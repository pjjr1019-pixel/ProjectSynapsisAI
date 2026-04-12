# 11-Duplicate and Overlap Map

## Routing Logic (INFERENCE)
- Some routing logic duplicated between router.ts and runtime-capabilities.ts (TODO: Deep audit)

## Capability Registries (INFERENCE)
- Multiple capability registry sources/adapters (TODO: Map all sources)

## Memory Paths (INFERENCE)
- Possible overlap in memory/storage/messages.ts and memory/storage/memories.ts

## Event Systems (INFERENCE)
- Improvement event logic in both improvement/analyzer.ts and improvement/queue.ts

## Type Definitions (INFERENCE)
- Types duplicated between packages (TODO: Map all shared/duplicated types)

## Wrappers/Adapters (INFERENCE)
- Some wrappers/adapters in capability-eval/ and desktop-actions/

## Docs (INFERENCE)
- Some duplicate or conflicting docs in context/ and docs/

## TODO
- Deep audit for all duplicate/overlapping systems
