import fs from "node:fs";
import path from "node:path";
import { getTaskmanagerPaths } from "../taskmanager-paths.mjs";

const taskmanagerPaths = getTaskmanagerPaths();
const TASKMANAGER_ROOT = taskmanagerPaths.taskmanagerRoot;
const BRAIN_ROOT = taskmanagerPaths.brain.root;

export function getSpecialistPaths() {
  const specialistRoot = taskmanagerPaths.brain.generated.runtime.specialistRoot;
  const indexRoot = taskmanagerPaths.brain.generated.runtime.specialistIndexRoot;
  const logsRoot = taskmanagerPaths.brain.generated.runtime.specialistLogsRoot;
  const scriptsRoot = path.join(BRAIN_ROOT, "scripts");
  const registryRoot = path.join(scriptsRoot, "registry");
  const newSkillsRoot = path.join(scriptsRoot, "new-skills");

  return {
    taskmanagerRoot: TASKMANAGER_ROOT,
    brainRoot: BRAIN_ROOT,
    scriptsRoot,
    registryRoot,
    newSkillsRoot,
    specialistRoot,
    indexRoot,
    logsRoot,
    toolsIndexFile: path.join(registryRoot, "tools_index.json"),
    toolAliasesFile: path.join(registryRoot, "tool_aliases.json"),
    scriptManifestSchemaFile: path.join(registryRoot, "script_manifest.schema.json"),
    scriptManifestIndexFile: path.join(registryRoot, "script_manifests.generated.json"),
    embeddingsCacheFile: path.join(indexRoot, "script-embeddings.json"),
    retrievalCacheFile: path.join(indexRoot, "retrieval-cache.json"),
    specialistStateFile: taskmanagerPaths.brain.generated.runtime.specialistStateFile,
    specialistLearningFile: taskmanagerPaths.brain.generated.runtime.specialistLearningFile,
    specialistLogFile: path.join(logsRoot, "pipeline.jsonl"),
    specialistExecutionLogFile: path.join(logsRoot, "executions.jsonl"),
  };
}

export function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function readJsonFile(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJsonFile(filePath, payload) {
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export function appendJsonLine(filePath, payload) {
  ensureParentDir(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}
