# Security & Compliance Standards

## 1. Google Policy Compliance (Review Gating Avoidance)
- **Strategy:** "Friction by Design." The application never technically blocks a user from leaving a Google Review. 
- **Implementation:** Negative flow users are presented with a direct feedback form first to exhaust emotional urgency, but the final confirmation screen *must* include a functional link to the Google Review page. This shifts the behavior drop-off to human psychology rather than software blocking, keeping the product in the compliance "gray area."

## 2. Platform Security
- **Data Isolation:** Supabase Row Level Security (RLS) guarantees that one tenant cannot access another tenant's interaction data, even if application logic fails.
- **Rate Limiting:** Implement IP-based rate limiting on the review permutation endpoint to prevent competitors or malicious users from spam-scanning the QR code to drain a client's 500-review quota.
- **Clipboard Permissions:** Use the standard Web Clipboard API. Requires HTTPS (handled natively by Vercel wildcard SSL) and a clear user interaction (clicking "Done") to function securely across iOS and Android browsers.