/**
 * Ultra-short exact-match replies (one-line pleasantries and help).
 * Used when the scenario index is missing or before AC lookup when no local LLM runs
 * (see brain-chat-reply.mjs). Keep this list small: broader “common AI” intents live in
 * brain/apps/assistant/knowledge/scenarios/sources/00-core-common-intents.jsonl (merged
 * first into scenario-index.json). Strings here intentionally align with those flows.
 */

const BASE_GREET =
  "Hi — I'm Horizons AI. I can help with the launcher, your apps (Assistant, Financial, Work, Social, Life, Intel), and general questions. Say **help** anytime.";

const BASE_HELP =
  "Horizons AI is your shell assistant: open apps from the grid, run focused chats per surface, and pull answers from the **brain** knowledge base. Try naming a surface (e.g. Financial, Social) in your message.";

const BASE_KNOWLEDGE =
  "Without Local AI, I still answer from a few built-in paths: **scripted intents** (e.g. **help**, hi), the **Horizons brain** (indexed knowledge — stronger when you name an area like Work or Financial), a **calculator** for math and short phrases like “add 10 to 30,” and **saved Q&A** from past turns when Local AI had stored them. If nothing matches well, I ask you to name an area or say **help**. Turn **Local AI** on for open-ended questions from your machine.";

const BASE_THANKS = "You're welcome — glad to help. Ask anything else when you're ready.";
const BASE_BYE = "Goodbye — I'll be here when you come back.";
const BASE_OK = "Sounds good. Tell me what you'd like to do next.";

const EXACT = new Map([
  ["hi", BASE_GREET],
  ["hey", BASE_GREET],
  ["hello", BASE_GREET],
  ["yo", BASE_GREET],
  ["sup", BASE_GREET],
  ["hiya", BASE_GREET],
  ["help", BASE_HELP],
  ["what can you do", BASE_HELP],
  ["what do you do", BASE_HELP],
  ["capabilities", BASE_HELP],
  ["how does this work", BASE_HELP],
  ["what do you know", BASE_KNOWLEDGE],
  ["what do u know", BASE_KNOWLEDGE],
  ["what can you tell me", BASE_KNOWLEDGE],
  ["tell me what you know", BASE_KNOWLEDGE],
  ["what information do you have", BASE_KNOWLEDGE],
  ["what are you based on", BASE_KNOWLEDGE],
  ["thanks", BASE_THANKS],
  ["thank you", BASE_THANKS],
  ["thx", BASE_THANKS],
  ["ty", BASE_THANKS],
  ["bye", BASE_BYE],
  ["goodbye", BASE_BYE],
  ["see you", BASE_BYE],
  ["later", BASE_BYE],
  ["cya", BASE_BYE],
  ["ok", BASE_OK],
  ["okay", BASE_OK],
  ["k", BASE_OK],
  ["sure", BASE_OK],
  ["got it", BASE_OK],
]);

/** Keys used for exact match after {@link normalizeForQuickIntent}. */
export const QUICK_INTENT_KEYS = new Set(EXACT.keys());

/**
 * Match quick intents even when the UI sends odd Unicode or invisible characters.
 * @param {string} s
 */
export function normalizeForQuickIntent(s) {
  return String(s ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * @param {string} normalized — output of {@link prepareUserQuery} (or same shape)
 * @returns {string | null}
 */
export function tryQuickGreeting(normalized) {
  const t = normalizeForQuickIntent(normalized);
  if (!t) return null;
  return EXACT.get(t) ?? null;
}
