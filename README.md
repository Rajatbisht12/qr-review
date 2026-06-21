# ReviewLoop — QR Review & Feedback Platform

A multi-tenant SaaS that turns a physical QR standee into a branded, **policy-compliant**
review & feedback flow. Customers scan with their own phone, land on a per-business page,
and can (a) leave a public Google review **in their own words** or (b) send private feedback
straight to the manager — who gets a real-time WhatsApp alert for low ratings.

Built to the [PRD](./PRD_QR_Review_and_Feedback_Platform.md). Implements **Phase 1 (MVP)**.

## Why it's compliant by design (no review gating)

This product deliberately **cannot** gate reviews — that architecture is baked in:

- **C1 / C5 — no gating:** the Google CTA and the private-feedback CTA are shown to **every**
  rating with equal access. A low rating only re-orders the cards (private surfaced first); the
  Google link is never removed, demoted, or made harder to reach. See `ChooseStep` in
  `src/app/s/[subdomain]/CustomerFlow.tsx`.
- **C2 / C3 — assist, don't author:** the app offers open-ended prompts + voice-to-text only.
  It never generates review text. The customer's words are always their own (`src/lib/prompts.ts`).
- **C4 — no incentives** tied to reviews anywhere in the flow.
- **C6 — own-device only:** standee QR → the customer's phone. No kiosk mode.
- **§9 auditability:** every `google_cta_click` event logs the rating band, so you can *prove* the
  Google path is rating-agnostic (see "Google CTA by rating band" in the dashboards).

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Prisma** ORM with **SQLite** (swap `provider` to `postgresql` for production)
- Host-based multi-tenant routing via `src/middleware.ts`
- HMAC-signed cookie sessions (no external auth dependency)

## Quick start

```bash
npm install
npm run setup     # prisma generate + db push + seed demo data
npm run dev       # http://localhost:3000
```

### Demo logins

| Role    | URL                | Email                       | Password     |
| ------- | ------------------ | --------------------------- | ------------ |
| Admin   | `/admin`           | `admin@demo.com`            | `admin123`   |
| Manager | `/s/pizzapalace/manage` | `manager@pizzapalace.com` | `manager123` |

### Try the customer flow

- Path form (works everywhere): <http://localhost:3000/s/pizzapalace>
- Subdomain form (modern browsers): <http://pizzapalace.localhost:3000>

Demo tenants: **pizzapalace**, **glowsalon**.

## How multi-tenancy works (PRD 6.1)

`src/middleware.ts` reads the `Host` header, extracts the subdomain, and rewrites
`pizzapalace.yourdomain.com/` → `/s/pizzapalace` internally (the URL stays clean).
The bare root domain and reserved hosts (`admin`, `www`, `app`) pass through untouched, so
`/admin` and the marketing page work normally. New tenants are live the moment they're created —
no deploy (config is resolved per-request from the DB).

For production: point wildcard DNS `*.yourdomain.com` at the app, set
`NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com`, and provision a wildcard TLS cert.

## WhatsApp alerts (PRD 6.5)

Provider abstraction in `src/lib/whatsapp.ts`:

- `WHATSAPP_PROVIDER=log` (default) — prints the alert to the server console. Zero config.
- `WHATSAPP_PROVIDER=meta` — sends via the WhatsApp Business Cloud API. Set
  `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` in `.env`. (Production messaging
  requires pre-approved message templates — adapt the payload to yours.)

An alert fires when `rating <= alertThreshold` **or** (optionally) on any private note.

## Project structure

```
prisma/schema.prisma         Data model (tenant, theme, contacts, feedback, alerts, events, usage, users)
prisma/seed.ts               Demo plans, admin, two branded tenants
src/middleware.ts            Host-based subdomain → /s/[subdomain] rewrite
src/lib/                     db, auth, tenant routing, prompts, whatsapp, analytics, qr
src/app/page.tsx             Marketing / holding page
src/app/admin/...            Admin console: tenant list, create, edit (branding + QR + analytics)
src/app/s/[subdomain]/       Customer flow (rating → unified CTAs → assist / private → thanks)
src/app/s/[subdomain]/manage Manager dashboard: feedback inbox, funnel, alert settings
```

## Scripts

| Script             | Description                              |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Dev server                               |
| `npm run build`    | Production build (runs `prisma generate`)|
| `npm run setup`    | Generate client + push schema + seed     |
| `npm run db:reset` | Wipe DB and re-seed                      |
| `npm run db:seed`  | Re-run the seed                          |

## What's next (PRD Phase 2/3)

- Razorpay/Stripe billing + automated quota-exhaustion notices
- Multilingual prompt libraries; review-response management
- Reseller/agency multi-account management; deeper reporting
- Real WhatsApp BSP delivery receipts via webhooks

---

_This is a product implementation, not legal advice. Validate against current Google policies and
the applicable consumer-protection rules in each market with qualified counsel._
