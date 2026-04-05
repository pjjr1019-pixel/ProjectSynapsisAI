---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/vite.config.ts"
source_name: "vite.config.ts"
top_level: "taskmanager"
surface: "other"
classification: "neutral"
kind: "code"
language: "typescript"
extension: ".ts"
score: 20
selected_rank: 4009
content_hash: "c5388e76ff5403a63b16f8be73798c2e07994e7abb1050bbaea72e1beeb01d0a"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "config"
  - "neutral"
  - "other"
  - "scripts"
  - "ts"
imports:
  - "@vitejs/plugin-react"
  - "node:path"
  - "node:process"
  - "node:url"
  - "vite"
exports:
  - "defineConfig"
---

# taskmanager/vite.config.ts

> Code module; imports @vitejs/plugin-react, node:path, node:process, node:url; exports defineConfig

## Key Signals

- Source path: taskmanager/vite.config.ts
- Surface: other
- Classification: neutral
- Kind: code
- Language: typescript
- Top level: taskmanager
- Score: 20
- Tags: code, config, neutral, other, scripts, ts
- Imports: @vitejs/plugin-react, node:path, node:process, node:url, vite
- Exports: defineConfig

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, config, neutral, other, scripts, taskmanager, ts
- Source link target: taskmanager/vite.config.ts

## Excerpt

~~~typescript
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const taskManagerRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
  const taskManagerEnv = loadEnv(mode, taskManagerRoot, "");
  const chatPort =
    process.env.HORIZONS_FORCE_CHAT_API_PORT ||
    process.env.CHAT_API_PORT ||
    taskManagerEnv.HORIZONS_FORCE_CHAT_API_PORT ||
    taskManagerEnv.CHAT_API_PORT ||
    "8787";
  const chatApi =
    taskManagerEnv.VITE_CHAT_API_TARGET ||
    taskManagerEnv.VITE_CHAT_API_URL ||
    `http://127.0.0.1:${chatPort}`;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@shared": path.resolve(taskManagerRoot, "shared"),
      },
    },
~~~