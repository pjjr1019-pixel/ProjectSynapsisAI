---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/src/types/horizonsDesktop.d.ts"
source_name: "horizonsDesktop.d.ts"
top_level: "taskmanager"
surface: "app-src"
classification: "high-value"
kind: "code"
language: "typescript"
extension: ".ts"
score: 80
selected_rank: 707
content_hash: "44faa91af33f23d9bc6e518ac252abee1a73ab0bff41102705351d80d3c2b4b0"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "app-src"
  - "code"
  - "high-value"
  - "scripts"
  - "ts"
---

# taskmanager/src/types/horizonsDesktop.d.ts

> Code module

## Key Signals

- Source path: taskmanager/src/types/horizonsDesktop.d.ts
- Surface: app-src
- Classification: high-value
- Kind: code
- Language: typescript
- Top level: taskmanager
- Score: 80
- Tags: app-src, code, high-value, scripts, ts

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: app-src, code, high-value, scripts, taskmanager, ts
- Source link target: taskmanager/src/types/horizonsDesktop.d.ts

## Excerpt

~~~typescript
interface HorizonsTaskManagerDesktopApi {
  openWindow(): Promise<{ ok: boolean }>;
  setWindowLayout(input: { mode: "collapsed" | "expanded" }): Promise<{
    ok: boolean;
    mode: "collapsed" | "expanded";
    maximized?: boolean;
    width?: number;
    height?: number;
    error?: string;
  }>;
  minimizeWindow(): Promise<{ ok: boolean }>;
  toggleMaximizeWindow(): Promise<{ ok: boolean; maximized: boolean }>;
  closeWindow(): Promise<{ ok: boolean }>;
  isMaximizedWindow(): Promise<{ ok: boolean; maximized: boolean }>;
  getSnapshot(): Promise<unknown>;
  stopGroup(input: { groupId: string; pids: number[] }): Promise<{
    ok: boolean;
    stoppedPids: number[];
    skippedPids: number[];
    errors?: Array<{ pid: number; error: string }>;
  }>;
  revealPath(input: { path: string }): Promise<{ ok: boolean; error?: string }>;
}

interface HorizonsRuntimeManagerDesktopApi {
  getComputerOverview(input?: {
    monitoringEnabled?: boolean;
    ignoredFingerprints?: string[];
~~~