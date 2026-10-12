(function () {
  const C = window.SITE_CONFIG, T = I18N.t, L = I18N.L;
  document.documentElement.classList.add("js");
  const page = document.body.dataset.page || "";
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const links = [
    ["index.html", "nav.home", "home"], ["about.html", "nav.about", "about"],
    ["resources.html", "nav.resources", "resources"], ["img-pathways.html", "nav.img", "img"],
    ["consultations.html", "nav.consult", "consultations"], ["contact.html", "nav.contact", "contact"]
  ];

  /* ---------- Header ---------- */
  const header = document.getElementById("site-header");
  if (header) {
    const opts = Object.entries(C.languages).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("");
    header.className = "site-header";
    header.innerHTML = `
    <div class="wrap nav">
      <a class="brand" href="index.html"><b>${esc(C.name)}</b><small data-i18n="brand.role"></small></a>
      <button class="burger" aria-expanded="false" aria-controls="menu" data-i18n-attr="aria-label:nav.menu"><span></span></button>
      <nav class="menu" id="menu" aria-label="Main">
        ${links.map(l => `<a href="${l[0]}" data-i18n="${l[1]}" ${page === l[2] ? 'aria-current="page"' : ""}></a>`).join("")}
        <select class="lang" id="lang" data-i18n-attr="aria-label:nav.lang">${opts}</select>
        <a class="btn gold" href="booking.html" data-i18n="nav.book"></a>
      </nav>
    </div>`;
    const menu = header.querySelector(".menu"), burger = header.querySelector(".burger");
    burger.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      burger.setAttribute("aria-expanded", open);
    });
    menu.addEventListener("click", e => { if (e.target.tagName === "A") { menu.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); } });
    document.addEventListener("keydown", e => { if (e.key === "Escape") { menu.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); } });
    const sel = header.querySelector("#lang");
    sel.value = I18N.get();
    sel.addEventListener("change", () => I18N.set(sel.value));
  }

  /* ---------- Footer ---------- */
  const footer = document.getElementById("site-footer");
  if (footer) {
    footer.className = "site-footer";
    const contact = [];
    if (C.email) contact.push(`<li><a href="mailto:${esc(C.email)}">${esc(C.email)}</a></li>`);
    if (C.phone) contact.push(`<li><a href="tel:${esc(C.phone.replace(/\s/g, ""))}">${esc(C.phone)}</a></li>`);
    contact.push(`<li><a href="${esc(C.instagram)}" target="_blank" rel="noopener">Instagram ${esc(C.handle)}</a></li>`);
    footer.innerHTML = `
    <div class="wrap">
      <div class="fgrid">
        <div><h3>${esc(C.name)}</h3><p data-i18n="foot.tag"></p></div>
        <div><h3 data-i18n="foot.explore"></h3><ul>${links.map(l => `<li><a href="${l[0]}" data-i18n="${l[1]}"></a></li>`).join("")}</ul></div>
        <div><h3 data-i18n="foot.connect"></h3><ul>${contact.join("")}</ul></div>
        <div><h3 data-i18n="foot.legal"></h3><ul>
          <li><a href="privacy.html" data-i18n="foot.privacy"></a></li>
          <li><a href="terms.html" data-i18n="foot.terms"></a></li>
          <li><a href="refund-policy.html" data-i18n="foot.refund"></a></li></ul></div>
      </div>
      <div class="legal"><p data-i18n="foot.disc"></p><p>© <span id="yr"></span> ${esc(C.name)}. <span data-i18n="foot.rights"></span></p></div>
    </div>`;
    footer.querySelector("#yr").textContent = new Date().getFullYear();
  }

  /* ---------- Sticky booking button (mobile) ---------- */
  if (page !== "booking") {
    const s = document.createElement("div");
    s.className = "sticky-book";
    s.innerHTML = '<a class="btn gold" href="booking.html" data-i18n="nav.book"></a>';
    document.body.appendChild(s);
  }

  /* ---------- Dynamic content ---------- */
  function renderResources() {
    const host = document.getElementById("resource-list"); if (!host) return;
    const limit = +host.dataset.limit || 99;
    const cat = host.dataset.cat || "all";
    const items = C.resources.filter(r => cat === "all" || r.category === cat).slice(0, limit);
    host.innerHTML = items.length ? items.map((r, i) => {
      const title = r.titleKey ? T(r.titleKey) : L(r.title), desc = r.descKey ? T(r.descKey) : L(r.description);
      const date = r.date ? `<small class="muted">${esc(r.date)}</small>` : "";
      const more = r.link ? `<a class="more" href="${esc(r.link)}" target="_blank" rel="noopener" data-i18n="common.open"></a>` : "";
      return `<article class="card reveal" style="--d:${i * .08}s">
        <div class="img"><img src="${esc(r.image)}" alt="" loading="lazy" width="600" height="400"></div>
        <div class="body"><span class="tag">${esc(T("r.cat." + r.category))}</span><h3>${esc(title)}</h3>${date}<p>${esc(desc)}</p>${more}</div></article>`;
    }).join("") : `<p class="muted">${esc(T("res.empty"))}</p>`;
    I18N.apply(host);
    window.Animations && Animations.observe(host);
  }

  function renderServices() {
    const host = document.getElementById("service-list"); if (!host) return;
    const list = C.services.filter(s => s.enabled);
    const empty = document.getElementById("service-empty");
    if (empty) empty.classList.toggle("hidden", list.length > 0);
    host.innerHTML = list.map((s, i) => {
      const fmt = new Intl.NumberFormat(I18N.get(), { style: "currency", currency: s.currency || "CHF" }).format(s.price);
      const row = (k, v) => v ? `<p><b>${esc(T(k))}:</b> ${esc(v)}</p>` : "";
      return `<article class="card reveal" style="--d:${i * .08}s"><div class="body">
        <h3>${esc(L(s.name))}</h3><p>${esc(L(s.description))}</p>
        <div class="price">${esc(fmt)}</div>
        ${row("c.dur", s.durationMin ? s.durationMin + " " + T("c.min") : "")}${row("c.fmt", L(s.format))}${row("c.avail", L(s.availability))}${row("c.cancel", L(s.cancellation))}${row("c.refund", L(s.refund))}
        <a class="btn" href="booking.html?service=${encodeURIComponent(s.id)}" data-i18n="c.book"></a></div></article>`;
    }).join("");
    I18N.apply(host);
    window.Animations && Animations.observe(host);
  }

  function renderOfficial() {
    const host = document.getElementById("official-links"); if (!host) return;
    host.innerHTML = C.officialLinks.map(o => `<li><a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(T(o.key))}</a></li>`).join("");
  }

  function renderContactLinks() {
    const host = document.getElementById("contact-links"); if (!host) return;
    const out = [];
    if (C.email) out.push(`<a class="btn" href="mailto:${esc(C.email)}">${esc(T("ct.mail"))}</a>`);
    if (C.phone) out.push(`<a class="btn ghost" href="tel:${esc(C.phone.replace(/\s/g, ""))}">${esc(T("ct.call"))}</a>`);
    out.push(`<a class="btn ghost" href="${esc(C.instagram)}" target="_blank" rel="noopener">${esc(T("ct.insta"))}</a>`);
    host.innerHTML = out.join("");
    const rt = document.getElementById("resp");
    if (rt) { rt.classList.toggle("hidden", !C.responseTime); rt.textContent = C.responseTime ? T("ct.resp") + " " + C.responseTime : ""; }
  }

  function renderAll() { renderResources(); renderServices(); renderOfficial(); renderContactLinks(); }

  /* resource filter on resources page */
  document.querySelectorAll("[data-filter]").forEach(b => b.addEventListener("click", () => {
    const host = document.getElementById("resource-list");
    host.dataset.cat = b.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach(x => x.setAttribute("aria-pressed", x === b));
    renderResources();
  }));

  /* contact form */
  const cf = document.getElementById("contact-form");
  if (cf) cf.addEventListener("submit", async e => {
    e.preventDefault();
    const st = document.getElementById("contact-status");
    st.classList.remove("hidden", "err");
    if (!C.apiBase) { st.textContent = T("ct.off"); st.classList.add("err"); return; }
    try {
      const r = await fetch(C.apiBase + "/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(cf))) });
      if (!r.ok) throw 0;
      st.textContent = T("ct.ok"); cf.reset();
    } catch (_) { st.textContent = T("ct.err"); st.classList.add("err"); }
  });

  I18N.apply();
  renderAll();
  document.addEventListener("langchange", () => { I18N.apply(); renderAll(); });

  /* hide elements tied to unavailable contact methods */
  document.querySelectorAll("[data-needs]").forEach(el => { if (!C[el.dataset.needs]) el.classList.add("hidden"); });
})();
