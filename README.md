# Dr. Mohammad Ali Hajebrahimi (@draliswiss): personal website

Light, premium, fully responsive website (navy / ivory / champagne gold with soft sage accents).
Languages: **English, Deutsch, Français, فارسی (RTL)**. Frontend is plain HTML, CSS and JavaScript, so no build step is needed.

## Quick start
Open `index.html` in a browser, or serve the folder: `npx serve . -l 5500`.
Booking and the contact form need the backend (see `backend/README.md`). Until `apiBase` is set in `js/config.js`, they show a clear "not connected" message instead of pretending to work.

## Structure
```
index.html  about.html  resources.html  img-pathways.html  consultations.html
booking.html  contact.html  privacy.html  terms.html  refund-policy.html  404.html
css/style.css
js/config.js      <- ALL public settings (email, phone, services, resources, links)
js/i18n.js        <- ALL translations (en, de, fr, fa)
js/main.js        <- header, footer, mobile menu, renders services/resources
js/animations.js  <- scroll reveals (IntersectionObserver)
js/carousel.js    <- hero supporting-image carousel
js/booking.js     <- booking steps, talks to the backend
assets/           <- all images
backend/          <- Node/Express + SQLite + Stripe (server-side only)
.env.example  package.json  robots.txt  sitemap.xml
```

## Things you must fill in (nothing is invented)
Edit `js/config.js`:
- `email`, `phone`, `responseTime`: leave empty to hide them.
- `siteUrl`, plus the canonical links and `sitemap.xml` / `robots.txt` domain (replace `www.example.com`).
- `services`: every service is **disabled** with no price. Enable one only after you decide what you offer, the price, duration, format, cancellation and refund terms.
- `resources`: add articles/videos as objects (`image`, `category`, `date`, `link`, `title`, `description`). The three current items are labelled placeholders.
- `apiBase`: your backend URL once deployed.

Confirm before publishing: the designation "Cardiology Resident" and the institutions (LMU Munich, Heidelberg, Freiburg) come only from the Instagram bio. The About timeline deliberately has no dates. Legal pages are template text and **must be reviewed by a lawyer**. Verify the official links on the IMG page are current.

## Languages
Add a language: copy one block in `js/i18n.js`, translate it, add the code to `languages` in `js/config.js`. Right-to-left languages (fa, ar, he, ur) switch direction automatically. The Persian, German and French texts should be checked by a native speaker, especially medical and legal wording.

## Images (`assets/`)
| File | Use |
|---|---|
| doctor-profile.png | Hero and primary portrait. Transparent PNG (alpha verified); shown on a soft card |
| doctor-writing-notes.jpg | Hero carousel, About |
| doctor-zurich-waterfront.jpg | Hero carousel, About, IMG page |
| medical-desk-stethoscope.jpg | Carousel, consultations |
| anatomical-heart.jpg | Introduction, education |
| ecg-monitor.jpg | Areas of interest, education |
| extra-*.jpg | Extra stock-style images (contact, IMG sections) |

`consultation-lounge` was not supplied, so the desk image is used for consultation sections. `extra-ecg-cropped.jpg` is the ECG image with a third-party watermark cropped off; it is not used on any page. Check you have the rights to every image before launch.

## Deployment
Frontend: any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages). **A static host alone cannot take payments or store bookings**; deploy `backend/` separately on a Node host and set `apiBase`. Use HTTPS everywhere.

## Accessibility and performance
Semantic HTML, skip link, visible focus, labelled forms, `prefers-reduced-motion` respected, carousel pauses on hover/focus and when the tab is hidden, reserved image sizes, lazy-loaded below-the-fold images. Fonts load from Google Fonts with system fallbacks; self-host them if you want zero third-party requests (and update the privacy notice accordingly).

## GitHub
Upload the **contents** of this folder to the root of your repository (so `index.html` sits at the top level, not inside a subfolder).
- `.gitignore` keeps `.env` and databases out of the repo. Never commit secrets.
- `.nojekyll` makes GitHub Pages serve the files as-is.
- GitHub Pages: Settings → Pages → Deploy from branch → `main` / root. All paths are relative, so it also works at `https://USER.github.io/REPO/`.
- GitHub Pages is static only. Deploy `backend/` to a Node host (Render, Railway, Fly.io, etc.), set `apiBase` in `js/config.js`, and set `FRONTEND_ORIGIN` on the server to your full site address (include `/REPO` for a project site).
