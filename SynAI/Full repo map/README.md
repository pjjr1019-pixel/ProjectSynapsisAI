# Full Repo Map

This package provides a comprehensive, evidence-based map and audit of the entire codebase. It is designed to enable safe, professional reorganization, cleanup, and risk management by future maintainers or coding models.

## How to Use This Package
- Start with `00-executive-summary.md` for a high-level overview and priorities.
- Use `01-top-level-structure.md` and `repo-tree.txt` for folder navigation.
- Each numbered file provides a deep-dive into a specific area (runtime spine, boundaries, contracts, tests, docs, etc).
- All claims are labeled as VERIFIED, INFERENCE, or UNKNOWN.
- Machine-readable indexes (e.g., `top-level-folder-index.json`, `runtime-spine-index.json`) support automated analysis.
- Deferred or partial sections are clearly marked as TODOs.

## What is Verified vs Inferred
- VERIFIED: Directly inspected in the current repo state.
- INFERENCE: Deduced from structure, naming, or partial evidence.
- UNKNOWN: Not enough evidence to classify.

## Where to Start
- Executive summary and top-level structure for orientation.
- Runtime spine and boundaries for critical architecture.
- Risk register and do-not-touch-yet for safety.

## Most Important Documents
- 00-executive-summary.md
- 02-runtime-spine.md
- 17-cleanup-safety-map.md
- 21-risk-register.md
- 22-do-not-touch-yet.md

---

**Best next cleanup phase:** TODO (see 00-executive-summary.md)
**Why it must come after runtime stabilization:** TODO
**First 8 files/folders to touch in a future cleanup pass:** TODO
