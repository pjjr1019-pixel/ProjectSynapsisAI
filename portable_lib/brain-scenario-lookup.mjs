/**
 * Fast offline scenario lookup using Aho–Corasick + tie-breaking.
 * Loads brain/apps/assistant/knowledge/scenarios/build/scenario-index.json
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { getRepoRoot } from "./brain-retrieval.mjs";
import {
  expandQueryWithSemanticMap,
  loadProfileScenarioMap,
  loadRuntimeScenarioLookup,
} from "./brain-runtime-layer.mjs";

const require = createRequire(import.meta.url);
const AhoCorasick = require("aho-corasick");

const SHORT_TRIGGER_MAX = 3;

function scenarioIndexPath() {
  return path.join(
    getRepoRoot(),
    "brain",
    "apps",
    "assistant",
    "knowledge",
    "scenarios",
    "build",
    "scenario-index.json"
  );
}

/** @type {{ mtime: number, index: object, automaton: object, entries: object[] } | null} */
/** @type {Map<string, { key: string, index: object, automaton: object, entries: object[] }>} */
const cache = new Map();

function isWordChar(c) {
  return /[a-z0-9]/i.test(c);
}

/**
 * Avoid short triggers matching inside longer words (e.g. "hi" in "this").
 * @param {string} text — normalized message
 * @param {number} start — match start index
 * @param {number} len — match length
 */
export function shortTriggerBoundaryOk(text, start, len) {
  const before = start > 0 ? text[start - 1] : " ";
  const after = start + len < text.length ? text[start + len] : " ";
  return !isWordChar(before) && !isWordChar(after);
}

export function loadScenarioIndexPayload(opts = {}) {
  const profileName =
    opts && typeof opts === "object" && typeof opts.profileName === "string"
      ? opts.profileName
      : "";
  const runtimeIndex = profileName
    ? loadProfileScenarioMap(profileName) || loadRuntimeScenarioLookup()
    : loadRuntimeScenarioLookup();
  if (runtimeIndex?.entries?.length) {
    const cacheKey = `${profileName || "global"}:${runtimeIndex.builtAt || "runtime"}`;
    const hit = cache.get(cacheKey);
    if (hit) return hit;
    const ac = new AhoCorasick();
    const entries = Array.isArray(runtimeIndex.entries) ? runtimeIndex.entries : [];
    for (let i = 0; i < entries.length; i++) {
      const t = entries[i].trigger;
      if (t) ac.add(t, i);
    }
    ac.build_fail();
    const next = { key: cacheKey, index: runtimeIndex, automaton: ac, entries };
    cache.set(cacheKey, next);
    return next;
  }
  const p = scenarioIndexPath();
  if (!fs.existsSync(p)) {
    return null;
  }
  const st = fs.statSync(p);
  const cacheKey = `legacy:${st.mtimeMs}`;
  const legacyHit = cache.get(cacheKey);
  if (legacyHit) {
    return legacyHit;
  }
  const raw = fs.readFileSync(p, "utf8");
  const index = JSON.parse(raw);
  const entries = Array.isArray(index.entries) ? index.entries : [];

  const ac = new AhoCorasick();
  for (let i = 0; i < entries.length; i++) {
    const t = entries[i].trigger;
    if (t) ac.add(t, i);
  }
  ac.build_fail();

  const next = { key: cacheKey, index, automaton: ac, entries };
  cache.set(cacheKey, next);
  return next;
}

/**
 * Compare two candidates: exact full-message match, then longest trigger, priority, rowId.
 * @param {object} a
 * @param {object} b
 * @param {string} normalized
 */
function compareCandidates(a, b, normalized) {
  const exA = normalized === a.e.trigger ? 1 : 0;
  const exB = normalized === b.e.trigger ? 1 : 0;
  if (exA !== exB) return exB - exA;
  const modeA = a.queryMode === "original" ? 1 : 0;
  const modeB = b.queryMode === "original" ? 1 : 0;
  if (modeA !== modeB) return modeB - modeA;
  const lenA = a.e.trigger.length;
  const lenB = b.e.trigger.length;
  if (lenA !== lenB) return lenB - lenA;
  const pA = Number(a.e.priority) || 0;
  const pB = Number(b.e.priority) || 0;
  if (pA !== pB) return pB - pA;
  return String(a.e.rowId).localeCompare(String(b.e.rowId));
}

function scenarioCandidateScore(candidate, normalized) {
  const exact = normalized === candidate.e.trigger ? 1 : 0;
  const original = candidate.queryMode === "original" ? 1 : 0;
  const triggerCoverage = Math.min(1, candidate.e.trigger.length / Math.max(1, normalized.length));
  const priority = Math.max(0, Number(candidate.e.priority) || 0);
  return exact * 0.5 + original * 0.15 + triggerCoverage * 0.25 + Math.min(0.1, priority * 0.02);
}

export function lookupScenarioCandidates(message, opts = {}) {
  const trimmed = message.trim();
  if (!trimmed) return [];
  const normalized = trimmed.toLowerCase();

  const loaded = loadScenarioIndexPayload(opts);
  if (!loaded) return [];

  const { automaton, entries, index } = loaded;
  const responses = index.responseByRowId || {};
  const expansion =
    opts?.profileName ? expandQueryWithSemanticMap(normalized, opts.profileName) : null;
  const queryModes = [
    { text: normalized, queryMode: "original" },
    ...(expansion?.expandedQuery && expansion.expandedQuery !== normalized
      ? [{ text: expansion.expandedQuery, queryMode: "expanded" }]
      : []),
  ];

  /** @type {object[]} */
  const candidates = [];

  for (const queryMode of queryModes) {
    automaton.search(queryMode.text, (foundWord, dataArr, offset) => {
      const dataList = Array.isArray(dataArr) ? dataArr : [dataArr];
      for (const idx of dataList) {
        const e = entries[idx];
        if (!e) continue;
        const len = foundWord.length;
        if (e.trigger.length <= SHORT_TRIGGER_MAX) {
          if (!shortTriggerBoundaryOk(queryMode.text, offset, len)) continue;
        }
        candidates.push({ e, offset, foundWord, queryMode: queryMode.queryMode });
      }
    });
  }

  if (!candidates.length) return [];

  candidates.sort((a, b) => compareCandidates(a, b, normalized));
  const excludeByRowId = index.excludeByRowId || {};
  const ranked = [];
  for (const cand of candidates) {
    const rowId = cand.e.rowId;
    const ex = excludeByRowId[rowId];
    if (Array.isArray(ex) && ex.length && ex.some((sub) => normalized.includes(sub))) {
      continue;
    }
    const reply = responses[rowId];
    if (typeof reply !== "string" || !reply.trim()) continue;
    ranked.push({
      reply: reply.trim(),
      rowId,
      trigger: cand.e.trigger,
      path: cand.e.path || "",
      sourceType: cand.e.sourceType || "canonical",
      score: scenarioCandidateScore(cand, normalized),
      explain: {
        stage: "scenario",
        queryMode: cand.queryMode,
        aliasHits: expansion?.aliasHits || [],
        synonymHits: expansion?.synonymHits || [],
        offset: cand.offset,
        matchedTrigger: cand.foundWord,
      },
    });
  }
  const limit = Math.max(1, Math.floor(opts.limit ?? 8));
  return ranked.slice(0, limit);
}

/**
 * @param {string} message
 * @param {{ profileName?: string }} [opts]
 * @returns {{ reply: string, rowId: string, trigger: string, explain: object } | null}
 */
export function lookupScenarioMatch(message, opts = {}) {
  const candidate = lookupScenarioCandidates(message, { ...opts, limit: 1 })[0];
  if (!candidate) return null;
  return {
    reply: candidate.reply,
    rowId: candidate.rowId,
    trigger: candidate.trigger,
    explain: candidate.explain,
  };
}

/**
 * @param {string} message
 * @param {{ profileName?: string }} [opts]
 * @returns {string | null}
 */
export function lookupScenario(message, opts = {}) {
  return lookupScenarioMatch(message, opts)?.reply || null;
}

/**
 * @param {string} normalized
 * @param {object} index
 */
export function isScenarioExcluded(normalized, rowId, index) {
  const ex = index?.excludeByRowId?.[rowId];
  if (!Array.isArray(ex) || !ex.length) return false;
  return ex.some((sub) => normalized.includes(sub));
}
