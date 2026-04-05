import fs from "node:fs";
import path from "node:path";
import {
  WEBSTER_1913_CORPUS_ID,
  WEBSTER_1913_TITLE,
  compactDictionaryTerm,
  dictionaryLookupKeys,
  getWebster1913Paths,
  normalizeDictionaryTerm,
  readJsonlFile,
} from "./brain-dictionary-common.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";

const K1 = 1.2;
const B = 0.75;

/** @type {Map<string, { mtime: number, data: any }>} */
const jsonCache = new Map();
/** @type {Map<string, { mtime: number, rows: any[] }>} */
const shardCache = new Map();

function readJsonCached(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const stat = fs.statSync(filePath);
  const cached = jsonCache.get(filePath);
  if (cached && cached.mtime === stat.mtimeMs) return cached.data;
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  jsonCache.set(filePath, { mtime: stat.mtimeMs, data: parsed });
  return parsed;
}

function readShardCached(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const stat = fs.statSync(filePath);
  const cached = shardCache.get(filePath);
  if (cached && cached.mtime === stat.mtimeMs) return cached.rows;
  const rows = readJsonlFile(filePath);
  shardCache.set(filePath, { mtime: stat.mtimeMs, rows });
  return rows;
}

export function clearDictionaryCache() {
  jsonCache.clear();
  shardCache.clear();
}

export function getDictionaryPaths() {
  return getWebster1913Paths();
}

export function loadDictionaryHeadwordMap() {
  return readJsonCached(getDictionaryPaths().headwordMapFile) || {};
}

export function loadDictionaryAliasMap() {
  return readJsonCached(getDictionaryPaths().aliasMapFile) || {};
}

export function loadDictionaryBm25Artifact() {
  return readJsonCached(getDictionaryPaths().bm25File);
}

export function loadDictionaryArtifactManifest() {
  return readJsonCached(getDictionaryPaths().artifactManifestFile);
}

export function loadDictionaryEntryManifest() {
  return readJsonCached(getDictionaryPaths().entryManifestFile);
}

export function loadDictionaryStats() {
  return readJsonCached(getDictionaryPaths().statsFile);
}

export function loadDictionaryCorpusStats() {
  return readJsonCached(getDictionaryPaths().corpusStatsFile);
}

export function dictionaryArtifactsAvailable() {
  const manifest = loadDictionaryArtifactManifest();
  return !!manifest?.sourceHash;
}

export function loadDictionaryEntryById(entryId) {
  if (!entryId) return null;
  const paths = getDictionaryPaths();
  const manifest = loadDictionaryEntryManifest();
  const shardFile = manifest?.entryToShard?.[entryId];
  if (!shardFile) return null;
  const shardPath = path.join(paths.entriesRoot, shardFile);
  const rows = readShardCached(shardPath);
  return rows.find((row) => row.entryId === entryId) || null;
}

function loadDictionaryEntries(entryIds) {
  return (Array.isArray(entryIds) ? entryIds : []).map(loadDictionaryEntryById).filter(Boolean);
}

function compareDictionaryEntries(left, right) {
  const leftDefCount = Array.isArray(left?.definitions) ? left.definitions.length : 0;
  const rightDefCount = Array.isArray(right?.definitions) ? right.definitions.length : 0;
  if (rightDefCount !== leftDefCount) return rightDefCount - leftDefCount;
  const leftVariantCount = Array.isArray(left?.variants) ? left.variants.length : 0;
  const rightVariantCount = Array.isArray(right?.variants) ? right.variants.length : 0;
  if (rightVariantCount !== leftVariantCount) return rightVariantCount - leftVariantCount;
  return String(left?.entryId || "").localeCompare(String(right?.entryId || ""));
}

function chooseBestDictionaryEntry(entryIds) {
  const rows = loadDictionaryEntries(entryIds).sort(compareDictionaryEntries);
  return rows[0] || null;
}

function detectExplicitDictionaryTarget(message) {
  const raw = String(message ?? "").trim();
  if (!raw) return null;
  const patterns = [
    { mode: "define", regex: /^\s*define\s+(.+?)\s*[.?!]*$/i },
    { mode: "definition", regex: /^\s*definition of\s+(.+?)\s*[.?!]*$/i },
    { mode: "meaning", regex: /^\s*meaning of\s+(.+?)\s*[.?!]*$/i },
    { mode: "what-does-mean", regex: /^\s*what does\s+(.+?)\s+mean\s*[?!.]*$/i },
  ];
  for (const pattern of patterns) {
    const match = raw.match(pattern.regex);
    if (!match?.[1]) continue;
    return {
      active: true,
      mode: pattern.mode,
      lookupText: match[1].trim(),
    };
  }
  return null;
}

export function detectDictionaryIntent(message, normalizedQuery = "") {
  const explicit = detectExplicitDictionaryTarget(message);
  if (explicit) return explicit;

  const normalized = normalizeDictionaryTerm(message || normalizedQuery);
  const tokenCount = normalized ? normalized.split(" ").length : 0;
  if (!tokenCount) return { active: false, mode: "none", lookupText: "" };
  if (tokenCount === 1 && /^[a-z0-9]+$/.test(compactDictionaryTerm(normalized))) {
    return { active: true, mode: "single-token", lookupText: normalized };
  }
  return {
    active: false,
    mode: tokenCount === 2 ? "two-token-needs-exact" : "none",
    lookupText: normalized,
  };
}

function bm25Idf(term, N, df) {
  const docFrequency = Number(df?.[term] || 0);
  return Math.log(1 + (N - docFrequency + 0.5) / (docFrequency + 0.5));
}

export function rankDictionaryBm25Matches(queryText, opts = {}) {
  const bm25 = loadDictionaryBm25Artifact();
  if (!bm25?.N) return [];
  const queryTerms = tokenizeForRetrieval(normalizeDictionaryTerm(queryText));
  if (!queryTerms.length) return [];
  const scores = new Map();
  const matchedTerms = new Map();
  const avgdl = Number(bm25.avgdl || 1) || 1;
  for (const term of queryTerms) {
    const postings = Array.isArray(bm25.inverted?.[term]) ? bm25.inverted[term] : [];
    if (!postings.length) continue;
    const idf = bm25Idf(term, Number(bm25.N || 0), bm25.df || {});
    for (let index = 0; index < postings.length; index += 2) {
      const docIndex = postings[index];
      const tf = postings[index + 1];
      const docLength = Number(bm25.docLengths?.[docIndex] || 1);
      const contribution =
        (idf * (tf * (K1 + 1))) / (tf + K1 * (1 - B + (B * docLength) / avgdl));
      scores.set(docIndex, (scores.get(docIndex) || 0) + contribution);
      if (!matchedTerms.has(docIndex)) matchedTerms.set(docIndex, new Set());
      matchedTerms.get(docIndex).add(term);
    }
  }
  return [...scores.entries()]
    .sort((left, right) => right[1] - left[1] || left[0] - right[0])
    .slice(0, Math.max(1, Number(opts.limit || 5)))
    .map(([docIndex, score], rank, rows) => ({
      entryId: bm25.entryOrder?.[docIndex] || "",
      score,
      secondScore: rank === 0 ? rows[1]?.[1] || 0 : 0,
      matchedTerms: [...(matchedTerms.get(docIndex) || [])],
    }))
    .filter((row) => row.entryId);
}

function maybeEnableTwoTokenExact(intent, queryKeys) {
  if (intent.active || intent.mode !== "two-token-needs-exact") return intent;
  const headwordMap = loadDictionaryHeadwordMap();
  const aliasMap = loadDictionaryAliasMap();
  const exact = queryKeys.some((key) => headwordMap[key]?.length || aliasMap[key]?.length);
  return {
    active: exact,
    mode: exact ? "two-token-exact" : intent.mode,
    lookupText: intent.lookupText,
  };
}

export function lookupDictionaryMatch(message, normalizedQuery = "") {
  const baseIntent = detectDictionaryIntent(message, normalizedQuery);
  const queryText = baseIntent.lookupText || message || normalizedQuery;
  const queryKeys = dictionaryLookupKeys(queryText);
  const intent = maybeEnableTwoTokenExact(baseIntent, queryKeys);
  if (!intent.active) {
    return {
      enabled: false,
      intent,
      queryText,
      queryKeys,
      exactHeadwordEntry: null,
      exactAliasEntry: null,
      bm25Match: null,
      bestEntry: null,
      bestMatchType: "",
    };
  }

  const headwordMap = loadDictionaryHeadwordMap();
  const aliasMap = loadDictionaryAliasMap();

  let exactHeadwordEntry = null;
  let exactAliasEntry = null;
  for (const key of queryKeys) {
    if (!exactHeadwordEntry && Array.isArray(headwordMap[key]) && headwordMap[key].length) {
      exactHeadwordEntry = chooseBestDictionaryEntry(headwordMap[key]);
    }
    if (!exactAliasEntry && Array.isArray(aliasMap[key]) && aliasMap[key].length) {
      exactAliasEntry = chooseBestDictionaryEntry(aliasMap[key]);
    }
  }

  const bm25Ranked = rankDictionaryBm25Matches(queryText, { limit: 5 });
  const bm25Top = bm25Ranked[0] || null;
  const bm25Entry = bm25Top ? loadDictionaryEntryById(bm25Top.entryId) : null;

  return {
    enabled: true,
    intent,
    queryText,
    queryKeys,
    exactHeadwordEntry,
    exactAliasEntry,
    bm25Match: bm25Top && bm25Entry ? { ...bm25Top, entry: bm25Entry, ranked: bm25Ranked } : null,
    bestEntry: exactHeadwordEntry || exactAliasEntry || bm25Entry || null,
    bestMatchType: exactHeadwordEntry
      ? "exact_headword"
      : exactAliasEntry
        ? "exact_alias"
        : bm25Entry
          ? "bm25"
          : "",
  };
}

function truncateDictionaryLine(value, limit = 220) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trim()}...`;
}

export function formatDictionaryReply(entry, opts = {}) {
  if (!entry) return "";
  const definitions = (entry.definitions || []).filter(Boolean).slice(0, Math.max(1, opts.maxDefinitions || 3));
  const partOfSpeech = Array.isArray(entry.partOfSpeech) ? entry.partOfSpeech.join(", ") : "";
  const lines = [];
  lines.push(`Webster 1913 - ${entry.headword}${partOfSpeech ? ` (${partOfSpeech})` : ""}`);
  lines.push("");
  definitions.forEach((definition, index) => {
    lines.push(`${index + 1}. ${truncateDictionaryLine(definition, 260)}`);
  });
  if (entry.etymology) {
    lines.push("");
    lines.push(`Etymology: ${truncateDictionaryLine(entry.etymology, 200)}`);
  }
  lines.push("");
  lines.push(`Source: ${WEBSTER_1913_TITLE}`);
  return lines.join("\n").trim();
}

export function buildDictionaryTrace(match) {
  if (!match) {
    return {
      stage: "dictionary",
      enabled: false,
      intentMode: "none",
    };
  }
  return {
    stage: "dictionary",
    enabled: match.enabled === true,
    intentMode: match.intent?.mode || "none",
    queryText: match.queryText || "",
    queryKeys: match.queryKeys || [],
    exactHeadwordEntryId: match.exactHeadwordEntry?.entryId || "",
    exactAliasEntryId: match.exactAliasEntry?.entryId || "",
    bm25:
      match.bm25Match && match.bm25Match.entry
        ? {
            entryId: match.bm25Match.entry.entryId,
            score: match.bm25Match.score,
            secondScore: match.bm25Match.secondScore,
            matchedTerms: match.bm25Match.matchedTerms || [],
          }
        : null,
    selectedEntryId: match.bestEntry?.entryId || "",
    selectedMatchType: match.bestMatchType || "",
  };
}

export function getDictionarySourceLabel() {
  return `${WEBSTER_1913_TITLE} [${WEBSTER_1913_CORPUS_ID}]`;
}

