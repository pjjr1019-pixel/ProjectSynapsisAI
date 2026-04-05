---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/components/conversations/ChatManagerPanel.tsx"
source_name: "ChatManagerPanel.tsx"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescriptreact"
extension: ".tsx"
score: 80
selected_rank: 698
content_hash: "c818b2006610c85bef54c97a120fc76b5ddfad668635c339b16a1fe6611cb7c6"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "app-src"
  - "code"
  - "high-value"
  - "scripts"
  - "tsx"
imports:
  - "../../theme/taskManagerTheme"
  - "../runtime-manager/ProcessContextMenu"
  - "../runtime-manager/runtimeManagerUtils"
  - "../runtime-manager/RuntimePrimitives"
  - "./chatManagerTypes"
  - "react"
exports:
  - "ChatManagerPanel"
---

# taskmanager/src/components/conversations/ChatManagerPanel.tsx

> Code module; imports ../../theme/taskManagerTheme, ../runtime-manager/ProcessContextMenu, ../runtime-manager/runtimeManagerUtils, ../runtime-manager/RuntimePrimitives; exports ChatManagerPanel

## Key Signals

- Source path: taskmanager/src/components/conversations/ChatManagerPanel.tsx
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescriptreact
- Top level: taskmanager
- Score: 80
- Tags: app-src, code, high-value, scripts, tsx
- Imports: ../../theme/taskManagerTheme, ../runtime-manager/ProcessContextMenu, ../runtime-manager/runtimeManagerUtils, ../runtime-manager/RuntimePrimitives, ./chatManagerTypes, react
- Exports: ChatManagerPanel

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, tsx
- Source link target: taskmanager/src/components/conversations/ChatManagerPanel.tsx

## Excerpt

~~~typescriptreact
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { ProcessContextMenu, type ProcessContextMenuItem } from "../runtime-manager/ProcessContextMenu";
import { ActionButton, SearchField, StatusBadge, ToggleChip } from "../runtime-manager/RuntimePrimitives";
import { formatRelativeTime } from "../runtime-manager/runtimeManagerUtils";
import { TASKMANAGER_LAYOUT, type TaskManagerPalette } from "../../theme/taskManagerTheme";
import type { ChatManagerFilter, StandaloneChatThread } from "./chatManagerTypes";

interface ChatManagerPanelProps {
  palette: TaskManagerPalette;
  threads: StandaloneChatThread[];
  activeThreadId: string | null;
  filter: ChatManagerFilter;
  searchValue: string;
  actionsDisabled?: boolean;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: ChatManagerFilter) => void;
  onCreateThread: () => void;
  onOpenThread: (threadId: string) => void;
  onRenameThread: (threadId: string, title: string) => void;
  onDeleteThread: (threadId: string) => void;
  onTogglePin: (threadId: string) => void;
}

type ChatManagerSection = {
  id: string;
  label: string;
  detail: string;
  threads: StandaloneChatThread[];
~~~