---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/components/runtime-manager/SystemPressureCard.tsx"
source_name: "SystemPressureCard.tsx"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescriptreact"
extension: ".tsx"
score: 0
selected_rank: 3457
content_hash: "575d28e4aff93f1bdf4fd20c987a085a717b9c662c83a976d5045b34ba2440be"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "app-src"
  - "code"
  - "high-value"
  - "scripts"
  - "tsx"
imports:
  - "../../theme/taskManagerTheme"
  - "./RuntimePrimitives"
  - "./types"
exports:
  - "SystemPressureCard"
---

# taskmanager/src/components/runtime-manager/SystemPressureCard.tsx

> Code module; imports ../../theme/taskManagerTheme, ./RuntimePrimitives, ./types; exports SystemPressureCard

## Key Signals

- Source path: taskmanager/src/components/runtime-manager/SystemPressureCard.tsx
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescriptreact
- Top level: taskmanager
- Score: 0
- Tags: app-src, code, high-value, scripts, tsx
- Imports: ../../theme/taskManagerTheme, ./RuntimePrimitives, ./types
- Exports: SystemPressureCard

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, tsx
- Source link target: taskmanager/src/components/runtime-manager/SystemPressureCard.tsx

## Excerpt

~~~typescriptreact
import type { TaskManagerPalette } from "../../theme/taskManagerTheme";
import type { RuntimeManagerPressureModel } from "./types";
import { PanelCard } from "./RuntimePrimitives";

function levelColor(level: string, isLight = false) {
  const normalized = String(level || "").toLowerCase();
  if (isLight) {
    if (normalized.includes("critical")) return "#c0160c";
    if (normalized.includes("high"))    return "#9a5300";
    if (normalized.includes("warm"))    return "#7a5000";
    return "#1a6640";
  }
  if (normalized.includes("critical")) return "rgba(255, 202, 202, 0.96)";
  if (normalized.includes("high"))     return "rgba(255, 232, 191, 0.96)";
  if (normalized.includes("warm"))     return "rgba(255, 224, 170, 0.96)";
  return "rgba(212,255,236,0.96)";
}

export function SystemPressureCard({
  palette,
  pressure,
}: {
  palette: TaskManagerPalette;
  pressure: RuntimeManagerPressureModel;
}) {
  const isLight = palette.mode === "light";

  return (
~~~