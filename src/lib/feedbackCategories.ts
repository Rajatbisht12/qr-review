/**
 * Per-category presentation config for the customer feedback flow.
 *
 * Each business `category` gets its own background, welcome copy, and a set of
 * "survey pages" shown on the happy path (rating >= 3). A survey page is a single
 * screen with a two-column grid of selectable tags — the customer's picks shape the
 * review drafts they choose from at the end.
 *
 * The first two categories (restaurant, cafe) are modelled directly on the Figma
 * designs; the rest follow the same pattern so every vendor type gets a cohesive,
 * on-brand experience.
 */

export type SurveyTag = { label: string; emoji: string; icon?: string };
export type SurveyPage = { title: string; subtitle: string; tags: SurveyTag[] };

export type CategoryConfig = {
  /** Full-bleed background photo (under /public). Optional — falls back to gradient. */
  image?: string;
  /** Warm gradient used when there is no photo (and as a tint behind photos). */
  gradient: string;
  /** Subtitle under the welcome title on the rating screen. */
  welcomeSubtitle: string;
  /** Happy-path survey screens, shown in order. */
  surveyPages: SurveyPage[];
};

/** Service-quality tags reused across most categories (Figma "How was the Service?"). */
const SERVICE_PAGE: SurveyPage = {
  title: "How was the service?",
  subtitle: "Select all that apply",
  tags: [
    { label: "Friendly Staff", emoji: "😊", icon: "heart" },
    { label: "Quick Service", emoji: "⚡", icon: "clock" },
    { label: "Helpful", emoji: "🤝", icon: "tag" },
    { label: "Professional", emoji: "👔", icon: "badge" },
    { label: "Attentive", emoji: "👀", icon: "alert" },
    { label: "Welcoming", emoji: "🙌", icon: "smile" },
    { label: "Knowledgeable", emoji: "💡", icon: "bulb" },
    { label: "Responsible", emoji: "🔔", icon: "chat" },
  ],
};

const CONFIGS: Record<string, CategoryConfig> = {
  restaurant: {
    image: "/backgrounds/restaurant.png",
    gradient: "linear-gradient(160deg, #3a2417 0%, #66442a 100%)",
    welcomeSubtitle: "Thank you for dining with us today. We'd love to hear about your experience.",
    surveyPages: [
      {
        title: "What stood out about the food?",
        subtitle: "Select all that apply",
        tags: [
          { label: "Fresh Ingredients", emoji: "🥬", icon: "leaf" },
          { label: "Great Taste", emoji: "😋", icon: "fork" },
          { label: "Well Cooked", emoji: "🍳", icon: "pot" },
          { label: "Good Portions", emoji: "🍽️", icon: "plate" },
          { label: "Authentic Flavors", emoji: "🌶️", icon: "chili" },
          { label: "Beautifully Presented", emoji: "✨", icon: "sparkle" },
          { label: "Good Variety", emoji: "📋", icon: "grid" },
          { label: "Perfect Temperature", emoji: "🌡️", icon: "thermo" },
        ],
      },
      SERVICE_PAGE,
    ],
  },

  cafe: {
    image: "/backgrounds/cafe.png",
    gradient: "linear-gradient(160deg, #3a2a18 0%, #7a5a38 100%)",
    welcomeSubtitle: "Thanks for stopping by today. We'd love to hear about your visit.",
    surveyPages: [
      {
        title: "What did you enjoy?",
        subtitle: "Select all that apply",
        tags: [
          { label: "Great Coffee", emoji: "☕" },
          { label: "Fresh Pastries", emoji: "🥐" },
          { label: "Cozy Vibe", emoji: "🛋️" },
          { label: "Good Music", emoji: "🎶" },
          { label: "Tasty Food", emoji: "😋" },
          { label: "Quiet Space", emoji: "🤫" },
          { label: "Good for Work", emoji: "💻" },
          { label: "Great Value", emoji: "💛" },
        ],
      },
      SERVICE_PAGE,
    ],
  },

  salon: {
    gradient: "linear-gradient(160deg, #3a2330 0%, #7a4a63 100%)",
    welcomeSubtitle: "Thank you for visiting us today. We'd love to hear how it went.",
    surveyPages: [
      {
        title: "What did you love?",
        subtitle: "Select all that apply",
        tags: [
          { label: "Great Result", emoji: "💇" },
          { label: "Skilled Stylist", emoji: "✂️" },
          { label: "Relaxing", emoji: "🧖" },
          { label: "Clean Space", emoji: "🧼" },
          { label: "Attention to Detail", emoji: "🔍" },
          { label: "Good Advice", emoji: "💬" },
          { label: "On Time", emoji: "⏱️" },
          { label: "Great Value", emoji: "💛" },
        ],
      },
      SERVICE_PAGE,
    ],
  },

  retail: {
    gradient: "linear-gradient(160deg, #1f2e3a 0%, #3f5d72 100%)",
    welcomeSubtitle: "Thanks for shopping with us today. We'd love to hear about your visit.",
    surveyPages: [
      {
        title: "What stood out?",
        subtitle: "Select all that apply",
        tags: [
          { label: "Great Products", emoji: "🛍️" },
          { label: "Good Prices", emoji: "🏷️" },
          { label: "Wide Selection", emoji: "🗂️" },
          { label: "Quality Items", emoji: "💎" },
          { label: "Easy to Find", emoji: "🧭" },
          { label: "Well Organized", emoji: "📦" },
          { label: "Good Value", emoji: "💛" },
          { label: "In Stock", emoji: "✅" },
        ],
      },
      {
        ...SERVICE_PAGE,
        tags: [
          { label: "Friendly Staff", emoji: "😊" },
          { label: "Helpful", emoji: "🤝" },
          { label: "Knowledgeable", emoji: "💡" },
          { label: "Quick Checkout", emoji: "⚡" },
          { label: "No Pressure", emoji: "🌿" },
          { label: "Attentive", emoji: "👀" },
          { label: "Professional", emoji: "👔" },
          { label: "Welcoming", emoji: "🙌" },
        ],
      },
    ],
  },

  bar: {
    gradient: "linear-gradient(160deg, #2a1c2e 0%, #5a3a50 100%)",
    welcomeSubtitle: "Thanks for spending the evening with us. We'd love to hear about it.",
    surveyPages: [
      {
        title: "What did you enjoy?",
        subtitle: "Select all that apply",
        tags: [
          { label: "Great Drinks", emoji: "🍸" },
          { label: "Great Cocktails", emoji: "🍹" },
          { label: "Good Music", emoji: "🎶" },
          { label: "Lively Vibe", emoji: "🎉" },
          { label: "Tasty Food", emoji: "🍢" },
          { label: "Cozy Spot", emoji: "🛋️" },
          { label: "Good Value", emoji: "💛" },
          { label: "Fun Crowd", emoji: "🥳" },
        ],
      },
      SERVICE_PAGE,
    ],
  },

  default: {
    gradient: "linear-gradient(160deg, #2c2418 0%, #5c4a32 100%)",
    welcomeSubtitle: "Thank you for visiting us today. We'd love to hear about your experience.",
    surveyPages: [
      {
        title: "What stood out?",
        subtitle: "Select all that apply",
        tags: [
          { label: "Great Quality", emoji: "⭐" },
          { label: "Friendly Service", emoji: "😊" },
          { label: "Good Value", emoji: "💛" },
          { label: "Clean Space", emoji: "🧼" },
          { label: "Welcoming", emoji: "🙌" },
          { label: "Professional", emoji: "👔" },
          { label: "Quick", emoji: "⚡" },
          { label: "Attentive", emoji: "👀" },
        ],
      },
      SERVICE_PAGE,
    ],
  },
};

export function categoryConfig(category: string): CategoryConfig {
  return CONFIGS[category?.toLowerCase()] ?? CONFIGS.default;
}
