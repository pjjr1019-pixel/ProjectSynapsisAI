---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/optimizer-actions.mjs"
source_name: "optimizer-actions.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 650
content_hash: "5b3610dc1e7ecb0a66027d6b3948fdeabdd96d1d37e806fcf1ed06055eb6ccf4"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-idle-training.mjs"
  - "./optimizer-audit.mjs"
  - "./optimizer-policy.mjs"
  - "./optimizer-scoring.mjs"
exports:
  - "ActionResult"
  - "addRecommendation"
  - "async"
  - "getRecommendations"
---

# taskmanager/portable_lib/optimizer-actions.mjs

> Code module; imports ./brain-idle-training.mjs, ./optimizer-audit.mjs, ./optimizer-policy.mjs, ./optimizer-scoring.mjs; exports ActionResult, addRecommendation, async, getRecommendations

## Key Signals

- Source path: taskmanager/portable_lib/optimizer-actions.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-idle-training.mjs, ./optimizer-audit.mjs, ./optimizer-policy.mjs, ./optimizer-scoring.mjs
- Exports: ActionResult, addRecommendation, async, getRecommendations

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/optimizer-actions.mjs

## Excerpt

~~~javascript
/**
 * Optimizer Action Executor
 *
 * Executes safe optimizer actions. Every action:
 * 1. Re-checks hard safety rules
 * 2. Captures pre-action state snapshot
 * 3. Executes the action
 * 4. Updates module registry
 * 5. Records to audit log
 * 6. Returns a result object for the supervisor to schedule health checks
 *
 * Actions are intentionally limited to low-risk, reversible operations.
 * Higher-risk actions (kill-ingestion-worker, unload-model) are supported
 * only as RECOMMEND/APPROVE targets and must be confirmed by the user.
 */

import {
  setModuleCooldown,
  updateModuleState,
  noteModuleActivity,
  ModuleState,
  getModule,
} from "./optimizer-registry.mjs";
import { writeAuditEvent } from "./optimizer-audit.mjs";
import { riskScore } from "./optimizer-scoring.mjs";
import { evaluateHardRules } from "./optimizer-policy.mjs";
import { setIdleTrainingEnabled } from "./brain-idle-training.mjs";
import {
~~~