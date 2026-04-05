---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/components/runtime-manager/AIRuntimeResidencyCard.tsx"
source_name: "AIRuntimeResidencyCard.tsx"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescriptreact"
extension: ".tsx"
score: 0
selected_rank: 3449
content_hash: "0758633d632b3dad2214770924121e77e2fa3017d5480c800f1e6c63bddc895c"
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
  - "./types"
exports:
  - "AIRuntimeResidencyCard"
---

# taskmanager/src/components/runtime-manager/AIRuntimeResidencyCard.tsx

> Code module; imports ../../theme/taskManagerTheme, ./runtimeManagerUtils, ./RuntimePrimitives, ./types; exports AIRuntimeResidencyCard

## Key Signals

- Source path: taskmanager/src/components/runtime-manager/AIRuntimeResidencyCard.tsx
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescriptreact
- Top level: taskmanager
- Score: 0
- Tags: app-src, code, high-value, scripts, tsx
- Imports: ../../theme/taskManagerTheme, ./runtimeManagerUtils, ./RuntimePrimitives, ./types
- Exports: AIRuntimeResidencyCard

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, tsx
- Source link target: taskmanager/src/components/runtime-manager/AIRuntimeResidencyCard.tsx

## Excerpt

~~~typescriptreact
import type { TaskManagerPalette } from "../../theme/taskManagerTheme";
import type { RuntimeManagerResidencyModel } from "./types";
import { MetricBar, PanelCard } from "./RuntimePrimitives";
import { formatBytes } from "./runtimeManagerUtils";

export function AIRuntimeResidencyCard({
  palette,
  residency,
  memoryTotalBytes,
  vramTotalBytes,
}: {
  palette: TaskManagerPalette;
  residency: RuntimeManagerResidencyModel;
  memoryTotalBytes: number;
  vramTotalBytes: number;
}) {
  const ramPercent = memoryTotalBytes > 0 ? (residency.reservedRamBytes / memoryTotalBytes) * 100 : 0;
  const vramPercent = vramTotalBytes > 0 ? (residency.reservedVramBytes / vramTotalBytes) * 100 : 0;
  const isLight = palette.mode === "light";

  return (
    <PanelCard palette={palette} title="Horizons AI Residency">
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gap: 3 }}>
          <div style={{ fontSize: 12, color: palette.sidebarText }}>
            Main model: <strong>{residency.mainModelLabel}</strong>
          </div>
          <div style={{ fontSize: 11, color: palette.sidebarMuted }}>
~~~