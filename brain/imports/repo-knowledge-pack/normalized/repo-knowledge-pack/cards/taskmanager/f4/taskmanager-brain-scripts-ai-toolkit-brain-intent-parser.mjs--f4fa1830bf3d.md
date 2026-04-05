---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/ai-toolkit/brain-intent-parser.mjs"
source_name: "brain-intent-parser.mjs"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 112
selected_rank: 122
content_hash: "5a199ba1aeef19bde6824745b008987e4ee1735d345020b6c9ebd5f5b67c3283"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "mjs"
  - "neutral"
  - "scripts"
imports:
  - "../../../portable_lib/brain-calculator.mjs"
  - "../../../portable_lib/brain-query-decompose.mjs"
  - "../../../portable_lib/brain-query-normalize.mjs"
  - "../../../portable_lib/brain-scenario-fuzzy.mjs"
  - "../../../portable_lib/brain-scenario-lookup.mjs"
exports:
  - "describeIntent"
  - "parseBrainIntent"
---

# taskmanager/brain/scripts/ai-toolkit/brain-intent-parser.mjs

> Script surface; imports ../../../portable_lib/brain-calculator.mjs, ../../../portable_lib/brain-query-decompose.mjs, ../../../portable_lib/brain-query-normalize.mjs, ../../../portable_lib/brain-scenario-fuzzy.mjs; exports describeIntent, parseBrainIntent

## Key Signals

- Source path: taskmanager/brain/scripts/ai-toolkit/brain-intent-parser.mjs
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 112
- Tags: brain, brain-scripts, code, mjs, neutral, scripts
- Imports: ../../../portable_lib/brain-calculator.mjs, ../../../portable_lib/brain-query-decompose.mjs, ../../../portable_lib/brain-query-normalize.mjs, ../../../portable_lib/brain-scenario-fuzzy.mjs, ../../../portable_lib/brain-scenario-lookup.mjs
- Exports: describeIntent, parseBrainIntent

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, mjs, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/ai-toolkit/brain-intent-parser.mjs

## Excerpt

~~~javascript
import { prepareUserQuery } from "../../../portable_lib/brain-query-normalize.mjs";
import { tryMathReply } from "../../../portable_lib/brain-calculator.mjs";
import { lookupScenarioMatch } from "../../../portable_lib/brain-scenario-lookup.mjs";
import { lookupScenarioFuzzy } from "../../../portable_lib/brain-scenario-fuzzy.mjs";
import { decomposeQuery } from "../../../portable_lib/brain-query-decompose.mjs";

function classifyIntent(normalized, display) {
  const text = `${normalized} ${display}`.trim().toLowerCase();
  if (!text) return { intent: "empty", confidence: 1, params: {} };
  if (/^\s*(hi|hello|hey|help|support)\b/.test(text)) return { intent: "greeting", confidence: 0.98, params: {} };
  if (/\b(help|what can you do|commands|how do i)\b/.test(text)) return { intent: "help", confidence: 0.95, params: {} };
  if (/\b(cpu|memory|ram|gpu|hotspot|hot spots?|resource pressure|high[-\s]?cpu|high[-\s]?memory)\b/.test(text)) {
    return { intent: "analysis", confidence: 0.9, params: { focus: "hotspot" } };
  }
  if (/\b(compare|difference|vs|versus|between)\b/.test(text)) return { intent: "compare", confidence: 0.82, params: {} };
  if (/\b(show|list|find|open|run|launch|start)\b/.test(text)) return { intent: "task", confidence: 0.74, params: {} };
  return { intent: "query", confidence: 0.55, params: {} };
}

export function parseBrainIntent(rawQuery, opts = {}) {
  const display = String(rawQuery ?? "").trim();
  const prepared = prepareUserQuery(display, { profileName: opts.profileName });
  const mathReply = tryMathReply(display);
  const scenario = lookupScenarioMatch(prepared.normalized || display, { profileName: opts.profileName })
    || (prepared.normalized ? { reply: lookupScenarioFuzzy(prepared.normalized), explain: { source: "fuzzy" } } : null);
  const complex = decomposeQuery(prepared.normalized || display, { enabled: true });
  const classification = classifyIntent(prepared.normalized || display, display);
  const hotspotQuery = classification.params?.focus === "hotspot";
~~~