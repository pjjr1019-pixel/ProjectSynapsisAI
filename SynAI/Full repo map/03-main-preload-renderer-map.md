# 03-Main/Preload/Renderer Map

## Electron Boundary Audit (VERIFIED, EVIDENCE-BACKED)
- **Main process:** [apps/desktop/electron/main.ts](../../apps/desktop/electron/main.ts)
	- Owns all privileged operations, system/process/file access, runtime orchestration, IPC registration, and service creation. No direct UI code.
- **Preload:** [apps/desktop/electron/preload.ts](../../apps/desktop/electron/preload.ts)
	- Exposes only safe, whitelisted APIs via `contextBridge.exposeInMainWorld`. No direct system/file/process access. All APIs are routed to main via IPC.
- **Renderer:** [apps/desktop/src/main.tsx](../../apps/desktop/src/main.tsx), [apps/desktop/src/App.tsx](../../apps/desktop/src/App.tsx)
	- UI, user interaction, context display. No direct system/process/file access. All privileged operations go through preload bridge.

## What belongs where
- **Main:** System, file, process, and capability orchestration; IPC registration; runtime service creation (see code evidence above).
- **Preload:** Safe IPC bridge, context exposure (see SynAIBridge definition in preload.ts).
- **Renderer:** UI, user interaction, context display (see App.tsx, main.tsx).

## Current Leaks/Violations (April 2026)
- **Renderer:** No direct fs/process/system access found. All privileged operations are routed through preload and main.
- **Preload:** Only exposes safe, whitelisted APIs. No evidence of unsafe exposure or direct privileged access.
- **Boundary violations:** None found in code or context as of this audit.

## Rules to Preserve
- No direct system/process/file access in renderer
- Preload exposes only safe, whitelisted APIs
- Main owns all privileged operations

## Audit Status
- All boundaries currently respected. No violations found in code or context as of this audit.
- Re-audit required after any major refactor or new feature touching Electron boundaries.
