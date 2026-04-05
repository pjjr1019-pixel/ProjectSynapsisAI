---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/components/runtime-manager/RuntimePrimitives.tsx"
source_name: "RuntimePrimitives.tsx"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescriptreact"
extension: ".tsx"
score: 0
selected_rank: 3456
content_hash: "c78277452797438df42233f597f5fa22aad838a0ef1170687e55e3e7332996d7"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "app-src"
  - "code"
  - "high-value"
  - "scripts"
  - "tsx"
imports:
  - "./runtimeManagerUtils"
  - "./types"
  - "react"
exports:
  - "ActionButton"
  - "Dropdown"
  - "MetricBar"
  - "SearchField"
  - "StatusBadge"
  - "ToggleChip"
---

# taskmanager/src/components/runtime-manager/RuntimePrimitives.tsx

> Code module; imports ./runtimeManagerUtils, ./types, react; exports ActionButton, Dropdown, MetricBar, SearchField

## Key Signals

- Source path: taskmanager/src/components/runtime-manager/RuntimePrimitives.tsx
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescriptreact
- Top level: taskmanager
- Score: 0
- Tags: app-src, code, high-value, scripts, tsx
- Imports: ./runtimeManagerUtils, ./types, react
- Exports: ActionButton, Dropdown, MetricBar, SearchField, StatusBadge, ToggleChip

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, tsx
- Source link target: taskmanager/src/components/runtime-manager/RuntimePrimitives.tsx

## Excerpt

~~~typescriptreact
﻿import type { CSSProperties, ReactNode } from "react";
import {
  DEFAULT_TASKMANAGER_PALETTE,
  TASKMANAGER_LAYOUT,
  getTaskManagerTonePalette,
  type TaskManagerPalette,
} from "../../theme/taskManagerTheme";
import type { RuntimeManagerTone } from "./types";
import { formatPercent } from "./runtimeManagerUtils";

function resolvePalette(palette?: TaskManagerPalette) {
  return palette ?? DEFAULT_TASKMANAGER_PALETTE;
}

export function StatusBadge({
  label,
  tone,
  palette,
}: {
  label: string;
  tone: RuntimeManagerTone;
  palette?: TaskManagerPalette;
}) {
  const resolvedPalette = resolvePalette(palette);
  const colors = getTaskManagerTonePalette(resolvedPalette, tone);
  return (
    <span
      data-tm-chip="true"
~~~