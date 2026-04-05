import { loadTextForBm25Chunk } from "./brain-retrieval-bm25.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";
import { embedText } from "./brain-embeddings-local.mjs";

function envFlag(name, fallback = false) {
  const raw = String(process.env[name] ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return fallback;
}

function lexicalOverlap(queryTerms, text) {
  if (!queryTerms.length || !text) return 0;
  const haystack = String(text).toLowerCase();
  let hits = 0;
  for (const term of queryTerms) {
    if (haystack.includes(term)) hits += 1;
  }
  return hits / queryTerms.length;
}

function normalizeRetrievalSignal(candidate) {
  const rrf = Number(candidate.rrfScoreNormalized ?? candidate.retrievalSignal ?? 0);
  const bm25 = Math.min(1, Number(candidate.bm25Score || 0));
  const dense = Math.min(1, Number(candidate.denseScore || candidate.legacyDenseScore || 0));
  return Math.max(rrf, bm25, dense);
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const left = Number(a[i] || 0);
    const right = Number(b[i] || 0);
    dot += left * right;
    normA += left * left;
    normB += right * right;
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator ? dot / denominator : 0;
}

function heuristicRerank(query, candidates) {
  const queryTerms = tokenizeForRetrieval(query);
  const reranked = (Array.isArray(candidates) ? candidates : []).map((candidate, index) => {
    const rawText =
      candidate.rawText ||
      (candidate.chunkIds?.[0] ? loadTextForBm25Chunk({ chunkId: candidate.chunkIds[0] }) : "");
    const overlap = lexicalOverlap(queryTerms, rawText);
    const laneBonus = Array.isArray(candidate.laneHits) && candidate.laneHits.length > 1 ? 0.08 : 0;
    const score =
      normalizeRetrievalSignal(candidate) * 0.55 +
      overlap * 0.3 +
      laneBonus +
      Math.min(0.05, Math.max(0, 0.02 * (5 - Math.min(index, 5))));
    return {
      ...candidate,
      rerankMode: "heuristic",
      rerankScore: score,
      rerankOverlap: overlap,
    };
  });

  reranked.sort((a, b) => {
    if (b.rerankScore !== a.rerankScore) return b.rerankScore - a.rerankScore;
    if ((b.rrfScore || 0) !== (a.rrfScore || 0)) return (b.rrfScore || 0) - (a.rrfScore || 0);
    return String(a.candidateId ?? "").localeCompare(String(b.candidateId ?? ""));
  });

  return reranked;
}

async function modelRerank(query, candidates, opts = {}) {
  const queryTerms = tokenizeForRetrieval(query);
  const queryVector = await embedText(query, { model: opts.model || opts.rerankModel });
  const reranked = [];
  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const rawText =
      candidate.rawText ||
      (candidate.chunkIds?.[0] ? loadTextForBm25Chunk({ chunkId: candidate.chunkIds[0] }) : "");
    if (!rawText) {
      reranked.push({
        ...candidate,
        rerankMode: "model",
        rerankScore: normalizeRetrievalSignal(candidate),
        rerankOverlap: 0,
        rerankSemanticScore: 0,
      });
      continue;
    }
    const overlap = lexicalOverlap(queryTerms, rawText);
    const docVector = await embedText(rawText.slice(0, 4000), {
      model: opts.model || opts.rerankModel,
    });
    const semanticScore = Math.max(0, Math.min(1, cosineSimilarity(queryVector, docVector)));
    reranked.push({
      ...candidate,
      rerankMode: "model",
      rerankScore:
        semanticScore * 0.58 +
        normalizeRetrievalSignal(candidate) * 0.27 +
        overlap * 0.15,
      rerankOverlap: overlap,
      rerankSemanticScore: semanticScore,
    });
  }

  reranked.sort((a, b) => {
    if (b.rerankScore !== a.rerankScore) return b.rerankScore - a.rerankScore;
    if ((b.rrfScore || 0) !== (a.rrfScore || 0)) return (b.rrfScore || 0) - (a.rrfScore || 0);
    return String(a.candidateId ?? "").localeCompare(String(b.candidateId ?? ""));
  });

  return reranked;
}

export async function rerankChunkCandidates(query, candidates, opts = {}) {
  const requestedMode = String(opts.mode ?? "").trim().toLowerCase();
  const enabled =
    typeof opts.enabled === "boolean"
      ? opts.enabled
      : envFlag("HORIZONS_BRAIN_RERANK_ENABLED", false) ||
        requestedMode === "heuristic" ||
        requestedMode === "model";
  if (!enabled) {
    return {
      applied: false,
      mode: "off",
      candidates: [...(Array.isArray(candidates) ? candidates : [])],
    };
  }
  if (requestedMode === "off") {
    return {
      applied: false,
      mode: "off",
      candidates: [...(Array.isArray(candidates) ? candidates : [])],
    };
  }

  let mode = requestedMode || "heuristic";
  let reranked;
  if (mode === "model") {
    try {
      reranked = await modelRerank(query, candidates, opts);
    } catch (error) {
      reranked = heuristicRerank(query, candidates);
      mode = "heuristic";
      return {
        applied: true,
        mode,
        error: error?.message || String(error),
        candidates: reranked,
      };
    }
  } else {
    reranked = heuristicRerank(query, candidates);
    mode = "heuristic";
  }

  return {
    applied: true,
    mode,
    candidates: reranked,
  };
}
