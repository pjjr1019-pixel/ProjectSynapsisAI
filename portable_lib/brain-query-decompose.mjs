import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";

function cleanVariant(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[,;:-]+/, "")
    .replace(/[,;:-]+$/, "");
}

function splitByConnectors(normalizedQuery) {
  const lower = String(normalizedQuery ?? "").trim();
  if (!lower) return [];
  const connectors = /\s+(?:and|plus|vs|versus)\s+|,\s*/i;
  const parts = lower
    .split(connectors)
    .map((part) => cleanVariant(part))
    .filter((part) => tokenizeForRetrieval(part).length >= 2);
  return [...new Set(parts)].slice(0, 3);
}

export function decomposeQuery(normalizedQuery, opts = {}) {
  const enabled =
    typeof opts.enabled === "boolean"
      ? opts.enabled
      : String(process.env.HORIZONS_BRAIN_QUERY_DECOMPOSE ?? "1").toLowerCase() !== "0";
  const tokens = tokenizeForRetrieval(normalizedQuery);
  const complexityScore =
    Math.min(1, tokens.length / 14) +
    (/\b(?:compare|difference|versus|vs|and)\b/i.test(String(normalizedQuery ?? "")) ? 0.35 : 0);
  if (!enabled || complexityScore < 0.55) {
    return {
      enabled,
      complexityScore,
      strategy: "skip",
      subqueries: [],
      variants: [normalizedQuery],
    };
  }
  const subqueries = splitByConnectors(normalizedQuery);
  if (!subqueries.length) {
    return {
      enabled,
      complexityScore,
      strategy: "skip",
      subqueries: [],
      variants: [normalizedQuery],
    };
  }
  return {
    enabled,
    complexityScore,
    strategy: "connector-split",
    subqueries,
    variants: [normalizedQuery, ...subqueries],
  };
}
