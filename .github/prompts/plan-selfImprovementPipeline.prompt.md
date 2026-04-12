# Plan: Controlled Self-Improvement Pipeline for SynAI

## TL;DR

Implement a bounded, deterministic, approval-gated improvement system that analyzes user prompts and assistant replies to detect weak responses and capability gaps. Generates structured improvement events → plans memory/reply-policy/patch improvements → mode-gated execution (observe/propose/auto-implement-safe). Zero uncontrolled self-modification.

**Key insight**: Your codebase already has memory, governance/approvals, and audit infrastructure. This system **adds an analysis layer on top** without duplicating runtime.

---

## Plan Corrections Required Before Implementation

1. **Two-Layer Reply-Policy Design**
   - Do NOT auto-append generated rules directly into a canonical checked-in `rules.json`
   - Use: canonical reviewed definitions + runtime overlay store for generated/proposed/applied local rules
   - Analyzer/planner write to runtime overlay only, not canonical source files
   - Allows safe local experimentation + inspectable diffs without polluting canonical source

2. **Persistence Pattern Alignment**
   - Do NOT assume SQLite unless repo already uses this pattern
   - Use existing local persistence abstractions first
   - Requirement: persistent + inspectable local storage (not the storage engine itself matters)
   - SQLite acceptable only if it matches current repo architecture cleanly

3. **Minimize Core Edits**
   - Avoid modifying deep core files like `assembler.ts` in this pass unless proven stable
   - Prefer thin adapter at fallback reply / final response layer
   - Minimize merge risk with other runtime branch work
   - Keep assembler.ts untouched unless necessary

4. **Restrict Memory Auto-Apply**
   - Only allowlist durable memory categories (e.g., user preferences, confirmed facts, not random chat facts)
   - Reuse existing memory extraction/storage rules if present
   - Do NOT auto-save all high-confidence facts from chat into memory

5. **Event Quality & Specificity**
   - Add dedupe, fingerprinting, cooldown, repeat-count, and escalation logic to improvement events
   - Prevent queue spam from near-duplicate events (use content hash + time window)
   - Escalate severity only when repeated patterns justify it (e.g., same request 3+ times)
   - Include: `fingerprint` (hash of normalized prompt), `cooldownUntil` (timestamp), `repeatCount`, `lastSimilarEventId`

6. **Patch Proposals as First-Class Artifacts**
   - Patch proposals must be real structured artifacts in this pass, even if code auto-application is deferred
   - Include: schema, storage, risk estimation, file candidates, test plan, and governance adapter
   - Do NOT defer patch proposal infrastructure; build it upfront
   - Enable future auto-test + auto-apply without additional design work

7. **Additive-First, Merge-Safe Implementation**
   - Prioritize new modules, contracts, queue, planner, runtime overlay storage, tests, and docs
   - Minimize edits to unstable shared runtime surfaces (assembler, scheduler, routing core)
   - Accept deferred integration into some components (reply-policy adapter can be lazy-loaded)
   - Goal: this branch merges cleanly without blocking other runtime work

---

## What the System Does

| Scenario | Current Behavior | With Improvement System |
|----------|------------------|------------------------|
| User: "can you show a calendar?" | "I don't have that feature" | Detect weak reply → suggest better fallback → create reply-policy rule → future similar requests use rule |
| User: "show me time tracking" | (No special behavior) | Detect capability gap → escalate to planner → propose patch scaffolding (if low-risk) + save to event queue + audit |
| User asks same thing twice | No correlation | Detect repetition → escalate severity → may trigger patch proposal |
| Tool fails silently | Reply just says "error" | Detect tool_failure → escalate → flag operator |

---

## Architecture

```
user prompt + assistant reply
    ↓
[Analyzer]      ← Rules-first; detects weak_reply, capability_gap, tool_failure, memory_candidates
    ↓             (with dedupe, fingerprinting, cooldown logic)
[Event Queue]   ← Local persistent storage (abstraction-agnostic; SQLite if compatible, else native)
    ↓
[Planner]       ← Routes to memory/reply-policy/patch/escalate based on rules + escalation logic
    ↓
[Appliers]
  ├─ Memory auto-add (allowlisted categories only)
  ├─ Reply-Policy Overlay Applier (writes to runtime overlay, not canonical)
  └─ Patch Proposal Generator (real artifacts, not deferred)
    ↓
[Inspection Card] ← Shows events in trace view
    ↓
[Governance Adapter] ← Patch proposals flow through existing approval ledger + audit
```

### Two-Layer Reply-Policy Design

```
Canonical Layer (source-checked, reviewed):
  packages/Awareness-Reasoning/src/reply-policies/canonical-rules.json
    ↓ (static, rarely changes, part of codebase)
    
Runtime Overlay Layer (generated, local-only):
  .runtime/reply-policies/generated-overlay.json
    ↓ (auto-generated, inspectable in git, safe to discard)
    
Merged at Query Time:
  active_rules = canonical_rules + overlay_rules (overlay wins on conflict)
```

---

## Implementation: 4 Phases (18 Steps)

### Phase 1a: Core Infrastructure (5 steps)

**Step 1: Event Schema** (`improvement/contracts.ts`)
- ImprovementEvent type with fields:
  - Core: id, type, recommendation, risk, status, payload, created_at
  - Deduplication: `fingerprint` (normalized content hash), `cooldownUntil` (timestamp), `repeatCount`, `lastSimilarEventId`
  - Tracing: source_conversation_id, user_prompt_excerpt, assistant_reply_excerpt
- Types: memory_candidate, weak_reply, capability_gap, tool_failure, feature_request, needs_review
- Storage: abstract persistence interface (not SQLite-specific)

**Step 2: Event Queue** (`improvement/queue.ts`)
- Persistence abstraction (compatible with existing repo patterns):
  - Option A: JSON files in `.runtime/improvement-events/` if repo uses file-based storage
  - Option B: SQLite if repo already uses it and it's stable
  - Option C: Memory store with periodic flush if repo prefers this
  - MUST support: insert, query by type/status/risk/date, update_status, mark_processed
- Dedupe logic: check fingerprint against recent events (7-day window), update cooldown if near-duplicate
- Location: `.runtime/` directory (matches existing pattern)

**Step 3: Analyzer** (`improvement/analyzer.ts`)
- Input: user prompt + assistant reply + metadata
- Rules-based detection (heuristics first):
  - Weak fallback: "I don't have", "would you like me to build"
  - Capability gap: explicit admissions + name extraction
  - Tool failure: timeout/permission errors
  - Memory candidate: fact extraction
  - Repeated request: same request 2+ times
- Output: `ImprovementEvent[]` → immediately queued
- Non-blocking (runs async after chat)

**Step 4: Planner** (`improvement/planner.ts`)
- Routes events to outcomes:
  - capability_gap + repeated → patch_proposal
  - weak_reply + clear type → reply_policy
  - tool_failure → escalate
  - memory_candidate → update_memory
  - feature_request → propose_only
  - Unknown → defer
- Updates event status to "analyzed"

**Step 5: Reply-Policy Module** (`reply-policies/`)
- Two-layer design:
  - **Canonical Layer**: `packages/Awareness-Reasoning/src/reply-policies/canonical-rules.json` (source-checked, rarely changes)
  - **Runtime Overlay Layer**: `.runtime/reply-policies/generated-overlay.json` (auto-generated, local-only, safe to discard)
- Schema (canonical):
  ```json
  {
    "id": "string",
    "category": "string",
    "condition": "string",
    "fallback_reply": "string",
    "risk": "low|medium",
    "source": "canonical|manual",
    "enabled": true
  }
  ```
- Schema (overlay):
  ```json
  {
    "id": "string",
    "category": "string",
    "condition": "string",
    "fallback_reply": "string",
    "risk": "low|medium",
    "source": "improvement-analyzer",
    "generated_from_event_id": "string",
    "enabled": true,
    "created_at": "ISO string"
  }
  ```
- Analyzer/planner write ONLY to overlay, never to canonical
- Query path: merged view (canonical + overlay, overlay wins on conflict)
- Overlay can be safely deleted/reset without losing canonical definitions

### Phase 1b: Integration (5 steps, *depends on 1a*)

**Step 6: Hook to Chat Pipeline**
- File: [useLocalChat.ts](apps/desktop/src/features/local-chat/hooks/useLocalChat.ts)
- After response generated + stored, fire async analyzer (non-blocking)
- Thin adapter approach: reply-policy lookup happens at fallback-reply layer or final response formatting, NOT in assembler.ts
- Analyzer failures don't block chat
- Do NOT modify assembler.ts in this pass; add reply-policy adapter elsewhere

**Step 7: Mode System** (`improvement/modes.ts`)
- **Observe**: Analyzer runs, events queued, nothing applied
- **Propose**: Analyzer + planner run, proposals generated but not applied
- **Auto-implement-safe**: Auto-apply memory + reply-policy only; code stays proposal
- Stored in app settings (integrates with existing SettingsPanel)

**Step 8: Memory Auto-Applier**
- When analyzer finds high-confidence fact → check if category is allowlisted
- Allowlist example: user_preference, confirmed_fact, capability_confirmation, workspace_structure (reuse existing categories if present)
- Do NOT auto-save all high-confidence facts; be conservative
- Auto-insert via existing memory layer only if mode != observe AND fact passes allowlist
- Source tagged as "improvement-analyzer"
- Include: category, fact, confidence, extraction_method in stored record

**Step 9: Reply-Policy Auto-Applier**
- When planner recommends reply_policy → append rule to `.runtime/reply-policies/generated-overlay.json` (NEVER canonical file)
- Record: improvement_event_id → generated_rule_id mapping
- Version hash incremented for overlay (inspectable in git diff)
- Status: "applied" if mode = auto-impl-safe, else "proposed"
- Canonical rules.json remains source-controlled and unchanged by analyzer

**Step 10: Patch Proposal Generator** (code changes only)
- Input: improvement event recommending patch
- Output: Real structured `PatchProposal` artifact (do NOT defer infrastructure)
- Steps:
  1. Heuristic file search (existing code awareness)
  2. Identify affected modules + file candidates
  3. Risk estimation + scope classification ("scaffold" vs "small_ui" vs "small_tool_wrapper")
  4. Generate test plan (what tests would pass to verify)
  5. Create structured proposal object
- Schema:
  ```typescript
  interface PatchProposal {
    id: string;
    from_improvement_event_id: string;
    target_files: string[];
    estimated_lines_changed: number;
    risk_level: "low" | "medium";
    scope: "scaffold" | "small_ui" | "small_tool_wrapper";
    test_plan: string[];
    code_sketch?: string; // optional pseudocode or placeholder
    approval_required: boolean;
    estimated_effort: "tiny" | "small" | "medium";
    status: "drafted" | "proposed" | "approved" | "rejected" | "applied";
    created_at: ISO string;
    applied_at?: ISO string;
  }
  ```
- Store in persistent storage (same abstraction as event queue)
- Do NOT auto-apply code patches; proposals await approval

### Phase 2: Inspection & Governance (4 steps, *depends on 1*)

**Step 11: Improvement Event Card** (new component)
- Shows in [ReasoningTraceView.tsx](apps/desktop/src/features/local-chat/components/ReasoningTraceView.tsx)
- Displays: event type | prompt/reply excerpt | recommended action | risk | applied status

**Step 12: Governance Integration**
- Patch proposals flow through existing approval ledger
- Hash + token validation
- Audit trail entry

**Step 13: Cascade-Dismiss Logic**
- User dismisses event → status = "dismissed"
- Similar future events still surface but flagged as "recently dismissed"
- No permanent suppression

**Step 14: Settings Integration**
- Mode selector (observe/propose/auto-impl-safe)
- Toggles: enable analyzer, show events, auto-dismiss duplicates

### Phase 3: Testing (3 steps, *depends on 1+2*)

**Step 15: Analyzer Tests** — 10+ prompt+reply patterns
**Step 16: Planner Tests** — routing rules verified
**Step 17: E2E Tests** — full flow (event queued → memory applied → reply policy updated)

### Phase 4: Docs (1 step, *depends on 1-3*)

**Step 18: Documentation**
- [improvement-system.md](docs/improvement-system.md) — what/what-not/how
- [improvement-reply-policies.md](docs/improvement-reply-policies.md) — rule schema + manual edits
- [improvement-patch-proposals.md](docs/improvement-patch-proposals.md) — risk logic + approval flow

---

## Files to Create/Modify

### New files:
- `packages/Awareness-Reasoning/src/improvement/{contracts, analyzer, queue, planner, modes, memory-applier}.ts`
- `packages/Awareness-Reasoning/src/reply-policies/{index, applier, rules.json, schema}.ts`
- `packages/Governance-Execution/src/improvement/{patch-generator, approval-adapter}.ts`
- `apps/desktop/src/features/local-chat/components/ImprovementEventCard.tsx`
- `tests/capability/{improvement-analyzer, improvement-planner, improvement-e2e}.test.ts`
- `docs/{improvement-system, improvement-reply-policies, improvement-patch-proposals}.md`

### Modified files (minimal, merge-safe):
- [useLocalChat.ts](apps/desktop/src/features/local-chat/hooks/useLocalChat.ts) — hook analyzer (non-blocking call)
- [ReasoningTraceView.tsx](apps/desktop/src/features/local-chat/components/ReasoningTraceView.tsx) — add card
- [SettingsPanel.tsx](apps/desktop/src/features/local-chat/components/SettingsPanel.tsx) — mode selector
- Memory schema — add source field (if needed; verify existing pattern first)
- **DO NOT modify**: assembler.ts, scheduler.ts, or core routing logic in this pass

---

## Key Decisions Confirmed

✅ Reply policies stored in separate module (not system prompt or memory)
✅ Patch scope: tiny scaffolding + small UI/tool wrappers only
✅ Separate improvement queue (not folded into capability-evals yet)
✅ Auto-apply: memory + reply-policy only; code stays proposal
✅ Minimal coupling with hardening runtime via adapters

---

## Example Flow: Calendar Request

```
User: "Can you show me a calendar?"
AI:   "I don't have a calendar interface. Would you like me to build one?"

→ Analyzer detects: weak_fallback_reply + clear capability gap (calendar)
→ Event queued: type=weak_reply, type=capability_gap

→ Planner determines: weak_reply + clear type → update_reply_policy

→ If mode=auto-impl-safe:
  - New rule created: category="calendar_missing", fallback_reply="I don't have a calendar, but I can help you track tasks using my memory. Would you like to set up a task tracking system?"
  - Rule appended to rules.json (versioned, inspectable)

→ Inspection card shows: "Weak reply detected for calendar request → replied-policy rule added"

→ Next similar request checks reply-policy first → uses improved fallback
→ Future requests show less weak AI behavior
```

---

## Verification Checklist

- [ ] Analyzer correctly classifies 10+ patterns
- [ ] Planner routes to memory/reply-policy/patch by rule
- [ ] Memory/reply-policy auto-apply only in correct modes
- [ ] No false positives on good replies
- [ ] Dismissal doesn't suppress future events
- [ ] Chat latency + quality unchanged
- [ ] Governance integration working (patch proposals flow through ledger)
- [ ] Inspection card displays correctly
- [ ] All tests passing

---

## Non-Goals (Out of Scope)

- ❌ Online model training from chats
- ❌ Uncontrolled self-editing
- ❌ New package features (scaffolding + small tool-wrappers only)
- ❌ Deep coupling with hardening runtime/workflows
- ❌ Giant prompt blobs

---

## Critical Implementation Constraints for Merge Safety & Correctness

### Persistence Layer Decision
Before implementing Step 2 (Event Queue), **investigate the actual repo persistence pattern**:
- Does the repo use SQLite already for anything (memory, settings, history)?
- Does it use file-based JSON stores?
- Does it use in-memory + periodic flush?
- Choose the same pattern for event queue to maintain architectural consistency

**Do not** assume SQLite is the right choice. If repo uses file-based storage, prefer that.

### Reply-Policy Two-Layer Architecture
The overlay design is non-negotiable:
- Canonical rules source-controlled, rarely change, safe to diff in PR
- Overlay generated locally, inspectable, safe to delete without losing source definitions
- This prevents polluting the codebase with auto-generated rules while enabling improvement

### Memory Auto-Apply Allowlist
Define allowlist explicitly before implementation:
- Examples: user_preference, confirmed_capability, workspace_location, language_preference
- Do NOT auto-save arbitrary facts extracted from chat
- Reuse existing memory category taxonomy if present

### Assembler.ts Untouched
The reply-policy lookup/override must happen at the **fallback reply generation layer**, not in context assembly:
- Existing flow: prompt + context → model response → fallback if needed
- New flow: prompt + context → model response → fallback if needed → check reply-policy overlay → apply if match
- This is a thin adapter at response formatting time, not a deep core change

### Patch Proposal Artifacts
Patch proposals must be real, stored, queryable objects from Step 1:
- Not deferred to "later"
- Enables future auto-test/auto-apply infrastructure
- Storage: same abstraction as event queue

---

## Notes for Refinement

- **Deduplication Logic**: Fingerprint + cooldown prevents event queue spam. Near-duplicate events within 5 minutes should increment repeat_count instead of creating new event. Escalate only on 3+ repetitions.
- **VRAM constraints**: analyzer should be lightweight, optional LLM analysis gated behind flag

---

**Ready to begin implementation?**
