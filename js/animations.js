/* Scroll reveals via IntersectionObserver. Respects prefers-reduced-motion (CSS also disables transitions). */
window.Animations = (function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let io = null;
  if ("IntersectionObserver" in window && !reduce) {
    io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  }
  function observe(root) {
    (root || document).querySelectorAll(".reveal:not(.in)").forEach(el => io ? io.observe(el) : el.classList.add("in"));
  }
  /* stagger children of [data-stagger] */
  document.querySelectorAll("[data-stagger]").forEach(p => [...p.children].forEach((c, i) => { c.classList.add("reveal"); c.style.setProperty("--d", i * 0.08 + "s"); }));
  observe();
  return { observe };
})();
