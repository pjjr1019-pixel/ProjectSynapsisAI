---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/lib/common.js"
source_name: "common.js"
top_level: "taskmanager"
surface: "other"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".js"
score: 14
selected_rank: 4430
content_hash: "663c2a6022128afa7978f933fcfcecfad0b8214df4a179e5fecfe579032d8680"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "js"
  - "neutral"
  - "other"
  - "scripts"
imports:
  - "../brain/scripts/lib/common"
  - "../lib/common"
---

# taskmanager/lib/common.js

> Code module; imports ../brain/scripts/lib/common, ../lib/common

## Key Signals

- Source path: taskmanager/lib/common.js
- Surface: other
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 14
- Tags: code, js, neutral, other, scripts
- Imports: ../brain/scripts/lib/common, ../lib/common

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, js, neutral, other, scripts, taskmanager
- Source link target: taskmanager/lib/common.js

## Excerpt

~~~javascript
// MIGRATION NOTICE — this file is in a "type":"module" (ESM) package and cannot be require()d.
// The canonical location of this module is: taskmanager/brain/scripts/lib/common.js
// If you are calling require('../lib/common') from a CJS script, update the path to:
//   require('../brain/scripts/lib/common')
// The taskmanager/brain/scripts/ directory has its own package.json with "type":"commonjs".
throw new Error(
  'common.js has moved to taskmanager/brain/scripts/lib/common.js — ' +
  'update your require() path to: require("../brain/scripts/lib/common")'
);
~~~