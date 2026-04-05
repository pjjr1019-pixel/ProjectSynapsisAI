---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/components/conversations/ConversationPreviewDrawer.tsx"
source_name: "ConversationPreviewDrawer.tsx"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescriptreact"
extension: ".tsx"
score: 80
selected_rank: 700
content_hash: "6648f4ce8732413a8dafe780bca92c905f294c64d65576da0a999417bbbd39d1"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "app-src"
  - "code"
  - "high-value"
  - "scripts"
  - "tsx"
imports:
  - "../../theme/taskManagerTheme"
  - "../../types/conversations"
exports:
  - "ConversationPreviewDrawer"
---

# taskmanager/src/components/conversations/ConversationPreviewDrawer.tsx

> Code module; imports ../../theme/taskManagerTheme, ../../types/conversations; exports ConversationPreviewDrawer

## Key Signals

- Source path: taskmanager/src/components/conversations/ConversationPreviewDrawer.tsx
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescriptreact
- Top level: taskmanager
- Score: 80
- Tags: app-src, code, high-value, scripts, tsx
- Imports: ../../theme/taskManagerTheme, ../../types/conversations
- Exports: ConversationPreviewDrawer

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, tsx
- Source link target: taskmanager/src/components/conversations/ConversationPreviewDrawer.tsx

## Excerpt

~~~typescriptreact
import type { TaskManagerPalette } from "../../theme/taskManagerTheme";
import type { TaskManagerConversationSnapshot } from "../../types/conversations";

interface ConversationPreviewDrawerProps {
  palette: TaskManagerPalette;
  visible: boolean;
  snapshot: TaskManagerConversationSnapshot | null;
  error: string | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function formatRelativeTime(updatedAt: number): string {
  const deltaMs = Math.max(0, Date.now() - Number(updatedAt || 0));
  if (deltaMs < 60_000) return "just now";
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function messageRoleLabel(role: "user" | "assistant" | null) {
  if (role === "assistant") return "Horizons";
  if (role === "user") return "You";
  return "No messages yet";
}
~~~