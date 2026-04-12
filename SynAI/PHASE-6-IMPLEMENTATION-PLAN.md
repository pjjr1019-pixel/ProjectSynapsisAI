
# Phase 6 Implementation Plan: Unified Request Understanding & Capability Routing (Revised)

_Last updated: 2026-04-12_

---

## 1. Exact Live Call Chain

| Step | File | Function/Class | Status | Phase 6 Action |
|------|------|----------------|--------|---------------|
| **Renderer Entry** | `apps/desktop/src/features/local-chat/components/ChatInputBar.tsx` | `ChatInputBar` (`onSend`) | live | Leave alone |
| **Preload Bridge** | `apps/desktop/electron/preload.ts` | `bridge().sendChat()` | live | Leave alone |
| **Main Process Handler** | `apps/desktop/electron/main.ts` | `handleSendChat` | live | **Extend:** call universal interpreter before legacy routing (feature-flagged) |
| **Router/Interpreter** | `packages/Governance-Execution/src/governed-chat/router.ts` | `routeGovernedChatTask` | live | **Extend:** add request type, capability lookup (via runtime-capabilities), trace, feature flag/shadow mode |
| **Capability Registry** | `packages/Awareness-Reasoning/src/runtime-capabilities.ts` | `loadRuntimeCapabilityRegistry`, `CapabilityRegistryEntry` | live | **Primary registry:** extend for all capability lookups; treat `windows-action-catalog.ts` as a Windows-only adapter |
| **Context Assembly** | `apps/desktop/electron/main.ts` | `preparePromptContext`, `buildConversationAwarenessContext` | live | Leave alone |
| **Model Execution** | `packages/Governance-Execution/src/execution/chat-execution-service.ts` | `runChat`, `runChatStream` | live | Leave alone |
| **Post-Processing** | `apps/desktop/electron/reply-formatting.ts`, `packages/Awareness-Reasoning/src/reasoning/grounding.ts`, `apps/desktop/electron/reply-policy-overlay-service.ts` | `cleanupPlainTextAnswer`, `groundAssistantReply`, `applyOverlayRewrite` | live | Leave alone |
| **Persistence** | `packages/Awareness-Reasoning/src/memory/storage/messages.ts`, `db.ts` | `addMessage`, `mutateDatabase` | live | Leave alone |
| **Improvement Analysis** | `packages/Awareness-Reasoning/src/improvement/analyzer.ts` | `analyzePromptReply` | live | **Extend:** accept new unsupported/clarify events, dedupe, rate-limit |

---

## 2. Exact Contracts to Add (Tightened)

All types should be placed in `packages/Governance-Execution/src/governed-chat/types.ts` or a new types file.

```typescript
// 1. RequestFamily
export type RequestFamily =
  | "file"
  | "browser"
  | "process"
  | "service"
  | "registry"
  | "ui"
  | "system"
  | "app"
  | "answer-only"
  | "workflow"
  | "unknown";

// 2. RoutingOutcome
export type RoutingOutcome = "answer" | "act" | "clarify" | "unsupported";

// 3. ExecutorId
export type ExecutorId =
  | "desktop-actions"
  | "workflow-orchestrator"
  | "browser-automation"
  | "service-control"
  | "registry-control"
  | "answer-only"
  | "improvement"
  | "unknown";

// 4. UnsupportedRequestReason
export type UnsupportedRequestReason =
  | "NO_CAPABILITY"
  | "BLOCKED_BY_POLICY"
  | "RISK_TIER_TOO_HIGH"
  | "AMBIGUOUS"
  | "PLUGIN_BLOCKED"
  | "MISSING_CONTEXT"
  | "UNRECOGNIZED";

// 5. CapabilitySource
export type CapabilitySource = "runtime-registry" | "windows-action-adapter" | "plugin" | "builtin";

// 6. CapabilityType
export type CapabilityType = "action" | "executor" | "skill" | "surface";

// 7. RequestIntent
export interface RequestIntent {
  family: RequestFamily;
  label: string;
  signals: string[];
}

// 8. RequestIntentConfidence
export interface RequestIntentConfidence {
  value: number; // 0-1
  rationale: string;
}

// 9. CapabilityMatch
export interface CapabilityMatch {
  capabilityId: string;
  name: string;
  matchConfidence: number;
  matchReason: "alias" | "category" | "intent";
  source: CapabilitySource;
  type: CapabilityType;
}

// 10. CapabilityLookupResult
export interface CapabilityLookupResult {
  matches: CapabilityMatch[];
  unsupportedReason?: UnsupportedRequestReason;
}

// 11. RoutingDecision
export interface RoutingDecision {
  outcome: RoutingOutcome;
  reason?: string;
  clarificationNeeded?: string[];
  actionPlan?: ActionPlan;
}

// 12. ClarificationDecision
export interface ClarificationDecision {
  clarificationNeeded: string[];
  prompt: string;
  fingerprint: string;
}

// 13. UnsupportedClarifyEvent
export interface UnsupportedClarifyEvent {
  eventType: "unsupported" | "clarify";
  requestId: string;
  timestamp: number;
  userText: string;
  detectedIntent: RequestIntent;
  unsupportedReason?: UnsupportedRequestReason;
  clarificationNeeded?: string[];
  fingerprint: string; // hash of (userText + detectedIntent.family + unsupportedReason)
  dedupKey: string;    // same as fingerprint
  rateLimitBucket: string; // e.g. user/session/intent
  rateLimitCount: number;
  improvementCandidate: boolean; // true if event should be queued for improvement analysis
}

// 14. ActionPlan
export interface ActionPlan {
  executor: ExecutorId;
  steps: string[];
  riskTier: string;
  requiresApproval: boolean;
}

// 15. RequestUnderstandingTrace
export interface RequestUnderstandingTrace {
  requestId: string;
  timestamp: number;
  normalizedText: string;
  detectedIntent: RequestIntent;
  intentConfidence: RequestIntentConfidence;
  capabilityLookup: CapabilityLookupResult;
  routingDecision: RoutingDecision;
  contextSummary: string;
}
```

---

## 3. Exact Insertion Points

| Subsystem | File | Function/Class to Extend or Add |
|-----------|------|--------------------------------|
| Universal request interpreter | `packages/Governance-Execution/src/governed-chat/router.ts` | **Extend** `routeGovernedChatTask` (add intent detection, capability lookup via runtime-capabilities, trace, feature flag/shadow mode) |
| Capability registry extension | `packages/Awareness-Reasoning/src/runtime-capabilities.ts` | **Extend** `loadRuntimeCapabilityRegistry`, `CapabilityRegistryEntry` (add type/source/category fields, primary registry for all lookups) |
| Capability lookup | `packages/Awareness-Reasoning/src/runtime-capabilities.ts` | **Add** `findCapabilitiesForIntent` (use adapters like `windows-action-catalog.ts` for Windows actions only) |
| Clarify-vs-act-vs-answer router | `packages/Governance-Execution/src/governed-chat/router.ts` | **Extend** `routeGovernedChatTask` (add new RoutingDecision logic, use enums/unions) |
| Unsupported/clarify event emission | `packages/Governance-Execution/src/governed-chat/router.ts` | **Emit** `UnsupportedClarifyEvent` (dedupe by fingerprint, rate-limit by bucket, set improvementCandidate) |
| Improvement event queue | `packages/Awareness-Reasoning/src/improvement/analyzer.ts` | **Extend** to accept `UnsupportedClarifyEvent`, dedupe by fingerprint, rate-limit, only queue if `improvementCandidate` is true |
| Inspection/debug trace output | `packages/Awareness-Reasoning/src/memory/storage/messages.ts` | **Attach** `RequestUnderstandingTrace` to message metadata (persist in message object, not a separate diagnostics file) |
| Feature flag/shadow mode | `packages/Governance-Execution/src/governed-chat/router.ts` and `apps/desktop/electron/main.ts` | **Add** `PHASE_6_REQUEST_ROUTER_SHADOW` env/config flag; run new interpreter in trace-only mode if enabled |

---

## 4. Minimal Viable Phase 6

**Includes:**
- Supported request classes: answer, act, clarify, unsupported (with enums)
- Capability lookup via `runtime-capabilities.ts` (primary registry, adapters for platform-specific actions)
- Clarification and unsupported event emission (with dedupe, rate limiting, improvement candidate flag)
- Routing decision trace (attached to message metadata)
- Feature flag/shadow mode for safe rollout

**Excludes:**
- Semantic/embedding-based matching
- Human-in-the-loop escalation
- New UI
- Plugin install/uninstall
- Model auto-selection
- Cross-turn intent learning

---

## 5. Backward Compatibility Plan

- **Overlay behavior:** Overlay rules still apply post-reply; Phase 6 only adds trace and new unsupported/clarify events, does not change overlay matching.
- **Memory auto-apply:** Memory extraction and retrieval remain unchanged; Phase 6 only reads context, does not alter memory storage or auto-apply.
- **Improvement events:** Analyzer continues to run post-reply; now also receives explicit unsupported/clarify events (deduped, rate-limited, only if `improvementCandidate` is true).
- **Chat flow:** Renderer, IPC, and main handler signatures remain compatible; new fields are additive, not breaking.
- **Tool/workflow execution:** Existing executors and workflows are called as before; only the router’s decision logic is extended, not replaced.
- **Diagnostics:** All traces are attached to message metadata (no new diagnostics file).

**Migration notes:**
- All new fields are optional/additive.
- No existing contract is removed or renamed.
- Legacy paths (answer, act) are preserved; only clarify/unsupported are new.
- Overlay and improvement systems should be updated to recognize new unsupported/clarification events, but will not break if not updated immediately.

---

## 6. Test Plan

**Unit tests:**
- `routeGovernedChatTask` returns correct RoutingDecision (using enums) for each request class.
- Capability lookup via `runtime-capabilities.ts` returns correct matches and unsupported reasons.
- Clarification and unsupported event emission dedupes and rate-limits as specified.

**Integration tests:**
- End-to-end: User request → router → correct RoutingDecision → correct executor or clarification/unsupported.
- Trace output: Each routed request produces a valid `RequestUnderstandingTrace` attached to message metadata.

**Regression tests:**
- Overlay rules still apply to answer/act replies.
- Memory extraction and improvement events still fire as before.
- No breaking changes to chat UI or IPC.

**Examples:**
- "Delete C:\Windows" → RoutingDecision: unsupported, reason: RISK_TIER_TOO_HIGH
- "Open Notepad" → RoutingDecision: act, actionPlan.executor: "desktop-actions"
- "What is my CPU usage?" → RoutingDecision: answer
- "Delete that file" (no file specified) → RoutingDecision: clarify, clarificationNeeded: ["Which file?"]

---

## 7. Brutal Implementation Order

1. **Add new contracts** to types file (`governed-chat/types.ts`), using enums/unions.
2. **Extend capability registry** (`runtime-capabilities.ts`) to support type/source/category fields and primary lookup.
3. **Add/extend capability lookup** (`runtime-capabilities.ts`) to support intent-based lookup and unsupported reasons, using adapters for platform-specific actions.
4. **Extend router** (`governed-chat/router.ts`) to:
   - Detect intent and confidence (using enums)
   - Lookup capabilities (via registry)
   - Route to answer/act/clarify/unsupported (using enums)
   - Emit `UnsupportedClarifyEvent` (dedupe, rate-limit, improvement candidate)
   - Build and attach `RequestUnderstandingTrace`
   - Add feature flag/shadow mode
5. **Update main process handler** (`main.ts`) to consume new RoutingDecision and trace, pass to executors/UI.
6. **Update improvement analyzer** (`improvement/analyzer.ts`) to accept new unsupported/clarify events (dedupe, rate-limit, improvement candidate).
7. **Attach trace to message metadata** (`memory/storage/messages.ts`).
8. **Add/extend tests** (`governed-chat/__tests__`, `runtime-capabilities/__tests__`, `improvement/__tests__`).

---

## 8. Risks

1. **Router logic drift**: New clarify/unsupported paths could break legacy answer/act routing if not carefully additive.
2. **Overlay misfire**: Overlay rules may not recognize new RoutingOutcome types, causing fallback or silence.
3. **Memory extraction confusion**: If trace or unsupported events are stored as memories, could pollute context.
4. **Improvement event overload**: Too many unsupported/clarify events could flood the improvement queue (rate limiting required).
5. **Capability registry mismatch**: If registry is not updated, capability lookup may return false negatives.
6. **Ambiguity in clarification**: Poor clarification prompts could frustrate users or block valid requests.
7. **Trace bloat**: Large traces could increase message size or slow down diagnostics.
8. **IPC contract drift**: If new fields are not optional, renderer/main IPC could break.
9. **Test coverage gaps**: Missing regression tests could let subtle routing bugs through.
10. **Partial migration**: If only some executors honor new RoutingDecision, inconsistent behavior may result.

---

## 9. Exact Files to Modify First

1. `packages/Governance-Execution/src/governed-chat/types.ts`  
   *Add new contracts/interfaces for intent, enums, capability match, routing decision, trace, unsupported/clarify event.*

2. `packages/Awareness-Reasoning/src/runtime-capabilities.ts`  
   *Extend registry to support type/source/category fields and primary lookup.*

3. `packages/Governance-Execution/src/governed-chat/router.ts`  
   *Extend main router to use new contracts, perform intent/capability lookup, emit clarify/unsupported, build trace, add feature flag/shadow mode.*

4. `packages/Awareness-Reasoning/src/improvement/analyzer.ts`  
   *Update analyzer to accept new unsupported/clarify events (dedupe, rate-limit, improvement candidate).*

5. `apps/desktop/electron/main.ts`  
   *Update main handler to consume new RoutingDecision and trace, pass to executors/UI.*

6. `packages/Awareness-Reasoning/src/memory/storage/messages.ts`  
   *Attach `RequestUnderstandingTrace` to message metadata.*

7. `packages/Awareness-Reasoning/src/runtime-capabilities.ts`  
   *Add/extend capability lookup functions for intent-based matching and unsupported reasons, using adapters for platform-specific actions.*

8. `packages/Governance-Execution/src/governed-chat/__tests__/`  
   *Add/extend unit/integration tests for new routing logic and contracts.*

---

**End of Phase 6 Implementation Plan (Revised)**
