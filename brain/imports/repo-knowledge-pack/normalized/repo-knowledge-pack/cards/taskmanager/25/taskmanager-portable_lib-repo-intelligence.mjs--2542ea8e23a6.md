---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/repo-intelligence.mjs"
source_name: "repo-intelligence.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 622
content_hash: "1dc81dd978d4bd4b27a5dd665430bdaf7fac0b61c9c2bfce7625714fb798f026"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-yaml.mjs"
  - "node:fs"
  - "node:path"
  - "node:url"
exports:
  - "REPO_INTELLIGENCE_SCHEMA_VERSION"
---

# taskmanager/portable_lib/repo-intelligence.mjs

> Code module; imports ./brain-yaml.mjs, node:fs, node:path, node:url; exports REPO_INTELLIGENCE_SCHEMA_VERSION

## Key Signals

- Source path: taskmanager/portable_lib/repo-intelligence.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-yaml.mjs, node:fs, node:path, node:url
- Exports: REPO_INTELLIGENCE_SCHEMA_VERSION

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/repo-intelligence.mjs

## Excerpt

~~~javascript
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureDir,
  normalizeSlashes,
  relPath,
  stableStringify,
  writeJsonStable,
} from "./brain-build-utils.mjs";
import { parseYaml } from "./brain-yaml.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const generatedRoot = path.join(repoRoot, "repo-intelligence");
const repoSupportRoot = path.join(repoRoot, "repo-support");
const agentsPath = path.join(repoRoot, "AGENTS.md");
const repoMapPath = path.join(repoRoot, "REPO_MAP.yaml");
const sourceScriptPath = path.join(repoRoot, "scripts", "lib", "repo-intelligence.mjs");

export const REPO_INTELLIGENCE_SCHEMA_VERSION = "1.0";

const REQUIRED_SYSTEM_IDS = [
  "repo.root",
  "repo.docs",
  "repo.ui.landing",
  "repo.server",
  "repo.desktop",
~~~