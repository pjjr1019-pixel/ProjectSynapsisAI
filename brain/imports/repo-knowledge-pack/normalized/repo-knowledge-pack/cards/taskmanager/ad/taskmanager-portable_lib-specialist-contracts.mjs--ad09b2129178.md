---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/specialist/contracts.mjs"
source_name: "contracts.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 661
content_hash: "48cc95046e3ba6a52f4d370254ceb12973062fe34a7884686707e0c9f86f6c2c"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
exports:
  - "classifyPolicyFromManifest"
  - "DEFAULT_ROUTER_RESULT"
  - "EXECUTION_MODES"
  - "EXECUTION_POLICIES"
  - "normalizeExecutionPolicy"
  - "SCRIPT_POLICY_CLASS"
  - "validateRouterDecision"
---

# taskmanager/portable_lib/specialist/contracts.mjs

> Code module; exports classifyPolicyFromManifest, DEFAULT_ROUTER_RESULT, EXECUTION_MODES, EXECUTION_POLICIES

## Key Signals

- Source path: taskmanager/portable_lib/specialist/contracts.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Exports: classifyPolicyFromManifest, DEFAULT_ROUTER_RESULT, EXECUTION_MODES, EXECUTION_POLICIES, normalizeExecutionPolicy, SCRIPT_POLICY_CLASS

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/specialist/contracts.mjs

## Excerpt

~~~javascript
export const EXECUTION_MODES = {
  NONE: "none",
  DRY_RUN: "dry_run",
  SUGGEST_ONLY: "suggest_only",
  ASK_FIRST: "ask_first",
  AUTORUN: "autorun",
};

export const EXECUTION_POLICIES = {
  DRY_RUN: "dry_run",
  SUGGEST_ONLY: "suggest_only",
  ASK_FIRST: "ask_first",
  AUTORUN_SAFE_ONLY: "autorun_safe_only",
  AUTORUN_WITH_POLICY: "autorun_with_policy",
};

export const SCRIPT_POLICY_CLASS = {
  READ_ONLY_SAFE: "read_only_safe",
  LOCAL_SAFE: "local_safe",
  STATE_MODIFYING: "state_modifying",
  SYSTEM_SENSITIVE: "system_sensitive",
  DESTRUCTIVE: "destructive",
  EXPERIMENTAL: "experimental",
};

export const DEFAULT_ROUTER_RESULT = {
  selected_script_id: null,
  selected_script_path: null,
~~~