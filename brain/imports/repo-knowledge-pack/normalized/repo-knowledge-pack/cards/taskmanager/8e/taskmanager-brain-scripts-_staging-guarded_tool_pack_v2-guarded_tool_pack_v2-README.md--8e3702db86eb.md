---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/_staging/guarded_tool_pack_v2/guarded_tool_pack_v2/README.md"
source_name: "README.md"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 122
selected_rank: 19
content_hash: "370e25b817374fd6dc956e1ba306b529f986391aea09a7b56855210ae822c83d"
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
  - "Counts"
  - "Example policy files"
  - "Fast start"
  - "Guarded mutation examples"
  - "Guarded Tool Pack v2"
  - "Notes"
  - "Registry files"
---

# taskmanager/brain/scripts/_staging/guarded_tool_pack_v2/guarded_tool_pack_v2/README.md

> Script surface; headings Counts / Example policy files / Fast start

## Key Signals

- Source path: taskmanager/brain/scripts/_staging/guarded_tool_pack_v2/guarded_tool_pack_v2/README.md
- Surface: brain-scripts
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 122
- Tags: brain, brain-scripts, docs, markdown, md, neutral, scripts
- Headings: Counts | Example policy files | Fast start | Guarded mutation examples | Guarded Tool Pack v2 | Notes

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, docs, markdown, md, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/_staging/guarded_tool_pack_v2/guarded_tool_pack_v2/README.md

## Excerpt

~~~markdown
# Guarded Tool Pack v2

A compact **Node.js** tool pack for a lower-level orchestrator AI.

This pack focuses on:
- process inspection
- service inspection
- startup inspection
- network inspection
- temp cleanup preview
- guarded mutation tools with **approval + dry-run**
- registry search so an AI can find tools fast

## Counts

- Total tools: **114**
- Risk summary:
  - low: 106
  - high: 7
  - critical: 1

## Fast start

```bash
node run-tool.js registry_search --query "top cpu"
node run-tool.js list_processes --limit 20
node run-tool.js top_memory_processes --limit 15
node run-tool.js running_services --limit 30
~~~