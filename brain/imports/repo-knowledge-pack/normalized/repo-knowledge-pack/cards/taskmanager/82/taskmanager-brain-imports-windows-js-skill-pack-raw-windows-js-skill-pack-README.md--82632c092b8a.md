---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/README.md"
source_name: "README.md"
top_level: "taskmanager"
surface: "brain-imports"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 75
selected_rank: 3902
content_hash: "4a23842b33ed894324737126b6febb6aecc41bf0f355a0185ebd1470247f5df0"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-imports"
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
imports:
  - "./src"
headings:
  - "CLI examples"
  - "Coverage"
  - "Extending it"
  - "Integrating into your app"
  - "Reality check"
  - "Safety model suggestion"
  - "What is inside"
  - "Windows JS Skill Pack"
---

# taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/README.md

> Markdown doc; imports ./src; headings CLI examples / Coverage / Extending it

## Key Signals

- Source path: taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/README.md
- Surface: brain-imports
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 75
- Tags: brain, brain-imports, docs, markdown, md, neutral
- Imports: ./src
- Headings: CLI examples | Coverage | Extending it | Integrating into your app | Reality check | Safety model suggestion

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-imports, docs, markdown, md, neutral, taskmanager
- Source link target: taskmanager/brain/imports/windows-js-skill-pack/raw/windows-js-skill-pack/README.md

## Excerpt

~~~markdown
# Windows JS Skill Pack

This package gives your app a **cheap-model-friendly** Windows action library.

It is designed so a low-cost model can:
1. search a local registry of approved skills,
2. choose the best match,
3. execute a safe launcher,
4. avoid inventing raw shell commands.

## What is inside

- `INDEX.json` — machine-readable full skill index
- `INDEX.md` — human-readable overview
- `src/data/*.js` — category source files
- `src/skillRegistry.js` — loads and searches the local registry
- `src/router.js` — resolves exact IDs or fuzzy natural-language matches
- `src/executors/*` — actual launch logic
- `src/cli.js` — local CLI for testing
- `src/createIndex.js` — rebuilds the JSON index from the source modules

## Coverage

Current skill count: **259**
- Settings pages: **195**
- Control Panel items: **19**
- System tools: **30**
- Shell folders: **15**
~~~