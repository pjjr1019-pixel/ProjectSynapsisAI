---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/tsconfig.json"
source_name: "tsconfig.json"
top_level: "taskmanager"
surface: "source"
classification: "neutral"
kind: "json"
language: "json"
extension: ".json"
score: 16
selected_rank: 4344
content_hash: "f2bd289891d5974b1d9508a37a3fe694ec4ba0775c3e4f98965ed142ce560358"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "config"
  - "json"
  - "neutral"
  - "source"
json_keys:
  - "compilerOptions"
  - "include"
---

# taskmanager/tsconfig.json

> JSON data file; keys compilerOptions, include

## Key Signals

- Source path: taskmanager/tsconfig.json
- Surface: source
- Classification: neutral
- Kind: json
- Language: json
- Top level: taskmanager
- Score: 16
- Tags: config, json, neutral, source
- JSON keys: compilerOptions, include

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: config, json, neutral, source, taskmanager
- Source link target: taskmanager/tsconfig.json

## Excerpt

~~~json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["src"]
}
~~~