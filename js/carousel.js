/* Hero supporting-image carousel. The portrait is separate and permanent; only these slides rotate. */
(function () {
  const root = document.getElementById("carousel"); if (!root) return;
  const slides = [...root.querySelectorAll(".slide")];
  const dotsHost = root.querySelector(".dots");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const T = k => I18N.t(k);
  let i = 0, timer = null, paused = false;

  dotsHost.innerHTML = slides.map((_, n) => `<button type="button" data-n="${n}"></button>`).join("");
  const dots = [...dotsHost.children];

  function show(n) {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => { s.classList.toggle("on", k === i); s.setAttribute("aria-hidden", k !== i); });
    dots.forEach((d, k) => { d.setAttribute("aria-current", k === i); d.setAttribute("aria-label", T("car.go") + " " + (k + 1)); });
  }
  function start() { stop(); if (reduce || paused || document.hidden) return; timer = setInterval(() => show(i + 1), 5500); }
  function stop() { clearInterval(timer); timer = null; }

  root.querySelector(".pv").addEventListener("click", () => { show(i - 1); start(); });
  root.querySelector(".nx").addEventListener("click", () => { show(i + 1); start(); });
  dots.forEach(d => d.addEventListener("click", () => { show(+d.dataset.n); start(); }));
  ["mouseenter", "focusin"].forEach(ev => root.addEventListener(ev, () => { paused = true; stop(); }));
  ["mouseleave", "focusout"].forEach(ev => root.addEventListener(ev, () => { paused = false; start(); }));
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
  document.addEventListener("langchange", () => show(i));
  show(0); start();
})();
