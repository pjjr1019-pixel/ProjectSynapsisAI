/**
 * Lightweight regex slot extraction for retrieval boosting (no ML).
 * Returns structured hints appended as synthetic query terms.
 */
export function extractSlots(text) {
  const t = String(text);
  const hints = [];

  const tickers = t.match(/\b([A-Z]{1,5})\b/g);
  if (tickers) {
    for (const x of tickers) {
      if (x.length >= 2 && x !== "AI" && x !== "OK") hints.push(`ticker_${x}`);
    }
  }

  const money = t.match(/\$?\d[\d,]*(?:\.\d+)?\s*(?:k|m|b|usd|dollars?)?/gi);
  if (money) hints.push("has_amount");

  if (/\b20\d{2}\b/.test(t)) hints.push("has_year");

  return [...new Set(hints)];
}
