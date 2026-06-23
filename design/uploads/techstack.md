# Technical Architecture & Stack

## Frontend (User & Admin Shell)
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS (using CSS variables mapped to JSONB theme configs for dynamic tenant styling).
- **Hosting:** Vercel (crucial for Edge Middleware and wildcard SSL).

## Backend & Database
- **Database:** Supabase (PostgreSQL).
- **Tenancy Enforcement:** Row Level Security (RLS) to ensure strict data boundaries.
- **Edge Routing:** Next.js `middleware.ts` to read the host header and rewrite wildcard requests to `/[tenant]/page.tsx`.
- **Background Jobs / Triggers:** Supabase Webhooks triggered on quota changes.

## Integrations
- **Messaging:** WhatsApp Business API (via Meta or a wrapper like Twilio/MessageBird) for alerts and top-ups.
- **Analytics:** PostHog or custom Supabase dashboards to track scan-to-copy conversion rates.

## Field Hardware Kit
- **Standees:** Blank premium acrylic or PVC A5 standees with pre-printed generic category art.
- **Printer:** Bluetooth pocket thermal label printer (e.g., Niimbot B21) loaded with waterproof adhesive squares.