---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/windows/INTEGRATION_NOTES.md"
source_name: "INTEGRATION_NOTES.md"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 106
selected_rank: 546
content_hash: "8c11dbbb21d6e5480584aa42b5d24eab9d5cb9e8f10d17d23d5a5340d4f96717"
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
  - "App Discovery"
  - "Chat Routing"
  - "Coverage Boundary"
  - "Logging"
  - "Next Step"
  - "Safe Execution"
  - "Windows Skill Pack Integration Notes"
---

# taskmanager/brain/scripts/windows/INTEGRATION_NOTES.md

> Script surface; headings App Discovery / Chat Routing / Coverage Boundary

## Key Signals

- Source path: taskmanager/brain/scripts/windows/INTEGRATION_NOTES.md
- Surface: brain-scripts
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 106
- Tags: brain, brain-scripts, docs, markdown, md, neutral, scripts
- Headings: App Discovery | Chat Routing | Coverage Boundary | Logging | Next Step | Safe Execution

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, docs, markdown, md, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/windows/INTEGRATION_NOTES.md

## Excerpt

~~~markdown
# Windows Skill Pack Integration Notes

## App Discovery
- Discover pack through scripts/windows/INDEX.json and compact registries.
- Preserve provenance from imports/windows-js-skill-pack/manifests.

## Chat Routing
- Resolve via aliases first, then ranked search.
- If confidence is low, return top 3 candidates for user choice.

## Safe Execution
- Validate parameters before execution.
- Use dry-run when available.
- Require explicit confirmation for risky/admin actions.

## Logging
- Log query, resolved skill id, executor, confidence, and result.

## Coverage Boundary
- This pack covers many Windows Settings, Control Panel items, tools, folders, and launch targets.
- It does not guarantee perfect interaction with every possible Windows UI window.
- Deeper arbitrary UI control should use a future UI Automation layer.

## Next Step
- Add a dedicated UI Automation executor bridge with strict safety policy.
~~~