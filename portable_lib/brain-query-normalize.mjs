/**
 * Normalize user text for matching: spacing, fillers, optional synonym expansion.
 */
import fs from "node:fs";
import path from "node:path";
import { getRepoRoot } from "./brain-retrieval.mjs";
import { expandQueryWithSemanticMap, loadRuntimeSynonyms } from "./brain-runtime-layer.mjs";

const FILLER_RE =
  /^(?:um+|uh+|er+|ah+|like|so|well|ok(?:ay)?|please)[,.\s]+/gi;

/** @type {{ mtime: number, map: Map<string, string> } | null} */
let synCache = null;

function synonymsPath() {
  return path.join(
    getRepoRoot(),
    "brain",
    "apps",
    "assistant",
    "knowledge",
    "synonyms.json"
  );
}

export function loadSynonymMap() {
  const runtime = loadRuntimeSynonyms();
  if (runtime?.synonyms && typeof runtime.synonyms === "object") {
    const map = new Map();
    for (const [k, v] of Object.entries(runtime.synonyms)) {
      if (typeof v !== "string") continue;
      map.set(String(k).toLowerCase(), v.toLowerCase());
    }
    return map;
  }
  const p = synonymsPath();
  if (!fs.existsSync(p)) return new Map();
  const st = fs.statSync(p);
  if (synCache && synCache.mtime === st.mtimeMs) return synCache.map;
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  const map = new Map();
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("$") || typeof v !== "string") continue;
    map.set(String(k).toLowerCase(), v.toLowerCase());
  }
  synCache = { mtime: st.mtimeMs, map };
  return map;
}

/**
 * Collapse whitespace, trim, lowercase; strip leading fillers once.
 */
export function normalizeWhitespace(raw) {
  let s = String(raw).trim().replace(/\s+/g, " ");
  s = s.replace(FILLER_RE, "").trim();
  return s.toLowerCase();
}

/**
 * Apply word-level synonym map (whole-token replacement).
 */
export function applySynonyms(normalized, map) {
  if (!map || map.size === 0) return normalized;
  return normalized.replace(/[a-z0-9]+/gi, (w) => map.get(w.toLowerCase()) || w);
}

/**
 * @param {string} raw
 * @param {{ profileName?: string }} [opts]
 * @returns {{
 *   normalized: string,
 *   display: string,
 *   expandedTerms?: string[],
 *   expandedQuery?: string,
 *   aliasHits?: { term: string, expandsTo: string }[],
 *   synonymHits?: { term: string, expandsTo: string }[],
 * }}
 */
export function prepareUserQuery(raw, opts = {}) {
  const display = String(raw).trim();
  const map = loadSynonymMap();
  let normalized = normalizeWhitespace(display);
  normalized = applySynonyms(normalized, map);
  normalized = normalizeWhitespace(normalized);
  if (!opts.profileName) {
    return { normalized, display };
  }
  const expanded = expandQueryWithSemanticMap(normalized, opts.profileName);
  return {
    normalized,
    display,
    expandedTerms: expanded.expandedTerms,
    expandedQuery: expanded.expandedQuery,
    aliasHits: expanded.aliasHits,
    synonymHits: expanded.synonymHits,
  };
}
