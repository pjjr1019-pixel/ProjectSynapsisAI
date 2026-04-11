export const DEFAULT_CONTEXT_BUDGET = {
    maxChars: 6000,
    maxStableMemories: 4,
    maxRetrievedMemories: 6,
    maxRecentMessages: 10
};
export const MAX_WEB_RESULTS_IN_PROMPT = 4;
export const clipByChars = (text, maxChars) => text.length <= maxChars ? text : `${text.slice(0, maxChars - 3)}...`;
