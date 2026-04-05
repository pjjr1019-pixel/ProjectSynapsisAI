/**
 * Ranked hybrid retrieval with optional legacy embedding fusion and optional LanceDB dense pilot.
 * Falls back to BM25-only when dense lanes are unavailable.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { rankedBm25Scores } from "./brain-retrieval-bm25.mjs";
import { densePilotRequested } from "./brain-embeddings-local.mjs";
import { retrieveDensePilot } from "./brain-retrieval-dense-lancedb.mjs";
import { getRepoRoot } from "./brain-retrieval.mjs";

const BUILD_DIR = path.join(
  getRepoRoot(),
  "brain",
  "apps",
  "assistant",
  "knowledge",
  "build"
);
const EMBED_DEFAULT = "retrieval-embeddings.json";
const EMBED_FULL = "retrieval-embeddings-full.json";
const DEFAULT_RRF_K = 60;

/** @type {Map<string, { mtime: number, data: object }>} */
const embCache = new Map();

/** @param {'default' | 'full'} scope */
function embedPathForScope(scope) {
  const name = scope === "full" ? EMBED_FULL : EMBED_DEFAULT;
  return path.join(BUILD_DIR, name);
}

/** @param {'default' | 'full'} scope */
function loadEmbeddingIndex(scope = "default") {
  const p = embedPathForScope(scope);
  if (!fs.existsSync(p)) return null;
  const st = fs.statSync(p);
  const hit = embCache.get(p);
  if (hit && hit.mtime === st.mtimeMs) return hit.data;
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  embCache.set(p, { mtime: st.mtimeMs, data });
  return data;
}

function cosineSim(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denominator = Math.sqrt(na) * Math.sqrt(nb);
  return denominator ? dot / denominator : 0;
}

async function embedQuery(text) {
  const base =
    process.env.LOCAL_EMBED_BASE_URL?.trim() ||
    process.env.LOCAL_LLM_BASE_URL?.trim()?.replace(/\/v1\/?$/, "") ||
    "";
  const model =
    process.env.LOCAL_EMBED_MODEL?.trim() ||
    process.env.LOCAL_LLM_MODEL?.trim() ||
    "";
  if (!base || !model) return null;
  const url = `${base.replace(/\/$/, "")}/v1/embeddings`;
  const headers = { "Content-Type": "application/json" };
  const key = process.env.LOCAL_EMBED_API_KEY?.trim() || process.env.LOCAL_LLM_API_KEY?.trim();
  if (key) headers.Authorization = `Bearer ${key}`;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Math.max(8000, Number(process.env.LOCAL_EMBED_TIMEOUT_MS) || 30000)
  );
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        input: String(text ?? "").slice(0, 8000),
      }),
      signal: controller.signal,
    });
    const raw = await res.text();
    if (!res.ok) {
      throw new Error(`embed HTTP ${res.status}: ${raw.slice(0, 200)}`);
    }
    const data = JSON.parse(raw);
    const emb = data?.data?.[0]?.embedding;
    return Array.isArray(emb) ? emb.map((value) => Number(value)) : null;
  } finally {
    clearTimeout(timeout);
  }
}

function resolveScope(opts) {
  return {
    scope: opts?.scope === "full" ? "full" : "default",
    profileName: typeof opts?.profileName === "string" ? opts.profileName : "",
    topK: Math.max(1, Number(opts?.topK || 8)),
  };
}

function normalizeQueryVariants(normalizedQuery, variants = []) {
  const seen = new Set();
  const out = [];
  const push = (text, label) => {
    const clean = String(text ?? "").trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    out.push({ text: clean, label: label || "original" });
  };
  push(normalizedQuery, "original");
  for (const entry of Array.isArray(variants) ? variants : []) {
    if (typeof entry === "string") push(entry, "variant");
    else if (entry && typeof entry === "object") push(entry.text, entry.label || "variant");
  }
  return out;
}

async function rankLegacyDenseChunks(normalizedQuery, opts = {}) {
  const resolved = resolveScope(opts);
  const embIdx = loadEmbeddingIndex(resolved.scope);
  if (!embIdx?.vectors?.length || !embIdx.chunkOrder?.length) {
    return { available: false, lane: "legacy-dense", ranked: [] };
  }
  const qVec = await embedQuery(normalizedQuery);
  if (!qVec || qVec.length !== embIdx.dim) {
    return { available: false, lane: "legacy-dense", ranked: [] };
  }
  const ranked = [];
  for (let i = 0; i < embIdx.chunkOrder.length; i += 1) {
    const vector = embIdx.vectors[i];
    if (!Array.isArray(vector) || vector.length !== qVec.length) continue;
    ranked.push({
      chunkId: embIdx.chunkOrder[i],
      lane: "legacy-dense",
      legacyDenseScore: cosineSim(qVec, vector),
      queryVariant: opts.queryVariant || "original",
    });
  }
  ranked.sort(
    (a, b) =>
      b.legacyDenseScore - a.legacyDenseScore || String(a.chunkId).localeCompare(String(b.chunkId))
  );
  return {
    available: true,
    lane: "legacy-dense",
    ranked: ranked.slice(0, Math.max(1, resolved.topK)),
  };
}

export function reciprocalRankFusion(resultSets, opts = {}) {
  const k = Math.max(1, Number(opts.k || DEFAULT_RRF_K));
  const merged = new Map();

  for (const resultSet of Array.isArray(resultSets) ? resultSets : []) {
    resultSet.forEach((row, index) => {
      const chunkId = String(row?.chunkId || "").trim();
      if (!chunkId) return;
      const previous = merged.get(chunkId) || {
        chunkId,
        laneHits: [],
        queryVariants: [],
        rrfScore: 0,
        bm25Score: 0,
        denseScore: 0,
        legacyDenseScore: 0,
      };
      const lane = String(row.lane || "unknown");
      previous.rrfScore += 1 / (k + index + 1);
      previous.laneHits = [...new Set([...previous.laneHits, lane])];
      previous.queryVariants = [
        ...new Set([...previous.queryVariants, String(row.queryVariant || "original")]),
      ];
      previous.bm25Score = Math.max(previous.bm25Score, Number(row.bm25Score || row.score || 0));
      previous.denseScore = Math.max(previous.denseScore, Number(row.denseScore || 0));
      previous.legacyDenseScore = Math.max(
        previous.legacyDenseScore,
        Number(row.legacyDenseScore || 0)
      );
      previous.explain = {
        ...(previous.explain || {}),
        ...(row.explain || {}),
      };
      merged.set(chunkId, { ...previous, ...row });
    });
  }

  const ranked = [...merged.values()].sort(
    (a, b) => b.rrfScore - a.rrfScore || String(a.chunkId).localeCompare(String(b.chunkId))
  );
  const maxScore = Math.max(1e-9, ...ranked.map((row) => row.rrfScore));
  return ranked.map((row) => ({
    ...row,
    primaryLane: row.laneHits[0] || row.lane || "bm25",
    rrfScoreNormalized: row.rrfScore / maxScore,
  }));
}

export async function rankHybridChunks(normalizedQuery, extraTerms = [], opts = {}) {
  const resolved = resolveScope(opts);
  const bm25 = rankedBm25Scores(normalizedQuery, extraTerms, resolved);
  const bm25Ranked = (bm25?.ranked || []).slice(0, resolved.topK * 2).map((row) => ({
    ...row,
    lane: "bm25",
    bm25Score: Number(row.score || 0),
    queryVariant: "original",
  }));

  const denseVariants = normalizeQueryVariants(normalizedQuery, opts.denseQueryVariants);
  const denseSets = [];

  if (opts.useLegacyDense !== false) {
    for (const variant of denseVariants) {
      try {
        const legacy = await rankLegacyDenseChunks(variant.text, {
          ...resolved,
          queryVariant: variant.label,
        });
        if (legacy.available && legacy.ranked.length) denseSets.push(legacy.ranked);
      } catch (error) {
        console.error("[brain-retrieval-hybrid] legacy dense:", error?.message || error);
      }
    }
  }

  if (densePilotRequested(opts) || opts.densePilot === true) {
    for (const variant of denseVariants) {
      try {
        const pilot = await retrieveDensePilot(variant.text, {
          ...resolved,
          densePilot: true,
          queryVariant: variant.label,
          topK: resolved.topK * 2,
        });
        if (pilot.available && pilot.ranked.length) denseSets.push(pilot.ranked);
      } catch (error) {
        console.error("[brain-retrieval-hybrid] dense pilot:", error?.message || error);
      }
    }
  }

  const fused = reciprocalRankFusion([bm25Ranked, ...denseSets], {
    k: Number(opts.rrfK || DEFAULT_RRF_K),
  });
  return {
    settings: {
      scope: resolved.scope,
      profileName: resolved.profileName,
      topK: resolved.topK,
      rrfK: Number(opts.rrfK || DEFAULT_RRF_K),
      densePilot: densePilotRequested(opts) || opts.densePilot === true,
    },
    queryVariants: denseVariants,
    bm25: bm25Ranked,
    ranked: fused.slice(0, resolved.topK),
    best:
      fused[0]
        ? {
            chunkId: fused[0].chunkId,
            score: fused[0].rrfScoreNormalized,
            secondScore: fused[1]?.rrfScoreNormalized ?? 0,
            explain: fused[0].explain || null,
          }
        : null,
  };
}

export async function bestHybridChunk(normalizedQuery, extraTerms = [], opts = {}) {
  const result = await rankHybridChunks(normalizedQuery, extraTerms, opts);
  return result.best;
}
