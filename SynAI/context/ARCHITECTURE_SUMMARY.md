<!-- doc:ARCHITECTURE_SUMMARY; input-hash:f6ba471e53afbb9b8ca9eb513ea808d2433d11ae202355a31d5f367828e95d72 -->
# SynAI Architecture Summary

## Canonical Shape
- `SynAI/` is the real product root.
- `SynAI/apps/desktop/` contains the Electron app and renderer.
- `SynAI/packages/Agent-Runtime/` is the canonical runtime package surface.
- `SynAI/packages/Governance-Execution/` owns governed execution, approvals, policy, and workflow wiring.
- `SynAI/packages/Awareness-Reasoning/` owns awareness, memory, retrieval, local AI, and contract surfaces consumed by the app.

## Secondary Repo Shell
- The repository root exists for bootstrap/hygiene only.
- Secondary root folders should only be read when a task explicitly targets wrapper/support content.

## Current Ambiguity Policy
- Checked-in `.js` twins are treated as documented mirrors or compatibility surfaces until proven redundant.
- TypeScript variants of paired configs are the current canonical candidates.

## Key Boundaries
- `.`: Bootstrap shell only; primary product code lives under SynAI/.
- `SynAI`: Canonical app/package root for SynAI.
- `SynAI/apps/desktop`: Electron/Vite desktop app boundary inferred from renderer/main/preload config.
- `SynAI/apps/vscode-capability-testing`: Package boundary inferred from SynAI/apps/vscode-capability-testing/package.json.
- `SynAI/packages/Agent-Runtime`: Workspace package directory for Agent-Runtime.
- `SynAI/packages/Awareness-Reasoning`: Workspace package directory for Awareness-Reasoning.
- `SynAI/packages/Capability-Catalog`: Workspace package directory for Capability-Catalog.
- `SynAI/packages/Governance-Execution`: Package boundary inferred from SynAI/packages/Governance-Execution/package.json.

