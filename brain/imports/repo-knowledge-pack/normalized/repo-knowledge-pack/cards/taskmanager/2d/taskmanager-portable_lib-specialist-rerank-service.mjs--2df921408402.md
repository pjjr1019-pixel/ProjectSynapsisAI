---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/specialist/rerank-service.mjs"
source_name: "rerank-service.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 669
content_hash: "d1143723a6604eb98bf1b4408610f864720b4d619008b074d562e4a322ea26fd"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
exports:
  - "ScriptRerankService"
---

# taskmanager/portable_lib/specialist/rerank-service.mjs

> Code module; exports ScriptRerankService

## Key Signals

- Source path: taskmanager/portable_lib/specialist/rerank-service.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Exports: ScriptRerankService

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/specialist/rerank-service.mjs

## Excerpt

~~~javascript
export class ScriptRerankService {
  constructor({ rerankerProvider }) {
    this.rerankerProvider = rerankerProvider;
  }

  async warm() {
    return this.rerankerProvider.warm();
  }

  async rerank({ request, candidates }) {
    const ranked = await this.rerankerProvider.rerank({ request, candidates });
    const out = Array.isArray(ranked) ? ranked : [];
    return {
      request,
      candidates: out,
      topCandidates: out.slice(0, 6),
    };
  }
}
~~~