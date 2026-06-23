# System Workflows

## 1. The End-User Flow
1. **Scan:** Customer scans the QR code on the physical standee.
2. **Access:** DNS routes `storename.xyz.com` to the Next.js app, loading the specific store's UI template.
3. **Rating:** User selects an emoji (1 to 5).
   - **Path A (1-2 Emojis):** 
     - Opens internal feedback text box.
     - User submits complaint.
     - Backend fires WhatsApp alert to Manager.
     - User sees "Thank You" screen with a small, optional link to Google Reviews.
   - **Path B (3-5 Emojis):**
     - Opens 3-question survey (e.g., Food, Ambience, Service).
     - User taps answers.
     - Backend generates unique review text, decrements the store's quota by 1, and marks the permutation as `used`.
     - Text is auto-copied to the user's clipboard.
     - User is auto-redirected to the store's Google Place ID review link.

## 2. The Agent / Deployment Flow
1. **Pitch & Close:** Votica Labs agent closes the sale (₹1,999) on-site.
2. **Admin Entry:** Agent opens `admin.xyz.com` on their phone -> enters business details, WhatsApp number, selects UI template, inputs Google Maps link.
3. **Instant Provision:** Agent clicks "Generate". 
4. **Hardware Handover:** Agent prints the generated subdomain QR via Bluetooth thermal printer, sticks it to a pre-printed acrylic standee, and hands it to the owner.

## 3. The Quota Top-Up Flow
1. Customer triggers a generation that brings the tenant's `quota_remaining` to 0.
2. Supabase Database Webhook fires.
3. Backend sends an automated WhatsApp message to the owner: "Your 500 smart reviews are exhausted. Auto-copy is paused. Click here to top up for ₹X."