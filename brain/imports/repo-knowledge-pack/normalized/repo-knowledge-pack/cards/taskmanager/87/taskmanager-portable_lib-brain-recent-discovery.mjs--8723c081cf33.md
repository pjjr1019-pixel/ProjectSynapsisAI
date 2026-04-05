---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-recent-discovery.mjs"
source_name: "brain-recent-discovery.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 603
content_hash: "fd394859d24a86dd911d7fdb8ee7ce1a1fc39ded13d7e02e40d00ce26d91da69"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-build-utils.mjs"
  - "./brain-runtime-layer.mjs"
  - "./brain-text-tokens.mjs"
exports:
  - "buildRecentBrainReply"
  - "collectRecentBrainDiscovery"
  - "detectRecentBrainIntent"
---

# taskmanager/portable_lib/brain-recent-discovery.mjs

> Code module; imports ./brain-build-utils.mjs, ./brain-runtime-layer.mjs, ./brain-text-tokens.mjs; exports buildRecentBrainReply, collectRecentBrainDiscovery, detectRecentBrainIntent

## Key Signals

- Source path: taskmanager/portable_lib/brain-recent-discovery.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-build-utils.mjs, ./brain-runtime-layer.mjs, ./brain-text-tokens.mjs
- Exports: buildRecentBrainReply, collectRecentBrainDiscovery, detectRecentBrainIntent

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-recent-discovery.mjs

## Excerpt

~~~javascript
import { compareStrings } from "./brain-build-utils.mjs";
import { loadAllNormalizedDocs, loadProfileRetrievalMap } from "./brain-runtime-layer.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";

const GENERIC_RECENT_TERMS = new Set([
  "added",
  "any",
  "been",
  "brain",
  "bring",
  "can",
  "data",
  "has",
  "info",
  "information",
  "knowledge",
  "latest",
  "learned",
  "learning",
  "me",
  "my",
  "new",
  "newly",
  "recent",
  "recently",
  "scraped",
  "scraping",
  "search",
~~~