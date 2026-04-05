---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/package.json"
source_name: "package.json"
top_level: "taskmanager"
surface: "source"
classification: "high-value"
kind: "package-json"
language: "json"
extension: ".json"
score: 68
selected_rank: 768
content_hash: "eba337f0c689cde692e7beeb47b35bc9d9192d16d04468450d4a533e386e1b6f"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "high-value"
  - "json"
  - "package-json"
  - "package-manifest"
  - "source"
json_keys:
  - "dependencies"
  - "devDependencies"
  - "main"
  - "name"
  - "private"
  - "scripts"
  - "type"
  - "version"
package_name: "horizons-taskmanager"
package_scripts:
  - "brain:repo-knowledge-pack"
  - "brain:repo-knowledge-pack:update"
  - "build"
  - "dev"
  - "dev:api"
  - "preview"
  - "start"
  - "test"
  - "test:governed-actions"
  - "test:process-knowledge"
  - "test:specialist"
package_dependencies:
  - "@lancedb/lancedb"
  - "@types/react"
  - "@types/react-dom"
  - "@vitejs/plugin-react"
  - "@xenova/transformers"
  - "aho-corasick"
  - "electron"
  - "expr-eval"
  - "react"
  - "react-dom"
  - "typescript"
  - "vite"
---

# taskmanager/package.json

> Package manifest; keys dependencies, devDependencies, main, name, private, scripts; scripts brain:repo-knowledge-pack, brain:repo-knowledge-pack:update, build, dev, dev:api, preview

## Key Signals

- Source path: taskmanager/package.json
- Surface: source
- Classification: high-value
- Kind: package-json
- Language: json
- Top level: taskmanager
- Score: 68
- Tags: high-value, json, package-json, package-manifest, source
- JSON keys: dependencies, devDependencies, main, name, private, scripts, type, version
- Package scripts: brain:repo-knowledge-pack, brain:repo-knowledge-pack:update, build, dev, dev:api, preview, start, test, test:governed-actions, test:process-knowledge

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: high-value, json, package-json, package-manifest, source, taskmanager
- Source link target: taskmanager/package.json

## Excerpt

~~~json
{
  "name": "horizons-taskmanager",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "main": "desktop/main.cjs",
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 5180 --strictPort",
    "dev:api": "node server/dev-api.mjs",
    "start": "node desktop/run-electron-dev.cjs",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --host 127.0.0.1 --port 4180 --strictPort",
    "test": "tsc --noEmit",
    "test:specialist": "node --test tests/specialist/*.test.mjs",
    "test:governed-actions": "node --test tests/governed-actions/*.test.mjs",
    "test:process-knowledge": "node --test tests/process-knowledge/*.test.mjs",
    "brain:repo-knowledge-pack": "node brain/scripts/repo-tools/10-generate-repo-knowledge-pack.js",
    "brain:repo-knowledge-pack:update": "node brain/scripts/repo-tools/10-generate-repo-knowledge-pack.js --incremental"
  },
  "dependencies": {
    "@lancedb/lancedb": "^0.22.0",
    "@xenova/transformers": "^2.17.2",
    "aho-corasick": "^0.1.3",
    "electron": "^31.7.7",
    "expr-eval": "^2.0.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
~~~