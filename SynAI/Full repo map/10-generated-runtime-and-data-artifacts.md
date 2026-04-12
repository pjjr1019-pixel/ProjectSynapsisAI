# 10-Generated Runtime and Data Artifacts

## Source of Truth (VERIFIED)
- All source code in packages/, apps/, scripts/

## Generated Files (VERIFIED)
- out/, .runtime/: Build outputs
- artifacts/: Analysis and repo metadata (config-surfaces.json, repo-tree.json, etc.)

## Runtime Outputs (VERIFIED)
- data/: Conversation and runtime data

## Local Data/State (VERIFIED)
- data/: User and runtime state

## Caches/Logs/Test Fixtures (INFERENCE)
- node_modules/: Dependency cache (IGNORED)
- test-full-suite.log, post-phase-4-full-tests.log: Test logs

## Bad Mixing
- Some mixing of generated/runtime/data in artifacts/ and data/ (INFERENCE)

## Recommendations
- Separate generated, runtime, and source-of-truth folders in future cleanup
