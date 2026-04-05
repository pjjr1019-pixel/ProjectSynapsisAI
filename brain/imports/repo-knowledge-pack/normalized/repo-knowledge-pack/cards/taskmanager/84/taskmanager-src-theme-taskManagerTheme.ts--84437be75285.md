---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/theme/taskManagerTheme.ts"
source_name: "taskManagerTheme.ts"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescript"
extension: ".ts"
score: 80
selected_rank: 704
content_hash: "1a35b582d4fa3e6ad880c398038f986a4181d28bcd86a7a284f08e0ba5be605d"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "app-src"
  - "code"
  - "high-value"
  - "scripts"
  - "ts"
exports:
  - "DEFAULT_TASKMANAGER_PALETTE"
  - "getTaskManagerFocusRing"
  - "getTaskManagerTonePalette"
  - "interface"
  - "LIGHT_TASKMANAGER_PALETTE"
  - "TASKMANAGER_LAYOUT"
  - "taskManagerAppChromeStyle"
  - "type"
---

# taskmanager/src/theme/taskManagerTheme.ts

> Code module; exports DEFAULT_TASKMANAGER_PALETTE, getTaskManagerFocusRing, getTaskManagerTonePalette, interface

## Key Signals

- Source path: taskmanager/src/theme/taskManagerTheme.ts
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescript
- Top level: taskmanager
- Score: 80
- Tags: app-src, code, high-value, scripts, ts
- Exports: DEFAULT_TASKMANAGER_PALETTE, getTaskManagerFocusRing, getTaskManagerTonePalette, interface, LIGHT_TASKMANAGER_PALETTE, TASKMANAGER_LAYOUT

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, ts
- Source link target: taskmanager/src/theme/taskManagerTheme.ts

## Excerpt

~~~typescript
export type TaskManagerSemanticTone = "neutral" | "active" | "warning" | "error";

export interface TaskManagerTonePalette {
  border: string;
  background: string;
  color: string;
}

export interface TaskManagerPalette {
  mode: "dark" | "light";
  appBg: string;
  appPanelBg: string;
  appPanelBorder: string;
  appPanelShadow: string;
  appHeaderText: string;
  appSubtleText: string;
  sidebarBg: string;
  sidebarBtnBorder: string;
  sidebarMuted: string;
  sidebarText: string;
  sidebarItemBg: string;
  sidebarDivider: string;
  sidebarSurfaceRaised: string;
  sidebarSurfaceStrong: string;
  sidebarSurfaceSoft: string;
  sidebarInputBg: string;
  sidebarControlBg: string;
  sidebarControlHoverBg: string;
~~~