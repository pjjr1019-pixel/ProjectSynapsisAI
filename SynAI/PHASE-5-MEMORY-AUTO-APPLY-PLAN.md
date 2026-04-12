# Phase 5: Narrow Memory Auto-Apply — Implementation Plan

**Status**: Plan Ready (awaiting execution approval)  
**Date**: April 12, 2026  
**Scope**: Implement safe, local-first memory auto-apply for high-confidence `preference` and `personal_fact` candidates only.

---

## ⚠️ CRITICAL: Verification Steps Required Before Starting Implementation

**DO NOT CODE** until these verification steps are complete:

### Step V1: Verify Planner Action Schema (Task 2.5)
- [ ] Read `PlannerAction` type definition in `packages/Awareness-Reasoning/src/contracts/improvement.ts`
- [ ] Trace actual `planImprovementEvent()` output from `improvement/planner.ts`
- [ ] Document exact field names for `update_memory` actions (e.g., is it `action.event` or `action.sourceEvent`? `action.targetMemoryCategory` or different?)
- [ ] Confirm memory text source (via `action.event.reasoning`? `action.memoryText`? other?)
- [ ] **Update Task 3 schema adapters before implementing**

### Step V2: Verify Existing Inspection Can Surface Results (Task 4)
- [ ] Check if existing `listEvents()` IPC method can already filter/display `update_memory` outcomes
- [ ] Verify if event metadata can already store durability score, sensitivity flags, etc.
- [ ] If YES: extend UI only, no new bridge needed
- [ ] If NO: document minimal new bridge methods needed

### Step V3: Verify Older 4-Category Allowlist Override (Task 2)
- [ ] Check if `memory-applier-adapter.ts` still has the old 4-category `ALLOWED_MEMORY_CATEGORIES` constant
- [ ] Confirm this must be removed or completely replaced with Phase 5 narrower scope
- [ ] Add comment flagging Phase 5-only behavior

**Do not proceed to code tasks until ALL three verification steps are done.**

---

## Objective

Wire the planner's `update_memory` actions through a strict allowlist policy that auto-applies only high-confidence (`0.8+`) memories in:
- `preference` (all qualifying candidates)
- `personal_fact` (only clearly durable, non-sensitive entries via durability + sensitivity checks)

Use exact-first dedupe, write to the real memory system on the main process, and extend the existing improvement inspection UI minimally to show apply/reject/defer outcomes.

---

## Hard Constraints (Already Decided)

### 1. Allowlist Scope: CONSERVATIVE
Auto-apply memory only for:
- `preference`
- `personal_fact`

Do NOT auto-apply:
- `project`
- `goal`
- `constraint`
- `decision`
- `note`
- any broader category

If planner outputs these, keep them as proposal-only or deferred, not auto-applied.

### 2. Confidence Threshold: HIGH
- Minimum score to auto-apply: **0.8+**
- Below 0.8: reject or defer

### 2.5. Personal_fact Safety Gates (NEW - STRICT ADDITIONAL CHECKS)
Even with confidence >= 0.8 and risk === low, auto-apply `personal_fact` ONLY if:
- **Durability Check**: Content shows durable keywords ("always", "prefer", "typically", "generally", "stable", "permanent", etc.) with calculated durability score >= 0.7
- **Sensitivity Check**: Content does NOT contain sensitive keywords (medical, health, financial, bank, political, religion, intimate, private, secret, password, etc.)

If either check fails:
- Durability score < 0.7 → Decision: `defer` (content appears temporary or ambiguous)
- Has sensitive keywords → Decision: `defer` (sensitive content requires manual review)

This ensures `personal_fact` auto-apply is as conservative as `preference` auto-apply.

### 3. Dedupe Strategy: EXACT FIRST, OPTIONAL FUZZY
1. **Exact match** (mandatory): Normalize text (lowercase/trim/split), compare against `listMemories()` results
2. **Fuzzy match** (optional): Only use if real memory system already safely supports semantic similarity; otherwise defer to Phase 6+

### 4. Inspection UI Location
- Do NOT build separate memory management product UI
- Extend existing **improvement inspection panel**
- Add filter/tab for `applied_memory` results
- Use larger workspace/detail area for expanded views only if needed
- Keep compact summary in the existing narrow improvement panel
- Reuse existing IPC methods if possible (no new bridge unless proven necessary)

---

## Non-Goals

Do NOT:
- Activate governance routing
- Redesign memory architecture
- Create second memory store
- Auto-save broad chat transcripts
- Auto-save temporary requests
- Auto-save speculative facts
- Change reply-policy overlay logic
- Change planner policy beyond what's necessary for narrow memory routing
- Rewrite CAG/RAG or chat pipeline
- Add cloud dependencies

---

## Implementation Tasks

### Phase 5A: Policy & Gating (Foundation)

#### Task 1: Create Memory Auto-Apply Policy Module

**File**: `packages/Awareness-Reasoning/src/integration/memory-auto-apply-policy.ts` (new)

**Exports**:
```typescript
type MemoryAutoApplyDecision = 'apply' | 'reject' | 'defer';

interface MemoryAutoApplyResult {
  decision: MemoryAutoApplyDecision;
  reason: string;
  metadata?: {
    category?: MemoryCategory;
    confidence?: number;
    riskLevel?: string;
    dedupeMatch?: string; // existing memory ID if duplicate
    durabilityScore?: number; // for personal_fact
    hasSensitiveContent?: boolean; // for personal_fact
  };
}

interface MemoryCandidateInput {
  text: string;
  category: MemoryCategory;
  confidence: number;
  risk: 'low' | 'medium' | 'high';
  sourceConversationId?: string;
  sourceEventId?: string;
}

export function evaluateMemoryAutoApply(
  candidate: MemoryCandidateInput
): Promise<MemoryAutoApplyResult>;
```

**Logic** (checked in order, short-circuit on fail):

1. **Category Check**
   - If category NOT in ['preference', 'personal_fact']
   - → Decision: `reject`, Reason: `"Category '${category}' not in allowlist (Phase 5 only allows preference and filtered personal_fact)"`

2. **Confidence Check**
   - If confidence < 0.8
   - → Decision: `reject`, Reason: `"Confidence ${confidence} below threshold 0.8"`

3. **Risk Check**
   - If risk !== 'low'
   - → Decision: `reject`, Reason: `"Risk level '${risk}' is not low"`

4. **Transience Check** (reuse analyzer patterns)
   - If text contains temporal keywords: "today", "tomorrow", "this week", "next Monday", "now", "soon", "later" (case-insensitive)
   - → Decision: `defer`, Reason: `"Content appears time-bound; deferring to ensure durability"`

5. **Personal_fact Safety Gates** (NEW - only for personal_fact category)
   ```typescript
   if (category === 'personal_fact') {
     // Check for sensitive content
     const sensitiveKeywords = [
       'medical', 'health', 'doctor', 'disease', 'medication', 'therapy',
       'financial', 'bank', 'credit', 'salary', 'income',
       'political', 'religion', 'religious', 'belief',
       'intimate', 'private', 'secret', 'password', 'key'
     ];
     const hasSensitive = sensitiveKeywords.some(kw => text.toLowerCase().includes(kw));
     
     if (hasSensitive) {
       → Decision: `defer`, Reason: `"Personal fact contains sensitive content; deferring for manual review"`
       metadata.hasSensitiveContent: true
     }

     // Check durability score
     const durabilityKeywords = [
       'always', 'prefer', 'usually', 'typically', 'general', 'default',
       'permanent', 'stable', 'consistent', 'standard'
     ];
     const temporalKeywords = [
       'today', 'this week', 'soon', 'temporary', 'try', 'maybe', 'might', 'consider'
     ];
     
     const durabilityScore = calculateDurability(text, durabilityKeywords, temporalKeywords);
     
     if (durabilityScore < 0.7) {
       → Decision: `defer`, Reason: `"Personal fact not clearly durable (score ${durabilityScore}); deferring for later"`
       metadata.durabilityScore: durabilityScore
     }
   }
   ```

6. **Exact Dedupe Check**
   - Normalize candidate text: `text.toLowerCase().trim()`
   - Call `listMemories()` to retrieve all existing memories
   - For each existing memory:
     - Normalize: `memory.text.toLowerCase().trim()`
     - If normalized texts match exactly:
       - → Decision: `reject`, Reason: `"Exact duplicate of memory '${memory.id}'"`
   - If no exact match found: continue

7. **All Checks Passed**
   - → Decision: `apply`, Reason: `"All checks passed; auto-applying"`

**Helper functions**:
```typescript
function calculateDurability(text: string, durabilityKws: string[], temporalKws: string[]): number {
  const lower = text.toLowerCase();
  const dKwCount = durabilityKws.filter(kw => lower.includes(kw)).length;
  const tKwCount = temporalKws.filter(kw => lower.includes(kw)).length;
  
  if (tKwCount > 0) return 0.3 + (dKwCount * 0.1);  // Temporal dampens score
  return Math.min(1.0, 0.5 + (dKwCount * 0.15));     // Durability boosts score
}

function hasSensitiveKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}
```

**Dedupe detail**: 
- Use `listMemories()` API from memory storage layer
- Normalize both candidate and existing memory text (lowercase, trim whitespace)
- Exact string comparison after normalization
- Do NOT implement fuzzy/semantic similarity in Phase 5; defer to Phase 6+ if needed
- Log each check for observability

---

#### Task 2: Update Memory Applier Adapter

**File**: `packages/Awareness-Reasoning/src/integration/memory-applier-adapter.ts` (update)

**Current state**: Has `applyMemoryFromEvent()` and `applyQueuedMemories()` already defined but calls `upsertMemory()` directly without policy checks.

**Changes**:
1. Import new policy: `import { evaluateMemoryAutoApply } from './memory-auto-apply-policy'`
2. Update `applyMemoryFromEvent()` to call policy before write:
   ```typescript
   async function applyMemoryFromEvent(event: ImprovementEvent): Promise<MemoryApplyResult> {
     try {
       if (event.type !== "memory_candidate") {
         return { eventId: event.id, success: false, reason: "Not a memory_candidate event" };
       }

       const memoryText = extractMemoryText(event.reasoning);
       if (!memoryText || memoryText.length < 5) {
         return { eventId: event.id, success: false, reason: "Could not extract memory text" };
       }

       const category = inferMemoryCategory(event);
       if (!category) {
         return { eventId: event.id, success: false, reason: "Could not infer category" };
       }

       const importance = calculateImportance(event.risk);

       // NEW: Evaluate policy before writing
       const policyResult = await evaluateMemoryAutoApply({
         text: memoryText,
         category,
         confidence: event.payload?.confidence ?? 0.5,
         risk: event.risk,
         sourceConversationId: event.sourceConversationId,
         sourceEventId: event.id
       });

       if (policyResult.decision === 'reject') {
         await updateImprovementEventStatus(event.id, 'rejected', {
           reason: policyResult.reason
         });
         return { eventId: event.id, success: false, reason: policyResult.reason };
       }

       if (policyResult.decision === 'defer') {
         // Leave status as 'analyzed' or mark 'deferred'
         await updateImprovementEventStatus(event.id, 'deferred', {
           reason: policyResult.reason
         });
         return { eventId: event.id, success: false, reason: policyResult.reason };
       }

       // decision === 'apply'
       const memory = await upsertMemory({
         category,
         text: memoryText,
         sourceConversationId: event.sourceConversationId || "unknown",
         importance,
         provenance: {
           sourceEventId: event.id,
           sourceKind: "conversation",
           capturedAt: new Date().toISOString()
         }
       });

       await updateImprovementEventStatus(event.id, 'applied', {
         memoryId: memory.id,
         appliedAt: new Date().toISOString()
       });

       return { eventId: event.id, success: true, memoryId: memory.id };
     } catch (err) {
       console.warn(`[Memory Applier] Failed for event ${event.id}:`, err);
       return { eventId: event.id, success: false, reason: String(err) };
     }
   }
   ```

3. No changes to `applyQueuedMemories()` or `setupMemoryAutoApplier()`—they already orchestrate `applyMemoryFromEvent()`.

---

### Phase 5B: Wire Planner Output (Integration)

#### Task 2.5: VERIFY Planner Action Schema (REQUIRED FIRST)

**File**: `packages/Awareness-Reasoning/src/contracts/improvement.ts`

**What to verify** (read the actual code):
1. Type `PlannerAction` definition — what fields does it have?
2. Where/how does `planImprovementEvent()` emit `update_memory` actions?
3. Does it include:
   - `action.event` (source improvement event)?
   - `action.targetMemoryCategory` (the category to apply)?
   - `action.reasoning` (explanation)?
   - Or different field names?
4. How is memory text provided? Via `action.event.reasoning`? `action.memoryText`? Other?

**Document findings** before proceeding to Task 3. Update this plan with actual schema.

**Likely result** (example, but MUST verify):
```typescript
interface PlannerAction {
  type: 'update_memory' | 'update_reply_policy' | ...;
  event: ImprovementEvent;
  targetMemoryCategory?: string;
  reasoning?: string;
  // other fields...
}
```

---

#### Task 3: Handle update_memory Actions in Improvement Runtime

**File**: `apps/desktop/electron/improvement-runtime-service.ts` (update, ~lines 130-150)

**Prerequisites**: Task 2.5 completed with actual schema documented above.

**Current state**: Has a `for const action of plannedOutput.actions` loop that handles `update_reply_policy` actions. No handler for `update_memory` actions.

**Changes** (pseudo-code, adapt to actual schema from Task 2.5):
Add new branch in the action-routing loop:

```typescript
for (const action of plannedOutput.actions) {
  if (action.type === "update_reply_policy" && action.replyPolicyRule) {
    // Phase 3: Existing logic for reply-policy rules
    try {
      await this.addReplyPolicyRule(
        action.replyPolicyRule.sourceEventId || event.id,
        action.replyPolicyRule.category,
        action.replyPolicyRule.matchConditions,
        action.replyPolicyRule.rewrittenFallback,
        action.replyPolicyRule.confidence,
        action.replyPolicyRule.risk
      );
      this.emitProgress(
        `Overlay rule created: ${action.replyPolicyRule.category} (${action.replyPolicyRule.risk} risk)`
      );
    } catch (err) {
      console.error("[Improvement] Failed to create reply-policy rule:", err);
    }
  }

  // NEW: Phase 5 - Memory auto-apply
  // NOTE: Adapt field access below to actual PlannerAction schema from Task 2.5
  if (action.type === "update_memory") {
    try {
      const sourceEvent = action.event; // verify field name
      const category = action.targetMemoryCategory || "personal_fact"; // verify field name
      const confidence = sourceEvent.payload?.confidence ?? 0.5;

      // Call applier which internally uses policy
      const result = await applyMemoryFromEvent(sourceEvent);

      if (result.success) {
        this.emitProgress(
          `Memory auto-applied: ${category} (confidence: ${confidence}, id: ${result.memoryId})`
        );
      } else {
        this.emitProgress(`Memory action skipped: ${result.reason}`);
      }
    } catch (err) {
      console.error("[Improvement] Failed to process memory action:", err);
      // Graceful fallback: don't break chat if memory auto-apply fails
    }
  }
}
```

**Important**: 
- Field names (`action.event`, `action.targetMemoryCategory`) are placeholders; adapt to actual schema
- Import `applyMemoryFromEvent` at top:
  ```typescript
  import { applyMemoryFromEvent } from "@awareness/integration/memory-applier-adapter";
  ```
- Source attribution already included via `provenance` in `applyMemoryFromEvent`

---

### Phase 5C: Main/Renderer Boundaries (Verification)

#### Task 4: Verify Electron Boundaries Remain Intact

**Scope**: Review, no code changes expected (boundaries already strong from Phase 4).

**Checklist**:
- ✅ Main process (`improvement-runtime-service.ts`): All policy evaluation + memory writes
- ✅ Preload (`apps/desktop/electron/preload.ts`): Only typed IPC forwarding; no new handlers needed unless inspection demands real-time updates
- ✅ Renderer (`apps/desktop/src/`): Inspection/debug UI only; zero file I/O; uses bridge for data
- ✅ No direct renderer-side memory writes

**Result**: No changes needed. Phase 4 boundaries remain intact.

---

### Phase 5D: Inspection & Observability (UI)

#### Task 5: Extend Existing Improvement Inspection UI

**Scope**: Add memory auto-apply results view to existing improvement panel.

**Assumption**: The app already has an improvement inspection panel showing recent improvement events (analyzer outputs). This task extends that to show memory auto-apply outcomes.

**Location**: Exact file location TBD based on existing improvement panel structure. Likely in:
- `apps/desktop/src/features/local-chat/components/improvement/` or similar

**UI Changes**:
1. **Add filter/tab for memory actions**:
   - Existing tab: "All Events"
   - New tab/filter: "Memory Auto-Apply"
   - Shows only events with `type === 'memory_candidate'` and action `type === 'update_memory'`

2. **Display columns/fields**:
   - **Memory Text** (truncated, expandable to full text)
   - **Category** (preference | personal_fact | etc.)
   - **Confidence** (0.XX format)
   - **Decision** (❌ Rejected | ✅ Applied | ⏸️ Deferred)
   - **Reason** (Why the decision was made)
   - **Source Event ID** (hyperlink to full event if needed)
   - **Timestamp** (ISO or relative time)

3. **Interaction**:
   - Click a memory row → expand detail view
   - Detail view can use larger right-side workspace area if available
   - Show full memory text, dedupe match (if applicable), policy evaluation details

4. **No major UI redesign**:
   - Reuse existing event list component
   - Add new columns to existing table/list
   - Do NOT build a separate memory-admin product

**Implementation approach**:
- Determine exact location by inspecting existing improvement panel code
- Add new filter state (e.g., `filterByActionType = 'update_memory'`)
- Add columns to existing event list display
- If detail view needs expansion, use existing split/panel pattern (don't invent new UI)

---

### Phase 5E: Testing (Safety)

#### Task 6: Add Comprehensive Test Suite

**File**: `tests/capability/memory-auto-apply.test.ts` (new)

**Test Structure**:

```typescript
describe('Memory Auto-Apply System', () => {
  // Unit Tests: Policy Evaluation
  describe('evaluateMemoryAutoApply Policy', () => {
    test('allows preference category with confidence >= 0.8 and low risk', async () => {
      const result = await evaluateMemoryAutoApply({
        text: 'User prefers dark mode',
        category: 'preference',
        confidence: 0.85,
        risk: 'low'
      });
      expect(result.decision).toBe('apply');
    });

    test('allows personal_fact category with confidence >= 0.8 and low risk', async () => {
      const result = await evaluateMemoryAutoApply({
        text: 'User works in software engineering',
        category: 'personal_fact',
        confidence: 0.9,
        risk: 'low'
      });
      expect(result.decision).toBe('apply');
    });

    test('rejects project category (not in allowlist)', async () => {
      const result = await evaluateMemoryAutoApply({
        text: 'Working on AI chatbot project',
        category: 'project',
        confidence: 0.9,
        risk: 'low'
      });
      expect(result.decision).toBe('reject');
      expect(result.reason).toMatch(/not in allowlist/i);
    });

    test('rejects goal category (not in allowlist)', async () => {
      const result = await evaluateMemoryAutoApply({
        text: 'Goal: improve productivity',
        category: 'goal',
        confidence: 0.9,
        risk: 'low'
      });
      expect(result.decision).toBe('reject');
      expect(result.reason).toMatch(/not in allowlist/i);
    });

    test('rejects confidence below 0.8', async () => {
      const result = await evaluateMemoryAutoApply({
        text: 'User might prefer light mode',
        category: 'preference',
        confidence: 0.7,
        risk: 'low'
      });
      expect(result.decision).toBe('reject');
      expect(result.reason).toMatch(/below threshold/i);
    });

    test('rejects medium risk', async () => {
      const result = await evaluateMemoryAutoApply({
        text: 'User prefers Python for coding',
        category: 'preference',
        confidence: 0.9,
        risk: 'medium'
      });
      expect(result.decision).toBe('reject');
      expect(result.reason).toMatch(/not low/i);
    });

    test('rejects high risk', async () => {
      const result = await evaluateMemoryAutoApply({
        text: 'User medical preference',
        category: 'preference',
        confidence: 0.9,
        risk: 'high'
      });
      expect(result.decision).toBe('reject');
      expect(result.reason).toMatch(/not low/i);
    });

    // NEW: Personal_fact durability & sensitivity gates
    test('defers personal_fact with sensitive content (medical) even at high confidence', async () => {
      const result = await evaluateMemoryAutoApply({
        text: 'I have a history of migraines and take medication daily',
        category: 'personal_fact',
        confidence: 0.95,  // Very high
        risk: 'low'
      });
      expect(result.decision).toBe('defer');
      expect(result.reason).toMatch(/sensitive|medical/i);
      expect(result.metadata?.hasSensitiveContent).toBe(true);
    });

    test('defers personal_fact with sensitive content (financial) even at high confidence', async () => {
      const result = await evaluateMemoryAutoApply({
        text: 'My salary is $150,000 per year',
        category: 'personal_fact',
        confidence: 0.95,
        risk: 'low'
      });
      expect(result.decision).toBe('defer');
      expect(result.reason).toMatch(/sensitive|financial/i);
    });

    test('defers personal_fact with sensitive content (political)', async () => {
      const result = await evaluateMemoryAutoApply({
        text: 'I am a strong believer in this political ideology',
        category: 'personal_fact',
        confidence: 0.9,
        risk: 'low'
      });
      expect(result.decision).toBe('defer');
      expect(result.reason).toMatch(/sensitive/i);
    });

    test('accepts personal_fact with strong durability signals', async () => {
      const result = await evaluateMemoryAutoApply({
        text: 'I usually prefer to work in the morning and always take coffee breaks',
        category: 'personal_fact',
        confidence: 0.85,
        risk: 'low'
      });
      expect(result.decision).toBe('apply');
      expect(result.metadata?.durabilityScore).toBeGreaterThanOrEqual(0.7);
    });

    test('defers personal_fact with weak durability signals even at high confidence', async () => {
      const result = await evaluateMemoryAutoApply({
        text: 'I might try using a standing desk in the future',
        category: 'personal_fact',
        confidence: 0.9,
        risk: 'low'
      });
      expect(result.decision).toBe('defer');
      expect(result.reason).toMatch(/durable/i);
      expect(result.metadata?.durabilityScore).toBeLessThan(0.7);
    });

    test('defers personal_fact with temporal keywords even if otherwise strong', async () => {
      const result = await evaluateMemoryAutoApply({
        text: 'Today I realized I should try exercising more regularly',
        category: 'personal_fact',
        confidence: 0.9,
        risk: 'low'
      });
      expect(result.decision).toBe('defer');
      expect(result.reason).toMatch(/time-bound/i);
    });

    test('detects and rejects transient content (today)', async () => {
      const result = await evaluateMemoryAutoApply({
        text: 'I want to finish this task today',
        category: 'preference',
        confidence: 0.9,
        risk: 'low'
      });
      expect(result.decision).toBe('defer');
      expect(result.reason).toMatch(/time-bound/i);
    });

    test('detects and rejects transient content (next week)', async () => {
      const result = await evaluateMemoryAutoApply({
        text: 'Meeting scheduled for next week',
        category: 'personal_fact',
        confidence: 0.9,
        risk: 'low'
      });
      expect(result.decision).toBe('defer');
      expect(result.reason).toMatch(/time-bound/i);
    });

    test('rejects exact duplicate memory', async () => {
      // Mock existing memory
      const mockListMemories = jest.fn().mockResolvedValueOnce([
        { id: 'mem-1', text: 'user prefers dark mode', category: 'preference' }
      ]);
      
      const result = await evaluateMemoryAutoApply({
        text: 'User prefers dark mode',  // exact duplicate (will normalize)
        category: 'preference',
        confidence: 0.9,
        risk: 'low'
      });
      
      expect(result.decision).toBe('reject');
      expect(result.reason).toMatch(/duplicate/i);
      expect(result.metadata?.dedupeMatch).toBe('mem-1');
    });
  });

  // Integration Tests: Full Flow
  describe('Memory Auto-Apply Full Flow', () => {
    test('applies high-confidence preference to real memory system', async () => {
      const mockUpsertMemory = jest.fn().mockResolvedValueOnce({
        id: 'mem-new',
        category: 'preference',
        text: 'User prefers dark mode'
      });

      const event: ImprovementEvent = {
        id: 'evt-1',
        type: 'memory_candidate',
        status: 'detected',
        reasoning: 'User prefers Dark mode',
        payload: { confidence: 0.95 },
        risk: 'low',
        sourceConversationId: 'conv-1'
      };

      const result = await applyMemoryFromEvent(event);

      expect(result.success).toBe(true);
      expect(result.memoryId).toBe('mem-new');
      expect(mockUpsertMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'preference',
          text: expect.stringContaining('Dark mode'),
          provenance: expect.objectContaining({
            sourceEventId: 'evt-1'
          })
        })
      );
    });

    test('skips duplicate candidate without writing duplicate memory', async () => {
      // Pre-populate memory
      const existingMemory = {
        id: 'mem-1',
        text: 'user prefers dark mode',
        category: 'preference'
      };
      
      const mockListMemories = jest.fn().mockResolvedValueOnce([existingMemory]);
      const mockUpsertMemory = jest.fn(); // should not be called

      const result = await applyMemoryFromEvent({
        id: 'evt-2',
        type: 'memory_candidate',
        reasoning: 'User prefers dark mode',
        payload: { confidence: 0.9 },
        risk: 'low'
      });

      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/duplicate/i);
      expect(mockUpsertMemory).not.toHaveBeenCalled();
    });

    test('rejects policy-disallowed memory without writing', async () => {
      const mockUpsertMemory = jest.fn(); // should not be called

      const result = await applyMemoryFromEvent({
        id: 'evt-3',
        type: 'memory_candidate',
        reasoning: 'Project goal: improve system',
        payload: { confidence: 0.9 },
        risk: 'low'
      });

      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/reject|not in allowlist/i);
      expect(mockUpsertMemory).not.toHaveBeenCalled();
    });

    test('defers transient memory without writing', async () => {
      const mockUpsertMemory = jest.fn();

      const result = await applyMemoryFromEvent({
        id: 'evt-4',
        type: 'memory_candidate',
        reasoning: 'I want to finish this work today',
        payload: { confidence: 0.9 },
        risk: 'low'
      });

      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/time-bound|defer/i);
      expect(mockUpsertMemory).not.toHaveBeenCalled();
    });
  });

  // Boundary Tests
  describe('Electron Boundaries', () => {
    test('memory writes occur only via real memory system API, not side-written', async () => {
      // Mock file system to ensure no direct writes
      const mockWriteFile = jest.fn();
      
      await applyMemoryFromEvent(validMemoryCandidateEvent);

      // Should NOT write directly to JSON files
      expect(mockWriteFile).not.toHaveBeenCalled();
      // Should only use upsertMemory API
      expect(mockUpsertMemory).toHaveBeenCalled();
    });

    test('renderer never owns memory writes (mock preload only forwards)', async () => {
      // Simulate renderer calling via bridge
      const bridgeCall = async (channel, ...args) => {
        if (channel === 'memory_auto_apply_status') {
          // Bridge only forwards read requests, not write requests
          return await queryImprovementEvents({ type: 'memory_candidate' });
        }
      };

      // Calling through bridge should not allow writes
      expect(() => {
        // Attempting to write via preload should fail
        bridgeCall('write_memory', { text: 'test' });
      }).toThrow(); // or mock it to throw
    });
  });

  // Safety Tests
  describe('Failure Handling', () => {
    test('policy evaluation failure does not crash chat', async () => {
      const mockEvaluatePolicy = jest.fn().mockRejectedValueOnce(new Error('Policy error'));

      const result = await applyMemoryFromEvent(validEvent);

      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/error/i);
      // Chat should still function (no unhandled exception)
    });

    test('upsertMemory failure does not crash chat', async () => {
      const mockUpsertMemory = jest.fn().mockRejectedValueOnce(new Error('DB error'));

      const result = await applyMemoryFromEvent(validEvent);

      expect(result.success).toBe(false);
      // Chat continues
    });

    test('analyzer/planner failure does not prevent auto-apply process', async () => {
      // If planner fails, improvement runtime should not crash
      const mockPlanImprovementEvent = jest.fn().mockRejectedValueOnce(new Error('Planner error'));

      // Should not throw; should gracefully continue
      await expect(performAnalysis(userMsg, assistantMsg)).resolves.not.toThrow();
    });
  });

  // Inspection Tests
  describe('Inspection Surface Accuracy', () => {
    test('rejected memory candidates are visible in inspection with reason', async () => {
      const rejectedEvent = await applyMemoryFromEvent({
        id: 'evt-5',
        type: 'memory_candidate',
        reasoning: 'Project planning: Q1 2026',
        payload: { confidence: 0.9 },
        risk: 'low'
      });

      const inspectionData = await listEvents({ status: 'rejected', type: 'memory_candidate' });

      expect(inspectionData).toContainEqual(
        expect.objectContaining({
          id: 'evt-5',
          status: 'rejected',
          metadata: expect.objectContaining({
            reason: expect.stringMatching(/not in allowlist|category/i)
          })
        })
      );
    });

    test('applied memory candidates show in inspection with memory ID', async () => {
      const appliedEvent = await applyMemoryFromEvent(validMemoryCandidate);

      const inspectionData = await listEvents({ status: 'applied', type: 'memory_candidate' });

      expect(inspectionData).toContainEqual(
        expect.objectContaining({
          status: 'applied',
          metadata: expect.objectContaining({
            memoryId: expect.stringMatching(/^mem-/)
          })
        })
      );
    });

    test('deferred memory candidates remain in queue for later review', async () => {
      const deferredEvent = await applyMemoryFromEvent({
        id: 'evt-6',
        type: 'memory_candidate',
        reasoning: 'Next week I want to...',
        payload: { confidence: 0.9 },
        risk: 'low'
      });

      const allEvents = await listEvents();

      expect(allEvents).toContainEqual(
        expect.objectContaining({
          id: 'evt-6',
          status: 'deferred'
        })
      );
    });
  });

  // End-to-End Test
  describe('End-to-End Memory Auto-Apply Flow', () => {
    test('user preference input → analyzer → planner → auto-apply → memory persisted', async () => {
      // 1. Simulate chat interaction
      const userPrompt = "I prefer to use dark mode for all my work";
      const assistantReply = "Got it! I'll remember that you prefer dark mode.";

      // 2. Call analyzer (existing Phase 3 function)
      const analysisResult = await analyzePromptReply({
        userPrompt,
        assistantReply
      });

      expect(analysisResult.events).toContainEqual(
        expect.objectContaining({ type: 'memory_candidate' })
      );

      // 3. Get the memory_candidate event
      const memoryEvent = analysisResult.events.find(e => e.type === 'memory_candidate');
      expect(memoryEvent?.payload?.confidence).toBeGreaterThanOrEqual(0.8);

      // 4. Call planner (existing Phase 3 function)
      const planOutput = await planImprovementEvent(memoryEvent);
      expect(planOutput.actions).toContainEqual(
        expect.objectContaining({ type: 'update_memory' })
      );

      // 5. Extract update_memory action
      const memoryAction = planOutput.actions.find(a => a.type === 'update_memory');

      // 6. Simulate improvement runtime handling the action
      const applyResult = await applyMemoryFromEvent(memoryEvent);
      expect(applyResult.success).toBe(true);

      // 7. Verify memory was written to real system
      const allMemories = await listMemories();
      expect(allMemories).toContainEqual(
        expect.objectContaining({
          category: 'preference',
          text: expect.stringContaining('dark mode')
        })
      );

      // 8. Verify inspection shows the outcome
      const inspectData = await listEvents({ type: 'memory_candidate' });
      expect(inspectData).toContainEqual(
        expect.objectContaining({
          id: memoryEvent.id,
          status: 'applied',
          metadata: expect.objectContaining({
            memoryId: expect.any(String)
          })
        })
      );
    });
  });
});
```

**Test Execution**:
```bash
npm run test -- tests/capability/memory-auto-apply.test.ts
```

Expected: All tests pass, no regressions.

---

### Phase 5F: Verification & QA

#### Task 7: Run Full Test Suite & Build

1. **Unit & Integration Tests**:
   ```bash
   npm run test
   ```
   - Phase 5 tests: 20+ assertions
   - Full repo: ensure 611/612 pass (same as Phase 4)

2. **Build**:
   ```bash
   npm run build
   ```
   - No TypeScript errors
   - All three bundles (main, preload, renderer) build cleanly

3. **Lint & Type Check**:
   ```bash
   npm run lint
   npm run typecheck
   ```
   - No new errors introduced

---

## Architecture Summary

**Before Phase 5**:
```
Chat → Analyzer → ImprovementEvent (type=memory_candidate)
     → Planner emits (action.type=update_memory)
     → [action discarded, no memory write]
```

**After Phase 5**:
```
Chat → Analyzer → ImprovementEvent
     → Planner emits (action.type=update_memory)
     → ImprovementRuntimeService handles action
     → Memory-Auto-Apply Policy Gate (new)
          ├─ Allowlist check (preference|personal_fact only)
          ├─ Confidence >= 0.8?
          ├─ Risk === low?
          ├─ Exact dedupe check
          └─ Durable (not transient)?
     → DECISION (apply | reject | defer)
        ├─ Apply  → upsertMemory() via real API
        ├─ Reject → Event marked 'rejected' + reason stored
        └─ Defer  → Event stays 'analyzed' or marked 'deferred'
     → Inspection panel shows outcomes
```

---

## Files Changed/Added

### New Files
- `packages/Awareness-Reasoning/src/integration/memory-auto-apply-policy.ts`
- `tests/capability/memory-auto-apply.test.ts`

### Updated Files
- **MUST DO FIRST**: `packages/Awareness-Reasoning/src/contracts/improvement.ts` (read only, verify schema in Task 2.5)
- `apps/desktop/electron/improvement-runtime-service.ts` (add update_memory action handler, adapt to actual schema)
- `packages/Awareness-Reasoning/src/integration/memory-applier-adapter.ts` (integrate policy checks, override 4-category allowlist)
- `apps/desktop/src/features/*/improvement/` (extend inspection UI if needed; verify existing surface first)

### No Changes (Verified Intact)
- Electron boundaries remain unchanged
- Preload: no new IPC handlers added unless Task 4 proves necessary
- Memory system API unchanged
- Planner: unchanged (reads only, doesn't execute policy)

---

## Design Decisions & Tradeoffs

### 1. Why Exact-Only Dedupe in Phase 5?
- **Fuzzy/semantic dedupe** requires either:
  - Embedding index (expensive, new infrastructure)
  - Reuse of RAG similarity (complex coupling)
- **Exact dedupe** (string match after normalization):
  - Safe, deterministic, implementable now
  - Catches the common case (user enters same fact twice)
  - Leaves fuzzy to Phase 6+ when we have more confidence
- **Decision**: Exact-only in Phase 5, fuzzy as Phase 6+ enhancement

### 2. Why No Project/Goal Auto-Apply?
- User was explicit: `preference` and `personal_fact` only in Phase 5
- Project/goal categories may need different confidence thresholds or approval workflows
- Keep Phase 5 ultra-conservative
- Future phases can expand categories if proven safe

### 3. Why Extend Existing Inspection Panel, Not Build New UI?
- User wants bounded scope, not product redesign
- Improvement panel already shows events
- Adding a filter/tab for memory actions is minimal effort
- Detail views can use larger workspace area as needed
- Prevents scope creep

### 4. Why No Governance Routing Yet?
- Governance was deferred (user stated as non-goal)
- Phase 5 focuses on narrow auto-apply, not approval workflows
- Phase 6+ can add governance if needed
- Current setup allows easy insertion of governance layer later

---

## Verification Checklist

- ✅ **Allowlist policy**: Only `preference` + `personal_fact` auto-apply
- ✅ **Confidence gating**: >= 0.8 required; below is rejected/deferred
- ✅ **Dedupe**: Exact text match (normalized), no fuzzy in Phase 5
- ✅ **Real memory system**: All writes via `upsertMemory()` API
- ✅ **Main process only**: All policy + write logic in electron/improvement-runtime-service.ts
- ✅ **Renderer inspection only**: UI reads events via existing bridge, zero file I/O
- ✅ **Bounded UI**: Extends existing improvement panel, not separate product
- ✅ **Source tracking**: Improvement event ID stored in memory entry provenance
- ✅ **Tests**: 20+ assertions covering unit, integration, boundaries, failure cases, E2E
- ✅ **Electron boundaries intact**: Phase 4 boundaries remain correct
- ✅ **Graceful failures**: Auto-apply errors don't break chat pipeline
- ✅ **Inspectability**: Applied/rejected/deferred outcomes visible in inspection panel

---

## Critical Revisions Required (Before Implementation)

### Revision 1: Narrow personal_fact Further

Current plan is too loose: high confidence alone is insufficient for personal_fact auto-apply.

**Phase 5 personal_fact allowlist gating**:

Add a durability & sensitivity check **after** confidence/risk checks.

Auto-apply personal_fact ONLY if:
1. Category = personal_fact ✓
2. Confidence >= 0.8 ✓
3. Risk = low ✓
4. NOT transient pattern ✓
5. **AND** new gate: Explicitly durable (durability score >= 0.7)
6. **AND** new gate: Not sensitive content

**Durability scoring** (heuristic, reuse from analyzer if available):
- Keywords indicating durability: "always", "prefer", "usually", "typically", "in general", "by default", "permanent", "stable", "consistent"
- Keywords indicating temporality: "today", "this week", "soon", "temporary", "try", "maybe", "might", "consider"
- Score: presence of durability keywords → 0.7+; presence of temporal → 0.0-0.3; neutral → 0.5

**Sensitivity detection**:
- If text contains keywords: ["medical", "health", "doctor", "disease", "medication", "therapy", "financial", "bank", "credit", "salary", "political", "religion", "religious", "belief", "intimate", "private", "secret"], mark as sensitive
- Sensitive + high confidence still gets deferred, not rejected (allow manual review)

**Revised logic for personal_fact**:
```
if category === 'personal_fact' && confidence >= 0.8 && risk === 'low' && !transient:
  if hasSensitiveKeywords(text):
    → decision: 'defer', reason: "Personal fact contains sensitive content; deferring for review"
  else:
    durabilityScore = scoreForDurability(text)
    if durabilityScore < 0.7:
      → decision: 'defer', reason: "Personal fact not clearly durable; deferring"
    else:
      → continue to dedupe check
else:
  → decision: 'reject' (from earlier checks)
```

### Revision 2: Verify Planner Action Schema BEFORE Wiring

Stop and inspect before implementing Task 3.

**Do NOT assume** these fields exist:
- `action.event`
- `action.targetMemoryCategory`
- `action.memory*` fields

**Required step BEFORE Task 3**:
1. Read PlannerAction type definition exactly: `packages/Awareness-Reasoning/src/contracts/improvement.ts`
2. Check planner.ts actual output: How does `planImprovementEvent()` emit update_memory actions?
3. Verify exact field names, types, and presence
4. Document findings in this plan

**Likely findings** (but must verify):
- PlannerAction has `type`, `event`, `reasoning`
- For update_memory: probably has `targetMemoryCategory` or similar
- Memory text likely comes from `event.reasoning` or must be extracted

### Revision 3: Override Older 4-Category Defaults

The scaffolded adapters in memory-applier-adapter.ts define:
```typescript
const ALLOWED_MEMORY_CATEGORIES: MemoryCategory[] = [
  "preference",
  "personal_fact",
  "project",
  "goal"
];
```

**Phase 5 MUST OVERRIDE this**.

Options:
A) Replace the constant in memory-applier-adapter.ts with Phase 5 allowlist (preference only, plus narrowly-filtered personal_fact)
B) Create a Phase 5-specific policy that doesn't reuse the old adapter's allowlist

**Recommendation**: Option A with clear comment:
```typescript
// Phase 5: Narrow allowlist — only preference and vetted personal_fact
// project/goal are deferred to later phases
const ALLOWED_MEMORY_CATEGORIES_PHASE_5: MemoryCategory[] = [
  "preference",
  // "personal_fact" → allowed only if durability + sensitivity checks pass
];

// This replaces the old 4-category allowlist from scaffolding
```

### Revision 4: Keep Preload/IPC Minimal

**Current assumption**: New inspection UI requires new IPC handlers.

**Verify first**:
1. Does existing improvement event inspection already surface `update_memory` actions?
2. Can the event list already show action.type and action.reasoning?
3. If YES → add filter/tab to existing UI, no new IPC needed
4. If NO → consider what minimum bridge needed

**Likely outcome**: Existing `listEvents()` and `getEvent()` already sufficient.
- Events have status: detected, queued, analyzed, applied, rejected, deferred
- Actions are stored in event metadata or sidecart

**Do NOT add**:
- `subscribe_memory_auto_apply_events`
- `get_memory_auto_apply_status`
- `memory_write_hook`
- Any other new bridge unless inspection surface truly can't show the data

**Do reuse**:
- `listEvents()` with optional filter by type or status
- `getEvent(id)` to show full event + actions

---

## Execution Order (Revised)

1. ✅ Inspect memory architecture (completed)
2. ✅ Draft plan (completed)
3. **[NEW STEP] Verify planner action schema** (must do BEFORE Task 1-3)
   - Read PlannerAction type definition
   - Trace planImprovementEvent() output
   - Document exact field names
4. Revise memory auto-apply policy module per Revision 1 (personal_fact safety gates)
5. Revise memory applier adapter to use Phase 5-only allowlist
6. **[NEW STEP] Verify existing inspection can surface update_memory outcomes** (must do BEFORE Task 5)
   - Check if listEvents() + getEvent() sufficient
   - If not, define minimal new bridge
7. Wire planner output in runtime service per revised action schema
8. Verify Electron boundaries (unchanged)
9. Extend inspection UI (if needed, minimal only)
10. Implement test suite per Revision 1 (durability, sensitivity gates)
11. Run tests & build
12. Report results

---

## Quality Bar

**Phase 5 is successful if**:
- ✅ Auto-apply is narrow and conservative (only preference + vetted personal_fact)
- ✅ Personal_fact has safety gates: durability check + sensitivity check
- ✅ Memory writes go through the real memory system (upsertMemory)
- ✅ Electron boundaries remain correct (main process owns writes)
- ✅ Renderer stays bridge-only (no file I/O in renderer)
- ✅ Random chat content is not auto-saved (strict policy gates)
- ✅ Sensitive content (medical, financial, political) is deferred, not auto-saved
- ✅ Temporary/transient content is not auto-saved
- ✅ Failures are bounded (auto-apply errors don't crash chat)
- ✅ Inspectability is preserved (UI shows apply/reject/defer outcomes)
- ✅ No new IPC handlers unless proven necessary
- ✅ Tests prove all above (25+ passing assertions)

---

**Status**: Plan Ready for Implementation  
**Estimated Effort**: 2-3 hours (policy + wiring + tests)  
**Next Step**: Execute Phase 5A task 1-7 in order.
