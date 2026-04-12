# 06-Memory, Improvement, and Overlay Map

## Memory Systems (VERIFIED)
- packages/Awareness-Reasoning/src/memory/storage/messages.ts: Message persistence
- packages/Awareness-Reasoning/src/memory/storage/memories.ts: Memory persistence
- packages/Awareness-Reasoning/src/memory/storage/conversations.ts: Conversation persistence

## Improvement Event/Analyzer/Planner Flow (VERIFIED)
- packages/Awareness-Reasoning/src/improvement/analyzer.ts: Event dedupe, rate limiting, improvement candidate logic
- packages/Awareness-Reasoning/src/improvement/planner.ts: Improvement planning
- packages/Awareness-Reasoning/src/improvement/queue.ts: Event queue

## Reply-Policy Overlays (VERIFIED)
- packages/Awareness-Reasoning/src/reply-policies/: Overlay logic and rules

## Inspection/Debug Surfaces (VERIFIED)
- context/ARCHITECTURE_SUMMARY.md, context/BLAST_RADIUS.md

## Duplication/Drift (INFERENCE)
- Some memory/improvement logic may be duplicated or drifted (TODO: Deep audit)

## TODO
- Map overlay/inspection connections
- Identify any memory/improvement drift or duplication
