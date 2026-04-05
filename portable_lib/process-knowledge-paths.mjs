import path from "node:path";
import { getTaskmanagerPaths } from "./taskmanager-paths.mjs";

const taskmanagerPaths = getTaskmanagerPaths();

export const repoRoot = taskmanagerPaths.taskmanagerRoot;
export const brainRoot = taskmanagerPaths.brain.root;
export const processKnowledgeRoot = path.join(brainRoot, "processes");

export const processKnowledgeFileNames = Object.freeze({
  index: "INDEX.md",
  lookup: "LOOKUP.json",
  seenRegistry: "SEEN_REGISTRY.json",
  pendingEnrichment: "PENDING_ENRICHMENT.json",
  searchIndex: "SEARCH_INDEX.json",
});

export function getProcessKnowledgePaths() {
  return {
    repoRoot,
    brainRoot,
    processKnowledgeRoot,
    indexPath: path.join(processKnowledgeRoot, processKnowledgeFileNames.index),
    lookupPath: path.join(processKnowledgeRoot, processKnowledgeFileNames.lookup),
    seenRegistryPath: path.join(processKnowledgeRoot, processKnowledgeFileNames.seenRegistry),
    pendingEnrichmentPath: path.join(processKnowledgeRoot, processKnowledgeFileNames.pendingEnrichment),
    searchIndexPath: path.join(processKnowledgeRoot, processKnowledgeFileNames.searchIndex),
  };
}

export function getProcessKnowledgePath(fileName) {
  return path.join(processKnowledgeRoot, String(fileName ?? ""));
}
