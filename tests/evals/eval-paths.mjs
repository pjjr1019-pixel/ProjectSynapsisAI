import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir, normalizeSlashes } from "../../portable_lib/brain-build-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const TESTS_EVALS_ROOT = path.resolve(__dirname);
export const REPO_ROOT = path.resolve(TESTS_EVALS_ROOT, "..", "..");
export const PROMPT_CASES_ROOT = path.join(TESTS_EVALS_ROOT, "prompt-cases");

export const EVAL_ROOT = path.join(REPO_ROOT, "brain", "runtime", "evals");
export const EVAL_SANDBOX_ROOT = path.join(EVAL_ROOT, "sandbox");
export const EVAL_RESULTS_ROOT = path.join(EVAL_ROOT, "results");
export const EVAL_HISTORY_ROOT = path.join(EVAL_ROOT, "history");
export const EVAL_SANDBOX_TASKMANAGER_ROOT = path.join(EVAL_SANDBOX_ROOT, "app", "taskmanager-root");

export function getEvalSandboxPaths(taskmanagerRoot = EVAL_SANDBOX_TASKMANAGER_ROOT) {
  const brainRoot = path.join(taskmanagerRoot, "brain");
  const runtimeRoot = path.join(brainRoot, "runtime");
  const generatedRoot = path.join(brainRoot, "generated");
  const generatedRuntimeRoot = path.join(generatedRoot, "runtime");
  const workflowBaseRoot = runtimeRoot;
  const workflowsRoot = path.join(runtimeRoot, "workflows");

  return {
    taskmanagerRoot,
    brainRoot,
    runtimeRoot,
    generatedRoot,
    generatedRuntimeRoot,
    workflowBaseRoot,
    workflowsRoot,
    workflowRunsRoot: path.join(runtimeRoot, "workflow-runs"),
    workflowIndexRoot: path.join(runtimeRoot, "workflow-index"),
    governedLogsRoot: path.join(runtimeRoot, "logs", "governed-actions"),
    desktopRoot: path.join(EVAL_SANDBOX_ROOT, "Desktop"),
    documentsRoot: path.join(EVAL_SANDBOX_ROOT, "Documents"),
    runtimeStateRoot: path.join(taskmanagerRoot, ".runtime"),
    evalRoot: EVAL_ROOT,
    sandboxRoot: EVAL_SANDBOX_ROOT,
    resultsRoot: EVAL_RESULTS_ROOT,
    historyRoot: EVAL_HISTORY_ROOT,
  };
}

export function ensureEvalDirectories() {
  const sandboxPaths = getEvalSandboxPaths();
  for (const directory of [
    PROMPT_CASES_ROOT,
    EVAL_ROOT,
    EVAL_SANDBOX_ROOT,
    EVAL_RESULTS_ROOT,
    EVAL_HISTORY_ROOT,
    sandboxPaths.taskmanagerRoot,
  ]) {
    ensureDir(directory);
  }
  return sandboxPaths;
}

export function normalizeEvalPath(value) {
  return normalizeSlashes(path.resolve(String(value || "")));
}

export function isWithinDirectory(candidate, root) {
  const rel = path.relative(path.resolve(root), path.resolve(candidate));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

export function resolveSandboxRelativePath(input, sandboxPaths = getEvalSandboxPaths()) {
  const text = String(input || "").trim();
  if (!text) return "";
  if (path.isAbsolute(text)) return path.normalize(text);

  const normalized = text.replace(/\//g, "\\");
  if (/^Documents\\/i.test(normalized)) {
    return path.normalize(path.join(sandboxPaths.documentsRoot, normalized.slice("Documents\\".length)));
  }
  if (/^Desktop\\/i.test(normalized)) {
    return path.normalize(path.join(sandboxPaths.desktopRoot, normalized.slice("Desktop\\".length)));
  }
  return path.normalize(path.join(sandboxPaths.taskmanagerRoot, normalized));
}

export function buildTemplateContext(sandboxPaths = getEvalSandboxPaths()) {
  return {
    repoRoot: REPO_ROOT,
    evalRoot: EVAL_ROOT,
    sandboxRoot: sandboxPaths.sandboxRoot,
    taskmanagerRoot: sandboxPaths.taskmanagerRoot,
    brainRoot: sandboxPaths.brainRoot,
    runtimeRoot: sandboxPaths.runtimeRoot,
    generatedRuntimeRoot: sandboxPaths.generatedRuntimeRoot,
    workflowBaseRoot: sandboxPaths.workflowBaseRoot,
    workflowsRoot: sandboxPaths.workflowsRoot,
    documentsRoot: sandboxPaths.documentsRoot,
    desktopRoot: sandboxPaths.desktopRoot,
    runtimeStateRoot: sandboxPaths.runtimeStateRoot,
    resultsRoot: EVAL_RESULTS_ROOT,
    historyRoot: EVAL_HISTORY_ROOT,
  };
}

export function applyTemplateValue(value, context) {
  if (typeof value === "string") {
    return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) =>
      Object.prototype.hasOwnProperty.call(context, key) ? String(context[key]) : ""
    );
  }
  if (Array.isArray(value)) {
    return value.map((entry) => applyTemplateValue(entry, context));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const next = {};
  for (const [key, entry] of Object.entries(value)) {
    next[key] = applyTemplateValue(entry, context);
  }
  return next;
}
