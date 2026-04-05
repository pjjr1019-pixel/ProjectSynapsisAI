---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/components/runtime-manager/ProcessList.tsx"
source_name: "ProcessList.tsx"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescriptreact"
extension: ".tsx"
score: 0
selected_rank: 3451
content_hash: "a8063d388c8dae367d74abb591dfde5d95713b77ab86c7ce07879cffaee46409"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "app-src"
  - "code"
  - "high-value"
  - "scripts"
  - "tsx"
imports:
  - "../../theme/taskManagerTheme"
  - "./ProcessRow"
  - "./RuntimePrimitives"
  - "react"
exports:
  - "ProcessList"
---

# taskmanager/src/components/runtime-manager/ProcessList.tsx

> Code module; imports ../../theme/taskManagerTheme, ./ProcessRow, ./RuntimePrimitives, react; exports ProcessList

## Key Signals

- Source path: taskmanager/src/components/runtime-manager/ProcessList.tsx
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescriptreact
- Top level: taskmanager
- Score: 0
- Tags: app-src, code, high-value, scripts, tsx
- Imports: ../../theme/taskManagerTheme, ./ProcessRow, ./RuntimePrimitives, react
- Exports: ProcessList

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, tsx
- Source link target: taskmanager/src/components/runtime-manager/ProcessList.tsx

## Excerpt

~~~typescriptreact
import { useMemo } from "react";
import type { MouseEvent } from "react";
import type { TaskManagerPalette } from "../../theme/taskManagerTheme";
import type {
  RuntimeManagerDisplayRow,
  RuntimeManagerSort,
  RuntimeManagerSummaryModel,
  RuntimeManagerTab,
} from "./types";
import { ActionButton, PanelCard } from "./RuntimePrimitives";
import { ProcessRow } from "./ProcessRow";

const SORT_COLS: Array<{ key: RuntimeManagerSort; label: string; width: number }> = [
  { key: "cpu",  label: "CPU",    width: 38 },
  { key: "ram",  label: "MEMORY", width: 54 },
  { key: "gpu",  label: "GPU",    width: 34 },
];

/** Heat colour for aggregate % values — mirrors Windows Task Manager colouring */
function heatColor(pct: number, isLight = false): string {
  if (pct >= 80) return isLight ? "#b85000" : "#ff9966";
  if (pct >= 60) return isLight ? "#8b6200" : "#ffd88f";
  if (pct >= 30) return isLight ? "rgba(0,0,0,0.74)" : "rgba(240,245,255,0.88)";
  return isLight ? "rgba(0,0,0,0.44)" : "rgba(214,231,255,0.62)";
}

/** Compact total-memory display for the aggregate header */
function fmtTotalMem(usedBytes: number, totalBytes: number): string {
~~~