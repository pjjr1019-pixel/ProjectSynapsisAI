---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/optimizer-registry.mjs"
source_name: "optimizer-registry.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 654
content_hash: "68a0bcf4358af0c0d05c9ebc43db1a8d0c5b101aeec3af45e038108ff2f13710"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-runtime-settings.mjs"
  - "./optimizer-settings.mjs"
exports:
  - "ActionTier"
  - "applyOptimizerPreferences"
  - "clearRegistry"
  - "countActiveOfType"
  - "getAllModules"
  - "getModule"
  - "getModulesOfType"
  - "getOptimizerPreferences"
  - "getRegistrySummary"
  - "ignoreModule"
---

# taskmanager/portable_lib/optimizer-registry.mjs

> Code module; imports ./brain-runtime-settings.mjs, ./optimizer-settings.mjs; exports ActionTier, applyOptimizerPreferences, clearRegistry, countActiveOfType

## Key Signals

- Source path: taskmanager/portable_lib/optimizer-registry.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-runtime-settings.mjs, ./optimizer-settings.mjs
- Exports: ActionTier, applyOptimizerPreferences, clearRegistry, countActiveOfType, getAllModules, getModule

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/optimizer-registry.mjs

## Excerpt

~~~javascript
/**
 * Optimizer Module Registry
 *
 * Tracks all known app-managed modules, workers, tasks, and model runtimes.
 * Each registered module has a type, protection level, state, activity timestamps,
 * and resource hints. The registry is the single source of truth for the optimizer.
 *
 * Rules:
 * - CRITICAL modules (chat-pipeline, local-llm) are never auto-acted upon.
 * - Pinned modules are treated as keep-warm regardless of idle scores.
 * - neverAutoTouch modules skip all action tiers except OBSERVE.
 */

import { getCrawlerIds } from "./brain-runtime-settings.mjs";
import { readOptimizerSettings } from "./optimizer-settings.mjs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ModuleType = Object.freeze({
  CHAT_PIPELINE: "chat-pipeline",
  BRAIN_RUNTIME_CACHE: "brain-runtime-cache",
  SCENARIO_INDEX: "scenario-index",
  BM25_INDEX: "bm25-index",
  EMBEDDING_MODEL: "embedding-model",
  LOCAL_LLM: "local-llm",
  CRAWLER: "crawler",
~~~