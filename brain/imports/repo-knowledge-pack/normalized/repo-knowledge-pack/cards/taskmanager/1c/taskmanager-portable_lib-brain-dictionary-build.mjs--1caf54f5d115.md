---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-dictionary-build.mjs"
source_name: "brain-dictionary-build.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 8
selected_rank: 3432
content_hash: "161b4e13803a0d51bf138bbe7db17354345a96555712fdb4a2067487b9be6edf"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-text-tokens.mjs"
  - "node:fs"
  - "node:path"
exports:
  - "async"
  - "parseWebster1913Source"
---

# taskmanager/portable_lib/brain-dictionary-build.mjs

> Code module; imports ./brain-text-tokens.mjs, node:fs, node:path; exports async, parseWebster1913Source

## Key Signals

- Source path: taskmanager/portable_lib/brain-dictionary-build.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 8
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-text-tokens.mjs, node:fs, node:path
- Exports: async, parseWebster1913Source

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-dictionary-build.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import {
  ensureDir,
  sha256File,
  sha256Text,
  stableStringify,
  writeJsonStable,
} from "./brain-build-utils.mjs";
import {
  WEBSTER_1913_CORPUS_ID,
  WEBSTER_1913_PROJECT_URL,
  WEBSTER_1913_SOURCE_URL,
  WEBSTER_1913_TITLE,
  compactDictionaryTerm,
  dictionaryLookupKeys,
  ensureWebster1913Layout,
  entryShardNameForTerm,
  getWebster1913Paths,
  normalizeDictionaryTerm,
  readJsonlFile,
  relFromBrain,
  slugifyDictionaryTerm,
} from "./brain-dictionary-common.mjs";
import { tokenizeForRetrieval } from "./brain-text-tokens.mjs";

const PROJECT_GUTENBERG_START = "*** START OF THE PROJECT GUTENBERG EBOOK";
const PROJECT_GUTENBERG_END = "*** END OF THE PROJECT GUTENBERG EBOOK";
~~~