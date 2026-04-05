---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/_staging/tiny_tool_pack_v1/tiny_tool_pack_v1/package.json"
source_name: "package.json"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "package-json"
language: "json"
extension: ".json"
score: 130
selected_rank: 5
content_hash: "77d2beef10b9ab80b4567031253662ba5b122d57dec4f91c360ac0879f36acb9"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "json"
  - "neutral"
  - "package-json"
  - "package-manifest"
  - "scripts"
imports:
  - "./registry/tools_index.json"
json_keys:
  - "description"
  - "name"
  - "private"
  - "scripts"
  - "type"
  - "version"
package_name: "tiny-tool-pack-v1"
package_scripts:
  - "list:tools"
  - "search"
---

# taskmanager/brain/scripts/_staging/tiny_tool_pack_v1/tiny_tool_pack_v1/package.json

> Script surface; imports ./registry/tools_index.json; keys description, name, private, scripts, type, version; scripts list:tools, search

## Key Signals

- Source path: taskmanager/brain/scripts/_staging/tiny_tool_pack_v1/tiny_tool_pack_v1/package.json
- Surface: brain-scripts
- Classification: neutral
- Kind: package-json
- Language: json
- Top level: taskmanager
- Score: 130
- Tags: brain, brain-scripts, json, neutral, package-json, package-manifest, scripts
- Imports: ./registry/tools_index.json
- JSON keys: description, name, private, scripts, type, version
- Package scripts: list:tools, search

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, json, neutral, package-json, package-manifest, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/_staging/tiny_tool_pack_v1/tiny_tool_pack_v1/package.json

## Excerpt

~~~json
{
  "name": "tiny-tool-pack-v1",
  "version": "1.0.0",
  "private": true,
  "description": "128 tiny Node.js scripts with a registry for AI orchestrators.",
  "type": "commonjs",
  "scripts": {
    "search": "node run-tool.js registry_search",
    "list:tools": "node -e \"const t=require('./registry/tools_index.json');console.log(t.map(x=>x.id).join('\\n'))\""
  }
}
~~~