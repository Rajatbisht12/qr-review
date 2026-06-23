# Product Requirements Document (PRD)

## Target Audience
Restaurants, salons, cafes, and local retail stores relying heavily on Google Maps visibility and foot traffic.

## The Problem
1. **Customer Laziness:** Happy customers rarely take the time to write the long, keyword-rich reviews required by Google's AI SEO algorithms.
2. **Reputation Damage:** Angry customers are highly motivated to leave damaging 1-star public reviews.
3. **Agency Fulfillment Bottlenecks:** Selling custom software usually requires long delivery times, killing unit economics for low-ticket local sales.

## The Solution
A physical QR standee connected to a smart, multi-tenant web application.
- **The Happy Flow (Emojis 3-5):** Prompts users with 3 quick taps, generates a highly customized, keyword-rich review, copies it to the clipboard, and routes them to Google.
- **The Friction Flow (Emojis 1-2):** Prompts users to type a private complaint, sends it instantly to the manager via WhatsApp, and provides a secondary, lower-visibility link to Google to maintain policy compliance.

## Key Features
1. **Multi-Tenant Wildcard Routing:** Instant `storename.xyz.com` creation upon admin generation.
2. **Dynamic UI Theming:** Client-specific branding (colors, logos, categories) managed via database templates, not code deployments.
3. **Smart Review Permutations:** Algorithmically mixes adjectives, nouns, and sentence structures to ensure Google's spam filters do not detect duplicate pre-written reviews.
4. **Automated WhatsApp Alerts:** Real-time manager alerts for 1-2 emoji complaints and automated quota-exhaustion warnings for top-up billing.