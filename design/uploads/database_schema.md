# Core Relational Schema

**1. `businesses`**
- `id` (UUID, PK)
- `agent_id` (UUID, FK)
- `business_name` (String)
- `whatsapp_number` (String)
- `subdomain` (String, Unique) 
- `google_place_id` (String)
- `template_id` (UUID, FK)
- `quota_remaining` (Integer, Default: 500)
- `status` (Enum: active, suspended, exhausted)

**2. `templates`**
- `id` (UUID, PK)
- `category` (String) - e.g., 'Restaurant', 'Salon'
- `theme_config` (JSONB) - CSS variables
- `prompt_questions` (JSONB) - UI text arrays

**3. `review_permutations`**
- `id` (UUID, PK)
- `template_id` (UUID, FK)
- `adjectives` (Array of Strings)
- `nouns` (Array of Strings)
- `structures` (Array of Strings)

**4. `scan_interactions`**
- `id` (UUID, PK)
- `business_id` (UUID, FK)
- `emoji_selected` (Integer)
- `internal_feedback` (Text, Nullable)
- `clipboard_copied` (Boolean)
- `created_at` (Timestamp)