---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "artifacts/integration_reports/latest/report.md"
source_name: "report.md"
top_level: "artifacts"
surface: "source"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 18
selected_rank: 4032
content_hash: "320c17b807ddee4cb417c17d12423a581bd7efaec9b6798e6c0ad6b34f4401da"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
  - "source"
  - "tests"
headings:
  - "Executive Summary"
  - "Features Detected"
---

# artifacts/integration_reports/latest/report.md

> Markdown doc; headings Executive Summary / Features Detected

## Key Signals

- Source path: artifacts/integration_reports/latest/report.md
- Surface: source
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: artifacts
- Score: 18
- Tags: docs, markdown, md, neutral, source, tests
- Headings: Executive Summary | Features Detected

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: artifacts, docs, markdown, md, neutral, source, tests
- Source link target: artifacts/integration_reports/latest/report.md

## Excerpt

~~~markdown
# Executive Summary

- Generated at: 2026-04-02T12:43:08+00:00
- Passed: 1
- Failed: 0
- Skipped not integrated: 0
- Skipped not wired: 0
- Skipped env: 0

# Features Detected

- Approvals timeline panel [partial] - Pending approvals are surfaced inside the Task Manager shell rather than as a dedicated tab. (evidence: taskmanager/src/App.tsx, taskmanager/server/http-routes.mjs)
- Approvals workflow [integrated] - Pending approvals are exposed through the Task Manager shell and governed action routes. (evidence: taskmanager/server/http-routes.mjs, taskmanager/src/App.tsx, taskmanager/portable_lib/governed-actions.mjs)
- Assistant state repository [partial] - Conversation snapshots exist, but a broader assistant-state repository contract is not explicit. (evidence: taskmanager/server/http-routes.mjs, taskmanager/server/conversation-snapshot-store.mjs)
- Audit logging [integrated] - Optimizer audit events are exposed over the API. (evidence: taskmanager/server/dev-api.mjs, taskmanager/portable_lib/optimizer-audit.mjs)
- Autonomy panel [partial] - Autonomy controls live inside the Optimizer surface instead of a dedicated panel.
- Backtest service [not_integrated] - No backtest service implementation was found.
- Benchmark panel [not_integrated] - No dedicated Benchmark panel is wired into the UI.
- Brain lookup flow [integrated] - Brain pipeline route exists. (evidence: taskmanager/server/dev-api.mjs)
- Brain root [integrated] - taskmanager/brain exists. (evidence: taskmanager/brain)
- Budget system [not_integrated] - No explicit model budget system was found.
- Bundled local dependencies [partial] - Dependencies are local to taskmanager, but no packaged bundle workflow was found. (evidence: taskmanager/package.json, taskmanager/PORTABILITY_REPORT.md)
- Chat panel [integrated] - Prompt dock and task-manager chat route are wired. (evidence: taskmanager/src/App.tsx)
- Compressor [not_integrated] - No dedicated compressor agent role was found.
- Crawler integration [integrated] - Idle training manages crawler queues and state. (evidence: taskmanager/portable_lib/brain-idle-training.mjs)
- Critic [not_integrated] - No dedicated critic agent role was found.
- DB wiring [not_integrated] - No database session/entity layer for financial services was found.
- Dataset registry [not_integrated] - No financial dataset registry implementation was found.
~~~