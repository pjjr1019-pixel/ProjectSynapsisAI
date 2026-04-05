---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/types/conversations.ts"
source_name: "conversations.ts"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescript"
extension: ".ts"
score: 80
selected_rank: 705
content_hash: "9fdb4422ef40dfbcd8d1bcc7683de59cd7b2bca31eddf4d46b365f8268f49c85"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "app-src"
  - "code"
  - "high-value"
  - "scripts"
  - "ts"
exports:
  - "interface"
---

# taskmanager/src/types/conversations.ts

> Code module; exports interface

## Key Signals

- Source path: taskmanager/src/types/conversations.ts
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescript
- Top level: taskmanager
- Score: 80
- Tags: app-src, code, high-value, scripts, ts
- Exports: interface

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, ts
- Source link target: taskmanager/src/types/conversations.ts

## Excerpt

~~~typescript
export interface TaskManagerConversationThreadSummary {
  id: string;
  title: string;
  surfaceId: string;
  surfaceTitle: string | null;
  updatedAt: number;
  messageCount: number;
  lastMessageRole: "user" | "assistant" | null;
  lastMessagePreview: string;
  active: boolean;
}

export interface TaskManagerLauncherWorkspaceMessage {
  role: "user" | "assistant";
  text: string;
  source: string | null;
  provenanceLabel: string | null;
}

export interface TaskManagerLauncherWorkspaceSnapshot {
  appName: string;
  activeSurfaceId: string | null;
  activeSurfaceTitle: string | null;
  chatThreadTitle: string | null;
  chatSubmitting: boolean;
  chatWindowOpen: boolean;
  brainBrowserOpen: boolean;
  crawlTerminalOpen: boolean;
~~~