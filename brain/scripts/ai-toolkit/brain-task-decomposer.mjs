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
      scenarioReply: intent.params?.scenarioReply || intent.params?.scenario?.reply || null,
      scenario: intent.params?.scenario || null,
    }, [taskId(planId, "intent")]));
  } else if (intent.intent === "compound-query") {
    for (const [index, subquery] of (intent.params?.decomposition?.subqueries || []).entries()) {
      tasks.push(makeTask(taskId(planId, `subquery-${index + 1}`), `Process subquery ${index + 1}`, "subquery", {
        query: subquery,
        normalized: subquery.toLowerCase(),
        parentQuery: intent.rawQuery,
      }, [taskId(planId, "intent")]));
    }
  } else if (intent.intent === "help") {
    tasks.push(makeTask(taskId(planId, "help"), "Assemble help response", "help", {
      query: intent.rawQuery,
      normalized,
    }, [taskId(planId, "intent")]));
  } else if (intent.intent === "task") {
    tasks.push(makeTask(taskId(planId, "plan"), "Plan action", "plan", {
      query: intent.rawQuery,
      normalized,
      profileName: intent.params?.profileName || null,
      expansion: intent.params?.expansion || [],
    }, [taskId(planId, "intent")]));
  } else if (intent.intent === "analysis") {
    tasks.push(makeTask(taskId(planId, "hotspot-analysis"), "Analyze resource hotspots", "hotspot-analysis", {
      query: intent.rawQuery,
      normalized,
      focus: intent.params?.focus || "analysis",
    }, [taskId(planId, "intent")]));
  } else {
    tasks.push(makeTask(taskId(planId, "clarify"), "Generate clarification", "clarify", {
      query: intent.rawQuery,
      normalized,
    }, [taskId(planId, "intent")]));
  }

  return { tasks, planId, intent };
}

export function summarizeTasks(plan) {
  return (plan?.tasks || []).map((task) => `${task.id}:${task.type}`).join(", ");
}