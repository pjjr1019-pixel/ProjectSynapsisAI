---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/types/governed-actions.ts"
source_name: "governed-actions.ts"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescript"
extension: ".ts"
score: 80
selected_rank: 706
content_hash: "569e5018a93ee108df4f638eb24457f5cca137e12af9ef12399b18404be5a061"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "app-src"
  - "code"
  - "high-value"
  - "scripts"
  - "ts"
exports:
  - "interface"
  - "type"
---

# taskmanager/src/types/governed-actions.ts

> Code module; exports interface, type

## Key Signals

- Source path: taskmanager/src/types/governed-actions.ts
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescript
- Top level: taskmanager
- Score: 80
- Tags: app-src, code, high-value, scripts, ts
- Exports: interface, type

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, ts
- Source link target: taskmanager/src/types/governed-actions.ts

## Excerpt

~~~typescript
export type GovernedApprovalRisk = "low" | "medium" | "high" | "critical" | string;

export type GovernedApprovalScope = "dry_run" | "read_only" | "app_managed_write" | "user_approval" | "blocked" | string;

export type GovernedApprovalStatus = "pending" | "approved" | "declined" | string;

export type GovernedRunStatus = "approval_required" | "executed" | "failed";

export interface GovernedStepApproval {
  needsApproval: boolean;
  scope: GovernedApprovalScope;
  risk: GovernedApprovalRisk;
}

export interface GovernedWorkflowStep {
  action: string;
  args?: Record<string, unknown>;
  approval?: GovernedStepApproval;
}

export interface GovernedWorkflowPlan {
  workflow_id: string;
  source: string;
  message: string;
  dry_run: boolean;
  planner: string;
  steps: GovernedWorkflowStep[];
}
~~~