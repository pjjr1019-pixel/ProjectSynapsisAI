---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/components/conversations/chatManagerTypes.ts"
source_name: "chatManagerTypes.ts"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescript"
extension: ".ts"
score: 80
selected_rank: 699
content_hash: "0986f6fc870e9761de04a0468ea55c1a81e24987c41b6e23f1a5aa82e64a74f5"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "app-src"
  - "code"
  - "high-value"
  - "scripts"
  - "ts"
imports:
  - "../../types/governed-actions"
exports:
  - "interface"
  - "type"
---

# taskmanager/src/components/conversations/chatManagerTypes.ts

> Code module; imports ../../types/governed-actions; exports interface, type

## Key Signals

- Source path: taskmanager/src/components/conversations/chatManagerTypes.ts
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescript
- Top level: taskmanager
- Score: 80
- Tags: app-src, code, high-value, scripts, ts
- Imports: ../../types/governed-actions
- Exports: interface, type

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, ts
- Source link target: taskmanager/src/components/conversations/chatManagerTypes.ts

## Excerpt

~~~typescript
import type { GovernedChatResponse } from "../../types/governed-actions";

export type ChatManagerFilter = "all" | "pinned" | "recent";

export interface StandaloneChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  pending?: boolean;
  governedAction?: GovernedChatResponse | null;
  drawerVisible?: boolean;
  drawerFading?: boolean;
  drawerPersistent?: boolean;
  drawerExpiresAt?: number | null;
}

export interface StandaloneChatThread {
  id: string;
  sessionId: string;
  title: string;
  customTitle: boolean;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  messages: StandaloneChatMessage[];
}
~~~