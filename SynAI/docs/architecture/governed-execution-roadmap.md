# Governed Desktop Execution Roadmap

## Summary
- SynAI now has a governed desktop action path for Windows-first local execution.
- The renderer proposes and previews actions; the Electron main process validates, audits, and executes them.
- Safe actions are exposed first, while destructive or system-changing actions stay approval-gated.
- Multi-step Windows workflows now sit on top of the action catalog, so vague prompts can become research, report, file, app, browser, process, and uninstall task plans instead of one-off shell commands.

## Key Changes
- Shared action contracts define `DesktopActionRequest`, `DesktopActionProposal`, `DesktopActionResult`, `ActionScope`, `DesktopActionKind`, `DesktopActionTargetKind`, `DesktopActionRiskClass`, and `ApprovalToken`.
- A renderer-safe catalog exposes the supported action surface, while the main-process desktop service performs the real work through IPC.
- Supported action families include app launch/open, file and folder open/create/rename/move/delete, Settings and Control Panel navigation, Task Manager/process inspection, and exact-target process termination.
- Approvals are bound to the exact normalized command hash, and every request/result is written to JSONL audit logs.
- The Actions tab now shows proposals, preview text, approval issuance, and execution results in one visible flow.
- Workflow planning adds browser-backed research/report flows, system-navigation routing, workflow progress events, and a dedicated Workflow tab for multi-step task execution.

## Test Plan
- Unit test catalog lookup, suggestion, preview rendering, scope normalization, approval issuance/validation, and dry-run versus live command-bus behavior.
- Integration test the desktop action service with a mocked host for launch/open, workspace file operations, blocked cross-scope writes, and process termination.
- Smoke test the Actions tab for rendering, suggestion, preview, approval-token validation, and visible success/failure states.
- Capability eval coverage should include launch/open, file and folder operations, control-surface navigation, and gated termination cases.

## Assumptions
- Windows is the primary v1 execution target.
- Execution remains local to the user machine.
- Proposal/simulation stays the default until a request is explicitly approved for live execution.
