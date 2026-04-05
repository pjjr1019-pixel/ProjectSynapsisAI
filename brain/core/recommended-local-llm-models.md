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

- Larger instruct models if VRAM allows; **refine** mode usually does **not** need the largest weights.

## RAM / VRAM

- Rules of thumb only: **3B–4B** quants often fit **8 GB** VRAM for short contexts; **7B–8B** often want **8–12+ GB** depending on context length and backend.
- CPU-only Ollama is possible but **refine** may feel slow; prefer GPU for interactive use.

## Disclaimer

Model identifiers, licenses, and safety behaviors are defined by their publishers. Horizons does not ship model weights; you pull and run them under your own policy.
