---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/components/runtime-manager/AdvancedControlPanel.tsx"
source_name: "AdvancedControlPanel.tsx"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescriptreact"
extension: ".tsx"
score: 0
selected_rank: 3446
content_hash: "fe7b51d463e0d5d343b012cf9dc78c7acb5ca20025c2f403671defc6096e8b51"
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
  - "react"
exports:
  - "AdvancedControlPanel"
  - "interface"
  - "type"
---

# taskmanager/src/components/runtime-manager/AdvancedControlPanel.tsx

> Code module; imports ../../theme/taskManagerTheme, ./runtimeManagerUtils, ./RuntimePrimitives, react; exports AdvancedControlPanel, interface, type

## Key Signals

- Source path: taskmanager/src/components/runtime-manager/AdvancedControlPanel.tsx
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescriptreact
- Top level: taskmanager
- Score: 0
- Tags: app-src, code, high-value, scripts, tsx
- Imports: ../../theme/taskManagerTheme, ./runtimeManagerUtils, ./RuntimePrimitives, react
- Exports: AdvancedControlPanel, interface, type

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, tsx
- Source link target: taskmanager/src/components/runtime-manager/AdvancedControlPanel.tsx

## Excerpt

~~~typescriptreact
import { useMemo, useState } from "react";
import { TASKMANAGER_LAYOUT, type TaskManagerPalette } from "../../theme/taskManagerTheme";
import type {
  RuntimeManagerAdvisorItem,
  RuntimeManagerPrefs,
  RuntimeManagerSummaryModel,
} from "./types";
import {
  AdvancedSection,
  SectionFooterMeta,
  SettingRowAction,
  SettingRowSelect,
  SettingRowToggle,
  buildStatusMetaChips,
} from "./AdvancedPanelPrimitives";
import { ActionButton, MetricBar, StatusBadge } from "./RuntimePrimitives";
import { formatRelativeTime, toneFromStatus } from "./runtimeManagerUtils";

export type OptimizerShellMode =
  | "max-performance"
  | "balanced"
  | "low-resource"
  | "background-maintenance"
  | "emergency";

export interface OptimizerShellStatus {
  running: boolean;
  killSwitchActive: boolean;
~~~