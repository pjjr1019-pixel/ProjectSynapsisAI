/** Shared tokenization for retrieval / BM25 builds. */
export const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "to",
  "of",
  "and",
  "or",
  "in",
  "for",
  "on",
  "with",
  "as",
  "at",
  "by",
  "this",
  "that",
  "it",
  "from",
  "what",
  "how",
  "when",
  "where",
  "who",
  "which",
  "can",
  "could",
  "would",
  "should",
  "do",
  "does",
  "did",
  "i",
  "you",
  "we",
  "they",
  "me",
  "my",
]);

/**
 * @param {string} s lowercased text
 * @returns {string[]}
 */
export function tokenizeForRetrieval(s) {
  return (s.toLowerCase().match(/\w{2,}/g) || []).filter((w) => !STOP_WORDS.has(w));
}
