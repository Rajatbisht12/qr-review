# Master Blueprint: Votica Local SEO & Review Router - StarRoute

## 1. Executive Summary & Business Model
**The Problem:** Google Maps local SEO is driven by long, keyword-rich reviews, but the average customer is too lazy to type them. Conversely, angry customers are highly motivated to leave 1-star reviews.
**The Solution:** A physical QR standee tied to a smart routing web app that auto-generates unique, keyword-rich 5-star reviews for happy customers, while intercepting negative feedback privately.
**The Strategy (The "Trojan Horse"):** 
* Sell the hardware + software combo for a highly attractive ₹1,999 one-time setup fee (includes 500 generated reviews).
* Use the hardware as a foot-in-the-door to acquire 50-70 local B2B clients in Hyderabad rapidly.
* Monetize long-term through automated "quota top-up" fees via WhatsApp when their 500 reviews run out.
* Upsell web development and app services to this newly acquired client base.

---

## 2. Operational Logistics (The "One-Call Close")
To achieve high volume (target: 15-25 sales per day per agent) and high margins, the deployment process requires zero follow-up visits.

* **The Hardware Kit:** Field agents carry a backpack with 20-30 blank, premium acrylic standees (pre-printed with generic category designs like "Restaurant" or "Salon") and a pocket-sized Bluetooth thermal label printer (e.g., Niimbot B21).
* **The Process:** 
  1. Agent pitches the owner and collects ₹1,999.
  2. Agent opens `admin.xyz.com` on their phone, inputs the business name, Google Maps link, WhatsApp number, and selects a UI theme.
  3. Agent hits "Generate." The system instantly provisions a subdomain (`storename.xyz.com`) and outputs a QR code.
  4. Agent prints the QR code via Bluetooth, sticks it onto the blank square of the standee, and hands it to the owner. Total time: 5-10 minutes.

---

## 3. The User Experience (UX) Flows

### The Happy Flow (Emojis 3, 4, 5)
1. Customer scans the QR code.
2. Selects a happy emoji (3, 4, or 5).
3. Answers 3 rapid-fire tap questions (e.g., "What did you love?", "What did you order?", "Describe the vibe!").
4. Backend dynamically generates a keyword-rich review from the permutation database.
5. System deducts `1` from the business's `quota_remaining`.
6. Review text is automatically copied to the user's clipboard.
7. User is automatically redirected to the business's Google Maps review page to paste and post.

### The Friction Flow (Emojis 1, 2)
*Designed to comply with Google's "Review Gating" policies by using psychological friction rather than hard blocking.*
1. Customer selects an angry/sad emoji (1 or 2).
2. Opens an internal text box: *"We are so sorry. Please let us know what went wrong so we can fix it immediately."*
3. Customer types the complaint and hits Submit.
4. Backend instantly sends the complaint to the manager's WhatsApp.
5. Customer sees a Defusion Screen: *"Thank you. This has been sent to the manager."*
6. **Compliance Step:** A smaller, lower-visibility button at the bottom says: *"If you still wish to leave a public review on Google, click here."* (No text is auto-copied). 95% of users will abandon here because they already vented.

---

## 4. Technical Architecture

**Frontend (User & Admin Portals)**
* **Next.js (App Router):** Handles the frontend UI and edge routing.
* **Tailwind CSS:** Manages dynamic styling using CSS variables injected from the database, allowing one codebase to look different for every client.

**Hosting & Infrastructure**
* **Vercel:** Hosts the Next.js app.
* **Wildcard DNS & SSL:** Point `*.xyz.com` to Vercel. Vercel's Edge Network automatically generates and auto-renews SSL certificates for every instant subdomain (`storename.xyz.com`) with zero wait time.
* **Next.js Middleware:** Intercepts incoming requests at the edge, extracts the subdomain from the host header, and rewrites the URL to fetch the correct tenant data instantly.

**Database & Backend**
* **Supabase (PostgreSQL):** Handles strict relational data and JSON configurations.
* **Row Level Security (RLS):** Cryptographically ensures that one business cannot access another business's data or analytics, even if frontend routing fails.
* **Supabase Webhooks:** Listens for the `quota_remaining` column to hit `0`, triggering an automated WhatsApp API call to alert the business owner to top up.

---

## 5. Core Database Schema

**`businesses` (Tenant Table)**
* `id` (UUID, Primary Key)
* `agent_id` (UUID, Foreign Key)
* `business_name` (String)
* `whatsapp_number` (String)
* `subdomain` (String, Unique)
* `google_place_id` (String)
* `template_id` (UUID, Foreign Key)
* `quota_remaining` (Integer, Default: 500)
* `status` (Enum: active, suspended)

**`templates` (Dynamic UI Table)**
* `id` (UUID, Primary Key)
* `category` (String)
* `theme_config` (JSONB) - UI colors, fonts, background images
* `prompt_questions` (JSONB) - The 3 tap-based survey questions

**`review_permutations` (Smart Generator Table)**
* `id` (UUID, Primary Key)
* `template_id` (UUID, Foreign Key)
* `adjectives` (Array of Strings)
* `nouns` (Array of Strings)
* `structures` (Array of Strings)

**`scan_interactions` (Analytics & Quota Table)**
* `id` (UUID, Primary Key)
* `business_id` (UUID, Foreign Key)
* `emoji_selected` (Integer)
* `internal_feedback` (Text, Nullable)
* `clipboard_copied` (Boolean) - *The true metric for quota deduction*

---

## 6. Execution & Rollout Phases

**Phase 1: Build & Infrastructure (Weeks 1-3)**
* Connect Vercel Wildcard DNS.
* Write Next.js Edge Middleware for routing.
* Set up Supabase schema and RLS policies.
* Build the dynamic generation logic for `review_permutations`.

**Phase 2: Hardware & Integrations (Week 4)**
* Integrate WhatsApp Business API for manager alerts and top-up notices.
* Order 100 acrylic standees and the Bluetooth thermal printer.
* Design and print 4 core category background cards (Restaurant, Salon, Retail, Cafe).

**Phase 3: Beta Launch (Weeks 5-6)**
* Hit the streets in Hyderabad. Target: 50-70 beta users.
* Pitch: ₹1,999 flat rate for 500 smart reviews.
* Refine the pitch based on owner feedback and monitor actual scan-to-copy conversion rates.

**Phase 4: Scalable SaaS Automation (Week 7+)**
* Activate the "DIY Fallback" (CSV upload) for owners who exhaust their quota but don't want to pay the top-up fee (using friction to drive top-up sales).
* Begin leveraging the active client list to upsell core Votica Labs services.
* Hire commission-based field agents with their own hardware kits to scale acquisition.