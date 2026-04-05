---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/indexing/tool_catalog.js"
source_name: "tool_catalog.js"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 122
selected_rank: 27
content_hash: "f8d3e114f1004615e972578c73270e72213715c2bf936481cdb0829402fe6a53"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "index"
  - "js"
  - "neutral"
  - "scripts"
---

# taskmanager/brain/scripts/indexing/tool_catalog.js

> Script surface

## Key Signals

- Source path: taskmanager/brain/scripts/indexing/tool_catalog.js
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 122
- Tags: brain, brain-scripts, code, index, js, neutral, scripts

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, index, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/indexing/tool_catalog.js

## Excerpt

~~~javascript
const CATEGORY_DEFAULTS = {
  process: {
    tags: ["process", "task-manager", "windows"],
    risk_level: "low",
    requires_confirmation: false,
    supports_dry_run: false,
    estimated_runtime: "low",
    platform: ["windows"],
    dependencies: ["node", "powershell"],
    side_effects: [],
    success_criteria: ["Tool returned structured output."],
    failure_modes: ["Windows process query unavailable.", "Permission denied.", "Target not found."],
  },
  system: {
    tags: ["system", "health", "windows"],
    risk_level: "low",
    requires_confirmation: false,
    supports_dry_run: false,
    estimated_runtime: "low",
    platform: ["windows"],
    dependencies: ["node", "powershell"],
    side_effects: [],
    success_criteria: ["Tool returned structured output."],
    failure_modes: ["Windows performance counters unavailable.", "Permission denied."],
  },
  services: {
    tags: ["service", "windows", "control"],
    risk_level: "low",
~~~