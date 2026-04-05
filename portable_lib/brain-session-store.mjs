/** In-memory session hints for follow-up turns (per chat session id). */

/**
 * @typedef {{ role: 'user' | 'assistant', content: string }} ConversationTurn
 * @typedef {{
 *   lastNormalized: string | null,
 *   lastSource: string | null,
 *   lastAssistantText: string | null,
 *   turnSeq: number,
 *   conversationHistory: ConversationTurn[],
 *   lastActionResult: string | null,
 *   lastRunId: string | null,
 * }} SessionEntry
 */

/** @type {Map<string, SessionEntry>} */
const store = new Map();
const MAX_SESSIONS = 5000;
const MAX_HISTORY_TURNS = 10;
const MAX_TURN_LENGTH = 4000;

/** @param {string | undefined} sessionId */
function blankEntry() {
  return {
    lastNormalized: null,
    lastSource: null,
    lastAssistantText: null,
    turnSeq: 0,
    conversationHistory: [],
    lastActionResult: null,
    lastRunId: null,
  };
}

/**
 * @param {string | undefined} sessionId
 * @returns {SessionEntry}
 */
export function getSessionHints(sessionId) {
  if (!sessionId) return blankEntry();
  return store.get(sessionId) || blankEntry();
}

/**
 * @param {string | undefined} sessionId
 * @param {Partial<SessionEntry>} patch
 */
export function updateSessionHints(sessionId, patch) {
  if (!sessionId) return;
  if (store.size > MAX_SESSIONS) {
    const first = store.keys().next().value;
    store.delete(first);
  }
  const prev = getSessionHints(sessionId);
  store.set(sessionId, { ...prev, ...patch });
}

/**
 * Record the last assistant message for anti-duplicate paraphrasing and review logs.
 * @param {string | undefined} sessionId
 * @param {string} text
 */
export function recordAssistantReply(sessionId, text) {
  if (!sessionId) return;
  const prev = getSessionHints(sessionId);
  const turnSeq = (prev.turnSeq || 0) + 1;
  store.set(sessionId, {
    ...prev,
    lastAssistantText: String(text ?? "").slice(0, 120_000),
    turnSeq,
  });
}

/**
 * Append a user turn to the conversation history.
 * @param {string | undefined} sessionId
 * @param {string} text
 */
export function recordUserTurn(sessionId, text) {
  if (!sessionId || !text) return;
  const prev = getSessionHints(sessionId);
  const history = [...prev.conversationHistory, { role: "user", content: String(text).slice(0, MAX_TURN_LENGTH) }];
  if (history.length > MAX_HISTORY_TURNS) history.splice(0, history.length - MAX_HISTORY_TURNS);
  updateSessionHints(sessionId, { conversationHistory: history });
}

/**
 * Append an assistant turn to the conversation history.
 * @param {string | undefined} sessionId
 * @param {string} text
 */
export function recordAssistantTurn(sessionId, text) {
  if (!sessionId || !text) return;
  const prev = getSessionHints(sessionId);
  const history = [...prev.conversationHistory, { role: "assistant", content: String(text).slice(0, MAX_TURN_LENGTH) }];
  if (history.length > MAX_HISTORY_TURNS) history.splice(0, history.length - MAX_HISTORY_TURNS);
  updateSessionHints(sessionId, { conversationHistory: history });
}

/**
 * Return the conversation history as OpenAI-compatible message objects.
 * @param {string | undefined} sessionId
 * @returns {ConversationTurn[]}
 */
export function getConversationHistory(sessionId) {
  return getSessionHints(sessionId).conversationHistory;
}
