---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/components/runtime-manager/AdvancedPanelPrimitives.tsx"
source_name: "AdvancedPanelPrimitives.tsx"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescriptreact"
extension: ".tsx"
score: 0
selected_rank: 3447
content_hash: "4574104855472581a6fe580f86897f715d67d875188290062f7face64128a84d"
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
  - "react-dom"
exports:
  - "HelpTooltipAnchor"
  - "SettingRowAction"
  - "SettingRowSelect"
  - "SettingRowToggle"
  - "SwitchControl"
---

# taskmanager/src/components/runtime-manager/AdvancedPanelPrimitives.tsx

> Code module; imports ../../theme/taskManagerTheme, ./RuntimePrimitives, ./types, react-dom; exports HelpTooltipAnchor, SettingRowAction, SettingRowSelect, SettingRowToggle

## Key Signals

- Source path: taskmanager/src/components/runtime-manager/AdvancedPanelPrimitives.tsx
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescriptreact
- Top level: taskmanager
- Score: 0
- Tags: app-src, code, high-value, scripts, tsx
- Imports: ../../theme/taskManagerTheme, ./RuntimePrimitives, ./types, react-dom
- Exports: HelpTooltipAnchor, SettingRowAction, SettingRowSelect, SettingRowToggle, SwitchControl

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, tsx
- Source link target: taskmanager/src/components/runtime-manager/AdvancedPanelPrimitives.tsx

## Excerpt

~~~typescriptreact
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { TASKMANAGER_LAYOUT, type TaskManagerPalette } from "../../theme/taskManagerTheme";
import { ActionButton, Dropdown, StatusBadge } from "./RuntimePrimitives";
import type { RuntimeManagerTone } from "./types";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function sectionSurface(palette: TaskManagerPalette, emphasized = false) {
  const isLight = palette.mode === "light";
  return {
    borderRadius: TASKMANAGER_LAYOUT.radius.card,
    border: palette.sidebarBtnBorder,
    background: emphasized
      ? palette.sidebarSurfaceStrong
      : palette.sidebarSurfaceRaised,
    boxShadow: isLight ? TASKMANAGER_LAYOUT.shadow.soft : TASKMANAGER_LAYOUT.shadow.medium,
  };
}
~~~