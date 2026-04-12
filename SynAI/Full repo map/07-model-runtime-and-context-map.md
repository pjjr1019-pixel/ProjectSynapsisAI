# 07-Model Runtime and Context Map

## Local Model Execution (VERIFIED)
- packages/Awareness-Reasoning/src/local-ai/provider.ts: Model provider logic
- packages/Awareness-Reasoning/src/local-ai/ollama.ts: Ollama integration
- packages/Awareness-Reasoning/src/local-ai/scheduler.ts: Model scheduling (INFERENCE)

## Provider Integration (VERIFIED)
- Local AI, Ollama, and other providers in local-ai/

## Context Assembly (VERIFIED)
- packages/Awareness-Reasoning/src/context/: Context construction and task skills

## Grounding and Post-Processing (VERIFIED)
- packages/Awareness-Reasoning/src/reasoning/grounding.ts: Grounding logic
- packages/Awareness-Reasoning/src/reply-policies/: Post-processing overlays

## Runtime Scheduler/Model Selection (INFERENCE)
- scheduler.ts and provider.ts (TODO: Deep audit for dynamic model selection)

## Live vs Aspirational
- Most model/context code is live; some scheduler/model-selection logic may be partial (TODO)
