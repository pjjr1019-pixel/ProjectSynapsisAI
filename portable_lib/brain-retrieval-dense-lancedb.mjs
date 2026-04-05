import fs from "node:fs";
import path from "node:path";
import { readJsonIfExists } from "./brain-build-utils.mjs";
import { embedText, getDensePilotSettings } from "./brain-embeddings-local.mjs";
import {
  chunkMatchesProfile,
  findChunkByChunkId,
  getProfileConfig,
} from "./brain-retrieval.mjs";
import { getBrainRuntimePaths } from "./brain-runtime-layer.mjs";

const MANIFEST_PATH = path.join(getBrainRuntimePaths().indexesRoot, "dense-pilot-manifest.json");
let lancedbPromise = null;

function toDenseScore(row) {
  const distance = Number(row?._distance ?? row?.distance ?? Number.NaN);
  if (Number.isFinite(distance)) {
    return 1 / (1 + Math.max(0, distance));
  }
  const score = Number(row?.score ?? 0);
  if (Number.isFinite(score)) return Math.max(0, Math.min(1, score));
  return 0;
}

async function loadLanceDb() {
  if (!lancedbPromise) {
    lancedbPromise = import("@lancedb/lancedb").catch((error) => {
      lancedbPromise = null;
      throw new Error(
        `@lancedb/lancedb is not available. Run npm install before using the dense pilot. (${error?.message || error})`
      );
    });
  }
  return lancedbPromise;
}

export function loadDensePilotManifest() {
  return readJsonIfExists(MANIFEST_PATH);
}

export function densePilotReady() {
  const manifest = loadDensePilotManifest();
  return !!(manifest && fs.existsSync(manifest.dbPath || ""));
}

async function openDenseTable(manifest) {
  const lancedb = await loadLanceDb();
  const connect = lancedb.connect || lancedb.default?.connect || lancedb.default || lancedb;
  const db = await connect(manifest.dbPath);
  if (typeof db.openTable === "function") {
    return db.openTable(manifest.tableName);
  }
  throw new Error("LanceDB connection does not expose openTable().");
}

async function executeSearch(table, vector, limit) {
  let query =
    typeof table.search === "function"
      ? table.search(vector)
      : typeof table.vectorSearch === "function"
        ? table.vectorSearch(vector)
        : null;
  if (!query) throw new Error("Dense table does not expose search() or vectorSearch().");
  if (typeof query.limit === "function") query = query.limit(limit);
  if (typeof query.toArray === "function") return query.toArray();
  if (typeof query.toList === "function") return query.toList();
  if (typeof query.execute === "function") return query.execute();
  if (Array.isArray(query)) return query;
  return [];
}

export async function retrieveDensePilot(queryText, opts = {}) {
  const settings = getDensePilotSettings(opts);
  const manifest = loadDensePilotManifest();
  if (!settings.enabled && !opts.force) {
    return { available: false, reason: "disabled", ranked: [] };
  }
  if (!manifest) {
    return { available: false, reason: "manifest_missing", ranked: [] };
  }
  const vector = await embedText(queryText, settings);
  const table = await openDenseTable(manifest);
  const rows = await executeSearch(table, vector, Math.max(10, Number(opts.limit || 24)));
  const profile = opts.profileName ? getProfileConfig(opts.profileName) : null;

  const ranked = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const chunkId = String(row?.chunkId || "").trim();
    if (!chunkId) continue;
    const chunk = findChunkByChunkId(chunkId);
    if (!chunk) continue;
    if (profile && !chunkMatchesProfile(chunk, profile)) continue;
    ranked.push({
      chunkId,
      docId: chunk.docId,
      app: chunk.app,
      domain: chunk.domain,
      lane: "dense-pilot",
      denseScore: toDenseScore(row),
      distance: Number(row?._distance ?? row?.distance ?? 0),
      queryVariant: opts.queryVariant || "original",
    });
  }

  ranked.sort((a, b) => b.denseScore - a.denseScore || String(a.chunkId).localeCompare(String(b.chunkId)));
  return {
    available: true,
    model: manifest.model,
    tableName: manifest.tableName,
    ranked: ranked.slice(0, Math.max(1, Number(opts.topK || 10))),
  };
}
