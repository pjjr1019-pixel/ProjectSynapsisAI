/**
 * Bounded fuzzy match for single-token triggers (edit distance <= 1) when AC misses.
 */
import { isScenarioExcluded, loadScenarioIndexPayload } from "./brain-scenario-lookup.mjs";

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  /** @type {number[]} */
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[n];
}

/**
 * @param {string} normalized
 * @returns {string | null}
 */
export function lookupScenarioFuzzy(normalized) {
  const loaded = loadScenarioIndexPayload();
  if (!loaded) return null;
  const { entries, index } = loaded;
  const responses = index.responseByRowId || {};
  const words = normalized.match(/[a-z0-9]+/g) || [];

  for (const e of entries) {
    if (e.trigger.includes(" ")) continue;
    const tl = e.trigger.length;
    if (tl < 4 || tl > 14) continue;
    for (const w of words) {
      if (w.length < 4 || w.length > 14) continue;
      if (Math.abs(w.length - tl) > 1) continue;
      if (levenshtein(w, e.trigger) > 1) continue;
      const rowId = e.rowId;
      if (isScenarioExcluded(normalized, rowId, index)) continue;
      const reply = responses[rowId];
      if (typeof reply === "string" && reply.trim()) return reply.trim();
    }
  }
  return null;
}
