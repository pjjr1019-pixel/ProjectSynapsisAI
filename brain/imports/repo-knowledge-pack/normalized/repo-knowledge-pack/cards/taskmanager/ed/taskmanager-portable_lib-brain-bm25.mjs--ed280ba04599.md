---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-bm25.mjs"
source_name: "brain-bm25.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 578
content_hash: "75ee9bd0abc87fe84bc8b2c72eed833337ab536da98a15b49b9b979fc281dde6"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
exports:
  - "BM25_B"
  - "BM25_K1"
  - "bm25Score"
  - "idf"
---

# taskmanager/portable_lib/brain-bm25.mjs

> Code module; exports BM25_B, BM25_K1, bm25Score, idf

## Key Signals

- Source path: taskmanager/portable_lib/brain-bm25.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Exports: BM25_B, BM25_K1, bm25Score, idf

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-bm25.mjs

## Excerpt

~~~javascript
﻿export const BM25_K1 = 1.5;
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
~~~