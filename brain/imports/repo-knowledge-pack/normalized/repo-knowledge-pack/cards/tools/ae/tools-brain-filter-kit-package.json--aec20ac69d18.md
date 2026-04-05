---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "tools/brain-filter-kit/package.json"
source_name: "package.json"
top_level: "tools"
surface: "tools"
classification: "neutral"
kind: "package-json"
language: "json"
extension: ".json"
score: 40
selected_rank: 3382
content_hash: "b29427926a8665cc315b807a50830ba9d835c3dd784f6972ba0694574e5d6916"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "json"
  - "neutral"
  - "package-json"
  - "package-manifest"
  - "tools"
json_keys:
  - "bin"
  - "description"
  - "engines"
  - "name"
  - "private"
  - "scripts"
  - "version"
package_name: "brain-filter-kit"
package_scripts:
  - "all"
  - "build"
  - "dedupe"
  - "inventory"
  - "report"
  - "score"
  - "top"
---

# tools/brain-filter-kit/package.json

> Package manifest; keys bin, description, engines, name, private, scripts; scripts all, build, dedupe, inventory, report, score

## Key Signals

- Source path: tools/brain-filter-kit/package.json
- Surface: tools
- Classification: neutral
- Kind: package-json
- Language: json
- Top level: tools
- Score: 40
- Tags: brain, json, neutral, package-json, package-manifest, tools
- JSON keys: bin, description, engines, name, private, scripts, version
- Package scripts: all, build, dedupe, inventory, report, score, top

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, json, neutral, package-json, package-manifest, tools
- Source link target: tools/brain-filter-kit/package.json

## Excerpt

~~~json
{
  "name": "brain-filter-kit",
  "version": "1.0.0",
  "private": true,
  "description": "Low-token local JS toolkit to filter noise out of a brain/ knowledge tree.",
  "bin": {
    "brain-filter": "./bin/brain-filter.js"
  },
  "scripts": {
    "inventory": "node ./bin/brain-filter.js inventory",
    "score": "node ./bin/brain-filter.js score",
    "dedupe": "node ./bin/brain-filter.js dedupe",
    "build": "node ./bin/brain-filter.js build",
    "report": "node ./bin/brain-filter.js report",
    "top": "node ./bin/brain-filter.js top",
    "all": "node ./bin/brain-filter.js all"
  },
  "engines": {
    "node": ">=18"
  }
}
~~~