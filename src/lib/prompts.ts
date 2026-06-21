/**
 * Compliant "assist, don't author" prompt sets (PRD C2/C3, §5).
 *
 * RULES BAKED IN:
 *  - Every prompt is an OPEN-ENDED question the customer answers in their OWN words.
 *  - No prompt asks for specific keywords, phrases, or named staff.
 *  - These are conversation starters only — the app never generates review text to paste.
 */
export const CATEGORY_PROMPTS: Record<string, string[]> = {
  restaurant: [
    "What dish stood out to you today?",
    "How was the atmosphere during your visit?",
    "What would you tell a friend about this place?",
  ],
  cafe: [
    "How was your drink or snack?",
    "What did you think of the space to sit and relax?",
    "What brought you in, and would you come back?",
  ],
  salon: [
    "How did you feel about the result of your visit?",
    "What was the experience like from start to finish?",
    "Is there anything that made today memorable?",
  ],
  retail: [
    "Did you find what you were looking for?",
    "How was the help you received while shopping?",
    "What would you want others to know about your visit?",
  ],
  default: [
    "What stood out about your visit today?",
    "How was your overall experience?",
    "What would you tell a friend about this place?",
  ],
};

export function promptsForCategory(category: string): string[] {
  return CATEGORY_PROMPTS[category] ?? CATEGORY_PROMPTS.default;
}
