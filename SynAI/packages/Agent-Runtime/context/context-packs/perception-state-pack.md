# Perception State Pack

## Objective
Prepare layer 2 work so future prompts can add grounded observation and replayable state snapshots without mutating the world.

## Files To Read First
- `SynAI/packages/Agent-Runtime/specs/02-perception-grounding.md`
- `SynAI/packages/Agent-Runtime/context/GLOSSARY.yaml`
- `SynAI/packages/Awareness-Reasoning/src/memory/context/assembler.ts`
- `SynAI/packages/Awareness-Reasoning/src/contracts/memory.ts`
- `SynAI/packages/Awareness-Reasoning/src/contracts/grounding.ts`
- `SynAI/packages/Awareness-Reasoning/src/reasoning/grounding.ts`
- `SynAI/apps/desktop/electron/main.ts`
- `SynAI/apps/desktop/src/features/local-chat/components/ContextPreview.tsx`
- `SynAI/apps/desktop/src/features/local-chat/components/ReasoningTraceView.tsx`

## Files Not To Touch Casually
- `SynAI/packages/Governance-Execution/src/execution/windows-actions.ts`
- `SynAI/apps/desktop/electron/workflow-planner.ts`
- `SynAI/apps/desktop/src/features/local-chat/components/ChatPanel.tsx`

## Acceptance Criteria
- One execution attempt yields a structured observation snapshot.
- Grounding evidence is replayable and explainable.
- The UI preview and the data model agree on the same snapshot fields.
- No side effects are introduced by perception code.

## Validation Command
- `cd SynAI; npx vitest run packages/Awareness-Reasoning/tests/grounding.test.ts packages/Awareness-Reasoning/tests/awareness-engine.test.ts tests/smoke/context-assembly.smoke.test.ts tests/smoke/grounding-ui.smoke.test.tsx`
