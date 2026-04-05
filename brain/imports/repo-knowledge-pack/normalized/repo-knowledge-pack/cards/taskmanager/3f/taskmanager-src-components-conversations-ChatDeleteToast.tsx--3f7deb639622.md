---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/components/conversations/ChatDeleteToast.tsx"
source_name: "ChatDeleteToast.tsx"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescriptreact"
extension: ".tsx"
score: 80
selected_rank: 697
content_hash: "1567eb2977462b25fbf88e0d422bbe4cd3e74916f693d1b87db3ce01b2da969b"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "app-src"
  - "code"
  - "high-value"
  - "scripts"
  - "tsx"
imports:
  - "../../theme/taskManagerTheme"
  - "../runtime-manager/RuntimePrimitives"
exports:
  - "ChatDeleteToast"
---

# taskmanager/src/components/conversations/ChatDeleteToast.tsx

> Code module; imports ../../theme/taskManagerTheme, ../runtime-manager/RuntimePrimitives; exports ChatDeleteToast

## Key Signals

- Source path: taskmanager/src/components/conversations/ChatDeleteToast.tsx
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescriptreact
- Top level: taskmanager
- Score: 80
- Tags: app-src, code, high-value, scripts, tsx
- Imports: ../../theme/taskManagerTheme, ../runtime-manager/RuntimePrimitives
- Exports: ChatDeleteToast

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, tsx
- Source link target: taskmanager/src/components/conversations/ChatDeleteToast.tsx

## Excerpt

~~~typescriptreact
import { ActionButton } from "../runtime-manager/RuntimePrimitives";
import { TASKMANAGER_LAYOUT, type TaskManagerPalette } from "../../theme/taskManagerTheme";

interface ChatDeleteToastProps {
  title: string;
  palette: TaskManagerPalette;
  onUndo: () => void;
  onDismiss: () => void;
}

export function ChatDeleteToast({ title, palette, onUndo, onDismiss }: ChatDeleteToastProps) {
  const isLight = palette.mode === "light";

  return (
    <div
      style={{
        position: "absolute",
        left: TASKMANAGER_LAYOUT.padding.card,
        right: TASKMANAGER_LAYOUT.padding.card,
        bottom: TASKMANAGER_LAYOUT.padding.card,
        zIndex: TASKMANAGER_LAYOUT.zIndex.floatingMenu,
        borderRadius: TASKMANAGER_LAYOUT.radius.card,
        border: palette.sidebarBtnBorder,
        background: palette.sidebarSurfaceStrong,
        boxShadow: TASKMANAGER_LAYOUT.shadow.strong,
        padding: `${TASKMANAGER_LAYOUT.padding.cardCompact}px ${TASKMANAGER_LAYOUT.padding.card}px`,
        display: "grid",
        gap: TASKMANAGER_LAYOUT.spacing.tight,
~~~