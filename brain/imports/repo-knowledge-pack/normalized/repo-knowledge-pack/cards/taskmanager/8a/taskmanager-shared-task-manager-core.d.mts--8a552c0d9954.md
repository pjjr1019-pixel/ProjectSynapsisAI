---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/shared/task-manager-core.d.mts"
source_name: "task-manager-core.d.mts"
top_level: "taskmanager"
surface: "other"
classification: "high-value"
kind: "code"
language: "text"
extension: ".mts"
score: 34
selected_rank: 3961
content_hash: "2b7e2646328d5522a28eb5718043f824a4025c2829ec17e3a5214329335e3760"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "code"
  - "high-value"
  - "mts"
  - "other"
  - "scripts"
exports:
  - "buildTaskManagerView"
  - "getProtectionReasons"
  - "HELPER_KEYWORDS"
  - "interface"
  - "PROTECTED_PROCESS_NAMES"
  - "SECURITY_PROCESS_NAMES"
  - "TASK_MANAGER_POLL_BACKGROUND_MS"
  - "TASK_MANAGER_POLL_VISIBLE_MS"
  - "TASK_MANAGER_SNOOZE_MS"
  - "TOOLING_PROCESS_NAMES"
---

# taskmanager/shared/task-manager-core.d.mts

> Code module; exports buildTaskManagerView, getProtectionReasons, HELPER_KEYWORDS, interface

## Key Signals

- Source path: taskmanager/shared/task-manager-core.d.mts
- Surface: other
- Classification: high-value
- Kind: code
- Language: text
- Top level: taskmanager
- Score: 34
- Tags: code, high-value, mts, other, scripts
- Exports: buildTaskManagerView, getProtectionReasons, HELPER_KEYWORDS, interface, PROTECTED_PROCESS_NAMES, SECURITY_PROCESS_NAMES

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: code, high-value, mts, other, scripts, taskmanager
- Source link target: taskmanager/shared/task-manager-core.d.mts

## Excerpt

~~~
export interface TaskManagerProcessRow {
  processName: string;
  pid: number;
  parentPid?: number | null;
  cpuSeconds: number;
  cpuPercentHint: number;
  gpuPercent: number;
  gpuDedicatedBytes: number;
  gpuSharedBytes: number;
  workingSetBytes: number;
  privateBytes: number;
  sessionId: number | null;
  path: string | null;
  mainWindowTitle: string | null;
  responding: boolean | null;
  startTime: string | null;
}

export interface TaskManagerSnapshot {
  capturedAt: string;
  logicalCpuCount: number;
  totalMemoryBytes: number;
  freeMemoryBytes: number;
  totalVramBytes?: number | null;
  usedVramBytes?: number | null;
  diskBytesPerSecond?: number | null;
  totalCpuPercentHint: number;
  totalGpuPercentHint: number;
~~~