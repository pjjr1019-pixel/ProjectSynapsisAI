---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-idle-training.mjs"
source_name: "brain-idle-training.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 591
content_hash: "65bfc66e4707ff0a13c657ef3bf8fbd8399cd70bd00beb227f320ef9632b263a"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-ir-build.mjs"
  - "./brain-retrieval.mjs"
  - "./brain-runtime-layer.mjs"
  - "./brain-text-tokens.mjs"
  - "node:fs"
  - "node:path"
  - "node:url"
---

# taskmanager/portable_lib/brain-idle-training.mjs

> Code module; imports ./brain-ir-build.mjs, ./brain-retrieval.mjs, ./brain-runtime-layer.mjs, ./brain-text-tokens.mjs

## Key Signals

- Source path: taskmanager/portable_lib/brain-idle-training.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-ir-build.mjs, ./brain-retrieval.mjs, ./brain-runtime-layer.mjs, ./brain-text-tokens.mjs, node:fs, node:path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-idle-training.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";
import {
  ensureDir,
  normalizeSlashes,
  sha256Text,
  writeJsonStable,
} from "./brain-build-utils.mjs";
import { clearBrainRetrievalCache } from "./brain-retrieval.mjs";
import { buildBrainIrRuntime } from "./brain-ir-build.mjs";
import { clearBrainRuntimeCache, warmBrainRuntime } from "./brain-runtime-layer.mjs";
import {
  ensureBrainRuntimeHub,
  getBrainRuntimeHubPaths,
  migrateLegacyBrainRuntimeData,
} from "./brain-runtime-hub.mjs";
import {
  getCrawlerIds,
  getCrawlerSettings,
  readRuntimeSettings,
  summarizeCrawlerSettings,
  updateCrawlerSettings,
} from "./brain-runtime-settings.mjs";

const ROBOTS_CACHE_TTL_MS = 30 * 60 * 1000;
const SEEN_URL_TTL_MS = 24 * 60 * 60 * 1000;
~~~