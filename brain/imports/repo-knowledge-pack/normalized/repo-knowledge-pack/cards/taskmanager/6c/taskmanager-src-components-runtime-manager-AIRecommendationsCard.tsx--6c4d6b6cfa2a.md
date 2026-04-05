---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/components/runtime-manager/AIRecommendationsCard.tsx"
source_name: "AIRecommendationsCard.tsx"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescriptreact"
extension: ".tsx"
score: 0
selected_rank: 3448
content_hash: "2166bc3bb97e34e9bacd040bddaaca58f0999366a2f39d5fa41dce6c57b19d95"
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
exports:
  - "AIRecommendationsCard"
---

# taskmanager/src/components/runtime-manager/AIRecommendationsCard.tsx

> Code module; imports ../../theme/taskManagerTheme, ./RuntimePrimitives, ./types; exports AIRecommendationsCard

## Key Signals

- Source path: taskmanager/src/components/runtime-manager/AIRecommendationsCard.tsx
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescriptreact
- Top level: taskmanager
- Score: 0
- Tags: app-src, code, high-value, scripts, tsx
- Imports: ../../theme/taskManagerTheme, ./RuntimePrimitives, ./types
- Exports: AIRecommendationsCard

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, tsx
- Source link target: taskmanager/src/components/runtime-manager/AIRecommendationsCard.tsx

## Excerpt

~~~typescriptreact
import type { TaskManagerPalette } from "../../theme/taskManagerTheme";
import type { RuntimeManagerAdvisorItem } from "./types";
import { ActionButton, PanelCard } from "./RuntimePrimitives";

export function AIRecommendationsCard({
  palette,
  recommendations,
  busyId,
  onApply,
}: {
  palette: TaskManagerPalette;
  recommendations: RuntimeManagerAdvisorItem[];
  busyId: string | null;
  onApply: (item: RuntimeManagerAdvisorItem) => void;
}) {
  const isLight = palette.mode === "light";

  return (
    <PanelCard
      palette={palette}
      title="Runtime Advisor"
      aside={<span style={{ fontSize: 10.5, color: palette.sidebarMuted }}>{recommendations.length} suggestions</span>}
    >
      {recommendations.length ? (
        <div style={{ display: "grid", gap: 9 }}>
          {recommendations.slice(0, 4).map((item) => (
            <div
              key={item.id}
~~~