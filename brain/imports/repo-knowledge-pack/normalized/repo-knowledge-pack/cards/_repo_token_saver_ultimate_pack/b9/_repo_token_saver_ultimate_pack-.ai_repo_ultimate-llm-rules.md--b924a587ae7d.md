---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "_repo_token_saver_ultimate_pack/.ai_repo_ultimate/llm-rules.md"
source_name: "llm-rules.md"
top_level: "_repo_token_saver_ultimate_pack"
surface: "source"
classification: "neutral"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 14
selected_rank: 4354
content_hash: "bbf750846f91b721c334c8ca421c8fb2a06ab6218f7dabce69b208ffa56b1aab"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "docs"
  - "markdown"
  - "md"
  - "neutral"
  - "source"
headings:
  - "Core Rules"
  - "Default Avoid List"
  - "First-Read Defaults"
  - "Heavy Folders To Avoid On Pass One"
  - "LLM Repo Rules"
---

# _repo_token_saver_ultimate_pack/.ai_repo_ultimate/llm-rules.md

> Markdown doc; headings Core Rules / Default Avoid List / First-Read Defaults

## Key Signals

- Source path: _repo_token_saver_ultimate_pack/.ai_repo_ultimate/llm-rules.md
- Surface: source
- Classification: neutral
- Kind: markdown
- Language: markdown
- Top level: _repo_token_saver_ultimate_pack
- Score: 14
- Tags: docs, markdown, md, neutral, source
- Headings: Core Rules | Default Avoid List | First-Read Defaults | Heavy Folders To Avoid On Pass One | LLM Repo Rules

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: _repo_token_saver_ultimate_pack, docs, markdown, md, neutral, source
- Source link target: _repo_token_saver_ultimate_pack/.ai_repo_ultimate/llm-rules.md

## Excerpt

~~~markdown
# LLM Repo Rules

Generated: 2026-04-01T15:02:46.486Z
Repo root: C:\Users\Pgiov\OneDrive\Documents\Custom programs\Horizons.AI\_repo_token_saver_ultimate_pack

Use these rules when handing work to a coding model so it spends fewer tokens and chooses better files first.

## Core Rules

- Read the smallest high-value docs, manifests, and entrypoints first.
- Prefer canonical source over generated runtime output, indexes, caches, or packaging artifacts.
- Do not start in node_modules, dist, build, coverage, .runtime, or retrieval indexes unless the task explicitly requires them.
- Before editing package.json, confirm it is the real app/package owner and not a vendored dependency manifest.
- Split reasoning by surface: desktop shell, renderer UI, local API/server, shared contracts, portable/runtime helpers.
- When a change touches generated output, identify the upstream canonical source before editing the generated file.

## First-Read Defaults

- package.json
- package-lock.json
- package.standalone.json
- README.md
- READ_FIRST.md
- DEPENDENCY_AUDIT.md
- desktop/main.cjs
- desktop/runtime-host.cjs
- server/dev-api.mjs
- src/main.tsx
~~~