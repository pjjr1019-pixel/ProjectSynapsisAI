# 01-Top-Level Structure

## Top-Level Folders (VERIFIED)
- apps/: Application entrypoints and Electron app code
- packages/: Core logic, capabilities, runtime, and governance modules
- scripts/: Utility and dev scripts
- tests/: Test suites and test helpers
- config/: Aliases and build config
- context/: Architecture docs, guides, and file notes
- docs/: Architecture and decision records
- artifacts/: Generated analysis and repo metadata
- data/: Conversation and runtime data
- SynAI/: (INFERENCE) Main product folder, contains runtime, reports, and integration
- .github/: GitHub workflows and config
- .vscode/: VS Code workspace config
- node_modules/: Dependencies (IGNORED)
- out/, .runtime/: Build/runtime outputs (IGNORED)

## Structure Quality
- apps/: good (VERIFIED)
- packages/: good/acceptable (VERIFIED)
- scripts/: acceptable (VERIFIED)
- tests/: acceptable (VERIFIED)
- config/: acceptable (VERIFIED)
- context/: good (VERIFIED)
- docs/: good (VERIFIED)
- artifacts/: acceptable (VERIFIED)
- data/: acceptable (VERIFIED)
- SynAI/: messy/complex (INFERENCE)
- .github/, .vscode/: good (VERIFIED)
- node_modules/, out/, .runtime/: generated/runtime (VERIFIED)

## Core/Support/Legacy/Generated/Docs/Unclear
- See above for classification.

## Cleanup Recommendations
- Focus on SynAI/ and packages/ for future cleanup and boundary clarification.
- Defer node_modules/, out/, .runtime/ except for artifact separation.
- Review artifacts/ and data/ for generated/runtime/data separation.
- See 17-cleanup-safety-map.md for more.

(TODO: Deep dive into SynAI/ and packages/ subfolders in later sections.)
