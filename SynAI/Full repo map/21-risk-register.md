# 21-Risk Register

## Top Repo Cleanup/Reorganization Risks

### 1. Breaking the Runtime Spine (VERIFIED)
- Severity: Critical
- Affected: apps/desktop/electron/main.ts, router.ts, runtime-capabilities.ts, messages.ts, etc.
- Mitigation: Only touch after runtime stabilization; add regression tests

### 2. Electron Boundary Violations (VERIFIED)
- Severity: High
- Affected: main/preload/renderer files
- Mitigation: Audit for leaks, enforce IPC boundaries

### 3. Capability Registry/Router Drift (INFERENCE)
- Severity: High
- Affected: runtime-capabilities.ts, router.ts, types.ts
- Mitigation: Centralize contracts, add tests

### 4. Memory/Improvement System Duplication (INFERENCE)
- Severity: Medium
- Affected: memory/storage, improvement/
- Mitigation: Merge/clarify systems after audit

### 5. Dead Code/Wrapper Removal (INFERENCE)
- Severity: Medium
- Affected: scripts/, adapters, wrappers
- Mitigation: Only remove after validation

### 6. Artifact/Runtime/Data Mixing (INFERENCE)
- Severity: Medium
- Affected: artifacts/, data/, out/
- Mitigation: Separate after audit

### 7. Docs/Contract Drift (INFERENCE)
- Severity: Medium
- Affected: context/, docs/, types.ts
- Mitigation: Reconcile/centralize docs/contracts

## TODO
- Add more risks as discovered in deep audit
