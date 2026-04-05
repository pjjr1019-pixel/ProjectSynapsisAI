---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/components/runtime-manager/RuntimeFooter.tsx"
source_name: "RuntimeFooter.tsx"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescriptreact"
extension: ".tsx"
score: 0
selected_rank: 3453
content_hash: "1b7ab3ef30482bb36a288f3f7b500ffa8865a52eff4e646359123a31d1036e32"
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
  - "./types"
exports:
  - "RuntimeFooter"
---

# taskmanager/src/components/runtime-manager/RuntimeFooter.tsx

> Code module; imports ../../theme/taskManagerTheme, ./runtimeManagerUtils, ./types; exports RuntimeFooter

## Key Signals

- Source path: taskmanager/src/components/runtime-manager/RuntimeFooter.tsx
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescriptreact
- Top level: taskmanager
- Score: 0
- Tags: app-src, code, high-value, scripts, tsx
- Imports: ../../theme/taskManagerTheme, ./runtimeManagerUtils, ./types
- Exports: RuntimeFooter

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, tsx
- Source link target: taskmanager/src/components/runtime-manager/RuntimeFooter.tsx

## Excerpt

~~~typescriptreact
import type { TaskManagerPalette } from "../../theme/taskManagerTheme";
import type { RuntimeManagerFooterModel } from "./types";
import { formatRelativeTime } from "./runtimeManagerUtils";

export function RuntimeFooter({
  palette,
  footer,
}: {
  palette: TaskManagerPalette;
  footer: RuntimeManagerFooterModel;
}) {
  return (
    <div
      style={{
        borderTop: palette.sidebarDivider,
        paddingTop: 10,
        display: "grid",
        gap: 4,
        fontSize: 11,
        color: palette.sidebarMuted,
      }}
    >
      <div>
        {footer.visibleGroups} visible groups | {footer.recommendations} recommendations | {footer.protectedHidden} protected hidden
      </div>
      <div>
        Last optimize: {footer.lastOptimizeAt ? formatRelativeTime(footer.lastOptimizeAt) : "never"}
        {footer.providerLabel ? ` | ${footer.providerLabel}` : ""}
~~~