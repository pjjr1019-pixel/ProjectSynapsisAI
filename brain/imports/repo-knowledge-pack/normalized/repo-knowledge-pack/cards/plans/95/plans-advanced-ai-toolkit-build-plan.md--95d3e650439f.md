---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "plans/advanced-ai-toolkit-build-plan.md"
source_name: "advanced-ai-toolkit-build-plan.md"
top_level: "plans"
surface: "plans"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: -46
selected_rank: 3488
content_hash: "51bf7be2ae74e5d13dd0fe068aeccd18fd57bed9beb1f325490ae73d7792e721"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
  - "plans"
headings:
  - "Advanced Small AI Capability Toolkit — Build Plan"
  - "Final End-to-End Check"
  - "Phase 1 — Task Manager Gaps"
  - "Phase 2 — Assistant Planning Pipeline"
  - "Phase 3 — Validation & Resilience"
  - "Phase 4 — Advanced Automation"
  - "Summary"
---

# plans/advanced-ai-toolkit-build-plan.md

> Markdown doc; headings Advanced Small AI Capability Toolkit — Build Plan / Final End-to-End Check / Phase 1 — Task Manager Gaps

## Key Signals

- Source path: plans/advanced-ai-toolkit-build-plan.md
- Surface: plans
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: plans
- Score: -46
- Tags: docs, markdown, md, neutral, plans
- Headings: Advanced Small AI Capability Toolkit — Build Plan | Final End-to-End Check | Phase 1 — Task Manager Gaps | Phase 2 — Assistant Planning Pipeline | Phase 3 — Validation & Resilience | Phase 4 — Advanced Automation

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: docs, markdown, md, neutral, plans
- Source link target: plans/advanced-ai-toolkit-build-plan.md

## Excerpt

~~~markdown
# Advanced Small AI Capability Toolkit — Build Plan

## Summary

Building 16 new `.mjs` modules into `taskmanager/portable_lib/` based on the deep research report. The goal is to surround the existing AI assistant and task manager with deterministic scaffolding — planning, decomposition, validation, telemetry, and safe execution — so the small LLM feels substantially more capable.

**~12 of the 25 modules from the report already exist** (optimizer-telemetry, optimizer-audit, optimizer-scoring, optimizer-control-loop, optimizer-policy, optimizer-actions, optimizer-supervisor, system-metrics-service, process-monitor-service, safe-process-controller, optimizer-registry, brain-session-store). Do not rebuild those.

**What's being added:**

| Phase | New Modules | Purpose |
|---|---|---|
| 1 — TM Gaps | 6 optimizer modules | Fill missing task manager pieces (hotspot detection, process trees, startup analysis, health explanations, state machine, task queue) |
| 2 — Assistant Pipeline | 5 brain modules | Full intent → decompose → plan → select → compile pipeline |
| 3 — Validation | 3 brain modules | Response validation, retry logic, unified memory cache |
| 4 — Automation | 2 brain modules | Macro engine + context builder |

All files: `taskmanager/portable_lib/`, named `optimizer-*.mjs` (task manager domain) or `brain-*.mjs` (assistant domain), pure ESM, no new npm deps.

---

## Phase 1 — Task Manager Gaps

- [ ] **Create `optimizer-hotspot-detector.mjs`**
  - Detects processes/modules using >80% CPU, >70% RAM, >85% GPU
  - Inputs: telemetry snapshot + module list
  - Output: `{ hotspots: [{name, pid, resource, pct, severity}], checkedAt }`
  - Import from: `optimizer-scoring.mjs`, `optimizer-telemetry.mjs`
~~~