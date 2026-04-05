---
id: hz.core.retrieval-contract.2026-03-27
title: "Retrieval contract"
domain: core
app: core
kind: policy
status: canonical
confidence: 0.95
provenance:
  sourceType: internal
  sourceId: brain/MANIFEST.yaml
  ingestedAt: "2026-03-27T12:00:00Z"
  verifiedBy: platform-seed
tags:
  - retrieval
  - rag
visibility: system
reviewedAt: "2026-03-27T12:00:00Z"
---

# Retrieval contract

## Inputs

- `retrievalProfile`: string (e.g. `repo-knowledge-pack`) from `MANIFEST.yaml` surfaces.
- `docIds` / chunk filters: optional; must respect `visibility` and `status` (default: `canonical` only in production).

## Outputs

- Chunks from `brain/retrieval/indexes/chunks.jsonl` joined by `chunkId` to future embedding rows.
- Provenance and `confidence` must flow to the model; low-confidence chunks should be labeled in context assembly.

## Rules

- Do not retrieve from `draft/` or `pipeline/research/intake/` unless `allowDraft=true` (dev) or explicit user opt-in.
- User memory: only load records matching current user and sensitivity policy.

## Profiles

- Load [`../retrieval/profiles.json`](../retrieval/profiles.json) by the surface’s `defaultRetrievalProfile` from [`../MANIFEST.yaml`](../MANIFEST.yaml).
- Filter [`../retrieval/indexes/chunks.jsonl`](../retrieval/indexes/chunks.jsonl) with the profile’s `includeDomains`, `allowDraft`, `minConfidence`, and `importLibrary` (see [`../imports/base-knowledge/RETRIEVAL_STRATEGY.md`](../imports/base-knowledge/RETRIEVAL_STRATEGY.md)).
- Reference implementation: [`../../scripts/lib/brain-retrieval.mjs`](../../scripts/lib/brain-retrieval.mjs).
