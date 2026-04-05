import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir } from "./brain-build-utils.mjs";
import { getTaskmanagerPaths } from "./taskmanager-paths.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fallbackTaskmanagerRoot = path.resolve(__dirname, "..");

export function getTaskmanagerRoot() {
  return getTaskmanagerPaths()?.taskmanagerRoot || fallbackTaskmanagerRoot;
}

export function getWorkflowRuntimePaths() {
  const taskmanagerRoot = getTaskmanagerRoot();
  const defaultRuntimeBaseRoot = path.join(taskmanagerRoot, "brain", "runtime");
  const workflowsRoot = process.env.HORIZONS_WORKFLOW_RUNTIME_ROOT
    ? path.resolve(process.env.HORIZONS_WORKFLOW_RUNTIME_ROOT)
    : path.join(defaultRuntimeBaseRoot, "workflows");
  const runtimeBaseRoot = process.env.HORIZONS_WORKFLOW_RUNTIME_BASE_ROOT
    ? path.resolve(process.env.HORIZONS_WORKFLOW_RUNTIME_BASE_ROOT)
    : path.dirname(workflowsRoot);

  return {
    taskmanagerRoot,
    runtimeBaseRoot,
    workflowsRoot,
    candidatesRoot: path.join(workflowsRoot, "candidates"),
    trustedRoot: path.join(workflowsRoot, "trusted"),
    archiveRoot: path.join(workflowsRoot, "archive"),
    runsRoot: path.join(runtimeBaseRoot, "workflow-runs"),
    indexRoot: path.join(runtimeBaseRoot, "workflow-index"),
    catalogFile: path.join(runtimeBaseRoot, "workflow-index", "catalog.json"),
    runsLogFile: path.join(runtimeBaseRoot, "workflow-index", "runs.jsonl"),
    promotionsLogFile: path.join(runtimeBaseRoot, "workflow-index", "promotions.jsonl"),
  };
}

export function ensureWorkflowRuntimePaths() {
  const paths = getWorkflowRuntimePaths();
  ensureDir(paths.candidatesRoot);
  ensureDir(paths.trustedRoot);
  ensureDir(paths.archiveRoot);
  ensureDir(paths.runsRoot);
  ensureDir(paths.indexRoot);
  return paths;
}
