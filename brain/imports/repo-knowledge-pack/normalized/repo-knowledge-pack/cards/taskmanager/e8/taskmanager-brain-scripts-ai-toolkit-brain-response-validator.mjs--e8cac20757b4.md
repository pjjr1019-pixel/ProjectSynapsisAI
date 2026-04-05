---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/ai-toolkit/brain-response-validator.mjs"
source_name: "brain-response-validator.mjs"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 112
selected_rank: 125
content_hash: "64cfc80502a2cbf008c80aa2fa525a8e97cd67cfe2f778c62ac42da413fd9426"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "mjs"
  - "neutral"
  - "scripts"
exports:
  - "assertBrainResponse"
  - "validateBrainResponse"
---

# taskmanager/brain/scripts/ai-toolkit/brain-response-validator.mjs

> Script surface; exports assertBrainResponse, validateBrainResponse

## Key Signals

- Source path: taskmanager/brain/scripts/ai-toolkit/brain-response-validator.mjs
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 112
- Tags: brain, brain-scripts, code, mjs, neutral, scripts
- Exports: assertBrainResponse, validateBrainResponse

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, mjs, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/ai-toolkit/brain-response-validator.mjs

## Excerpt

~~~javascript
function checkFormat(output, format) {
  if (!format) return [];
  const failures = [];
  const text = String(output ?? "");
  if (format === "non-empty" && !text.trim()) failures.push("output must not be empty");
  if (format === "markdown" && !/[#*_`>-]/.test(text)) failures.push("output does not look like markdown");
  if (format === "json" && !/^[\s\[{]/.test(text.trim())) failures.push("output does not look like json");
  return failures;
}

export function validateBrainResponse({ output, criteria = {} } = {}) {
  const failures = [];
  const warnings = [];
  const text = typeof output === "string" ? output : JSON.stringify(output ?? null);

  if (criteria.schema) {
    const required = Array.isArray(criteria.schema.required) ? criteria.schema.required : [];
    if (!output || typeof output !== "object") {
      failures.push("output must be an object for schema validation");
    } else {
      for (const key of required) {
        if (!(key in output)) failures.push(`missing required key: ${key}`);
      }
    }
  }

  for (const assertion of Array.isArray(criteria.assertions) ? criteria.assertions : []) {
    try {
~~~