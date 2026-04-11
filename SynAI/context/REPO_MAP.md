<!-- doc:REPO_MAP; input-hash:0a8f8a660bc393d65feaf52bd91cfccd331f6cbfe41b56ab21e0b6f41f0c1781 -->
# SynAI Repo Map

## Package And App Boundaries
- `.` | repository-shell | Bootstrap shell only; primary product code lives under SynAI/.
- `SynAI` | primary-package-root | Canonical app/package root for SynAI.
- `SynAI/apps/desktop` | config-defined-app | Electron/Vite desktop app boundary inferred from renderer/main/preload config.
- `SynAI/apps/vscode-capability-testing` | package-json-boundary | Package boundary inferred from SynAI/apps/vscode-capability-testing/package.json.
- `SynAI/packages/Agent-Runtime` | workspace-package | Workspace package directory for Agent-Runtime.
- `SynAI/packages/Awareness-Reasoning` | workspace-package | Workspace package directory for Awareness-Reasoning.
- `SynAI/packages/Capability-Catalog` | workspace-package | Workspace package directory for Capability-Catalog.
- `SynAI/packages/Governance-Execution` | package-json-boundary | Package boundary inferred from SynAI/packages/Governance-Execution/package.json.

## Active Config Surfaces
- `SynAI/.env.example` | env-example | canonical: yes | Recognized env-example surface.
- `SynAI/apps/vscode-capability-testing/package.json` | package-manifest | canonical: yes | Package manifest detected.
- `SynAI/apps/vscode-capability-testing/tsconfig.json` | tsconfig | canonical: yes | Recognized tsconfig surface.
- `SynAI/electron.vite.config.js` | electron-vite | canonical: no | Overlapping config surfaces detected in the same directory.
- `SynAI/electron.vite.config.ts` | electron-vite | canonical: yes | Overlapping config surfaces detected in the same directory.
- `SynAI/jest.agent-runtime.config.cjs` | jest | canonical: yes | Recognized jest surface.
- `SynAI/package.json` | package-manifest | canonical: yes | Package manifest detected.
- `SynAI/packages/Governance-Execution/package.json` | package-manifest | canonical: yes | Package manifest detected.
- `SynAI/postcss.config.js` | postcss | canonical: yes | Recognized postcss surface.
- `SynAI/tailwind.config.js` | tailwind | canonical: no | Overlapping config surfaces detected in the same directory.
- `SynAI/tailwind.config.ts` | tailwind | canonical: yes | Overlapping config surfaces detected in the same directory.
- `SynAI/tsconfig.agent-runtime.json` | tsconfig | canonical: yes | Recognized tsconfig surface.
- `SynAI/tsconfig.json` | tsconfig | canonical: yes | Recognized tsconfig surface.
- `SynAI/tsconfig.node.json` | tsconfig | canonical: yes | Recognized tsconfig surface.
- `SynAI/vite.config.js` | vite | canonical: no | Overlapping config surfaces detected in the same directory.
- `SynAI/vite.config.ts` | vite | canonical: yes | Overlapping config surfaces detected in the same directory.

## Duplicate Candidates
- These are documented candidates only unless direct tooling evidence proves a safe consolidation path.
- `ChatInputBar` | canonical candidate: `SynAI/apps/desktop/src/features/local-chat/components/ChatInputBar.js` | alternates: `SynAI/apps/desktop/src/features/local-chat/components/ChatInputBar.tsx`
- `db` | canonical candidate: `SynAI/packages/Awareness-Reasoning/src/memory/storage/db.ts` | alternates: `SynAI/packages/Awareness-Reasoning/src/memory/storage/db.js`
- `id` | canonical candidate: `SynAI/apps/desktop/src/shared/utils/id.ts` | alternates: `SynAI/apps/desktop/src/shared/utils/id.js`
- `gap-classifier.test` | canonical candidate: `SynAI/tests/capability/gap-classifier.test.ts` | alternates: `SynAI/tests/capability/gap-classifier.test.js`
- `time` | canonical candidate: `SynAI/apps/desktop/src/shared/utils/time.ts` | alternates: `SynAI/apps/desktop/src/shared/utils/time.js`
- `main` | canonical candidate: `SynAI/apps/desktop/electron/main.ts` | alternates: `SynAI/apps/desktop/electron/main.js`
- `index` | canonical candidate: `SynAI/packages/Agent-Runtime/src/verifier/index.ts` | alternates: `SynAI/packages/Agent-Runtime/src/verifier/index.js`
- `runner.test` | canonical candidate: `SynAI/tests/capability/runner.test.ts` | alternates: `SynAI/tests/capability/runner.test.js`
- `context-assembly.smoke.test` | canonical candidate: `SynAI/tests/smoke/context-assembly.smoke.test.ts` | alternates: `SynAI/tests/smoke/context-assembly.smoke.test.js`
- `AwarenessCard` | canonical candidate: `SynAI/apps/desktop/src/features/local-chat/components/AwarenessCard.js` | alternates: `SynAI/apps/desktop/src/features/local-chat/components/AwarenessCard.tsx`
- `index` | canonical candidate: `SynAI/packages/Awareness-Reasoning/src/retrieval/index.ts` | alternates: `SynAI/packages/Awareness-Reasoning/src/retrieval/index.js`
- `index` | canonical candidate: `SynAI/packages/Agent-Runtime/src/policy/index.ts` | alternates: `SynAI/packages/Agent-Runtime/src/policy/index.js`
- `grounding.test` | canonical candidate: `SynAI/packages/Awareness-Reasoning/tests/grounding.test.ts` | alternates: `SynAI/packages/Awareness-Reasoning/tests/grounding.test.js`
- `SettingsPanel` | canonical candidate: `SynAI/apps/desktop/src/features/local-chat/components/SettingsPanel.js` | alternates: `SynAI/apps/desktop/src/features/local-chat/components/SettingsPanel.tsx`
- `windows-action-catalog` | canonical candidate: `SynAI/packages/Governance-Execution/src/execution/windows-action-catalog.ts` | alternates: `SynAI/packages/Governance-Execution/src/execution/windows-action-catalog.js`
- `queue` | canonical candidate: `SynAI/packages/Governance-Execution/src/approvals/queue.ts` | alternates: `SynAI/packages/Governance-Execution/src/approvals/queue.js`
- `powershell` | canonical candidate: `SynAI/packages/Awareness-Reasoning/src/windows/powershell.ts` | alternates: `SynAI/packages/Awareness-Reasoning/src/windows/powershell.js`
- `types` | canonical candidate: `SynAI/packages/Agent-Runtime/src/skills/types.ts` | alternates: `SynAI/packages/Agent-Runtime/src/skills/types.js`
- `governed-chat` | canonical candidate: `SynAI/apps/desktop/electron/governed-chat.ts` | alternates: `SynAI/apps/desktop/electron/governed-chat.js`
- `noop-runtime` | canonical candidate: `SynAI/packages/Agent-Runtime/src/runtime/noop-runtime.ts` | alternates: `SynAI/packages/Agent-Runtime/src/runtime/noop-runtime.js`
- `MessageItem` | canonical candidate: `SynAI/apps/desktop/src/features/local-chat/components/MessageItem.js` | alternates: `SynAI/apps/desktop/src/features/local-chat/components/MessageItem.tsx`
- `App` | canonical candidate: `SynAI/apps/desktop/src/App.js` | alternates: `SynAI/apps/desktop/src/App.tsx`
- `AgentRuntimeCard` | canonical candidate: `SynAI/apps/desktop/src/features/local-chat/components/AgentRuntimeCard.js` | alternates: `SynAI/apps/desktop/src/features/local-chat/components/AgentRuntimeCard.tsx`
- `index` | canonical candidate: `SynAI/packages/Awareness-Reasoning/src/reasoning/index.ts` | alternates: `SynAI/packages/Awareness-Reasoning/src/reasoning/index.js`

