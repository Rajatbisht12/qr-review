# Execution & Rollout Plan

## Phase 1: MVP Development (Weeks 1-3)
- Set up Vercel wildcard DNS and Next.js middleware routing.
- Design the Supabase schema and write RLS policies.
- Build the 2 frontend UI flows (Happy/Friction).
- Create the algorithm that randomly selects and combines adjectives, nouns, and templates from the database.
- Build the basic Admin form for sales agents to provision new tenants.

## Phase 2: Integrations & Hardware Setup (Week 4)
- Connect the WhatsApp API to handle manager alerts for bad reviews.
- Set up the Supabase database webhook to trigger the automated top-up message when `quota_remaining == 0`.
- Order the initial batch of 100 acrylic standees and the Bluetooth thermal label printer.
- Design and print the aesthetic backgrounds for the standees.

## Phase 3: Beta Launch & Field Testing (Weeks 5-6)
- Target: Onboard 50-70 beta customers in Hyderabad.
- Pitch: Flat ₹1,999 setup fee, 500 reviews included.
- Goal: Test the "one-call close" logistics. Ensure the thermal printer works flawlessly on the go, and the DNS routing is instant.
- Monitor scan conversion rates and refine the prompt questions for maximum engagement.

## Phase 4: Monetization & Scaling (Week 7+)
- Activate the DIY fallback system (CSV upload feature) for exhausted quotas to drive the upsell.
- Launch the WhatsApp automated top-up billing cycle.
- Leverage the existing active client base to begin pitching Votica Labs' secondary services (web dev, custom apps).
- Hire and train additional field sales agents equipped with printer kits.