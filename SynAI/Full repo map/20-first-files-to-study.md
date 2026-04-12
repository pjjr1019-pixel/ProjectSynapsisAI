# 20-First Files to Study

## Top Priority Files/Folders (VERIFIED/INFERENCE)
1. apps/desktop/electron/main.ts (VERIFIED) — Main process entry, critical runtime
2. apps/desktop/electron/preload.ts (VERIFIED) — Preload bridge, boundary
3. apps/desktop/src/main.tsx (VERIFIED) — Renderer entry
4. packages/Governance-Execution/src/governed-chat/router.ts (VERIFIED) — Routing logic
5. packages/Awareness-Reasoning/src/runtime-capabilities.ts (VERIFIED) — Capability registry/lookup
6. packages/Awareness-Reasoning/src/memory/storage/messages.ts (VERIFIED) — Message persistence
7. packages/Awareness-Reasoning/src/improvement/analyzer.ts (VERIFIED) — Improvement event logic
8. packages/Awareness-Reasoning/src/context/ (VERIFIED) — Context assembly
9. packages/Awareness-Reasoning/src/local-ai/provider.ts (VERIFIED) — Model provider
10. packages/Awareness-Reasoning/src/reply-policies/ (VERIFIED) — Post-processing overlays
11. packages/Governance-Execution/src/governed-chat/types.ts (VERIFIED) — Routing contracts
12. packages/Governance-Execution/src/governed-chat/__tests__/phase6-router.test.ts (VERIFIED) — Phase 6 router test
13. context/ARCHITECTURE_SUMMARY.md (VERIFIED) — Architecture doc
14. context/BLAST_RADIUS.md (VERIFIED) — Risk doc
15. artifacts/repo-tree.json (VERIFIED) — Repo tree
16. SynAI/ (INFERENCE) — Main product folder, needs deep audit
17. packages/ (VERIFIED) — Core logic, needs boundary audit
18. tests/ (VERIFIED) — Test coverage
19. docs/ (VERIFIED) — Decision records
20. data/ (VERIFIED) — Runtime/user data
21. scripts/ (VERIFIED) — Utility scripts
22. config/ (VERIFIED) — Aliases/build config
23. context/ (VERIFIED) — Docs/guides
24. artifacts/ (VERIFIED) — Generated/analysis
25. out/, .runtime/ (VERIFIED) — Build/runtime outputs

## Why Each Matters
- See above for critical runtime, boundary, and architecture roles

## What to Look For
- Runtime path, boundary violations, duplication, dead code, cleanup opportunities
