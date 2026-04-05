---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/ai-toolkit/optimizer-task-queue.mjs"
source_name: "optimizer-task-queue.mjs"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 108
selected_rank: 471
content_hash: "0f6615c7c330a91bde675054b518b727fc120e431daeabc8a3e002f9214bac6c"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "mjs"
  - "neutral"
  - "scripts"
exports:
  - "compareTaskPriority"
  - "createTaskQueue"
---

# taskmanager/brain/scripts/ai-toolkit/optimizer-task-queue.mjs

> Script surface; exports compareTaskPriority, createTaskQueue

## Key Signals

- Source path: taskmanager/brain/scripts/ai-toolkit/optimizer-task-queue.mjs
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 108
- Tags: brain, brain-scripts, code, mjs, neutral, scripts
- Exports: compareTaskPriority, createTaskQueue

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, mjs, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/ai-toolkit/optimizer-task-queue.mjs

## Excerpt

~~~javascript
/**
 * Optimizer Task Queue
 *
 * Deterministic FIFO priority queue for optimizer and brain-side sequencing.
 * Higher priority values are dequeued first; ties preserve insertion order.
 */

function normalizeTask(task, sequence) {
  if (!task || typeof task !== "object") {
    throw new Error("createTaskQueue: task must be an object");
  }

  return {
    id: task.id ?? `task-${sequence + 1}`,
    type: task.type ?? "task",
    payload: task.payload ?? null,
    priority: Number.isFinite(task.priority) ? Number(task.priority) : 0,
    createdAt: task.createdAt ?? new Date().toISOString(),
    sequence,
  };
}

function sortQueue(queue) {
  queue.sort((left, right) => {
    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }
    return left.sequence - right.sequence;
~~~