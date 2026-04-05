import fs from "node:fs";
import { readJsonIfExists } from "../../../portable_lib/brain-build-utils.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseBrainIntent } from "./brain-intent-parser.mjs";
import { decomposeBrainIntent } from "./brain-task-decomposer.mjs";
import { planBrainWorkflow } from "./brain-workflow-planner.mjs";
import { compileBrainActions } from "./brain-action-compiler.mjs";
import { buildBrainContext } from "./brain-context-builder.mjs";
import { explainOptimizerHealth } from "./optimizer-health-explainer.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const macrosPath = path.resolve(__dirname, "..", "..", "data", "macros", "macros.json");

function readMacros() {
  return readJsonIfExists(macrosPath) || { macros: {} };
}

function summarizeStep(step, output) {
  return {
    name: String(step.name || step.type || "step"),
    status: output?.error ? "failed" : "completed",
    output,
  };
}

async function executeMacroStep(step, params, state) {
  const query = params?.query || state.query || "";
  const taskType = params?.taskType || state.taskType || null;
  if (step.type === "intent") return parseBrainIntent(query, params);
  if (step.type === "decompose") return decomposeBrainIntent(query, params);
  if (step.type === "plan") return planBrainWorkflow(state.decomposed || decomposeBrainIntent(query, params));
  if (step.type === "compile") return compileBrainActions(state.workflow || planBrainWorkflow(state.decomposed || decomposeBrainIntent(query, params)), params);
  if (step.type === "context") return buildBrainContext({ query, taskType, maxTokens: params?.maxTokens || 1200, profileName: params?.profileName || "repo-knowledge-pack" });
  if (step.type === "health") return explainOptimizerHealth(params?.telemetry || {}, params?.hotspots || [], params?.anomalies || []);
  if (step.type === "summary") return {
    summary: step.template || `Macro ${state.macroName} completed`,
    query,
    taskType,
  };
  return { skipped: true, stepType: step.type };
}

export async function runBrainMacro({ macroName, params = {} } = {}) {
  const registry = readMacros();
  const macro = registry.macros?.[macroName];
  if (!macro) {
    throw new Error(`Unknown macro: ${macroName}`);
  }

  const state = {
    macroName,
    query: params.query || "",
    taskType: params.taskType || null,
    decomposed: null,
    workflow: null,
  };
  const steps = [];

  for (const step of Array.isArray(macro.steps) ? macro.steps : []) {
    const output = await executeMacroStep(step, params, state);
    if (step.type === "decompose") state.decomposed = output;
    if (step.type === "plan") state.workflow = output;
    steps.push(summarizeStep(step, output));
  }

  return {
    macroName,
    result: steps.every((step) => step.status === "completed") ? "success" : "partial",
    steps,
    params,
  };
}

export function listBrainMacros() {
  const registry = readMacros();
  return Object.keys(registry.macros || {}).sort();
}