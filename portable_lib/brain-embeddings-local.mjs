import path from "node:path";
import process from "node:process";
import { getBrainRuntimePaths } from "./brain-runtime-layer.mjs";

const DEFAULT_EMBED_MODEL = "Xenova/bge-small-en-v1.5";
const DEFAULT_RERANK_MODEL = "Xenova/all-MiniLM-L6-v2";
const DEFAULT_TABLE = "brain_chunks";
const VRAM_DEFER_THRESHOLD = 0.70;

let transformersPromise = null;
const pipelineCache = new Map();

// VRAM budget tracking — updated by the server when GPU telemetry is available.
let vramUsedBytes = 0;
let vramTotalBytes = 0;

/**
 * Called by the server layer when it has fresh GPU VRAM telemetry.
 * If usedVramBytes / totalVramBytes > 0.70, dense pilot initialization is deferred.
 */
export function setVramBudget(usedBytes, totalBytes) {
  vramUsedBytes = Math.max(0, Number(usedBytes) || 0);
  vramTotalBytes = Math.max(0, Number(totalBytes) || 0);
}

function isVramBudgetExceeded() {
  if (vramTotalBytes <= 0) return false;
  return vramUsedBytes / vramTotalBytes > VRAM_DEFER_THRESHOLD;
}

function envFlag(name, fallback = false) {
  const raw = String(process.env[name] ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return fallback;
}

export function getDensePilotSettings(opts = {}) {
  const indexesRoot = getBrainRuntimePaths().indexesRoot;
  const dbPath =
    opts.dbPath ||
    process.env.HORIZONS_BRAIN_LANCEDB_PATH?.trim() ||
    path.join(indexesRoot, "lancedb");
  return {
    enabled:
      typeof opts.densePilot === "boolean"
        ? opts.densePilot
        : envFlag("HORIZONS_BRAIN_DENSE_PILOT", true),
    dbPath,
    tableName:
      opts.tableName ||
      process.env.HORIZONS_BRAIN_LANCEDB_TABLE?.trim() ||
      DEFAULT_TABLE,
    model:
      opts.model ||
      process.env.HORIZONS_BRAIN_DENSE_MODEL?.trim() ||
      DEFAULT_EMBED_MODEL,
    rerankEnabled:
      typeof opts.rerank === "boolean"
        ? opts.rerank
        : envFlag("HORIZONS_BRAIN_RERANK_ENABLED", false),
    rerankModel:
      opts.rerankModel ||
      process.env.HORIZONS_BRAIN_RERANK_MODEL?.trim() ||
      DEFAULT_RERANK_MODEL,
  };
}

async function loadTransformers() {
  if (!transformersPromise) {
    transformersPromise = import("@xenova/transformers").catch((error) => {
      transformersPromise = null;
      throw new Error(
        `@xenova/transformers is not available. Run npm install before using dense pilot features. (${error?.message || error})`
      );
    });
  }
  return transformersPromise;
}

async function loadPipeline(task, model) {
  const key = `${task}:${model}`;
  if (pipelineCache.has(key)) return pipelineCache.get(key);
  const { pipeline } = await loadTransformers();
  const pipePromise = pipeline(task, model).catch((error) => {
    pipelineCache.delete(key);
    throw error;
  });
  pipelineCache.set(key, pipePromise);
  return pipePromise;
}

function toNumberArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => toNumberArray(item));
  }
  if (ArrayBuffer.isView(value)) {
    return Array.from(value, (entry) => Number(entry));
  }
  if (Array.isArray(value?.data)) {
    return value.data.map((entry) => Number(entry));
  }
  if (ArrayBuffer.isView(value?.data)) {
    return Array.from(value.data, (entry) => Number(entry));
  }
  if (typeof value?.tolist === "function") {
    return toNumberArray(value.tolist());
  }
  return [];
}

export async function localEmbeddingAvailable() {
  try {
    await loadTransformers();
    return true;
  } catch {
    return false;
  }
}

export async function embedText(text, opts = {}) {
  const settings = getDensePilotSettings(opts);
  const extractor = await loadPipeline("feature-extraction", settings.model);
  const output = await extractor(String(text ?? "").slice(0, 8000), {
    pooling: "mean",
    normalize: true,
  });
  const vector = toNumberArray(output);
  if (!vector.length) {
    throw new Error("Embedding model returned an empty vector.");
  }
  return vector;
}

export async function embedTexts(texts, opts = {}) {
  const out = [];
  for (const text of Array.isArray(texts) ? texts : []) {
    out.push(await embedText(text, opts));
  }
  return out;
}

export function densePilotRequested(opts = {}) {
  if (isVramBudgetExceeded()) return false;
  return getDensePilotSettings(opts).enabled;
}
