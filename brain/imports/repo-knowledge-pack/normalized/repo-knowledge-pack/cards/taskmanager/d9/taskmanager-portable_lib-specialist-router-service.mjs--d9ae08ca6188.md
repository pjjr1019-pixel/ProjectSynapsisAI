---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/specialist/router-service.mjs"
source_name: "router-service.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 670
content_hash: "e4eab082304c7726aa647be9e5f5c8edfdb821bd43191f104ac959418cd1cc58"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
exports:
  - "ScriptRouterService"
---

# taskmanager/portable_lib/specialist/router-service.mjs

> Code module; exports ScriptRouterService

## Key Signals

- Source path: taskmanager/portable_lib/specialist/router-service.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Exports: ScriptRouterService

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/specialist/router-service.mjs

## Excerpt

~~~javascript
import {
  DEFAULT_ROUTER_RESULT,
  EXECUTION_MODES,
  EXECUTION_POLICIES,
  SCRIPT_POLICY_CLASS,
  normalizeExecutionPolicy,
  validateRouterDecision,
} from "./contracts.mjs";

function decideExecutionMode(policy, candidate, confidence) {
  const safetyClass = String(candidate?.policy_class || SCRIPT_POLICY_CLASS.LOCAL_SAFE);

  if (policy === EXECUTION_POLICIES.DRY_RUN) return EXECUTION_MODES.DRY_RUN;
  if (policy === EXECUTION_POLICIES.SUGGEST_ONLY) return EXECUTION_MODES.SUGGEST_ONLY;

  if (policy === EXECUTION_POLICIES.AUTORUN_SAFE_ONLY) {
    if (confidence < 0.8) return EXECUTION_MODES.ASK_FIRST;
    if (safetyClass === SCRIPT_POLICY_CLASS.READ_ONLY_SAFE || safetyClass === SCRIPT_POLICY_CLASS.LOCAL_SAFE) {
      return EXECUTION_MODES.AUTORUN;
    }
    return EXECUTION_MODES.ASK_FIRST;
  }

  if (policy === EXECUTION_POLICIES.AUTORUN_WITH_POLICY) {
    if (confidence < 0.9) return EXECUTION_MODES.ASK_FIRST;
    if (safetyClass === SCRIPT_POLICY_CLASS.DESTRUCTIVE || safetyClass === SCRIPT_POLICY_CLASS.SYSTEM_SENSITIVE) {
      return EXECUTION_MODES.ASK_FIRST;
    }
~~~