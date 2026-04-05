---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-browser.mjs"
source_name: "brain-browser.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 579
content_hash: "365405371e97b9cce04d8e1b4761ad0ac1f0762ffa42399ffda2d558817ddaf1"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-local-llm.mjs"
  - "./brain-yaml.mjs"
  - "node:child_process"
  - "node:fs"
  - "node:path"
  - "node:process"
  - "node:url"
exports:
  - "resolveBrainBrowserPath"
---

# taskmanager/portable_lib/brain-browser.mjs

> Code module; imports ./brain-local-llm.mjs, ./brain-yaml.mjs, node:child_process, node:fs; exports resolveBrainBrowserPath

## Key Signals

- Source path: taskmanager/portable_lib/brain-browser.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-local-llm.mjs, ./brain-yaml.mjs, node:child_process, node:fs, node:path, node:process
- Exports: resolveBrainBrowserPath

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-browser.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn } from "node:child_process";
import process from "node:process";

import {
  firstParagraph,
  normalizeSlashes,
  sentenceFragments,
} from "./brain-build-utils.mjs";
import { completeLocalLlm, getLocalLlmConfig } from "./brain-local-llm.mjs";
import { extractFrontMatter, parseYaml } from "./brain-yaml.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const brainRoot = path.join(repoRoot, "brain");
const userBrainFilesManifestPath = path.join(repoRoot, ".horizons-user-brain-files.json");

const DEFAULT_FILE_PREVIEW_CHARS = 48_000;
const MAX_FULL_FILE_CHARS = 220_000;
const MAX_SUMMARY_SOURCE_CHARS = 16_000;
const MAX_SUMMARY_SOURCE_FILES = 6;
const MAX_SUMMARY_WALK_DEPTH = 2;
const RECENT_WINDOW_MS = 1000 * 60 * 60 * 72;
const DEFAULT_SEARCH_LIMIT = 2000;
const MAX_SEARCH_LIMIT = 5000;
const MAX_CONTENT_SEARCH_BYTES = 512_000;
~~~