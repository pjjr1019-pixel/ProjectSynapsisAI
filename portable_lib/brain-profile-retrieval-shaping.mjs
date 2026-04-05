import fs from "node:fs";
import path from "node:path";
import { getBrainRuntimePaths } from "./brain-runtime-layer.mjs";

const MEMORY_COMPACT_ROOT = path.join(getBrainRuntimePaths().brainRoot, "memory", "user", "compacted");

export function getCompactedMemoryPath(userId) {
  return path.join(MEMORY_COMPACT_ROOT, `${String(userId ?? "").trim()}.json`);
}

export function loadCompactedMemory(userId) {
  const filePath = getCompactedMemoryPath(userId);
  if (!userId || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function shapeRetrievalByProfile(profile, opts = {}) {
  const memory = opts.userId ? loadCompactedMemory(opts.userId) : null;
  const expertise = String(memory?.profile?.expertise || opts.expertise || "").toLowerCase();
  const base = {
    bm25Weight: 0.5,
    denseWeight: 0.5,
    topK: 6,
    summaryBias: profile?.summaryFirst !== false ? 1 : 0.85,
  };
  if (expertise === "expert") {
    return { ...base, bm25Weight: 0.45, denseWeight: 0.55, topK: 5, summaryBias: 0.9 };
  }
  if (expertise === "beginner") {
    return { ...base, bm25Weight: 0.55, denseWeight: 0.45, topK: 8, summaryBias: 1.05 };
  }
  return base;
}
