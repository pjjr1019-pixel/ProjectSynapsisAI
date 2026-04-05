import { bm25Score } from "../brain-bm25.mjs";

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, " ")
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function termFrequency(tokens) {
  const tf = {};
  for (const token of tokens) tf[token] = (tf[token] || 0) + 1;
  return tf;
}

function textBlob(manifest) {
  return [
    manifest.id,
    manifest.title,
    manifest.description,
    manifest.category,
    ...(manifest.aliases || []),
    ...(manifest.tags || []),
    JSON.stringify(manifest.inputs || {}),
    JSON.stringify(manifest.usage_examples || []),
  ].join(" ");
}

export class ScriptRetrievalService {
  constructor({ embeddingService }) {
    this.embeddingService = embeddingService;
  }

  async retrieve({ request, manifests, indexState, learningState, topK = 12 }) {
    const q = String(request || "").trim();
    const qLower = q.toLowerCase();
    const qTokens = tokenize(q);

    const exactBoost = new Map();
    const aliasBoost = new Map();

    const exact = indexState?.exactNameIndex || {};
    const alias = indexState?.aliasIndex || {};

    if (exact[qLower]) exactBoost.set(exact[qLower], 1);
    if (alias[qLower]) aliasBoost.set(alias[qLower], 1);

    for (const token of qTokens) {
      if (exact[token]) exactBoost.set(exact[token], 0.92);
      if (alias[token]) aliasBoost.set(alias[token], 0.78);
    }

    const docMeta = [];
    const df = {};
    for (const manifest of manifests) {
      const tokens = tokenize(textBlob(manifest));
      const tf = termFrequency(tokens);
      for (const term of Object.keys(tf)) df[term] = (df[term] || 0) + 1;
      docMeta.push({ manifest, tf, docLen: tokens.length });
    }

    const N = Math.max(1, docMeta.length);
    const avgdl = docMeta.reduce((sum, row) => sum + row.docLen, 0) / N;
    const idf = {};
    for (const [term, dfi] of Object.entries(df)) {
      const top = N - dfi + 0.5;
      const bottom = dfi + 0.5;
      idf[term] = Math.log((top / bottom) + 1);
    }

    const queryVector = await this.embeddingService.embedQuery(q);

    const scored = [];
    for (const row of docMeta) {
      const bm25 = bm25Score(qTokens, row.tf, row.docLen, avgdl || 1, N, idf);
      const scriptVector = this.embeddingService.getScriptVector(row.manifest.id);
      const embeddingScore = scriptVector
        ? this.embeddingService.embeddingProvider.similarity(queryVector, scriptVector)
        : 0;
      const exactScore = exactBoost.get(row.manifest.id) || 0;
      const aliasScore = aliasBoost.get(row.manifest.id) || 0;
      const categoryBoost = qLower.includes(String(row.manifest.category || "").toLowerCase()) ? 0.08 : 0;
      const history = learningState?.scriptScores?.[row.manifest.id] || { success: 0, fail: 0, accepted: 0 };
      const priorBoost = Math.max(-0.08, Math.min(0.12, (history.success * 0.015 + history.accepted * 0.008) - history.fail * 0.02));
      const recencyBoost = row.manifest.last_updated_time
        ? Math.max(0, 0.05 - ((Date.now() - new Date(row.manifest.last_updated_time).getTime()) / (1000 * 60 * 60 * 24 * 90)))
        : 0;

      const combined = Math.max(0,
        bm25 * 0.32 +
        embeddingScore * 0.34 +
        exactScore * 0.18 +
        aliasScore * 0.08 +
        categoryBoost +
        priorBoost +
        recencyBoost
      );

      scored.push({
        ...row.manifest,
        bm25_score: bm25,
        embedding_score: embeddingScore,
        exact_score: exactScore,
        alias_score: aliasScore,
        category_boost: categoryBoost,
        prior_boost: priorBoost,
        recency_boost: recencyBoost,
        base_score: combined,
      });
    }

    scored.sort((a, b) => b.base_score - a.base_score);
    return {
      request: q,
      topCandidates: scored.slice(0, Math.max(1, topK)),
    };
  }
}
