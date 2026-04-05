---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/optimizer-supervisor.mjs"
source_name: "optimizer-supervisor.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 82
selected_rank: 657
content_hash: "f41cf8dcfe8f4522dda9be020ec07384f2d156f268007b140551ea2cb836716d"
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
  - "./optimizer-registry.mjs"
exports:
  - "async"
  - "getSupervisorState"
  - "isActionTypeDisabled"
  - "isHealthGateOpen"
  - "resetSupervisor"
  - "runHealthCheck"
  - "scheduleHealthCheck"
---

# taskmanager/portable_lib/optimizer-supervisor.mjs

> Code module; imports ./brain-idle-training.mjs, ./optimizer-audit.mjs, ./optimizer-registry.mjs; exports async, getSupervisorState, isActionTypeDisabled, isHealthGateOpen

## Key Signals

- Source path: taskmanager/portable_lib/optimizer-supervisor.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 82
- Tags: code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-idle-training.mjs, ./optimizer-audit.mjs, ./optimizer-registry.mjs
- Exports: async, getSupervisorState, isActionTypeDisabled, isHealthGateOpen, resetSupervisor, runHealthCheck

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/optimizer-supervisor.mjs

## Excerpt

~~~javascript
/**
 * Optimizer Rollback / Health Supervisor
 *
 * After each AUTO action, the supervisor schedules a health check.
 * If the health check detects degradation, it triggers a rollback.
 *
 * Safety model:
 * - healthGateOpen starts as true (open = actions allowed)
 * - A failed health check closes the gate (no new AUTO actions)
 * - Gate reopens only when a subsequent health check passes
 * - After 3 rollbacks of the same action type within 1 hour: disable that action type
 * - After 2 consecutive failed health checks: disable ALL AUTO actions (kill-switch-like)
 */

import { ActionTier } from "./optimizer-registry.mjs";
import { writeAuditEvent } from "./optimizer-audit.mjs";
import { setIdleTrainingEnabled } from "./brain-idle-training.mjs";
import { updateModuleState, ModuleState } from "./optimizer-registry.mjs";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** Whether new AUTO actions are permitted. */
let healthGateOpen = true;

/** Count of consecutive failed health checks. */
let consecutiveFailedHealthChecks = 0;
~~~