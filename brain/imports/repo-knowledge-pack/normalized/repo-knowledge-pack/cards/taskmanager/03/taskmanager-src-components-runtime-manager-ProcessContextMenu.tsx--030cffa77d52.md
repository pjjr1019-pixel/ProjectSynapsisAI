---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/components/runtime-manager/ProcessContextMenu.tsx"
source_name: "ProcessContextMenu.tsx"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescriptreact"
extension: ".tsx"
score: 0
selected_rank: 3450
content_hash: "770411f1cf14cc2d516da5aa6317d1a0088e19e43c8d4cd2628c007a7da358f6"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "app-src"
  - "code"
  - "high-value"
  - "scripts"
  - "tsx"
imports:
  - "../../theme/taskManagerTheme"
  - "react"
exports:
  - "interface"
  - "ProcessContextMenu"
  - "type"
---

# taskmanager/src/components/runtime-manager/ProcessContextMenu.tsx

> Code module; imports ../../theme/taskManagerTheme, react; exports interface, ProcessContextMenu, type

## Key Signals

- Source path: taskmanager/src/components/runtime-manager/ProcessContextMenu.tsx
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescriptreact
- Top level: taskmanager
- Score: 0
- Tags: app-src, code, high-value, scripts, tsx
- Imports: ../../theme/taskManagerTheme, react
- Exports: interface, ProcessContextMenu, type

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, tsx
- Source link target: taskmanager/src/components/runtime-manager/ProcessContextMenu.tsx

## Excerpt

~~~typescriptreact
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { DEFAULT_TASKMANAGER_PALETTE, type TaskManagerPalette } from "../../theme/taskManagerTheme";

export type ProcessContextMenuTone = "neutral" | "warning";

export interface ProcessContextMenuItem {
  id: string;
  label: string;
  description?: string;
  tone?: ProcessContextMenuTone;
  disabled?: boolean;
  separatorBefore?: boolean;
}

export interface ProcessContextMenuPosition {
  x: number;
  y: number;
}

export interface ProcessContextMenuProps {
  open: boolean;
  anchor: ProcessContextMenuPosition | null;
  title: string;
  subtitle?: string | null;
  items: ProcessContextMenuItem[];
  palette?: TaskManagerPalette;
  onSelect: (item: ProcessContextMenuItem) => void;
~~~