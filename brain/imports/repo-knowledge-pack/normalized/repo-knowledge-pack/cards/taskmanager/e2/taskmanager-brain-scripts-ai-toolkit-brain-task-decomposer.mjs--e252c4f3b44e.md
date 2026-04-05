---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/brain/scripts/ai-toolkit/brain-task-decomposer.mjs"
source_name: "brain-task-decomposer.mjs"
top_level: "taskmanager"
surface: "brain-scripts"
classification: "neutral"
kind: "code"
language: "javascript"
extension: ".mjs"
score: 112
selected_rank: 127
content_hash: "c4dd4e8007749bb7b5ba0a143d80a3ab933dbe44bc8f2ee6daaf4160c3aa957f"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "brain"
  - "brain-scripts"
  - "code"
  - "mjs"
  - "neutral"
  - "scripts"
imports:
  - "./brain-intent-parser.mjs"
exports:
  - "decomposeBrainIntent"
  - "summarizeTasks"
---

# taskmanager/brain/scripts/ai-toolkit/brain-task-decomposer.mjs

> Script surface; imports ./brain-intent-parser.mjs; exports decomposeBrainIntent, summarizeTasks

## Key Signals

- Source path: taskmanager/brain/scripts/ai-toolkit/brain-task-decomposer.mjs
- Surface: brain-scripts
- Classification: neutral
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 112
- Tags: brain, brain-scripts, code, mjs, neutral, scripts
- Imports: ./brain-intent-parser.mjs
- Exports: decomposeBrainIntent, summarizeTasks

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: brain, brain-scripts, code, mjs, neutral, scripts, taskmanager
- Source link target: taskmanager/brain/scripts/ai-toolkit/brain-task-decomposer.mjs

## Excerpt

~~~javascript
import { parseBrainIntent } from "./brain-intent-parser.mjs";

function makeTask(id, name, type, input, dependsOn = []) {
  return { id, name, type, input, dependsOn: dependsOn.filter(Boolean) };
}

function taskId(planId, suffix) {
  return `${planId}:${suffix}`;
}

export function decomposeBrainIntent(rawQuery, opts = {}) {
  const intent = typeof rawQuery === "string" || !rawQuery?.intent
    ? parseBrainIntent(rawQuery, opts)
    : rawQuery;
  const planId = `plan-${Date.now().toString(36)}`;
  const tasks = [];
  const normalized = intent.params?.normalized || String(intent.rawQuery || "").trim().toLowerCase();

  tasks.push(makeTask(taskId(planId, "intent"), "Confirm intent", "intent", intent, []));

  if (intent.intent === "calculator") {
    tasks.push(makeTask(taskId(planId, "calculate"), "Evaluate expression", "calculator", {
      expression: intent.params?.mathReply || normalized,
      display: intent.rawQuery,
    }, [taskId(planId, "intent")]));
  } else if (intent.intent === "scenario") {
    tasks.push(makeTask(taskId(planId, "scenario"), "Resolve scenario reply", "scenario", {
      normalized,
~~~