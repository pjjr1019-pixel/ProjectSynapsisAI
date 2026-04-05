---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/App.tsx"
source_name: "App.tsx"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescriptreact"
extension: ".tsx"
score: 80
selected_rank: 696
content_hash: "3a0d3b9b45d89d720d300bc850594abd6f94b2372b3666be9594242d5d5fc560"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "app-src"
  - "code"
  - "high-value"
  - "scripts"
  - "tsx"
imports:
  - "./components/conversations/ChatDeleteToast"
  - "./components/conversations/ChatManagerPanel"
  - "./components/conversations/chatManagerTypes"
  - "./components/developer-mode/DeveloperModeWorkspace"
  - "./components/runtime-manager/ProcessContextMenu"
  - "./components/runtime-manager/RuntimePrimitives"
  - "./types/conversations"
  - "react"
  - "react-dom"
---

# taskmanager/src/App.tsx

> Code module; imports ./components/conversations/ChatDeleteToast, ./components/conversations/ChatManagerPanel, ./components/conversations/chatManagerTypes, ./components/developer-mode/DeveloperModeWorkspace

## Key Signals

- Source path: taskmanager/src/App.tsx
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescriptreact
- Top level: taskmanager
- Score: 80
- Tags: app-src, code, high-value, scripts, tsx
- Imports: ./components/conversations/ChatDeleteToast, ./components/conversations/ChatManagerPanel, ./components/conversations/chatManagerTypes, ./components/developer-mode/DeveloperModeWorkspace, ./components/runtime-manager/ProcessContextMenu, ./components/runtime-manager/RuntimePrimitives

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, tsx
- Source link target: taskmanager/src/App.tsx

## Excerpt

~~~typescriptreact
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import type {
  RuntimeManagerAiOverview,
  RuntimeManagerComputerOverview,
  RuntimeManagerDisplayRow,
  RuntimeManagerPrefs,
} from "./components/runtime-manager/types";
import {
  buildApiUrl,
  buildAiViewModel,
  buildComputerViewModel,
  computerRequestFromPrefs,
  fetchJson,
  filterAndSortRows,
  formatRelativeTime,
  getApiBaseUrl,
  loadRuntimeManagerPrefs,
  saveRuntimeManagerPrefs,
} from "./components/runtime-manager/runtimeManagerUtils";
import { DeveloperModeWorkspace } from "./components/developer-mode/DeveloperModeWorkspace";
import { ProcessContextMenu, type ProcessContextMenuItem } from "./components/runtime-manager/ProcessContextMenu";
import { ActionButton, StatusBadge } from "./components/runtime-manager/RuntimePrimitives";
import {
  AdvancedControlPanel,
  type OptimizerShellMode,
  type OptimizerShellStatus,
} from "./components/runtime-manager/AdvancedControlPanel";
~~~