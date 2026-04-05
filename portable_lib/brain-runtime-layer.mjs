import fs from "node:fs";
import path from "node:path";
import {
  BRAIN_RUNTIME_BUILD_VERSION,
  BRAIN_RUNTIME_SCHEMA_VERSION,
  normalizeSlashes,
  sha256File,
  uniqueSorted,
} from "./brain-build-utils.mjs";
import {
  dictionaryArtifactsAvailable,
  loadDictionaryArtifactManifest,
  loadDictionaryBm25Artifact,
  loadDictionaryHeadwordMap,
  loadDictionaryAliasMap,
  loadDictionaryStats,
} from "./brain-dictionary.mjs";
import { normalizeProfileDefinition } from "./brain-ir-contracts.mjs";
import { getTaskmanagerPaths, resolveExistingPath } from "./taskmanager-paths.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";

const taskmanagerPaths = getTaskmanagerPaths();
const repoRoot = taskmanagerPaths.taskmanagerRoot;
const brainRoot = taskmanagerPaths.brain.root;
const retrievalRoot = taskmanagerPaths.brain.retrieval.root;
const indexesRoot = taskmanagerPaths.brain.retrieval.indexesRoot;
const profilesPath = taskmanagerPaths.brain.retrieval.profilesFile;

/** @type {Map<string, { mtime: number, data: any }>} */
const jsonCache = new Map();

function readJsonCached(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const st = fs.statSync(filePath);
  const hit = jsonCache.get(filePath);
  if (hit && hit.mtime === st.mtimeMs) return hit.data;
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  jsonCache.set(filePath, { mtime: st.mtimeMs, data });
  return data;
}

export function clearBrainRuntimeCache() {
  jsonCache.clear();
}

export function getBrainRuntimeRoot() {
  return brainRoot;
}

export function getBrainRuntimeIndexesRoot() {
  return indexesRoot;
}

export function getBrainRuntimePaths() {
  const generatedRetrieval = taskmanagerPaths.brain.generated.retrieval;
  return {
    repoRoot,
    brainRoot,
    retrievalRoot,
    indexesRoot,
    runtimeManifest: taskmanagerPaths.brain.retrieval.runtimeManifestFile,
    previousRuntimeManifest: taskmanagerPaths.brain.retrieval.previousRuntimeManifestFile,
    runtimeDiagnostics: taskmanagerPaths.brain.retrieval.runtimeDiagnosticsFile,
    aliases: taskmanagerPaths.brain.retrieval.aliasesFile,
    synonyms: taskmanagerPaths.brain.retrieval.synonymsFile,
    semanticMap: taskmanagerPaths.brain.retrieval.semanticMapFile,
    compactFacts: taskmanagerPaths.brain.retrieval.compactFactsFile,
    scenarioLookup: taskmanagerPaths.brain.retrieval.scenarioLookupFile,
    responsePriors: taskmanagerPaths.brain.retrieval.responsePriorsFile,
    promptPack: taskmanagerPaths.brain.retrieval.promptPackFile,
    densePilotManifest: taskmanagerPaths.brain.retrieval.densePilotManifestFile,
    lancedbRoot: resolveExistingPath(generatedRetrieval.lancedbRoot, [
      generatedRetrieval.legacyLancedbRoot,
    ]),
    contradictionReport: taskmanagerPaths.brain.retrieval.contradictionReportFile,
    normalizedDocsRoot: resolveExistingPath(generatedRetrieval.normalizedDocsRoot, [
      generatedRetrieval.legacyNormalizedDocsRoot,
    ]),
    evalsRoot: path.join(indexesRoot, "evals"),
    evalHistoryRoot: resolveExistingPath(generatedRetrieval.evalHistoryRoot, [
      generatedRetrieval.legacyEvalHistoryRoot,
    ]),
    generatedEvalsRoot: path.join(brainRoot, "evals", "generated"),
    contextPacksRoot: resolveExistingPath(generatedRetrieval.contextPacksRoot, [
      generatedRetrieval.legacyContextPacksRoot,
    ]),
    profilesPath,
  };
}

function profileArtifactPath(profileName, fileName) {
  return path.join(indexesRoot, "profiles", profileName, fileName);
}

export function loadRuntimeManifest() {
  return readJsonCached(getBrainRuntimePaths().runtimeManifest);
}

export function loadPreviousRuntimeManifest() {
  return readJsonCached(getBrainRuntimePaths().previousRuntimeManifest);
}

export function loadRuntimeDiagnostics() {
  return readJsonCached(getBrainRuntimePaths().runtimeDiagnostics);
}

export function loadRuntimeAliases() {
  return readJsonCached(getBrainRuntimePaths().aliases);
}

export function loadRuntimeSynonyms() {
  return readJsonCached(getBrainRuntimePaths().synonyms);
}

export function loadRuntimeSemanticMap() {
  return readJsonCached(getBrainRuntimePaths().semanticMap);
}

export function loadRuntimeCompactFacts() {
  return readJsonCached(getBrainRuntimePaths().compactFacts);
}

export function loadRuntimeScenarioLookup() {
  return readJsonCached(getBrainRuntimePaths().scenarioLookup);
}

export function loadRuntimeResponsePriors() {
  return readJsonCached(getBrainRuntimePaths().responsePriors);
}

export function loadRuntimePromptPack() {
  return readJsonCached(getBrainRuntimePaths().promptPack);
}

export function loadProfileRetrievalMap(profileName) {
  return readJsonCached(profileArtifactPath(profileName, "retrieval-map.json"));
}

export function loadProfileScenarioMap(profileName) {
  return readJsonCached(profileArtifactPath(profileName, "scenario-map.json"));
}

export function loadProfileSummaryPack(profileName) {
  return readJsonCached(profileArtifactPath(profileName, "summary-pack.json"));
}

export function loadProfileBm25Artifact(profileName) {
  return readJsonCached(profileArtifactPath(profileName, "bm25.json"));
}

export function getProfileArtifactPath(profileName, fileName) {
  return profileArtifactPath(profileName, fileName);
}

export function loadNormalizedDoc(docId) {
  return readJsonCached(path.join(getBrainRuntimePaths().normalizedDocsRoot, `${docId}.json`));
}

export function loadAllNormalizedDocs() {
  const root = getBrainRuntimePaths().normalizedDocsRoot;
  if (!fs.existsSync(root)) return [];
  const files = fs
    .readdirSync(root)
    .filter((name) => name.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));
  return files
    .map((name) => readJsonCached(path.join(root, name)))
    .filter(Boolean);
}

export function loadRuntimeProfiles() {
  const raw = readJsonCached(profilesPath) || { profiles: {} };
  const normalized = {};
  for (const [profileName, profile] of Object.entries(raw.profiles || {})) {
    normalized[profileName] = normalizeProfileDefinition(profileName, profile);
  }
  return {
    ...raw,
    profiles: normalized,
  };
}

function mapObjectKeysToLower(obj) {
  const out = new Map();
  for (const [key, value] of Object.entries(obj || {})) {
    out.set(String(key).toLowerCase(), value);
  }
  return out;
}

export function expandQueryWithSemanticMap(normalizedQuery, profileName) {
  const query = String(normalizedQuery ?? "").trim().toLowerCase();
  const semanticMap = loadRuntimeSemanticMap();
  const retrievalMap = profileName ? loadProfileRetrievalMap(profileName) : null;
  const baseTerms = tokenizeForRetrieval(query);
  const aliasMap = mapObjectKeysToLower(semanticMap?.aliasToCanonical);
  const synonymMap = mapObjectKeysToLower(semanticMap?.synonymToCanonical);
  const allowedTerms = retrievalMap?.allowedSemanticTerms
    ? new Set(retrievalMap.allowedSemanticTerms.map((term) => String(term).toLowerCase()))
    : null;
  const expanded = new Set(baseTerms);
  const aliasHits = [];
  const synonymHits = [];

  for (const term of baseTerms) {
    const aliasTargets = Array.isArray(aliasMap.get(term)) ? aliasMap.get(term) : [];
    for (const target of aliasTargets) {
      const lower = String(target).toLowerCase();
      if (allowedTerms && !allowedTerms.has(lower)) continue;
      expanded.add(lower);
      aliasHits.push({ term, expandsTo: lower });
    }
    const synonymTargets = Array.isArray(synonymMap.get(term)) ? synonymMap.get(term) : [];
    for (const target of synonymTargets) {
      const lower = String(target).toLowerCase();
      if (allowedTerms && !allowedTerms.has(lower)) continue;
      expanded.add(lower);
      synonymHits.push({ term, expandsTo: lower });
    }
  }

  return {
    normalizedQuery: query,
    expandedTerms: uniqueSorted([...expanded]),
    expandedQuery: uniqueSorted([...expanded]).join(" "),
    aliasHits,
    synonymHits,
    semanticMapVersion:
      semanticMap?.schemaVersion || semanticMap?.version || BRAIN_RUNTIME_SCHEMA_VERSION,
  };
}

function overlapScore(queryTerms, candidateTerms, text) {
  if (!queryTerms.length || !candidateTerms?.length) return 0;
  const querySet = new Set(queryTerms);
  let hits = 0;
  for (const term of candidateTerms) {
    if (querySet.has(String(term).toLowerCase())) hits += 1;
  }
  let score = hits / queryTerms.length;
  const haystack = String(text ?? "").toLowerCase();
  for (const q of queryTerms) {
    if (haystack.includes(q)) score += 0.05;
  }
  return score;
}

export function lookupCompactFacts(normalizedQuery, profileName, opts = {}) {
  const queryInfo = expandQueryWithSemanticMap(normalizedQuery, profileName);
  const retrievalMap = profileName ? loadProfileRetrievalMap(profileName) : null;
  const compactFacts = loadRuntimeCompactFacts();
  if (!compactFacts?.facts?.length) return [];
  const allowedIds = retrievalMap?.compactFactIds ? new Set(retrievalMap.compactFactIds) : null;
  const limit = Math.max(1, Math.floor(opts.limit ?? 4));
  const ranked = [];
  for (const fact of compactFacts.facts) {
    if (allowedIds && !allowedIds.has(fact.factId)) continue;
    const score = overlapScore(
      queryInfo.expandedTerms,
      fact.tokens,
      `${fact.fact} ${fact.summary || ""}`.trim()
    );
    if (score <= 0) continue;
    ranked.push({
      ...fact,
      score,
      explain: {
        stage: "compact-fact",
        matchedTerms: queryInfo.expandedTerms.filter((term) =>
          Array.isArray(fact.tokens)
            ? fact.tokens.map((token) => String(token).toLowerCase()).includes(term)
            : false
        ),
      },
    });
  }
  ranked.sort((a, b) => b.score - a.score || String(a.factId).localeCompare(String(b.factId)));
  return ranked.slice(0, limit);
}

export function lookupSummaryMatches(normalizedQuery, profileName, opts = {}) {
  const pack = loadProfileSummaryPack(profileName);
  if (!pack?.docs?.length) return [];
  const queryInfo = expandQueryWithSemanticMap(normalizedQuery, profileName);
  const limit = Math.max(1, Math.floor(opts.limit ?? 4));
  const ranked = [];
  for (const doc of pack.docs) {
    const terms = Array.isArray(doc.tokens) ? doc.tokens : tokenizeForRetrieval(doc.summary || "");
    const score = overlapScore(queryInfo.expandedTerms, terms, doc.summary);
    if (score <= 0) continue;
    ranked.push({
      ...doc,
      score,
      explain: {
        stage: "summary",
        matchedTerms: queryInfo.expandedTerms.filter((term) =>
          terms.map((token) => String(token).toLowerCase()).includes(term)
        ),
      },
    });
  }
  ranked.sort((a, b) => b.score - a.score || String(a.docId).localeCompare(String(b.docId)));
  return ranked.slice(0, limit);
}

function verifySourceHashes(manifest) {
  const sourceHashes = manifest?.sourceHashes || {};
  const stale = [];
  for (const [rel, expectedHash] of Object.entries(sourceHashes)) {
    const full = path.join(brainRoot, rel);
    if (!fs.existsSync(full)) {
      stale.push({ path: rel, reason: "missing" });
      continue;
    }
    try {
      const currentHash = sha256File(full);
      if (currentHash !== expectedHash) {
        stale.push({ path: rel, reason: "hash_mismatch" });
      }
    } catch (error) {
      stale.push({ path: rel, reason: String(error?.message || error) });
    }
  }
  return stale;
}

export function warmBrainRuntime(opts = {}) {
  const logger = opts.logger || console;
  const diagnostics = {
    buildVersion: BRAIN_RUNTIME_BUILD_VERSION,
    schemaVersion: BRAIN_RUNTIME_SCHEMA_VERSION,
    loaded: [],
    missing: [],
    warnings: [],
    stale: [],
  };
  const manifest = loadRuntimeManifest();
  if (!manifest) {
    diagnostics.warnings.push("runtime-manifest.json missing");
    return diagnostics;
  }
  diagnostics.loaded.push("runtime-manifest");
  if (opts.verifyHashes !== false) {
    diagnostics.stale = verifySourceHashes(manifest);
    if (diagnostics.stale.length) {
      diagnostics.warnings.push(`stale artifacts detected for ${diagnostics.stale.length} source files`);
    }
  }

  const loads = [
    ["aliases", loadRuntimeAliases],
    ["synonyms", loadRuntimeSynonyms],
    ["semantic-map", loadRuntimeSemanticMap],
    ["compact-facts", loadRuntimeCompactFacts],
    ["scenario-lookup", loadRuntimeScenarioLookup],
    ["response-priors", loadRuntimeResponsePriors],
    ["prompt-pack", loadRuntimePromptPack],
  ];
  for (const [name, fn] of loads) {
    const loaded = fn();
    if (loaded) diagnostics.loaded.push(name);
    else diagnostics.missing.push(name);
  }

  if (dictionaryArtifactsAvailable()) {
    const dictionaryLoads = [
      ["dictionary:manifest", loadDictionaryArtifactManifest],
      ["dictionary:headword-map", loadDictionaryHeadwordMap],
      ["dictionary:alias-map", loadDictionaryAliasMap],
      ["dictionary:bm25", loadDictionaryBm25Artifact],
      ["dictionary:stats", loadDictionaryStats],
    ];
    for (const [name, fn] of dictionaryLoads) {
      const loaded = fn();
      if (loaded) diagnostics.loaded.push(name);
      else diagnostics.missing.push(name);
    }
  }

  const profileNames = Object.keys(loadRuntimeProfiles().profiles || {});
  diagnostics.profileCount = profileNames.length;
  for (const profileName of profileNames) {
    if (loadProfileRetrievalMap(profileName)) diagnostics.loaded.push(`${profileName}:retrieval-map`);
    else diagnostics.missing.push(`${profileName}:retrieval-map`);
    if (loadProfileSummaryPack(profileName)) diagnostics.loaded.push(`${profileName}:summary-pack`);
    else diagnostics.missing.push(`${profileName}:summary-pack`);
    if (loadProfileScenarioMap(profileName)) diagnostics.loaded.push(`${profileName}:scenario-map`);
    else diagnostics.missing.push(`${profileName}:scenario-map`);
    if (loadProfileBm25Artifact(profileName)) diagnostics.loaded.push(`${profileName}:bm25`);
  }

  if (diagnostics.missing.length && logger?.warn) {
    logger.warn(`[brain-runtime] optional artifacts missing: ${diagnostics.missing.join(", ")}`);
  }
  if (diagnostics.stale.length && logger?.warn) {
    logger.warn(
      `[brain-runtime] stale sources detected: ${diagnostics.stale
        .map((row) => `${normalizeSlashes(row.path)}:${row.reason}`)
        .join(", ")}`
    );
  }
  return diagnostics;
}
