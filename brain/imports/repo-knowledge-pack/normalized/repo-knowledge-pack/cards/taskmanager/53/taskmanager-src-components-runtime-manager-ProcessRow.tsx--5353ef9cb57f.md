---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/components/runtime-manager/ProcessRow.tsx"
source_name: "ProcessRow.tsx"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescriptreact"
extension: ".tsx"
score: 0
selected_rank: 3452
content_hash: "51bae62e8be1f069e8b5d49a5feb2f532c70a2332e108773d50078d4430d99e8"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "app-src"
  - "code"
  - "high-value"
  - "scripts"
  - "tsx"
imports:
  - "../../theme/taskManagerTheme"
  - "./runtimeManagerUtils"
  - "./RuntimePrimitives"
  - "./types"
  - "react"
exports:
  - "ProcessRow"
---

# taskmanager/src/components/runtime-manager/ProcessRow.tsx

> Code module; imports ../../theme/taskManagerTheme, ./runtimeManagerUtils, ./RuntimePrimitives, ./types; exports ProcessRow

## Key Signals

- Source path: taskmanager/src/components/runtime-manager/ProcessRow.tsx
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescriptreact
- Top level: taskmanager
- Score: 0
- Tags: app-src, code, high-value, scripts, tsx
- Imports: ../../theme/taskManagerTheme, ./runtimeManagerUtils, ./RuntimePrimitives, ./types, react
- Exports: ProcessRow

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, tsx
- Source link target: taskmanager/src/components/runtime-manager/ProcessRow.tsx

## Excerpt

~~~typescriptreact
import type { MouseEvent } from "react";
import type { TaskManagerPalette } from "../../theme/taskManagerTheme";
import type { RuntimeManagerDisplayRow } from "./types";
import { ActionButton, MetricBar, RuntimeIcon } from "./RuntimePrimitives";
import { formatPercent, formatRateLimitLabel } from "./runtimeManagerUtils";

/** Small color-coded icon badge for inline table rows */
const ICON_COLORS: Record<string, string> = {
  embedding: "#8fd5ff",
  browser:   "#7bb9ff",
  memory:    "#6ee7b7",
  python:    "#ffd88f",
  node:      "#4ade80",
  gpu:       "#bc77ff",
  crawler:   "#f7c76d",
  provider:  "#ff9f7b",
  optimizer: "#ff7b72",
  retrieval: "#90dfff",
  core:      "#a5b4fc",
  app:       "#a5b4fc",
};

function TinyIcon({ iconKey }: { iconKey: string }) {
  const color = ICON_COLORS[iconKey] ?? "rgba(180,200,255,0.65)";
  return (
    <span
      style={{
        display: "inline-flex",
~~~