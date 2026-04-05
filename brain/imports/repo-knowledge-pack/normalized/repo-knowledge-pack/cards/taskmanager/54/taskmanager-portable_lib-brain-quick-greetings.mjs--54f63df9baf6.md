---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-quick-greetings.mjs"
source_name: "brain-quick-greetings.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 602
content_hash: "459b624dffeca828b71c238f4142c813d3101a82cd6ebc543ad137249e753556"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
exports:
  - "normalizeForQuickIntent"
  - "QUICK_INTENT_KEYS"
  - "tryQuickGreeting"
---

# taskmanager/portable_lib/brain-quick-greetings.mjs

> Code module; exports normalizeForQuickIntent, QUICK_INTENT_KEYS, tryQuickGreeting

## Key Signals

- Source path: taskmanager/portable_lib/brain-quick-greetings.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Exports: normalizeForQuickIntent, QUICK_INTENT_KEYS, tryQuickGreeting

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-quick-greetings.mjs

## Excerpt

~~~javascript
/**
 * Ultra-short exact-match replies (one-line pleasantries and help).
 * Used when the scenario index is missing or before AC lookup when no local LLM runs
 * (see brain-chat-reply.mjs). Keep this list small: broader “common AI” intents live in
 * brain/apps/assistant/knowledge/scenarios/sources/00-core-common-intents.jsonl (merged
 * first into scenario-index.json). Strings here intentionally align with those flows.
 */

const BASE_GREET =
  "Hi — I'm Horizons AI. I can help with the launcher, your apps (Assistant, Financial, Work, Social, Life, Intel), and general questions. Say **help** anytime.";

const BASE_HELP =
  "Horizons AI is your shell assistant: open apps from the grid, run focused chats per surface, and pull answers from the **brain** knowledge base. Try naming a surface (e.g. Financial, Social) in your message.";

const BASE_KNOWLEDGE =
  "Without Local AI, I still answer from a few built-in paths: **scripted intents** (e.g. **help**, hi), the **Horizons brain** (indexed knowledge — stronger when you name an area like Work or Financial), a **calculator** for math and short phrases like “add 10 to 30,” and **saved Q&A** from past turns when Local AI had stored them. If nothing matches well, I ask you to name an area or say **help**. Turn **Local AI** on for open-ended questions from your machine.";

const BASE_THANKS = "You're welcome — glad to help. Ask anything else when you're ready.";
const BASE_BYE = "Goodbye — I'll be here when you come back.";
const BASE_OK = "Sounds good. Tell me what you'd like to do next.";

const EXACT = new Map([
  ["hi", BASE_GREET],
  ["hey", BASE_GREET],
  ["hello", BASE_GREET],
  ["yo", BASE_GREET],
  ["sup", BASE_GREET],
  ["hiya", BASE_GREET],
~~~