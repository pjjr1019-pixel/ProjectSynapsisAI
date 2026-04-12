# 22-Do Not Touch Yet

## Files/Folders Most Likely to Break Active Runtime if Reorganized Too Early

### 1. apps/desktop/electron/main.ts
- Why: Main process entry, orchestrates all runtime services
- Runtime path: Critical runtime spine
- Prerequisite: Complete runtime stabilization and add regression tests

### 2. packages/Governance-Execution/src/governed-chat/router.ts
- Why: Central routing logic, Phase 6 integration
- Runtime path: Routing/interpreter
- Prerequisite: Stabilize Phase 6 and legacy routing

### 3. packages/Awareness-Reasoning/src/runtime-capabilities.ts
- Why: Capability registry/lookup, adapter integration
- Runtime path: Capability lookup
- Prerequisite: Centralize registry and complete audit

### 4. packages/Awareness-Reasoning/src/memory/storage/messages.ts
- Why: Message persistence, trace storage
- Runtime path: Persistence
- Prerequisite: Audit for memory/improvement/overlay drift

### 5. packages/Awareness-Reasoning/src/improvement/analyzer.ts
- Why: Improvement event dedupe/rate-limiting
- Runtime path: Improvement analysis
- Prerequisite: Complete event flow audit

### 6. apps/desktop/electron/preload.ts
- Why: IPC bridge, boundary enforcement
- Runtime path: Preload bridge
- Prerequisite: Audit for unsafe exposures

### 7. packages/Awareness-Reasoning/src/context/
- Why: Context assembly, task skills
- Runtime path: Context assembly
- Prerequisite: Audit for context drift/duplication

### 8. SynAI/
- Why: Main product folder, complex integration
- Runtime path: Multiple
- Prerequisite: Deep audit and stabilization

## TODO
- Add more as discovered in deep audit
