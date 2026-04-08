# Context Assembly

Prompt context is assembled in one place: `packages/memory/src/context/assembler.ts`.

Included sources:
- system instruction
- stable high-importance memory
- retrieved relevant memory
- rolling summary snippet
- recent raw messages

Budget rules in `packages/memory/src/context/budget.ts` prevent dumping all history.
