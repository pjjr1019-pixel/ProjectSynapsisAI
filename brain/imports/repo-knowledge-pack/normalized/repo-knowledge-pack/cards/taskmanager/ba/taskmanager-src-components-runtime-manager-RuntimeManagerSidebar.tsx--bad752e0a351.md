---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/components/runtime-manager/RuntimeManagerSidebar.tsx"
source_name: "RuntimeManagerSidebar.tsx"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescriptreact"
extension: ".tsx"
score: 0
selected_rank: 3454
content_hash: "b398f21cdc2a2881a22a4b6c38ac9e87e3d829c74680a6c2b3c81a30132f04d9"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "app-src"
  - "code"
  - "high-value"
  - "scripts"
  - "tsx"
imports:
  - "../../theme/taskManagerTheme"
  - "./AIRecommendationsCard"
  - "./AIRuntimeResidencyCard"
  - "./ProcessContextMenu"
  - "./ProcessList"
  - "./RuntimeFooter"
  - "./RuntimePrimitives"
  - "./SystemPressureCard"
  - "react"
exports:
  - "RuntimeManagerSidebar"
---

# taskmanager/src/components/runtime-manager/RuntimeManagerSidebar.tsx

> Code module; imports ../../theme/taskManagerTheme, ./AIRecommendationsCard, ./AIRuntimeResidencyCard, ./ProcessContextMenu; exports RuntimeManagerSidebar

## Key Signals

- Source path: taskmanager/src/components/runtime-manager/RuntimeManagerSidebar.tsx
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescriptreact
- Top level: taskmanager
- Score: 0
- Tags: app-src, code, high-value, scripts, tsx
- Imports: ../../theme/taskManagerTheme, ./AIRecommendationsCard, ./AIRuntimeResidencyCard, ./ProcessContextMenu, ./ProcessList, ./RuntimeFooter
- Exports: RuntimeManagerSidebar

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, tsx
- Source link target: taskmanager/src/components/runtime-manager/RuntimeManagerSidebar.tsx

## Excerpt

~~~typescriptreact
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { TaskManagerPalette } from "../../theme/taskManagerTheme";
import { AIRecommendationsCard } from "./AIRecommendationsCard";
import { AIRuntimeResidencyCard } from "./AIRuntimeResidencyCard";
import { ProcessList } from "./ProcessList";
import { ProcessContextMenu, type ProcessContextMenuItem } from "./ProcessContextMenu";
import { ActionButton, Dropdown, SearchField, ToggleChip } from "./RuntimePrimitives";
import { RuntimeFooter } from "./RuntimeFooter";
import { SystemPressureCard } from "./SystemPressureCard";
import type {
  RuntimeManagerAiContext,
  RuntimeManagerAiOverview,
  RuntimeManagerAdvisorItem,
  RuntimeManagerComputerOverview,
  RuntimeManagerDisplayRow,
  RuntimeManagerFilter,
  RuntimeManagerPrefs,
  RuntimeManagerSort,
  RuntimeManagerTab,
  RuntimeManagerViewModel,
} from "./types";
import {
  buildAiViewModel,
  buildComputerViewModel,
  computerRequestFromPrefs,
  enrichAiOverviewWithContext,
  fetchJson,
  filterAndSortRows,
~~~