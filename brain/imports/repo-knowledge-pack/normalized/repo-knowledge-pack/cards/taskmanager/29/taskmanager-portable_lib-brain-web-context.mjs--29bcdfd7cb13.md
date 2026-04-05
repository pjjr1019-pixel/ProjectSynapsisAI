---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-web-context.mjs"
source_name: "brain-web-context.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 613
content_hash: "6e55288cbf78c0b3c37848d261c30ad3609181e6ec33582837def05ce23a722b"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./provider-usage-telemetry.mjs"
  - "node:process"
exports:
  - "async"
  - "consumeInternetRateSlot"
  - "getInternetProvider"
  - "getTavilyApiKey"
  - "isInternetConfigured"
  - "isInternetFeatureEnabled"
  - "isTavilyConfigured"
  - "WEB_COMPLETE_SYSTEM_SUFFIX"
  - "WEB_REFINE_SYSTEM_SUFFIX"
---

# taskmanager/portable_lib/brain-web-context.mjs

> Code module; imports ./provider-usage-telemetry.mjs, node:process; exports async, consumeInternetRateSlot, getInternetProvider, getTavilyApiKey

## Key Signals

- Source path: taskmanager/portable_lib/brain-web-context.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./provider-usage-telemetry.mjs, node:process
- Exports: async, consumeInternetRateSlot, getInternetProvider, getTavilyApiKey, isInternetConfigured, isInternetFeatureEnabled

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-web-context.mjs

## Excerpt

~~~javascript
/**
 * Optional web search context for local LLM turns (server-side only).
 *
 * Provider selection:
 * - If `HORIZONS_TAVILY_API_KEY` (or `TAVILY_API_KEY`) is set, use Tavily.
 * - Otherwise fall back to DuckDuckGo HTML search (free, no key, best-effort).
 *
 * Env:
 *   HORIZONS_TAVILY_API_KEY — optional; preferred provider when set
 *   HORIZONS_INTERNET_ENABLED — set 0/false/off to disable regardless of client
 *   HORIZONS_INTERNET_PROVIDER — optional: auto | tavily | duckduckgo (default auto)
 *   HORIZONS_TAVILY_TIMEOUT_MS — default 12000
 *   HORIZONS_TAVILY_MAX_RESULTS — default 5 (capped 8)
 *   HORIZONS_DDG_TIMEOUT_MS — default 10000
 *   HORIZONS_DDG_MAX_RESULTS — default 5 (capped 8)
 *   HORIZONS_WEB_CONTEXT_MAX_CHARS — default 6000
 *   HORIZONS_INTERNET_MAX_PER_MINUTE — default 30 (per client key, sliding window)
 */
import process from "node:process";
import { recordProviderFailure, recordProviderSuccess } from "./provider-usage-telemetry.mjs";

const TAVILY_URL = "https://api.tavily.com/search";
const DDG_HTML_URL = "https://html.duckduckgo.com/html/";

const WEB_BLOCK_HEADER = "### Web search snippets (untrusted third-party text)";

/** @type {Map<string, { count: number, windowStart: number }>} */
const rateBuckets = new Map();
~~~