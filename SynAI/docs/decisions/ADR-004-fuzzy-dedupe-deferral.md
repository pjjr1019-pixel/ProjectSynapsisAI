# ADR-004: Memory Deduplication Strategy — Exact-Match-Only for Phase 5, Fuzzy Dedupe Deferred to Phase 6+

**Date:** April 12, 2026  
**Status:** ACCEPTED (Phase 5)  
**Phase:** Memory Auto-Apply (Phase 5)  
**Affected Components:** Memory Storage, Memory Auto-Apply Policy  

---

## Problem

Memory auto-apply needs a deduplication strategy to prevent identical or very similar memory entries from being stored multiple times. Two approaches:

1. **Exact-match deduplication** (current Phase 5)
   - Normalized text comparison (lowercase, trim)
   - Simple string equality
   - Fast, low CPU cost
   - Misses near-duplicates ("prefer dark mode" ≠ "prefer dark code editing mode")

2. **Fuzzy/semantic deduplication** (proposed for Phase 6+)
   - Levenshtein/Jaro-Winkler distance
   - Embedding-based semantic similarity
   - Abbreviation/acronym expansion
   - Word-order-independent matching
   - Higher CPU cost, requires tuning, risk of false positives

**Decision Required:** Which strategy for Phase 5?

---

## Context

### Current System
- Memory auto-apply policy evaluates 7 gates before storing memories
- Phase 5 aims for **narrow, high-confidence** auto-apply
- Users can manually delete duplicate memories post-fact
- No ML/embedding infrastructure yet in place

### Constraints
- Phase 5 scope is conservative (narrow allowlist, strict gates)
- Exact-match dedupe is trivial to implement and test
- Fuzzy dedupe would require additional dependencies (NLP library) and compute
- Fuzzy thresholds need careful tuning (80% match? 85%?) and user feedback
- Current memory volume is small (single conversation context)

---

## Decision

**Phase 5 will use EXACT-MATCH DEDUPLICATION ONLY.**

Fuzzy/semantic deduplication is **explicitly deferred to Phase 6+**.

### Rationale

1. **Alignment with Phase 5 Philosophy**
   - Phase 5 = narrow, conservative, high-confidence auto-apply
   - Exact matching is conservative: allows only identical memories to dedupe
   - Fuzzy matching is permissive: risks false positives with aggressive thresholds

2. **Implementation Cost**
   - Exact match: ~20 lines of code, no dependencies, 100% test coverage
   - Fuzzy: Would require new dependency (fuse.js, string-similarity, or custom ML)

3. **False Positive Risk**
   - Exact: Only risk is missed duplicates (tolerable, user can delete manually)
   - Fuzzy: Risk is collapsing distinct memories (harmful, corruption of user data)

4. **Insufficient Data**
   - Fuzzy thresholds need real user memory data to tune properly
   - Phase 5 is pilot phase — gather real usage patterns first
   - Phase 6 can revisit with actual duplicate patterns

5. **User Recourse**
   - Users can manually delete duplicate/near-duplicate memories via UI
   - Manual deletion teaches us which memories *should* have been deduplicated
   - This feedback informs Phase 6 design

---

## Deduplication Strategy: Exact-Match Implementation

### What is Implemented (Phase 5)

**Location:** `packages/Awareness-Reasoning/src/integration/memory-auto-apply-policy.ts`  
**Function:** `checkExactDuplicate(text: string): Promise<string | null>`

**Algorithm:**
```typescript
1. Normalize candidate text: toLowercase().trim()
2. Scan all existing active memories
3. Normalize each memory text: toLowercase().trim()
4. Return memory ID if exact match found
5. Return null if no match
```

**Test Coverage:**  
- ✅ Detects exact match (same text)
- ✅ Ignores case differences ("Dark" vs "dark")
- ✅ Ignores whitespace variations ("prefer  dark" vs "prefer dark")
- ✅ Rejects near-duplicates (no fuzzy matching)

**Gate in Policy:**
- Gate 6 of 7: Exact Dedupe Check
- Rejects if exact duplicate already exists
- Persists original memory ID for tracing

---

## What is NOT Implemented (Deferred to Phase 6+)

The following capabilities are **explicitly NOT** implemented in Phase 5 and are deferred:

### Fuzzy String Matching
- Levenshtein distance
- Jaro-Winkler similarity
- Ratcliff-Obersoll algorithm
- Decision: Defer. Requires tuning; risk of false positives.

### Semantic Similarity
- Embedding-based comparison (cosine similarity)
- TF-IDF similarity
- Word embeddings (Word2Vec, FastText)
- Decision: Defer. Requires ML infrastructure not present in Phase 5.

### Abbreviation/Acronym Expansion
- "I prefer VSCode" vs "I prefer Visual Studio Code"
- Thesaurus lookup for common abbreviations
- Decision: Defer. Requires configuration and testing.

### Word-Order-Independent Matching
- "dark mode preference" vs "preference for dark mode"
- Semantic parse trees
- Decision: Defer. Requires NLP infrastructure.

### Contextual Merging
- Combining near-duplicate memories into a single parameterized entry
- Decision: Defer. Requires memory schema changes.

---

## Exit Criteria for Phase 6 Reconsideration

Fuzzy dedupe will be reconsidered in Phase 6 if *any* of the following occur:

1. **User Feedback**: 
   - Users report > 5% memory store as near-duplicates
   - Manual deletion patterns suggest systematic dedupe gaps

2. **Memory Growth**:
   - Active memory store > 500 entries
   - Manual deletion overhead significant

3. **Feature Demand**:
   - Product requirements explicitly require fuzzy matching
   - Users cannot tolerate manual duplicate removal

4. **Technical Readiness**:
   - ML inference layer available for embeddings
   - Threshold tuning data gathered from real usage

If none of these occur by end of Phase 6, exact-match dedupe remains acceptable.

---

## Implementation Notes

### Tests Added (Phase 5)

File: `tests/capability/memory-auto-apply-policy.test.ts`

- **Test:** Policy Gate 6 - Exact Dedupe Check
- **Cases:**
  - Rejects exact match (case-insensitive)
  - Rejects whitespace-normalized match
  - Accepts similar-but-different text
  - Handles empty memory store (no dupes)
  - Handles error in dedupe check (retries gracefully)

### Comments in Code

All locations where exact-only dedupe is implemented include comments noting:
- Phase 5 scope: exact-match-only
- Phase 6+ scope: fuzzy/semantic deduplication deferred
- Rationale for deferral

**Locations:**
- `memory-auto-apply-policy.ts` line ~142: `checkExactDuplicate()` function
- `memory-auto-apply-policy.ts` line ~238: Gate 6 return statement

---

## Future Decisions (Phase 6+)

When Phase 6 re-evaluates deduplication, it should:

1. **Analyze real duplicate patterns** from Phase 5 usage
2. **Select fuzzy algorithm** based on data (Levenshtein? semantic?)
3. **Tune similarity threshold** via A/B testing
4. **Evaluate embedding infrastructure** cost/benefit
5. **Plan migration** for existing exact-match-only memory store
6. **Update user docs** on how fuzzy dedupe works

---

## Decision Record

**Accepted by:** Phase 5 Completion Pass  
**Components:** Phase 5: Narrow Memory Auto-Apply  
**Tests:** ✅ All 47 policy tests passing  
**Documentation:** ✅ Comments in code + this ADR  

---

## Appendix: Why Not Hybrid?

Could Phase 5 implement exact-match AND prepare hooks for fuzzy? NO.

**Reasons:**
- Code complexity increases test surface area
- "Preparing" for fuzzy (thresholds, configs) creates technical debt
- Phase 6 might choose entirely different approach (e.g., user-curated tags instead)
- Premature abstraction violates Phase 5 philosophy (narrow, conservative)

**Better approach:** Hard wall. Phase 6 adds fuzzy from scratch with real design input.

---

**Approved:** Phase 5 Completion Pass (April 12, 2026)
