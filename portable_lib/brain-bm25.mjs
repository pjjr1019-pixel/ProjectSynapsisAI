export const BM25_K1 = 1.5;
export const BM25_B = 0.75;

export function idf(df, N) {
  return Math.log(1 + (N - df + 0.5) / (df + 0.5));
}

export function bm25Score(queryTerms, docTf, docLen, avgdl, N, idfMap) {
  if (!avgdl || avgdl <= 0 || !docLen) return 0;
  let score = 0;
  for (const t of queryTerms) {
    const tf = docTf[t] || 0;
    if (!tf) continue;
    const idfVal = idfMap[t] ?? idf(1, N);
    const denom = tf + BM25_K1 * (1 - BM25_B + (BM25_B * docLen) / avgdl);
    score += idfVal * ((tf * (BM25_K1 + 1)) / denom);
  }
  return score;
}
