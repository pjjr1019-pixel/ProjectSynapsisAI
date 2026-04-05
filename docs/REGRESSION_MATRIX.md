# REGRESSION_MATRIX.md

| Critical Flow                  | Covered by Tests? | Notes |
|-------------------------------|:-----------------:|-------|
| Startup                       |    Yes            | desktop/main.cjs smoke test added |
| Taskmanager load              |    Partial        | ai-task-scheduler CRUD and schedule logic tested |
| Key UI panels                 |    No             | UI panel rendering not directly tested |
| Bridge interactions           |    No             | No direct bridge contract tests found |
| Brain/runtime interactions    |    Partial        | ai-task-scheduler interacts with runtime state; covered by test CRUD |
| Scripts/tool invocation       |    No             | No direct invocation tests found |
| Config loading                |    Yes            | Regression test for config loading added |
| Process/service/resource views|    No             | Not directly tested |
| File/index loading            |    Partial        | ai-task-scheduler file I/O tested; path resolution regression test added |
| Shutdown/cleanup paths        |    No             | No explicit shutdown/cleanup regression test |

Legend:
- Yes: Explicit regression/integration test exists
- Partial: Some coverage via related module tests
- No: No direct regression test found

---
Planned: Add targeted regression tests for config loading, startup, and bridge contracts.
