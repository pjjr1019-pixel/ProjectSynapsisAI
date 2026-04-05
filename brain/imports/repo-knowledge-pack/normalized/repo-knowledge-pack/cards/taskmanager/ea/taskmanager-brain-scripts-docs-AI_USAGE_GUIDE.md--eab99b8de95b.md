---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/docs/AI_USAGE_GUIDE.md"
source_name: "AI_USAGE_GUIDE.md"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 108
selected_rank: 476
content_hash: "ae13bacea6da89a65313a40f784bb61638e29bc84b406bf7397c329212847e90"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
  - "scripts"
headings:
  - "AI Usage Guide"
  - "Aliases and playbooks"
  - "How to find tools fast"
  - "Notes for orchestration"
  - "Registry"
  - "Repo knowledge pack"
  - "Risk model"
  - "Runner usage"
---

# taskmanager/brain/scripts/docs/AI_USAGE_GUIDE.md

> Script surface; headings AI Usage Guide / Aliases and playbooks / How to find tools fast

## Key Signals

- Source path: taskmanager/brain/scripts/docs/AI_USAGE_GUIDE.md
- Surface: brain-scripts
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 108
- Tags: brain, brain-scripts, docs, markdown, md, neutral, scripts
- Headings: AI Usage Guide | Aliases and playbooks | How to find tools fast | Notes for orchestration | Registry | Repo knowledge pack

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, docs, markdown, md, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/docs/AI_USAGE_GUIDE.md

## Excerpt

~~~markdown
# AI Usage Guide

This pack provides a Windows-backed Task Manager style tool layer for AI orchestration.

## Registry

- Registry index: `registry/tools_index.json`
- Aliases: `registry/tool_aliases.json`
- Playbooks: `registry/playbooks.json`
- Quick lookup: `registry/TOOL_QUICK_LOOKUP.md`

## How to find tools fast

1. Run `node run-tool.js registry_search --query "<intent>"`.
2. Read the top tool ids and aliases.
3. Run the tool by id with explicit arguments.

## Risk model

- `low`: read-only inspection.
- `medium`: limited or reversible action with dry-run support.
- `high`: destructive or service/process control action and requires approval.
- `critical`: protected or stability-sensitive action and requires approval.

Current counts: {"total":55,"risks":{"low":50,"medium":0,"high":5,"critical":0},"categories":{"process":17,"system":8,"services":9,"startup":6,"network":5,"cleanup":6,"policy":4}}

## Aliases and playbooks
~~~