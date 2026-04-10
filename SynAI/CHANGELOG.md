# Changelog

## 2026-04-10

### Added
- Canonical 5-layer agent runtime implementation in `SynAI/packages/Agent-Runtime/src` covering typed action substrate, perception evidence, planner/executor/verifier flow, durable runtime jobs/checkpoints, and policy/audit/eval contracts.
- File-backed runtime state and audit stores with inspectable job history, checkpoint persistence, progress events, and replay-friendly runtime artifacts.
- Electron main-process runtime bridge, preload APIs, and a compact Tools > Workflows runtime inspector for job status, planned steps, policy, verification, audit, and checkpoint summaries.
- Governed desktop action support with a Windows-first catalog for launch, open, file, folder, and process operations.
- Electron main-process desktop execution service, IPC bridge methods, and a renderer Tools-tab Actions surface.
- Approval-token issuance and validation bound to exact desktop action requests, plus JSONL audit logging.
- Dedicated governed-execution roadmap docs and new capability cards for launch/open, file operations, folder moves, and gated termination.
- Governed Windows task orchestration with workflow planning for research, reports, app launch, system navigation, file workflows, process control, and uninstall flows.
- Browser-backed workflow execution, workflow progress events, and a dedicated Workflow tab in the desktop Tools panel.
- Normal chat now routes task-like prompts through governed chat execution with approval replay, history replay, and task-state metadata in the message stream.
- Local governance-history mining now emits backlog artifacts and candidate eval cards from repeated failed conversations.
- Governance-execution starter cards now cover clarification, approval gating, rollback metadata, refusal, verification, and execution-selection scenarios.
- Added a governance-execution usage guide and a `capability:mine-history` CLI entrypoint for mining local failures into candidate cards.

### Improved
- `@synai-agent` now resolves directly into `SynAI/packages/Agent-Runtime/src`, which removes the redundant root shim folder while keeping SynAI-facing imports stable.
- Runtime inspection, cancel, resume, and recover flows now return structured policy, verification, audit, and checkpoint data without rerunning side effects.
- Live runtime approvals now validate exact approval tokens against the normalized runtime binding hash before any adapter side effect is allowed to run.
- Runtime outcomes now preserve `clarification_needed` and `denied` separately, including denied adapter results and approval-validation failures.
- Governance audit queries now include `agent-runtime` entries, and context preview now surfaces a compact read-only runtime summary alongside existing grounding and awareness data.
- Repo hygiene now ignores generated runtime artifacts and removes tracked install output like `node_modules/` from source control.
- Actions and approvals now appear as active feature stages in the desktop UI.
- Desktop action requests now validate approval-token JSON inline and keep dry-run preview as the default path.
- Capability eval coverage now includes governed desktop action selection, sequencing, and approval-token checks.
- Workflow hashes now bind to stable plan content instead of volatile request IDs, which makes approvals safer to reuse for identical plans.
- Approved Desktop/Documents file operations now flow through explicit allowed roots instead of being blocked by the workspace guard.
- The workflow browser host no longer waits for load events that already completed before the listener was attached.
- Approval confirmations now replay the pending governed task instead of treating "approve" like a fresh free-text request.
- History replay stays plan-only until the user reissues the task with fresh governance instead of auto-running the old failure.
- Message rendering now surfaces governed task decision, approval, verification, gap, and remediation state inline.

### Tests
- Added root Jest coverage for runtime lifecycle management, file-backed state and audit stores, eval execution, and expanded runtime provenance/integration assertions.
- Added root Jest coverage for clarification-needed terminal results, approval-binding validation, and denied outcome preservation.
- Added SynAI smoke coverage for the runtime inspector plus focused contract, shim, workflow, governance-command-bus, and policy-engine validation around the new bridge.
- Added SynAI coverage for the runtime approval bridge validator, governance audit query inclusion for `agent-runtime`, and context-preview runtime rendering.
- Added smoke coverage for the Desktop Actions card and updated app-start coverage for the Actions tab.
- Added integration coverage for the governed desktop action service and new capability-card scenarios.
- Verified the desktop build and focused governance/action test slices remain green.
- Added planner, workflow-orchestrator, Workflow tab, and Workflow card smoke coverage for the new task runner flow.
- Added browser-session coverage for page open, search, and YouTube playback flows.
- Added tests for governed chat routing, governed chat service approval replay, history mining, CLI parsing, and governed task-state rendering.
- Verified the full Vitest suite and Electron build remain green after the governance-execution changes.

## 2026-04-08

### Added
- AwarenessEngine foundation for startup baselines, session tracking, digests, and event journaling.
- Machine awareness for Windows identity, hardware, processes, services, startup items, installed apps, settings maps, control panel maps, and registry zone maps.
- File, folder, media, and recent-change awareness with scoped roots, exclusions, and compact summaries.
- Safe on-screen Assist Mode with explicit observation controls, foreground-window awareness, UI tree capture, and protected-input blocking.
- Retrieval-first diagnostics and awareness query routing with compact evidence bundles and freshness metadata.

### Improved
- Chat workspace density, scroll behavior, and auto-follow behavior.
- Live local hardware answers for CPU, RAM, GPU, disk, uptime, and top-process hotspot questions.
- Direct hotspot answers for resource questions such as "what's using all my RAM?" with ranked process and program views.
- Typo-tolerant awareness routing so misspelled queries can still resolve correctly.
- Compact deterministic formatting for awareness answers when strong local evidence exists.

### Tests
- Added and expanded behavior-focused tests for awareness routing, file/machine/screen awareness, diagnostics, live usage answers, and hotspot ranking.
- Verified the current build and test suite remain green.

## Phase History

### Phase 5 - Retrieval-First Reasoning, Diagnostics, and Chat Integration
- Added the awareness intent router for repo, file, machine, settings, registry, hardware, performance, and on-screen queries.
- Built compact evidence bundles with freshness metadata, confidence notes, and targeted narrow scans.
- Integrated awareness retrieval into chat so answers stay grounded and budget-aware.
- Added diagnostics summaries for performance, startup, storage, and current UI state.

### Phase 4 - Safe On-Screen Awareness and Assist Mode
- Added explicit Assist Mode with visible state and user-controlled capture scope.
- Captured foreground window snapshots and safe UI semantic trees.
- Added protected-input blocking and a journal for visible on-screen events.
- Kept screen awareness explicit, local, and non-covert.

### Phase 3 - File, Folder, Media, and Machine Change Awareness
- Added metadata-first file catalogs, scoped roots, exclusions, and freshness tracking.
- Built folder intelligence for size, growth, hot-folder, and recent-change summaries.
- Added media metadata for photos, videos, audio, and documents.
- Added targeted content retrieval without broad disk ingestion.

### Phase 2 - Windows Machine Inventory, Process/Service Graphs, and OS Surface Maps
- Added system identity, hardware, process, service, startup, and installed app snapshots.
- Added settings, control panel, and registry zone maps for Windows surfaces.
- Added read-only machine inventory APIs and compact summaries.
- Added freshness-aware machine state capture for live awareness answers.

### Phase 1 - AwarenessEngine Foundation, Safety Model, and Canonical Data Contracts
- Defined the AwarenessEngine module skeleton and canonical data contracts.
- Added baseline startup snapshots, session artifacts, digest storage, and journal scaffolding.
- Established privacy scopes, permission tiers, and evidence references.
- Added the initial compact awareness context integration and safety boundaries.
