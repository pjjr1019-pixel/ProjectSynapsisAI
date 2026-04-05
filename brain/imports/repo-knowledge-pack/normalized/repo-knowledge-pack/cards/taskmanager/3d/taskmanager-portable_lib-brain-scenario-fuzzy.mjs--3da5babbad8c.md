---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/portable_lib/brain-scenario-fuzzy.mjs"
source_name: "brain-scenario-fuzzy.mjs"
top_level: "taskmanager"
surface: "portable-lib"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 88
selected_rank: 608
content_hash: "78feb3e64ffc24a56be4af13501b839b98fb0a14f1147623316d8c6dbdbc1356"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "code"
  - "high-value"
  - "mjs"
  - "portable-lib"
  - "scripts"
imports:
  - "./brain-scenario-lookup.mjs"
exports:
  - "lookupScenarioFuzzy"
---

# taskmanager/portable_lib/brain-scenario-fuzzy.mjs

> Code module; imports ./brain-scenario-lookup.mjs; exports lookupScenarioFuzzy

## Key Signals

- Source path: taskmanager/portable_lib/brain-scenario-fuzzy.mjs
- Surface: portable-lib
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 88
- Tags: brain, code, high-value, mjs, portable-lib, scripts
- Imports: ./brain-scenario-lookup.mjs
- Exports: lookupScenarioFuzzy

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, code, high-value, mjs, portable-lib, scripts, taskmanager
- Source link target: taskmanager/portable_lib/brain-scenario-fuzzy.mjs

## Excerpt

~~~javascript
/**
 * Bounded fuzzy match for single-token triggers (edit distance <= 1) when AC misses.
 */
import { isScenarioExcluded, loadScenarioIndexPayload } from "./brain-scenario-lookup.mjs";

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  /** @type {number[]} */
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[n];
}

/**
~~~