---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/process-knowledge-listener.mjs"
source_name: "process-knowledge-listener.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 617
content_hash: "0d1f3a8d47dad58b42ca0147e723df3639fe63e21c0eaf8365f57ae8926bc240"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./optimizer-telemetry.mjs"
---

# taskmanager/portable_lib/process-knowledge-listener.mjs

> Code module; imports ./optimizer-telemetry.mjs

## Key Signals

- Source path: taskmanager/portable_lib/process-knowledge-listener.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./optimizer-telemetry.mjs

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/process-knowledge-listener.mjs

## Excerpt

~~~javascript
import { getLatestOsSnapshot, getLatestTelemetry } from "./optimizer-telemetry.mjs";
import {
  loadPendingEnrichmentQueue,
  loadSeenRegistry,
  savePendingEnrichmentQueue,
  saveSeenRegistry,
} from "./process-knowledge-registry.mjs";
import {
  buildProcessKnowledgeIdentity,
  fingerprintChangeReasons,
} from "./process-knowledge-identity.mjs";

const BASE_INTERVAL_MS = 8_000;
const SLOW_INTERVAL_MS = 30_000;
const MAX_SEEN_KEYS = 5_000;
const STALE_SNAPSHOT_MS = 60_000;

const IGNORED_PROCESS_NAMES = new Set([
  "csrss",
  "dwm",
  "fontdrvhost",
  "idle",
  "lsass",
  "registry",
  "services",
  "smss",
  "system",
  "system-idle-process",
~~~