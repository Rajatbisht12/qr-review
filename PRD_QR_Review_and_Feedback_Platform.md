# Product Requirements Document
## QR-Based Review & Feedback Platform (Multi-Tenant SaaS)

**Version:** 1.0
**Status:** Draft for build
**Owner:** [You]
**Last updated:** 21 June 2026

---

## 1. Summary

A physical QR standee placed at a local business connects to a multi-tenant web app. A customer scans it with their **own phone**, lands on a branded page for that specific business, and is invited to (a) leave a public Google review in their own words and (b) optionally send private feedback straight to the manager. Managers get real-time WhatsApp alerts for low-rated feedback so they can fix problems fast. Agencies/admins can spin up a new branded tenant in minutes — no code deploy.

The product helps businesses **collect more genuine reviews and catch problems early**, without filtering, fabricating, or suppressing feedback.

---

## 2. Goals and non-goals

### Goals
- Increase the *volume* and *velocity* of genuine Google reviews via frictionless tap-to-review.
- Give managers a fast private channel to learn about and resolve complaints before they escalate.
- Let an admin/agency launch a fully branded tenant (subdomain, colours, logo, categories) without engineering work.
- Stay fully compliant with Google's review policies and the FTC Consumer Reviews and Testimonials Rule (16 CFR Part 465), so client listings are never put at risk.

### Non-goals (explicitly out of scope — these create legal/platform risk)
- ❌ **Sentiment-based routing of the Google link** (a.k.a. review gating). Every customer gets the same access to Google.
- ❌ **Generating review text for the customer to paste.** The app may *assist* phrasing but the words must be the customer's own.
- ❌ **Any "spam-filter evasion" / permutation engine.**
- ❌ **Incentives tied to leaving or revising a review** (discounts, points, free items).
- ❌ **Asking customers to name specific staff or include specific keywords** (prohibited under Google's 2026 update).
- ❌ **On-premises shared-device review capture** (tablets/kiosks at the counter). Customers use their own devices.

---

## 3. Compliance constraints (load-bearing — read before building)

These are hard product constraints, not guidelines. They shape the UX and the data model.

| # | Rule | Source | Product implication |
|---|------|--------|--------------------|
| C1 | No review gating: do not route customers to different destinations based on predicted sentiment; do not make the public-review path harder for unhappy customers. | Google Prohibited Content policy; FTC §465.7 (review suppression) | Single unified flow. Google CTA is equally prominent for all ratings. |
| C2 | Reviews must reflect the customer's genuine experience and be authored by them. No AI-written or pre-written review text presented for pasting. | FTC §465.2 (fake/false reviews; AI explicitly covered) | "Assist" features only: prompts, voice-to-text, editable bullets the user expands. No full-text generation. |
| C3 | Do not request specific content, keywords, or staff names in reviews. | Google review policy (2026 update) | Prompts must be open-ended ("What stood out?"), never "mention [keyword]/[staff]." |
| C4 | No incentives conditioned on writing/revising a review or on a particular sentiment. | FTC §465.4; Google Fake Engagement policy | No coupon/points hooks tied to reviews anywhere in the flow. |
| C5 | Do not discourage, block, or pre-screen negative reviews. Private feedback is offered *in addition to* — never *instead of* — the public option. | Google policy; FTC §465.7 | Private feedback never gates or hides the Google link. |
| C6 | Customers review on their own devices, not a shared on-premises tablet. | Google review policy (2026 update) | Standee QR → customer's phone. No kiosk mode. |
| C7 | The vendor (you) can be liable, not just the client. Tools that facilitate gating are targeted. | FTC §465 applies to agencies/reputation-management firms; Google targets facilitating software | The platform's architecture itself must be gating-free by design. |

> Jurisdiction note: Google's policy applies globally. The FTC rule applies to businesses operating in or targeting US consumers. India (and other markets) have their own evolving rules on fake/paid reviews (e.g. BIS framework on online consumer reviews; Consumer Protection Act / CCPA). The compliant design above satisfies all of these. Confirm specifics for each client's jurisdiction with qualified local counsel — this PRD is not legal advice.

---

## 4. Target users & personas

- **Local business owner / manager** (restaurant, salon, café, retail). Wants more reviews and early warning on problems. Low technical skill. Primary value: WhatsApp alerts + review growth.
- **Walk-in customer.** Scans the standee on their own phone. Wants a 5-second interaction. May be delighted, neutral, or unhappy.
- **Agency / platform admin (you or a reseller).** Onboards businesses, configures branding, manages billing, monitors usage across tenants.

---

## 5. Core user flow (single, compliant path)

```
Scan QR on standee (own phone)
        │
        ▼
Branded landing page (tenant theme)
        │
        ▼
"How was your visit?"  → quick rating (e.g. 1–5)
        │
        ├────────────────────────────────────────────┐
        ▼                                             ▼
   [Same for ALL ratings]                     (Optional, shown to ALL)
   "Share your experience on Google"          "Send private feedback to the manager"
   • Open-ended assist prompts                 • Free-text complaint/suggestion
   • Voice-to-text option                      • Triggers WhatsApp alert if low rating
   • Opens Google review composer             • Confirmation screen
```

Key points:
- The **Google CTA and the private-feedback CTA are both available to every customer.** A low rating may make the private-feedback option *more visually prominent* (to encourage the manager to hear about it), but the Google link is never removed, demoted, or made harder to reach for any rating.
- Rating is used **only** for (a) deciding whether to fire a WhatsApp alert and (b) internal analytics — never to decide who can reach Google.

### "Assist, don't author" detail (C2/C3)
When a customer chooses to write a Google review, the app may offer:
- Open-ended starter prompts they answer in their own words.
- Voice-to-text capture.
- A few editable bullet stubs they expand and can fully delete.
It must **not**: pre-fill complete sentences/paragraphs, copy generated text to clipboard for pasting, or instruct the user to include named staff or specific keywords.

---

## 6. Functional requirements

### 6.1 Multi-tenant wildcard routing
- `storename.yourdomain.com` resolves to the correct tenant via wildcard DNS + host-based routing.
- Tenant created on admin "generate"; subdomain live within seconds (cached config, no deploy).
- Each tenant maps to: business name, Google review link (place ID / write-review URL), manager WhatsApp number(s), theme, plan/quota.
- 404/holding page for unknown subdomains.

### 6.2 Dynamic UI theming
- Per-tenant branding stored in DB (logo URL, primary/secondary colours, business category, copy strings, language).
- Rendered from templates at request time — **no code deployment per client**.
- Sensible category defaults (restaurant / salon / café / retail) with override.
- Live preview in admin before publish.

### 6.3 Feedback capture
- Quick rating capture (configurable scale/emoji set per tenant).
- Private free-text feedback field (offered to all customers).
- Optional contact field (name / phone / email) — clearly optional, for follow-up only.
- Store: tenant_id, rating, feedback_text (nullable), contact (nullable), timestamp, channel = QR.
- **Never** store fabricated review content; the app does not retain or transmit any "review to paste."

### 6.4 Review assist (compliant)
- Open-ended prompt sets per category (editable per tenant), all phrased as neutral questions.
- Voice-to-text (browser API).
- "Open Google review" button → deep link to the tenant's Google write-review URL, identical for all ratings.

### 6.5 WhatsApp alerts
- Real-time alert to manager number(s) when feedback rating ≤ threshold (default configurable, e.g. ≤2) **or** any private feedback is submitted (tenant choice).
- Alert payload: rating, feedback text, time, optional customer contact, tenant name.
- Delivery via WhatsApp Business API / approved BSP; templated messages; retry + delivery status.
- **Billing alerts:** automated WhatsApp/email warning to admin + tenant on quota exhaustion / top-up needed.

### 6.6 Admin & tenant dashboard
- Admin: create/suspend tenants, set branding, set Google link & WhatsApp numbers, manage plan/quota/billing, view cross-tenant usage.
- Tenant manager: view private feedback inbox, mark resolved, view review-funnel analytics (scans → rating → Google-CTA clicks → private submissions), update own WhatsApp number.
- Role-based access (admin vs tenant manager).

### 6.7 Billing & quotas
- Plan = monthly scan/alert quota + features.
- Usage metering per tenant; soft warning + hard cap behaviour configurable.
- Top-up flow; automated exhaustion notices (ties to 6.5).
- Payment provider integration (e.g. Razorpay/Stripe per market).

---

## 7. Data model (sketch)

- **tenant**(id, subdomain, business_name, category, google_review_url, status, plan_id, created_at)
- **tenant_theme**(tenant_id, logo_url, color_primary, color_secondary, copy_overrides_json, language)
- **manager_contact**(id, tenant_id, whatsapp_number, alert_threshold, alert_on_any_private bool)
- **feedback**(id, tenant_id, rating, feedback_text, contact_json, channel, created_at, resolved_at)
- **alert_log**(id, tenant_id, feedback_id, channel, status, sent_at)
- **usage_meter**(tenant_id, period, scans, alerts, quota, topups)
- **user**(id, role, tenant_id nullable, auth_fields)

No table stores generated/pasteable review text — by design.

---

## 8. Architecture & technical notes
- Wildcard DNS (`*.yourdomain.com`) + reverse proxy / host-based routing to a single app.
- Tenant config cached (e.g. Redis) for instant subdomain activation.
- Stateless web tier; theme + copy resolved per request from tenant config.
- WhatsApp via official Business API / BSP with templated messages and webhook delivery receipts.
- Google integration: store each tenant's Place ID and generate the official "write a review" deep link (Google published official review-link/QR generation docs in Dec 2025 — prefer these over scraped/guessed URLs).
- HTTPS everywhere incl. wildcard cert; per-tenant data isolation.

---

## 9. Non-functional requirements
- **Performance:** landing page interactive < 1.5s on 4G; QR-scan-to-page < 2s.
- **Reliability:** alert delivery target 99%+ with retry; quota notices never silently dropped.
- **Security & privacy:** encrypt PII at rest; minimise contact data collected; clear privacy notice on the feedback page; data-deletion path; consent for storing contact details. Comply with applicable data-protection law (e.g. India DPDP Act for Indian users; GDPR if EU users).
- **Accessibility:** WCAG AA on the customer-facing page; large tap targets; multilingual copy.
- **Auditability:** log routing decisions to demonstrate the Google path is rating-agnostic (useful evidence of non-gating).

---

## 10. Success metrics
- Genuine Google reviews generated per tenant per month (and review velocity).
- Scan → Google-CTA click-through rate (tracked equally across rating bands; a healthy product shows similar CTA prominence regardless of rating).
- Private feedback submissions and **median time-to-resolution**.
- WhatsApp alert delivery rate.
- Tenant activation time (target: minutes).
- Tenant retention / churn; quota top-up rate.

---

## 11. Phased roadmap
- **Phase 1 (MVP):** wildcard routing + theming, unified feedback flow, Google deep link, private feedback + WhatsApp alerts, basic admin, basic billing.
- **Phase 2:** tenant dashboard analytics, review-response management, multilingual prompts, plan/quota automation + top-up notices.
- **Phase 3:** voice-to-text assist, category prompt libraries, reseller/agency multi-account management, deeper reporting.

---

## 12. Open questions
- Which markets/jurisdictions at launch (drives FTC vs DPDP vs GDPR specifics)?
- WhatsApp BSP choice and per-message cost model vs your plan pricing.
- Default rating scale (1–5 stars vs emoji) per category.
- Do tenants want private-feedback alerts on *all* submissions or only low ratings?
- Self-serve tenant signup vs agency-managed onboarding only?

---

*This document describes a compliant feedback-and-review product. It is a product spec, not legal advice; validate the final implementation against current Google policies and the applicable consumer-protection rules in each market with qualified counsel.*
