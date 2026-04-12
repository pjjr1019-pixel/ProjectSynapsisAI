# 02-Runtime Spine

## Critical Runtime Path (VERIFIED, EVIDENCE-BACKED)
- **User entry:**
	- [apps/desktop/index.html](../../apps/desktop/index.html): Loads root div and injects renderer bundle.
	- [apps/desktop/src/main.tsx](../../apps/desktop/src/main.tsx): React root, mounts `<App />`.
- **Preload bridge:**
	- [apps/desktop/electron/preload.ts](../../apps/desktop/electron/preload.ts): Exposes `SynAIBridge` API via `contextBridge.exposeInMainWorld`. No direct privileged access.
- **Main process handler:**
	- [apps/desktop/electron/main.ts](../../apps/desktop/electron/main.ts): Orchestrates all privileged operations, creates runtime services, registers IPC, owns lifecycle.
		- Key classes/functions: `createGovernedChatService`, `createAgentRuntimeService`, `createDesktopActionService`, `createWorkflowOrchestrator`, `mainWindow` lifecycle, IPC handlers.
- **Router/interpreter:**
	- [packages/Governance-Execution/src/governed-chat/router.ts](../../../packages/Governance-Execution/src/governed-chat/router.ts): Phase 6 router, intent detection, capability lookup, routing decision, event emission.
		- Key functions: `detectRequestIntent`, `findCapabilitiesForIntent`, `buildRoutingDecision`, `buildRequestUnderstandingTrace`.
- **Capability lookup:**
	- [packages/Awareness-Reasoning/src/runtime-capabilities.ts](../../../packages/Awareness-Reasoning/src/runtime-capabilities.ts): Central registry, intent-based lookup.
		- Key function: `findCapabilitiesForIntent`.
- **Context assembly:**
	- [packages/Awareness-Reasoning/src/context/index.ts](../../../packages/Awareness-Reasoning/src/context/index.ts): Assembles awareness/context for requests.
		- Key functions: `summarizeAwarenessDigest`, `buildAwarenessContextSection`.
- **Model execution:**
	- [packages/Awareness-Reasoning/src/local-ai/provider.ts](../../../packages/Awareness-Reasoning/src/local-ai/provider.ts): Local AI provider interface.
		- Key interface: `LocalAIProvider`.
- **Post-processing:**
	- [packages/Awareness-Reasoning/src/reply-policies/index.ts](../../../packages/Awareness-Reasoning/src/reply-policies/index.ts): Reply policy, canonical/overlay rules.
		- Key functions: `getActiveReplyPolicies`, `addGeneratedReplyPolicyRule`.
- **Persistence:**
	- [packages/Awareness-Reasoning/src/memory/storage/messages.ts](../../../packages/Awareness-Reasoning/src/memory/storage/messages.ts): Message storage, attaches `RequestUnderstandingTrace` to metadata.
		- Key function: `addMessage`.
- **Improvement analysis:**
	- [packages/Awareness-Reasoning/src/improvement/analyzer.ts](../../../packages/Awareness-Reasoning/src/improvement/analyzer.ts): Dedupes/rate-limits unsupported/clarify events, queues improvement events.
		- Key function: `analyzeUnsupportedClarifyEvent`.
- **Inspection/debug:**
	- [context/ARCHITECTURE_SUMMARY.md](../../context/ARCHITECTURE_SUMMARY.md), [context/BLAST_RADIUS.md](../../context/BLAST_RADIUS.md): Canonical architecture and blast radius docs.

## For each step:
- See [runtime-spine-index.json](runtime-spine-index.json) for exact file/function/class and status. All entries are now mapped to concrete code evidence.

## Why it matters
- This path is the "do not casually break" architecture spine. All major runtime, routing, and persistence flows depend on it. Any change here must be reviewed for blast radius and regression risk.

## Cleanup Risk
- **High:** Any changes here can break core app behavior. See [22-do-not-touch-yet.md](22-do-not-touch-yet.md).

**Status:** All runtime spine steps are now mapped to concrete code, with explicit function/class evidence. No TODOs remain.
