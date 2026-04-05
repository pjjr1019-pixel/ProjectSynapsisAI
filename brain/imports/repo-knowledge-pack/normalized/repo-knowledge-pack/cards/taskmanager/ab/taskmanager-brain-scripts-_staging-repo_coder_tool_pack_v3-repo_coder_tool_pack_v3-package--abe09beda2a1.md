---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/_staging/repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/package.json"
source_name: "package.json"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "package-json"
language: "json"
extension: ".json"
score: 132
selected_rank: 2
content_hash: "d761e7816499d10f24fc916b8d75f9168f30a2378cf33386c65e4e16b763befc"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "json"
  - "neutral"
  - "package-json"
  - "package-manifest"
  - "scripts"
json_keys:
  - "bin"
  - "description"
  - "name"
  - "private"
  - "scripts"
  - "type"
  - "version"
package_name: "repo-coder-tool-pack-v3"
package_scripts:
  - "demo"
  - "list"
---

# taskmanager/brain/scripts/_staging/repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/package.json

> Script surface; keys bin, description, name, private, scripts, type; scripts demo, list

## Key Signals

- Source path: taskmanager/brain/scripts/_staging/repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/package.json
- Surface: brain-scripts
- Classification: neutral
- Kind: package-json
- Language: json
- Top level: taskmanager
- Score: 132
- Tags: brain, brain-scripts, json, neutral, package-json, package-manifest, scripts
- JSON keys: bin, description, name, private, scripts, type, version
- Package scripts: demo, list

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, json, neutral, package-json, package-manifest, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/_staging/repo_coder_tool_pack_v3/repo_coder_tool_pack_v3/package.json

## Excerpt

~~~json
{
  "name": "repo-coder-tool-pack-v3",
  "version": "1.0.0",
  "private": true,
  "description": "Tiny repo/coder-ai support tools with fast registry lookup.",
  "type": "commonjs",
  "bin": {
    "repo-tools": "./run-tool.js"
  },
  "scripts": {
    "list": "node run-tool.js registry_search",
    "demo": "node run-tool.js generate_low_token_pack --path ."
  }
}
~~~