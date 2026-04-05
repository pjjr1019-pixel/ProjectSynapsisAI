---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/core/recommended-local-llm-models.md"
source_name: "recommended-local-llm-models.md"
top_level: "taskmanager"
surface: "brain-core"
classification: "high-value"
kind: "markdown"
language: "markdown"
extension: ".md"
score: 106
selected_rank: 538
content_hash: "1a0edb4cfda2213a6e0d6067b99882ac0310fb346fc2670fb289ba45e9a9b96c"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-core"
  - "docs"
  - "high-value"
  - "markdown"
  - "md"
headings:
  - "Disclaimer"
  - "Examples (not endorsements)"
  - "How Horizons uses the model"
  - "RAM / VRAM"
  - "Recommended local LLM models (operators)"
---

# taskmanager/brain/core/recommended-local-llm-models.md

> Markdown doc; headings Disclaimer / Examples (not endorsements) / How Horizons uses the model

## Key Signals

- Source path: taskmanager/brain/core/recommended-local-llm-models.md
- Surface: brain-core
- Classification: high-value
- Kind: markdown
- Language: markdown
- Top level: taskmanager
- Score: 106
- Tags: brain, brain-core, docs, high-value, markdown, md
- Headings: Disclaimer | Examples (not endorsements) | How Horizons uses the model | RAM / VRAM | Recommended local LLM models (operators)

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-core, docs, high-value, markdown, md, taskmanager
- Source link target: taskmanager/brain/core/recommended-local-llm-models.md

## Excerpt

~~~markdown
# Recommended local LLM models (operators)

Human-maintained hints for running Horizons with **Ollama**, **LM Studio**, or any **OpenAI-compatible** `/v1/chat/completions` endpoint. Upstream model names and quantization tags change often — verify with `ollama list` or your vendor docs before relying on a name.

## How Horizons uses the model

| `LOCAL_LLM_MODE` | Role |
|------------------|------|
| `refine` | Polish a **non-LLM draft** (scenario → retrieval → fallback). Prefer **small, fast** instruct models and **low temperature**. |
| `fallback` | Generate only when scenario **and** retrieval both miss. Slightly larger models are acceptable. |
| `always` | Full generation with brain context every turn. Heavier models possible; watch latency and VRAM. |

See `scripts/lib/brain-local-llm.mjs` for env vars (`LOCAL_LLM_REFINE_TEMPERATURE`, etc.).

## Examples (not endorsements)

**Refine / low-latency polish** — small instruct chat models, ~4–9 GB typical for Q4 quants (varies by implementation):

- Llama 3.x / 3.2 **small** instruct family (Ollama tags vary: `llama3.2`, `llama3.2:3b`, etc.)
- Mistral **small** / Nemo-class instruct variants
- Phi family (e.g. Phi-3/4 **mini**/small instruct where available)
- Qwen **2.5** smaller instruct variants

**Fallback / general local chat** — when the draft pipeline misses:

- Same as above, or one size up if quality is thin.

**Always / heavy context** — optional:
~~~