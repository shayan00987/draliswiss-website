/* Booking UI. The SERVER is authoritative for services, prices, slots and payment status.
   This script never marks anything as paid; it only creates a pending booking and redirects to hosted checkout. */
(function () {
  const host = document.getElementById("booking-app"); if (!host) return;
  const C = window.SITE_CONFIG, T = I18N.t, L = I18N.L;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const q = new URLSearchParams(location.search);
  const state = { step: 1, services: [], service: null, slot: null, slots: [], msg: "", err: false };

  const status = q.get("status");
  if (status === "success" || status === "cancelled") {
    const ok = status === "success";
    host.innerHTML = `<div class="panel"><h2>${esc(T(ok ? "b.success.t" : "b.cancel.t"))}</h2><p>${esc(T(ok ? "b.success.p" : "b.cancel.p"))}</p>
      ${ok ? "" : '<a class="btn" href="booking.html">' + esc(T("b.back")) + "</a>"}</div>`;
    document.addEventListener("langchange", () => location.reload());
    return;
  }

  async function api(path, opts) {
    const r = await fetch(C.apiBase + path, opts);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || "error"), { status: r.status });
    return data;
  }

  async function init() {
    if (!C.apiBase) { render(); return; }
    try { state.services = (await api("/api/services")).services; } catch (_) { state.err = true; state.msg = T("b.err"); }
    const pre = q.get("service");
    if (pre) { const s = state.services.find(x => x.id === pre); if (s) { state.service = s; state.step = 2; await loadSlots(); return; } }
    render();
  }
  async function loadSlots() {
    try { state.slots = (await api("/api/slots?service=" + encodeURIComponent(state.service.id))).slots; } catch (_) { state.slots = []; }
    render();
  }

  function steps() {
    return `<ol class="steps">${["b.s1", "b.s2", "b.s3", "b.s4"].map((k, n) => `<li class="${state.step === n + 1 ? "on" : ""}">${esc(T(k))}</li>`).join("")}</ol>`;
  }
  const fmtTime = iso => new Intl.DateTimeFormat(I18N.get(), { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  const fmtPrice = s => new Intl.NumberFormat(I18N.get(), { style: "currency", currency: s.currency }).format(s.priceMinor / 100);

  function render() {
    if (!C.apiBase) { host.innerHTML = `<div class="panel"><p class="status">${esc(T("b.off"))}</p><a class="btn" href="contact.html">${esc(T("nav.contact"))}</a></div>`; return; }
    let body = "";
    if (state.step === 1) {
      body = `<h2>${esc(T("b.pick"))}</h2>` + (state.services.length ? `<div class="grid g2">${state.services.map(s => `
        <div class="card"><div class="body"><h3>${esc(L(s.name))}</h3><p>${esc(L(s.description))}</p>
        <div class="price">${esc(fmtPrice(s))}</div><p class="muted">${s.durationMin} ${esc(T("c.min"))}</p>
        <button class="btn" data-pick="${esc(s.id)}">${esc(T("b.next"))}</button></div></div>`).join("")}</div>` : `<p class="status">${esc(T("c.empty"))}</p>`);
    } else if (state.step === 2) {
      body = `<h2>${esc(T("b.time"))}</h2>` + (state.slots.length ? `<div class="slots">${state.slots.map(sl => `<button type="button" data-slot="${esc(sl.id)}" aria-pressed="${state.slot === sl.id}">${esc(fmtTime(sl.startsAt))}</button>`).join("")}</div>` : `<p class="status">${esc(T("b.noslots"))}</p>`) +
        `<div class="actions"><button class="btn ghost" data-back>${esc(T("b.back"))}</button><button class="btn" data-next ${state.slot ? "" : "disabled"}>${esc(T("b.next"))}</button></div>`;
    } else {
      body = `<h2>${esc(T("b.s3"))}</h2>
      <form id="bf" novalidate>
        <label>${esc(T("b.name"))}<input name="name" required autocomplete="name" maxlength="120"></label>
        <label>${esc(T("b.email"))}<input name="email" type="email" required autocomplete="email" maxlength="160"></label>
        <label>${esc(T("b.phone"))}<input name="phone" type="tel" autocomplete="tel" maxlength="40"></label>
        <p class="note">${esc(T("b.warn"))}</p>
        <label class="check"><input type="checkbox" name="consent" required> <span>${esc(T("b.consent"))} (<a href="privacy.html">${esc(T("foot.privacy"))}</a>, <a href="terms.html">${esc(T("foot.terms"))}</a>, <a href="refund-policy.html">${esc(T("foot.refund"))}</a>)</span></label>
        <div class="actions"><button type="button" class="btn ghost" data-back>${esc(T("b.back"))}</button><button class="btn gold" type="submit">${esc(T("b.pay"))}</button></div>
      </form>`;
    }
    host.innerHTML = `<div class="panel">${steps()}${state.msg ? `<p class="status ${state.err ? "err" : ""}" role="status">${esc(state.msg)}</p>` : ""}${body}</div>`;
    bind();
  }

  function bind() {
    host.querySelectorAll("[data-pick]").forEach(b => b.onclick = async () => { state.service = state.services.find(s => s.id === b.dataset.pick); state.step = 2; state.slot = null; state.msg = ""; await loadSlots(); });
    host.querySelectorAll("[data-slot]").forEach(b => b.onclick = () => { state.slot = b.dataset.slot; render(); });
    host.querySelectorAll("[data-back]").forEach(b => b.onclick = () => { state.step--; state.msg = ""; render(); });
    const n = host.querySelector("[data-next]"); if (n) n.onclick = () => { state.step = 3; state.msg = ""; render(); };
    const f = host.querySelector("#bf");
    if (f) f.onsubmit = async e => {
      e.preventDefault();
      if (!f.checkValidity()) { f.reportValidity(); return; }
      const d = Object.fromEntries(new FormData(f));
      const btn = f.querySelector("[type=submit]"); btn.disabled = true;
      try {
        const res = await api("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceId: state.service.id, slotId: state.slot, name: d.name, email: d.email, phone: d.phone, consent: true, lang: I18N.get() }) });
        state.msg = T("b.ok"); state.err = false; render();
        location.href = res.checkoutUrl;                 // hosted checkout; confirmation arrives later via verified webhook
      } catch (err) {
        state.msg = err.status === 409 ? T("b.taken") : T("b.err"); state.err = true;
        if (err.status === 409) { state.step = 2; state.slot = null; await loadSlots(); } else { btn.disabled = false; render(); }
      }
    };
  }

  document.addEventListener("langchange", render);
  init();
})();
