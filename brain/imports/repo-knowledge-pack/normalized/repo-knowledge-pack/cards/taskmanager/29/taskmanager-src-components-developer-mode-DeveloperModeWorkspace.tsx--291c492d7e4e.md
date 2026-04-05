---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/components/developer-mode/DeveloperModeWorkspace.tsx"
source_name: "DeveloperModeWorkspace.tsx"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescriptreact"
extension: ".tsx"
score: 80
selected_rank: 701
content_hash: "ff638f2db00a75f8590e0267a8e33e64f48bf46913b1694a4d361307ff4f2e30"
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
---

# taskmanager/src/components/developer-mode/DeveloperModeWorkspace.tsx

> Code module; imports ../../theme/taskManagerTheme, react

## Key Signals

- Source path: taskmanager/src/components/developer-mode/DeveloperModeWorkspace.tsx
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescriptreact
- Top level: taskmanager
- Score: 80
- Tags: app-src, code, high-value, scripts, tsx
- Imports: ../../theme/taskManagerTheme, react

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, tsx
- Source link target: taskmanager/src/components/developer-mode/DeveloperModeWorkspace.tsx

## Excerpt

~~~typescriptreact
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TaskManagerPalette } from "../../theme/taskManagerTheme";
import {
  ActionButton,
  Dropdown,
  MetricBar,
  PanelCard,
  RuntimeIcon,
  SmallLabel,
  StatusBadge,
  ToggleChip,
} from "../runtime-manager/RuntimePrimitives";
import {
  buildApiUrl,
  fetchJson,
  formatBytes,
  formatClock,
  formatRelativeTime,
  toneFromStatus,
} from "../runtime-manager/runtimeManagerUtils";

type DeveloperTab = "overview" | "process-knowledge" | "console" | "controls" | "logs";
type DeveloperLogSource = "all" | "audit" | "chat" | "workspace" | "activity";
type OptimizerPerformanceMode =
  | "max-performance"
  | "balanced"
  | "low-resource"
  | "background-maintenance"
~~~