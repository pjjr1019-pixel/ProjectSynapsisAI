---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/components/optimizer/OptimizerWorkspace.tsx"
source_name: "OptimizerWorkspace.tsx"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescriptreact"
extension: ".tsx"
score: 80
selected_rank: 702
content_hash: "96f44764a1018e8ef8d16d399a479d90a83c7aef3ed81975b0a8c85eefb9f2e8"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "app-src"
  - "code"
  - "high-value"
  - "scripts"
  - "tsx"
imports:
  - "../../theme/taskManagerTheme"
  - "../runtime-manager/runtimeManagerUtils"
  - "react"
exports:
  - "OptimizerWorkspace"
---

# taskmanager/src/components/optimizer/OptimizerWorkspace.tsx

> Code module; imports ../../theme/taskManagerTheme, ../runtime-manager/runtimeManagerUtils, react; exports OptimizerWorkspace

## Key Signals

- Source path: taskmanager/src/components/optimizer/OptimizerWorkspace.tsx
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescriptreact
- Top level: taskmanager
- Score: 80
- Tags: app-src, code, high-value, scripts, tsx
- Imports: ../../theme/taskManagerTheme, ../runtime-manager/runtimeManagerUtils, react
- Exports: OptimizerWorkspace

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, tsx
- Source link target: taskmanager/src/components/optimizer/OptimizerWorkspace.tsx

## Excerpt

~~~typescriptreact
import { useCallback, useEffect, useMemo, useState } from "react";
import type { TaskManagerPalette } from "../../theme/taskManagerTheme";
import {
  ActionButton,
  MetricBar,
  PanelCard,
  SmallLabel,
  StatusBadge,
} from "../runtime-manager/RuntimePrimitives";
import { fetchJson, formatClock, formatRelativeTime } from "../runtime-manager/runtimeManagerUtils";

type OptimizerPerformanceMode =
  | "max-performance"
  | "balanced"
  | "low-resource"
  | "background-maintenance"
  | "emergency";

interface OptimizerStatusPayload {
  running: boolean;
  tickCount: number;
  killSwitchActive: boolean;
  deferRebuildActive: boolean;
  performanceMode: OptimizerPerformanceMode;
  currentIntervalMs: number;
  sessionMode: string;
  pressure: {
    ram?: string;
~~~