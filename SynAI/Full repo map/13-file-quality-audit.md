# 13-File Quality Audit

## Central and Well-Placed (VERIFIED)
- router.ts, runtime-capabilities.ts, main.ts, messages.ts

## Central but Badly Placed (INFERENCE)
- Some capability registry logic may be misplaced (TODO: Audit)

## Too Large/Should Be Split (INFERENCE)
- Some main.ts and router.ts files are large (TODO: Audit for split candidates)

## Tiny Wrappers to Merge (INFERENCE)
- Some adapters/wrappers in capability-eval/ and desktop-actions/ (TODO: Audit)

## Stale/Misleading Files (INFERENCE)
- Some docs and test helpers (TODO: Audit)

## Unprofessional/Accidental (INFERENCE)
- None VERIFIED

## TODO
- Deep audit for file quality and split/merge opportunities
