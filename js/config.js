/* PUBLIC configuration only. Never put secrets (API keys, SMTP passwords) here. */
window.SITE_CONFIG = {
  name: "Mohammad Ali Hajebrahimi",
  handle: "@draliswiss",
  siteUrl: "",                                   // e.g. "https://www.example.com" (for canonical/sitemap)
  instagram: "https://www.instagram.com/draliswiss/",
  email: "",                                     // e.g. "contact@example.com" - hidden while empty
  phone: "",                                     // e.g. "+41 00 000 00 00"  - hidden while empty
  responseTime: "",                              // e.g. "2 business days" - hidden while empty
  apiBase: "",                                   // backend URL, e.g. "https://api.example.com". Empty = booking not connected.
  defaultLang: "en",
  languages: { en: "English", de: "Deutsch", fr: "Français", fa: "فارسی" },

  /* Services: nothing is invented. Every service stays disabled until the owner approves it.
     To enable one: set enabled:true and fill in every field. Prices are only DISPLAYED here;
     the server (backend) is the authority for price, currency and availability. */
  services: [
    {
      id: "career-guidance", enabled: false,
      name: { en: "Career guidance session", de: "Karriereberatung", fr: "Séance d'orientation professionnelle", fa: "جلسه راهنمایی شغلی" },
      description: { en: "", de: "", fr: "", fa: "" },
      durationMin: null, price: null, currency: "", format: { en: "", de: "", fr: "", fa: "" },
      availability: { en: "", de: "", fr: "", fa: "" },
      cancellation: { en: "", de: "", fr: "", fa: "" }, refund: { en: "", de: "", fr: "", fa: "" }
    }
  ],

  /* Educational content: add items here, no redesign needed. Placeholders below use translation keys;
     for real posts use title/description objects {en,de,fr,fa} or plain strings. */
  resources: [
    { id: "heart-basics", category: "cardiology", image: "assets/anatomical-heart.jpg", date: "", link: "",
      titleKey: "res.i1.t", descKey: "res.i1.d" },
    { id: "ecg-basics", category: "cardiology", image: "assets/ecg-monitor.jpg", date: "", link: "",
      titleKey: "res.i2.t", descKey: "res.i2.d" },
    { id: "pathways", category: "img", image: "assets/doctor-zurich-waterfront.jpg", date: "", link: "",
      titleKey: "res.i3.t", descKey: "res.i3.d" }
  ],

  /* Official sources for the IMG page. Review for accuracy and freshness before publishing. */
  officialLinks: [
    { key: "off.de", url: "https://www.anerkennung-in-deutschland.de" },
    { key: "off.ch", url: "https://www.bag.admin.ch" },
    { key: "off.fmh", url: "https://www.fmh.ch" }
  ]
};
