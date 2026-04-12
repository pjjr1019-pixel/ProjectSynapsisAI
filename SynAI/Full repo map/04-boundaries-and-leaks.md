# 04-Boundaries and Leaks

## Verified Boundaries
- Main process (apps/desktop/electron/main.ts): Owns all privileged operations, system/process/file access, and runtime orchestration. No direct UI code.
- Preload (apps/desktop/electron/preload.ts): Exposes only safe, whitelisted APIs to renderer via contextBridge. No direct system/file/process access.
- Renderer (apps/desktop/src/main.tsx, apps/desktop/src/App.tsx): UI, user interaction, context display. No direct system/process/file access.

## Known/Suspected Leaks (as of April 2026)
- No direct fs/process/system access found in renderer (apps/desktop/src/). All privileged operations are routed through preload and main.
- Preload only exposes safe, whitelisted APIs (see SynAIBridge definition). No evidence of unsafe exposure.
- No evidence of direct Node.js or Electron privileged API usage in renderer.

## Rules to Preserve
- No direct system/process/file access in renderer
- Preload exposes only safe, whitelisted APIs
- Main owns all privileged operations

## Audit Status
- All boundaries currently respected. No violations found in code or context as of this audit.
- Re-audit required after any major refactor or new feature touching Electron boundaries.
