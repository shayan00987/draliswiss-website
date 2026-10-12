CREATE TABLE IF NOT EXISTS services(
  id TEXT PRIMARY KEY, name_json TEXT NOT NULL, description_json TEXT NOT NULL,
  duration_min INTEGER NOT NULL, price_minor INTEGER NOT NULL, currency TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS slots(
  id TEXT PRIMARY KEY, service_id TEXT NOT NULL REFERENCES services(id), starts_at TEXT NOT NULL UNIQUE,   -- UNIQUE = one practitioner, no double-booking
  status TEXT NOT NULL DEFAULT 'available' CHECK(status IN('available','held','booked')), held_until TEXT);
CREATE TABLE IF NOT EXISTS bookings(
  ref TEXT PRIMARY KEY, service_id TEXT NOT NULL, slot_id TEXT NOT NULL REFERENCES slots(id), starts_at TEXT NOT NULL,
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT, lang TEXT,
  status TEXT NOT NULL CHECK(status IN('pending','confirmed','expired','failed','refunded','review')),
  amount_minor INTEGER NOT NULL, currency TEXT NOT NULL, stripe_session_id TEXT, payment_intent TEXT,
  created_at TEXT NOT NULL DEFAULT(datetime('now')), paid_at TEXT);
CREATE TABLE IF NOT EXISTS stripe_events(id TEXT PRIMARY KEY, type TEXT, received_at TEXT DEFAULT(datetime('now')));
