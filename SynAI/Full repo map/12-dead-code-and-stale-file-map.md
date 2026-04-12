# 12-Dead Code and Stale File Map

## VERIFIED_UNUSED
- None marked without strong evidence (see below)

## PROBABLY_UNUSED (INFERENCE)
- Some scripts/ and test helpers may be unused (TODO: Audit import graph and runtime path)

## RISKY_TO_REMOVE (INFERENCE)
- Any file in the runtime spine (see 02-runtime-spine.md) is risky to remove

## For each candidate:
- Path: TODO
- Confidence: TODO
- Evidence: TODO
- Safe deletion timing: TODO

## Notes
- No file is marked dead without strong evidence
- All candidates are listed with confidence, evidence, and timing
- TODO: Deep audit for dead code and stale files
