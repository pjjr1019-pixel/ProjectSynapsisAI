/**
 * Reference loader + filter for brain/retrieval/indexes/chunks.jsonl
 * See brain/retrieval/profiles.json
 */
import fs from "node:fs";
import path from "node:path";
import { normalizeProfileDefinition } from "./brain-ir-contracts.mjs";
import {
  loadProfileRetrievalMap,
  lookupCompactFacts,
  lookupSummaryMatches,
} from "./brain-runtime-layer.mjs";
import { getTaskmanagerPaths } from "./taskmanager-paths.mjs";

const taskmanagerPaths = getTaskmanagerPaths();
const repoRoot = taskmanagerPaths.taskmanagerRoot;
const brain = taskmanagerPaths.brain.root;
const chunksPath = taskmanagerPaths.brain.retrieval.chunksFile;
const profilesPath = taskmanagerPaths.brain.retrieval.profilesFile;

/** @type {{ mtime: number, lines: object[] } | null} */
let chunksCache = null;
/** @type {{ mtime: number, data: object } | null} */
let profilesCache = null;
/** @type {Map<string, object> | null} */
let chunkByIdCache = null;
const SUPPORTED_SOURCE_TYPES = new Set(["canonical", "runtime", "web", "draft", "import", "memory"]);

function inferSourceTypeForChunk(chunk) {
  const rel = String(chunk?.path || "");
  const sourceType = String(chunk?.provenance?.sourceType || "").trim().toLowerCase();
  if (SUPPORTED_SOURCE_TYPES.has(sourceType)) return sourceType;
  if (rel.startsWith("runtime/learning/promoted/")) return "web";
  if (rel.startsWith("runtime/")) return "runtime";
  if (rel.startsWith("imports/")) return "import";
  if (rel.startsWith("memory/")) return "memory";
  if (rel.includes("/draft/")) return "draft";
  return "canonical";
}

function normalizeChunkRecord(chunk) {
  const normalizedSourceType = inferSourceTypeForChunk(chunk);
  return {
    ...chunk,
    provenance: {
      ...(chunk?.provenance || {}),
      sourceType: normalizedSourceType,
    },
  };
}

export function getRepoRoot() {
  return repoRoot;
}

export function loadChunksJsonl() {
  const st = fs.statSync(chunksPath);
  if (chunksCache && chunksCache.mtime === st.mtimeMs) return chunksCache.lines;
  const raw = fs.readFileSync(chunksPath, "utf8");
  const lines = raw
    .split("\n")
    .filter(Boolean)
    .map((line) => normalizeChunkRecord(JSON.parse(line)));
  chunksCache = { mtime: st.mtimeMs, lines };
  return lines;
}

export function loadProfiles() {
  const st = fs.statSync(profilesPath);
  if (profilesCache && profilesCache.mtime === st.mtimeMs) return profilesCache.data;
  const raw = JSON.parse(fs.readFileSync(profilesPath, "utf8"));
  const data = {
    ...raw,
    profiles: Object.fromEntries(
      Object.entries(raw.profiles || {}).map(([name, profile]) => [
        name,
        normalizeProfileDefinition(name, profile),
      ])
    ),
  };
  profilesCache = { mtime: st.mtimeMs, data };
  return data;
}

export function clearBrainRetrievalCache() {
  chunksCache = null;
  profilesCache = null;
  chunkByIdCache = null;
}

const MEGAPACK_DOC_ID = "hz.pipeline.imports.megapack-all-recommended";
const KNOWLEDGE_PACK_DOC_IDS = new Set([
  "hz.pipeline.imports.knowledge-pack-v1",
  "hz.pipeline.imports.knowledge-pack-v2",
]);

function importFamilyForChunk(chunk) {
  const rel = String(chunk?.path || "").replace(/\\/g, "/");
  if (rel.startsWith("imports/live/")) return "live";
  if (rel.startsWith("imports/bulk/")) return "bulk";
  if (rel.startsWith("imports/repo-knowledge-pack/")) return "repo_knowledge_pack";
  if (String(chunk?.docId || "") === MEGAPACK_DOC_ID) return "megapack";
  if (KNOWLEDGE_PACK_DOC_IDS.has(String(chunk?.docId || ""))) return "knowledge_v1_v2";
  if (rel.startsWith("imports/")) return "individual_packs";
  return null;
}

/**
 * @param {object} chunk
 * @param {object} profile profiles.json profiles[name]
 */
function isPipelineImportAnchor(chunk) {
  return (
    chunk.domain === "pipeline" &&
    String(chunk.docId).startsWith("hz.pipeline.imports.")
  );
}

export function chunkMatchesProfile(chunk, profile) {
  if (!profile.includeDomains.includes(chunk.domain)) return false;
  if (profile.allowedApps.length && !profile.allowedApps.includes(String(chunk.app || ""))) return false;
  if (chunk.confidence < profile.minConfidence) return false;
  const sourceType = inferSourceTypeForChunk(chunk);
  if (profile.includeSourceTypes.length && !profile.includeSourceTypes.includes(sourceType)) return false;
  if (sourceType === "memory" && !profile.allowMemory) return false;
  if (!profile.allowDraft && chunk.status === "draft" && !isPipelineImportAnchor(chunk)) return false;
  if (sourceType === "draft" && !profile.allowDraft) return false;
  if (sourceType === "import") {
    if (!profile.allowImports) return false;
    const family = importFamilyForChunk(chunk);
    if (profile.importFamilies.length && family && !profile.importFamilies.includes(family)) {
      return false;
    }
    if (family === "live" || family === "bulk") {
      return profile.importFamilies.includes(family);
    }
    const lib = profile.importLibrary;
    if (lib === "all") return true;
    if (lib === "none") return false;
    if (lib === "megapack") return family === "megapack";
    if (lib === "individual_packs") return family === "individual_packs";
    if (lib === "knowledge_v1_v2") return family === "knowledge_v1_v2";
    if (lib === "repo_knowledge_pack") return family === "repo_knowledge_pack";
    return false;
  }
  return true;
}

/**
 * @param {string} profileName e.g. repo-knowledge-pack
 */
export function resolveChunksForProfile(profileName) {
  const profiles = loadProfiles();
  const profile = profiles.profiles[profileName];
  if (!profile) {
    throw new Error(`Unknown profile: ${profileName}`);
  }
  return loadChunksJsonl().filter((c) => chunkMatchesProfile(c, profile));
}

export function getProfileConfig(profileName) {
  const profiles = loadProfiles();
  const profile = profiles.profiles[profileName];
  if (!profile) {
    throw new Error(`Unknown profile: ${profileName}`);
  }
  return profile;
}

/**
 * @param {string} chunkId
 * @returns {object | undefined}
 */
export function findChunkByChunkId(chunkId) {
  if (!chunkByIdCache) {
    const m = new Map();
    for (const c of loadChunksJsonl()) {
      m.set(c.chunkId, c);
    }
    chunkByIdCache = m;
  }
  return chunkByIdCache.get(chunkId);
}

export function clearChunkByIdCache() {
  chunkByIdCache = null;
}

/**
 * Read UTF-8 slice for a chunk manifest row (path relative to `brain/`).
 * @param {object} chunk — row from chunks.jsonl with path, charStart, charEnd
 * @returns {string | null}
 */
export function loadChunkText(chunk) {
  const rel = String(chunk.path || "").replace(/^[/\\]+/, "");
  if (!rel) return null;
  const full = path.join(brain, rel);
  if (!fs.existsSync(full)) return null;
  const raw = fs.readFileSync(full, "utf8");
  const start = Math.max(0, Math.floor(Number(chunk.charStart)) || 0);
  const end = Math.min(raw.length, Math.floor(Number(chunk.charEnd)) || raw.length);
  if (start >= end) return null;
  return raw.slice(start, end);
}

export function resolveProfileContextArtifacts(normalizedQuery, profileName, opts = {}) {
  const retrievalMap = loadProfileRetrievalMap(profileName);
  const compactFacts = retrievalMap?.allowCompactFacts !== false
    ? lookupCompactFacts(normalizedQuery, profileName, { limit: opts.factLimit ?? 3 })
    : [];
  const summaries = retrievalMap?.summaryFirst !== false && retrievalMap?.allowSummaries !== false
    ? lookupSummaryMatches(normalizedQuery, profileName, { limit: opts.summaryLimit ?? 3 })
    : [];
  return {
    retrievalMap,
    compactFacts,
    summaries,
  };
}
