# Context Assembly

Prompt context is assembled in one place: `packages/Awareness-Reasoning/src/memory/context/assembler.ts`.

Included sources:
- system instruction
- stable high-importance memory
- retrieved relevant memory
- rolling summary snippet
- recent raw messages

Budget rules in `packages/Awareness-Reasoning/src/memory/context/budget.ts` prevent dumping all history.


