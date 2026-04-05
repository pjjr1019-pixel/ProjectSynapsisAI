---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/src/utils/normalize.js"
source_name: "normalize.js"
top_level: "taskmanager"
surface: "brain-imports"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 61
selected_rank: 3927
content_hash: "11ac18702891cbcf1c770c3f55e4cd2aa8a12403afce01b869e70e6dfca6a408"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-imports"
  - "code"
  - "js"
  - "neutral"
  - "scripts"
exports:
  - "normalizeText,\n  tokenize,"
---

# taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/src/utils/normalize.js

> Code module; exports normalizeText,
  tokenize,

## Key Signals

- Source path: taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/src/utils/normalize.js
- Surface: brain-imports
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 61
- Tags: brain, brain-imports, code, js, neutral, scripts
- Exports: normalizeText,
  tokenize,

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-imports, code, js, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/imports/windows-js-skill-pack/normalized/windows-js-skill-pack/src/utils/normalize.js

## Excerpt

~~~javascript
function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[&]/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value).split(/\s+/).filter(Boolean);
}

module.exports = {
  normalizeText,
  tokenize,
};
~~~