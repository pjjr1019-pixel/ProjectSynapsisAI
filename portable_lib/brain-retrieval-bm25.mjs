/**
 * BM25 + inverted index over brain chunks (offline-built JSON).
 *
 * Default artifact: retrieval-bm25.json (repo-knowledge-pack profile build).
 * Optional whole-brain artifact: retrieval-bm25-full.json (e.g. dev-all-drafts profile).
 */
import fs from "node:fs";
import path from "node:path";
import { findChunkByChunkId, getRepoRoot, loadChunkText } from "./brain-retrieval.mjs";
import { expandQueryWithSemanticMap, loadProfileBm25Artifact } from "./brain-runtime-layer.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";

const K1 = 1.2;
const B = 0.75;

const FILE_DEFAULT = "retrieval-bm25.json";
const FILE_FULL = "retrieval-bm25-full.json";

/** @param {'default' | 'full'} scope */
function indexPathForScope(scope) {
  const name = scope === "full" ? FILE_FULL : FILE_DEFAULT;
  return path.join(getRepoRoot(), "brain", "apps", "assistant", "knowledge", "build", name);
}

/** @type {Map<string, { mtime: number, data: object }>} */
const cache = new Map();

let warnedFullMissing = false;

/**
 * @param {'default' | 'full'} [scope]
 */
export function bm25IndexFileExists(scope = "default") {
  return fs.existsSync(indexPathForScope(scope));
}

/**
 * @param {{ scope?: 'default' | 'full' } | 'default' | 'full'} [opts]
 */
export function loadBm25Index(opts = {}) {
  const scope =
    typeof opts === "string"
      ? opts === "full"
        ? "full"
        : "default"
      : opts?.scope === "full"
        ? "full"
        : "default";
  const p = indexPathForScope(scope);
  if (!fs.existsSync(p)) {
    if (scope === "full") {
      if (!warnedFullMissing) {
        console.warn(
          `[brain-retrieval-bm25] ${FILE_FULL} not found — use default BM25 index. Build: npm run brain:retrieval:build:full`
        );
        warnedFullMissing = true;
      }
      return loadBm25Index({ scope: "default" });
    }
    return null;
  }
  const st = fs.statSync(p);
  const key = p;
  const hit = cache.get(key);
  if (hit && hit.mtime === st.mtimeMs) return hit.data;
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  cache.set(key, { mtime: st.mtimeMs, data });
  return data;
}

function resolveScopeArg(arg) {
  if (arg && typeof arg === "object" && !Array.isArray(arg)) {
    return {
      scope: arg.scope === "full" ? "full" : "default",
      profileName: typeof arg.profileName === "string" ? arg.profileName : "",
    };
  }
  return {
    scope: "default",
    profileName: "",
  };
}

function idf(term, N, dfObj) {
  const df = dfObj[term] || 0;
  return Math.log(1 + (N - df + 0.5) / (df + 0.5));
}

/**
 * Rank only the user's own normalized query tokens by BM25 rarity/importance.
 * Expansion terms are intentionally excluded so "substantial words" stay grounded in what the user typed.
 *
 * @param {string} normalizedQuery
 * @param {{ scope?: 'default' | 'full', profileName?: string } | 'default' | 'full'} [scopeOrOpts]
 * @returns {{
 *   hasIndex: boolean,
 *   scope: 'default' | 'full',
 *   profileName: string,
 *   rankedTerms: { term: string, idf: number, documentFrequency: number, hasCorpusMatch: boolean }[],
 *   selectedTerms: string[],
 * }}
 */
export function rankQueryTermsByBm25Importance(normalizedQuery, scopeOrOpts) {
  const resolved = resolveScopeArg(scopeOrOpts);
  const runtimeProfileData = resolved.profileName
    ? loadProfileBm25Artifact(resolved.profileName)
    : null;
  const data = runtimeProfileData || loadBm25Index({ scope: resolved.scope });
  const rawTerms = tokenizeForRetrieval(normalizedQuery);
  const uniqueTerms = [];
  const seen = new Set();
  for (const term of rawTerms) {
    if (seen.has(term)) continue;
    seen.add(term);
    uniqueTerms.push(term);
  }
  const N = Number(data?.N || 0);
  const dfObj = data?.df || {};
  const inverted = data?.inverted || {};
  const rankedTerms = uniqueTerms
    .map((term, index) => {
      const documentFrequency = Number(dfObj?.[term] || 0);
      const hasCorpusMatch =
        documentFrequency > 0 || (Array.isArray(inverted?.[term]) && inverted[term].length > 0);
      return {
        term,
        idf: N ? idf(term, N, dfObj) : 0,
        documentFrequency,
        hasCorpusMatch,
        index,
      };
    })
    .sort((a, b) => {
      if (a.hasCorpusMatch !== b.hasCorpusMatch) return Number(b.hasCorpusMatch) - Number(a.hasCorpusMatch);
      if (b.idf !== a.idf) return b.idf - a.idf;
      return a.index - b.index;
    })
    .map(({ index, ...term }) => term);
  const selectedPool = rankedTerms.some((term) => term.hasCorpusMatch)
    ? rankedTerms.filter((term) => term.hasCorpusMatch)
    : rankedTerms;
  return {
    hasIndex: !!data,
    scope: resolved.scope,
    profileName: resolved.profileName || "",
    rankedTerms,
    selectedTerms: selectedPool.slice(0, 3).map((term) => term.term),
  };
}

function bm25Score(queryTerms, chunkIdx, data) {
  const { N, avgdl, tfs, df, chunkConfidences } = data;
  const tf = tfs[chunkIdx];
  if (!tf) return 0;
  let dl = 0;
  for (const c of Object.values(tf)) dl += c;
  const conf = chunkConfidences[chunkIdx] ?? 0.5;
  let score = 0;
  for (const q of queryTerms) {
    const f = tf[q] || 0;
    if (!f) continue;
    const idfq = idf(q, N, df);
    score += (idfq * (f * (K1 + 1))) / (f + K1 * (1 - B + (B * dl) / avgdl));
  }
  return score * (0.55 + 0.45 * Math.min(1, conf));
}

/**
 * @param {string} normalizedQuery
 * @param {string[]} extraTerms — slot hints etc.
 * @param {{ scope?: 'default' | 'full' } | 'default' | 'full'} [scopeOrOpts]
 * @returns {{ chunkId: string, score: number, secondScore: number } | null}
 */
export function bestBm25Chunk(normalizedQuery, extraTerms = [], scopeOrOpts) {
  const resolved = resolveScopeArg(scopeOrOpts);
  const runtimeProfileData = resolved.profileName
    ? loadProfileBm25Artifact(resolved.profileName)
    : null;
  const data = runtimeProfileData || loadBm25Index({ scope: resolved.scope });
  if (!data || !data.N) return null;

  const expansion = resolved.profileName
    ? expandQueryWithSemanticMap(normalizedQuery, resolved.profileName)
    : {
        expandedTerms: tokenizeForRetrieval(normalizedQuery),
        aliasHits: [],
        synonymHits: [],
      };
  const terms = [...new Set([...expansion.expandedTerms, ...extraTerms])];
  if (!terms.length) return null;

  const inverted = data.inverted || {};
  /** @type {Set<number>} */
  const cand = new Set();
  for (const t of terms) {
    const arr = inverted[t];
    if (arr) for (const i of arr) cand.add(i);
  }

  let indices = cand.size ? [...cand] : data.chunkOrder.map((_, i) => i);
  if (indices.length > 400) indices = indices.slice(0, 400);

  const scored = [];
  for (const i of indices) {
    const s = bm25Score(terms, i, data);
    if (s > 0) scored.push({ i, s });
  }
  if (!scored.length && cand.size) {
    for (let i = 0; i < data.chunkOrder.length; i++) {
      const s = bm25Score(terms, i, data);
      if (s > 0) scored.push({ i, s });
    }
  }
  scored.sort((a, b) => b.s - a.s);
  const best = scored[0];
  if (!best) return null;
  const chunkId = data.chunkOrder[best.i];
  const tf = data.tfs?.[best.i] || {};
  return {
    chunkId,
    score: best.s,
    secondScore: scored[1]?.s ?? 0,
    explain: {
      expandedTerms: terms,
      aliasHits: expansion.aliasHits,
      synonymHits: expansion.synonymHits,
      matchedTerms: terms.filter((term) => Object.prototype.hasOwnProperty.call(tf, term)),
    },
  };
}

/**
 * All chunk BM25 scores (for hybrid fusion). Sorted by score descending.
 * @param {string} normalizedQuery
 * @param {string[]} extraTerms
 * @param {{ scope?: 'default' | 'full' } | 'default' | 'full'} [scopeOrOpts]
 * @returns {{ data: object, ranked: { chunkIndex: number, chunkId: string, score: number }[] } | null}
 */
export function rankedBm25Scores(normalizedQuery, extraTerms = [], scopeOrOpts) {
  const resolved = resolveScopeArg(scopeOrOpts);
  const runtimeProfileData = resolved.profileName
    ? loadProfileBm25Artifact(resolved.profileName)
    : null;
  const data = runtimeProfileData || loadBm25Index({ scope: resolved.scope });
  if (!data || !data.N) return null;
  const expansion = resolved.profileName
    ? expandQueryWithSemanticMap(normalizedQuery, resolved.profileName)
    : {
        expandedTerms: tokenizeForRetrieval(normalizedQuery),
        aliasHits: [],
        synonymHits: [],
      };
  const terms = [...new Set([...expansion.expandedTerms, ...extraTerms])];
  if (!terms.length) return null;
  const ranked = [];
  for (let i = 0; i < data.chunkOrder.length; i++) {
    const s = bm25Score(terms, i, data);
    const tf = data.tfs?.[i] || {};
    ranked.push({
      chunkIndex: i,
      chunkId: data.chunkOrder[i],
      score: s,
      explain: {
        matchedTerms: terms.filter((term) => Object.prototype.hasOwnProperty.call(tf, term)),
      },
    });
  }
  ranked.sort((a, b) => b.score - a.score);
  return {
    data,
    ranked,
    explain: {
      expandedTerms: terms,
      aliasHits: expansion.aliasHits,
      synonymHits: expansion.synonymHits,
    },
  };
}

/**
 * @param {{ chunkId: string }} result
 * @returns {string | null}
 */
export function loadTextForBm25Chunk(result) {
  if (!result?.chunkId) return null;
  const ch = findChunkByChunkId(result.chunkId);
  if (!ch) return null;
  return loadChunkText(ch);
}
