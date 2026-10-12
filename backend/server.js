/* Booking + payment backend (Node 18+, Express, SQLite, Stripe Checkout).
   STATUS: written but NOT yet tested against live Stripe credentials. Run in TEST MODE first. */
require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const nodemailer = require("nodemailer");
const Stripe = require("stripe");

const env = process.env;
const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
const FRONT = (env.FRONTEND_ORIGIN || "http://localhost:5500").replace(/\/$/, "");
const HOLD_MIN = 35;                                  // slot is held while the customer pays (Stripe needs >= 30 min)
const db = new Database(env.DB_FILE || "bookings.db");
db.pragma("journal_mode = WAL"); db.pragma("foreign_keys = ON");
db.exec(require("fs").readFileSync(__dirname + "/schema.sql", "utf8"));

const mailer = env.SMTP_HOST ? nodemailer.createTransport({ host: env.SMTP_HOST, port: +env.SMTP_PORT || 587, secure: env.SMTP_SECURE === "true", auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }) : null;
async function mail(to, subject, text) {
  if (!to) return;
  if (!mailer) return console.log("[mail not configured]", subject, "->", to);
  try { await mailer.sendMail({ from: env.MAIL_FROM, to, subject, text }); } catch (e) { console.error("mail failed", e.message); }
}

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: FRONT }));

/* ---------- Stripe webhook (raw body, signature verified, idempotent) ---------- */
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) return res.status(503).send("payments not configured");
  let event;
  try { event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], env.STRIPE_WEBHOOK_SECRET); }
  catch (e) { return res.status(400).send("bad signature"); }
  if (db.prepare("SELECT 1 FROM stripe_events WHERE id=?").get(event.id)) return res.json({ duplicate: true });

  const s = event.data.object;
  const ref = s.metadata && s.metadata.booking_ref;
  const booking = ref && db.prepare("SELECT * FROM bookings WHERE ref=?").get(ref);

  if (booking && ["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type) && s.payment_status === "paid") {
    const ok = s.amount_total === booking.amount_minor && s.currency === booking.currency.toLowerCase();   // never trust, re-check
    const tx = db.transaction(() => {
      db.prepare("INSERT INTO stripe_events(id,type) VALUES(?,?)").run(event.id, event.type);
      if (!ok) { db.prepare("UPDATE bookings SET status='review' WHERE ref=?").run(ref); return false; }
      if (booking.status !== "confirmed") {
        db.prepare("UPDATE bookings SET status='confirmed', payment_intent=?, paid_at=datetime('now') WHERE ref=?").run(s.payment_intent, ref);
        db.prepare("UPDATE slots SET status='booked', held_until=NULL WHERE id=?").run(booking.slot_id);
      }
      return true;
    });
    if (tx()) {
      await mail(booking.email, `Booking confirmed · ${ref}`, `Thank you. Your booking ${ref} is confirmed.\nTime: ${booking.starts_at}\nA payment receipt is sent by the payment provider.`);
      await mail(env.OWNER_EMAIL, `New booking · ${ref}`, `New confirmed booking ${ref} (${booking.starts_at}).`);
    }
  } else if (booking && ["checkout.session.expired", "checkout.session.async_payment_failed"].includes(event.type)) {
    db.transaction(() => {
      db.prepare("INSERT INTO stripe_events(id,type) VALUES(?,?)").run(event.id, event.type);
      if (booking.status === "pending") {
        db.prepare("UPDATE bookings SET status='expired' WHERE ref=?").run(ref);
        db.prepare("UPDATE slots SET status='available', held_until=NULL WHERE id=? AND status='held'").run(booking.slot_id);
      }
    })();
  } else {
    db.prepare("INSERT OR IGNORE INTO stripe_events(id,type) VALUES(?,?)").run(event.id, event.type);
  }
  res.json({ received: true });
});

app.use(express.json({ limit: "20kb" }));
const publicLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });
const writeLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
app.use("/api", publicLimit);

const releaseExpired = () => db.prepare("UPDATE slots SET status='available', held_until=NULL WHERE status='held' AND held_until < datetime('now')").run();
const emailOk = e => typeof e === "string" && e.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const clean = (v, n) => String(v || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);

/* ---------- Public API ---------- */
app.get("/api/services", (_req, res) => {
  const rows = db.prepare("SELECT * FROM services WHERE enabled=1").all();
  res.json({ services: rows.map(r => ({ id: r.id, name: JSON.parse(r.name_json), description: JSON.parse(r.description_json), durationMin: r.duration_min, priceMinor: r.price_minor, currency: r.currency })) });
});

app.get("/api/slots", (req, res) => {
  releaseExpired();
  const rows = db.prepare("SELECT id, starts_at FROM slots WHERE service_id=? AND status='available' AND starts_at > datetime('now') ORDER BY starts_at LIMIT 200").all(clean(req.query.service, 60));
  res.json({ slots: rows.map(r => ({ id: r.id, startsAt: r.starts_at.replace(" ", "T") + "Z" })) });
});

app.post("/api/bookings", writeLimit, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "payments_not_configured" });
  const b = req.body || {};
  const name = clean(b.name, 120), email = clean(b.email, 160), phone = clean(b.phone, 40);
  if (name.length < 2 || !emailOk(email) || b.consent !== true) return res.status(400).json({ error: "invalid_input" });
  const service = db.prepare("SELECT * FROM services WHERE id=? AND enabled=1").get(clean(b.serviceId, 60));
  if (!service || !(service.price_minor > 0)) return res.status(400).json({ error: "invalid_service" });   // price comes from the DB only
  const ref = "BK-" + crypto.randomBytes(5).toString("hex").toUpperCase();

  releaseExpired();
  const hold = db.transaction(() => {
    const slot = db.prepare("SELECT * FROM slots WHERE id=? AND service_id=? AND status='available' AND starts_at > datetime('now')").get(clean(b.slotId, 60), service.id);
    if (!slot) return null;
    db.prepare("UPDATE slots SET status='held', held_until=datetime('now', ?) WHERE id=?").run(`+${HOLD_MIN} minutes`, slot.id);
    db.prepare("INSERT INTO bookings(ref,service_id,slot_id,starts_at,name,email,phone,lang,status,amount_minor,currency) VALUES(?,?,?,?,?,?,?,?,'pending',?,?)")
      .run(ref, service.id, slot.id, slot.starts_at, name, email, phone, ["en","de","fr","fa"].includes(b.lang) ? b.lang : "en", service.price_minor, service.currency);
    return slot;
  })();
  if (!hold) return res.status(409).json({ error: "slot_taken" });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment", client_reference_id: ref, customer_email: email, metadata: { booking_ref: ref },
      line_items: [{ quantity: 1, price_data: { currency: service.currency.toLowerCase(), unit_amount: service.price_minor, product_data: { name: JSON.parse(service.name_json).en } } }],
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      success_url: `${FRONT}/booking.html?status=success`, cancel_url: `${FRONT}/booking.html?status=cancelled`
    }, { idempotencyKey: "booking-" + ref });
    db.prepare("UPDATE bookings SET stripe_session_id=? WHERE ref=?").run(session.id, ref);
    res.json({ ref, checkoutUrl: session.url });
  } catch (e) {
    console.error("stripe error", e.message);
    db.transaction(() => {
      db.prepare("UPDATE bookings SET status='failed' WHERE ref=?").run(ref);
      db.prepare("UPDATE slots SET status='available', held_until=NULL WHERE id=?").run(hold.id);
    })();
    res.status(502).json({ error: "payment_unavailable" });
  }
});

app.post("/api/contact", writeLimit, async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true });                       // honeypot
  const name = clean(b.name, 120), email = clean(b.email, 160), message = clean(b.message, 3000);
  if (!name || !emailOk(email) || message.length < 5 || !b.consent) return res.status(400).json({ error: "invalid_input" });
  await mail(env.OWNER_EMAIL, "New website message", `From: ${name} <${email}>\n\n${message}`);
  res.json({ ok: true });
});

/* ---------- Admin API (bearer token; replace with full auth/MFA before scaling) ---------- */
function admin(req, res, next) {
  const given = Buffer.from((req.headers.authorization || "").replace(/^Bearer /, ""));
  const want = Buffer.from(env.ADMIN_TOKEN || "");
  if (!want.length || given.length !== want.length || !crypto.timingSafeEqual(given, want)) return res.status(401).json({ error: "unauthorized" });
  next();
}
const adminLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 });
app.use("/api/admin", adminLimit, admin);

app.get("/api/admin/bookings", (_req, res) => res.json({ bookings: db.prepare("SELECT ref,service_id,starts_at,name,email,phone,status,amount_minor,currency,payment_intent,created_at FROM bookings ORDER BY created_at DESC LIMIT 500").all() }));

app.put("/api/admin/services/:id", (req, res) => {
  const b = req.body, id = clean(req.params.id, 60);
  if (!b.name || !b.description || !(b.durationMin > 0) || !(Number.isInteger(b.priceMinor) && b.priceMinor > 0) || !/^[A-Za-z]{3}$/.test(b.currency || "")) return res.status(400).json({ error: "invalid_service" });
  db.prepare(`INSERT INTO services(id,name_json,description_json,duration_min,price_minor,currency,enabled) VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name_json=excluded.name_json, description_json=excluded.description_json, duration_min=excluded.duration_min, price_minor=excluded.price_minor, currency=excluded.currency, enabled=excluded.enabled`)
    .run(id, JSON.stringify(b.name), JSON.stringify(b.description), b.durationMin, b.priceMinor, b.currency.toUpperCase(), b.enabled ? 1 : 0);
  res.json({ ok: true });
});

app.post("/api/admin/slots", (req, res) => {                           // body: {serviceId, startsAt:["2026-11-02T09:00:00Z", ...]}
  const ins = db.prepare("INSERT OR IGNORE INTO slots(id,service_id,starts_at,status) VALUES(?,?,?, 'available')");
  const n = db.transaction(list => list.map(s => ins.run(crypto.randomUUID(), clean(req.body.serviceId, 60), new Date(s).toISOString().slice(0, 19).replace("T", " ")).changes).reduce((a, b) => a + b, 0))(req.body.startsAt || []);
  res.json({ created: n });
});

app.post("/api/admin/bookings/:ref/refund", async (req, res) => {
  const bk = db.prepare("SELECT * FROM bookings WHERE ref=?").get(req.params.ref);
  if (!bk || bk.status !== "confirmed" || !bk.payment_intent) return res.status(400).json({ error: "not_refundable" });
  try {
    await stripe.refunds.create({ payment_intent: bk.payment_intent }, { idempotencyKey: "refund-" + bk.ref });
    db.transaction(() => { db.prepare("UPDATE bookings SET status='refunded' WHERE ref=?").run(bk.ref); db.prepare("UPDATE slots SET status='available' WHERE id=?").run(bk.slot_id); })();
    await mail(bk.email, `Booking cancelled and refunded · ${bk.ref}`, "Your booking was cancelled and a refund was issued. It can take several days to appear.");
    res.json({ ok: true });
  } catch (e) { res.status(502).json({ error: "refund_failed" }); }
});

app.use((_req, res) => res.status(404).json({ error: "not_found" }));
app.listen(env.PORT || 4242, () => console.log("API on", env.PORT || 4242, stripe ? "(Stripe configured)" : "(Stripe NOT configured)"));
