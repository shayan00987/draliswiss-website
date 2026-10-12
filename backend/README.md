# Booking and payment backend

**Status: written, syntax-checked, NOT tested with live Stripe credentials. Not production-ready until you complete the checklist below.**

## Run (test mode)
```
npm install
cp .env.example backend/.env      # fill in Stripe TEST keys and ADMIN_TOKEN
npm start
stripe listen --forward-to localhost:4242/api/webhooks/stripe   # prints the whsec_ secret
```
Then set `apiBase: "http://localhost:4242"` in `js/config.js`.

## What it does
- Price, currency and availability come **only** from the database; the browser cannot change them.
- A slot is held (35 min) inside a DB transaction; `UNIQUE(starts_at)` prevents double-booking.
- A pending booking is created, then a Stripe Checkout Session (hosted, so card data never touches your site) with an idempotency key.
- The success page proves nothing. A booking becomes `confirmed` only when the **signed webhook** reports `paid` and the amount and currency match; webhook events are stored to be idempotent.
- Expired/failed payments release the slot; the visitor can pick a time again.
- Admin (Bearer `ADMIN_TOKEN`): list bookings, create/update services, add slots, refund.
- Rate limiting, Helmet, CORS limited to your frontend, input validation, honeypot on the contact form.

## Add your first service and slots (after you decide the real values)
```
curl -X PUT localhost:4242/api/admin/services/career-guidance -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
 -d '{"name":{"en":"..."},"description":{"en":"..."},"durationMin":30,"priceMinor":0,"currency":"CHF","enabled":true}'
curl -X POST localhost:4242/api/admin/slots -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
 -d '{"serviceId":"career-guidance","startsAt":["2026-11-02T09:00:00Z"]}'
```
(`priceMinor` is in minor units, e.g. 5000 = 50.00. Use your real price; the zero above is only a placeholder and the API rejects it.)

## Before going live
1. Choose the provider by your business country, payout eligibility and currencies (Stripe is wired in; PayPal and local methods depend on what Stripe enables for your account).
2. Complete a full test: success, failed card, abandoned checkout, double click, two people picking one slot, webhook retry, refund.
3. Switch to live keys through your host's secret manager. Never commit `.env`.
4. Not yet built (planned): customer self-service cancel/reschedule via signed email link, an admin web dashboard (the API is ready), receipt/cancel emails for every status, data-retention job. Replace the single admin token with proper login + MFA.
5. Bank transfer is intentionally not offered (no verified reconciliation process).
6. Confirm with a lawyer that each service (especially anything clinical) is permitted in your jurisdiction.
