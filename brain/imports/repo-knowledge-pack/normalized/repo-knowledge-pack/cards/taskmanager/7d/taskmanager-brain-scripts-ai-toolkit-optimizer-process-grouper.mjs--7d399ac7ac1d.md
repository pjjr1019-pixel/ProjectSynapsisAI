---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/ai-toolkit/optimizer-process-grouper.mjs"
source_name: "optimizer-process-grouper.mjs"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 108
selected_rank: 470
content_hash: "86464842f354bd172233a88be279e8874eb130a548831e1a687d976cd365535b"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "mjs"
  - "neutral"
  - "scripts"
exports:
  - "buildProcessTree"
  - "flattenProcessTree"
---

# taskmanager/brain/scripts/ai-toolkit/optimizer-process-grouper.mjs

> Script surface; exports buildProcessTree, flattenProcessTree

## Key Signals

- Source path: taskmanager/brain/scripts/ai-toolkit/optimizer-process-grouper.mjs
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 108
- Tags: brain, brain-scripts, code, mjs, neutral, scripts
- Exports: buildProcessTree, flattenProcessTree

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, mjs, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/ai-toolkit/optimizer-process-grouper.mjs

## Excerpt

~~~javascript
/**
 * Optimizer Process Grouper
 *
 * Builds deterministic parent/child process trees from a flat process list.
 */

function normalizeProcess(processEntry) {
  return {
    pid: Number(processEntry?.pid ?? processEntry?.processId ?? 0),
    ppid: Number(processEntry?.ppid ?? processEntry?.parentPid ?? processEntry?.parentProcessId ?? 0),
    name: String(processEntry?.name ?? processEntry?.displayName ?? `pid-${processEntry?.pid ?? 0}`),
    raw: processEntry,
    children: [],
  };
}

export function buildProcessTree(processes = []) {
  const byPid = new Map();
  const roots = [];
  const normalized = Array.isArray(processes) ? processes.map(normalizeProcess) : [];

  for (const node of normalized) {
    if (node.pid > 0) {
      byPid.set(node.pid, node);
    }
  }

  for (const node of normalized) {
~~~