import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";

function shouldUseHyde(query) {
  const tokens = tokenizeForRetrieval(query);
  if (tokens.length < 4) return false;
  if (tokens.length > 8) return true;
  return /\b(?:how|why|compare|difference|workflow|policy|features?|capabilities?)\b/i.test(
    String(query ?? "")
  );
}

function buildHeuristicPassage(query) {
  const clean = String(query ?? "").trim().replace(/[?.!]+$/g, "");
  return `Horizons knowledge that answers "${clean}" would describe the relevant workflows, features, policies, constraints, and supporting source material for that topic.`;
}

export function expandQueryWithHyde(normalizedQuery, opts = {}) {
  const enabled =
    typeof opts.enabled === "boolean"
      ? opts.enabled
      : String(process.env.HORIZONS_BRAIN_QUERY_EXPAND ?? "1").toLowerCase() !== "0";
  if (!enabled) {
    return {
      enabled: false,
      strategy: "off",
      original: normalizedQuery,
      hypothetical: "",
      variants: [normalizedQuery],
    };
  }
  if (!shouldUseHyde(normalizedQuery)) {
    return {
      enabled: true,
      strategy: "heuristic-skip",
      original: normalizedQuery,
      hypothetical: "",
      variants: [normalizedQuery],
    };
  }
  const hypothetical = buildHeuristicPassage(normalizedQuery);
  return {
    enabled: true,
    strategy: "heuristic-hyde",
    original: normalizedQuery,
    hypothetical,
    variants: [normalizedQuery, hypothetical],
  };
}
