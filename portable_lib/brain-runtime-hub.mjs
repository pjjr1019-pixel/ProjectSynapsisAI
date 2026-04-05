import fs from "node:fs";
import path from "node:path";
import { ensureDir, normalizeSlashes } from "./brain-build-utils.mjs";
import { ensureTaskmanagerPathDirs, getTaskmanagerPaths } from "./taskmanager-paths.mjs";

const taskmanagerPaths = getTaskmanagerPaths();

let migrationCache = null;

function ensureParent(filePath) {
  ensureDir(path.dirname(filePath));
}

function walkFiles(fullDir) {
  if (!fs.existsSync(fullDir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const full = path.join(fullDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full));
      continue;
    }
    out.push(full);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function copyFileIfNewer(src, dst) {
  if (!fs.existsSync(src)) return false;
  ensureParent(dst);
  if (!fs.existsSync(dst)) {
    fs.copyFileSync(src, dst);
    return true;
  }
  const srcStat = fs.statSync(src);
  const dstStat = fs.statSync(dst);
  if (srcStat.mtimeMs <= dstStat.mtimeMs) return false;
  fs.copyFileSync(src, dst);
  return true;
}

function copyTreeIfNeeded(srcRoot, dstRoot) {
  if (!fs.existsSync(srcRoot)) return 0;
  let copied = 0;
  for (const src of walkFiles(srcRoot)) {
    const rel = path.relative(srcRoot, src);
    const dst = path.join(dstRoot, rel);
    if (copyFileIfNewer(src, dst)) copied += 1;
  }
  return copied;
}

export function getBrainRuntimeHubPaths() {
  const generated = taskmanagerPaths.brain.generated.runtime;
  const logsRoot = generated.logsRoot;
  const learningRoot = generated.learningRoot;
  const stateRoot = generated.stateRoot;
  return {
    repoRoot: taskmanagerPaths.taskmanagerRoot,
    brainRoot: taskmanagerPaths.brain.root,
    runtimeRoot: generated.root,
    logsRoot,
    chatTurnsRoot: generated.chatTurnsRoot,
    learnedQaRoot: generated.learnedQaRoot,
    learnedQaFile: generated.learnedQaFile,
    fetchLogsRoot: generated.fetchLogsRoot,
    jobLogsRoot: generated.jobLogsRoot,
    digestRoot: generated.digestRoot,
    sessionsRoot: generated.sessionsRoot,
    sessionSnapshotsRoot: generated.sessionSnapshotsRoot,
    learningRoot,
    queueRoot: generated.queueRoot,
    queueFile: generated.queueFile,
    rawRoot: generated.rawRoot,
    processedRoot: generated.processedRoot,
    promotedRoot: generated.promotedRoot,
    quarantineRoot: path.join(generated.learningRoot, "quarantine"),
    manifestsRoot: path.join(generated.learningRoot, "manifests"),
    stateRoot,
    learningStatusFile: generated.learningStatusFile,
    seenUrlsFile: generated.seenUrlsFile,
    missTopicsFile: generated.missTopicsFile,
    domainStateFile: generated.domainStateFile,
    settingsRoot: taskmanagerPaths.brain.runtime.settingsRoot,
    settingsFile: taskmanagerPaths.brain.runtime.runtimeSettingsFile,
    testArtifactsRoot: generated.testArtifactsRoot,
    trashRoot: generated.trashRoot,
    legacyLogsRoot: generated.legacyLogsRoot,
    legacySessionsRoot: generated.legacySessionsRoot,
    legacySessionSnapshotsRoot: generated.legacySessionSnapshotsRoot,
    legacyLearningRoot: generated.legacyLearningRoot,
    legacyTestArtifactsRoot: generated.legacyTestArtifactsRoot,
    legacyTrashRoot: generated.legacyTrashRoot,
    legacyReviewChatTurnsRoot: taskmanagerPaths.brain.runtime.legacyReviewChatTurnsRoot,
    legacyLearnedQaFile: taskmanagerPaths.brain.runtime.legacyLearnedQaFile,
    legacyHistoricalSessionSnapshotsRoot: taskmanagerPaths.brain.runtime.legacySessionSnapshotsRoot,
  };
}

export function ensureBrainRuntimeHub() {
  ensureTaskmanagerPathDirs();
  const paths = getBrainRuntimeHubPaths();
  [
    paths.runtimeRoot,
    paths.logsRoot,
    paths.chatTurnsRoot,
    paths.learnedQaRoot,
    paths.fetchLogsRoot,
    paths.jobLogsRoot,
    paths.digestRoot,
    paths.sessionsRoot,
    paths.sessionSnapshotsRoot,
    paths.learningRoot,
    paths.queueRoot,
    paths.rawRoot,
    paths.processedRoot,
    paths.promotedRoot,
    paths.quarantineRoot,
    paths.manifestsRoot,
    paths.stateRoot,
    paths.settingsRoot,
    paths.testArtifactsRoot,
    paths.trashRoot,
  ].forEach(ensureDir);
  return paths;
}

export function migrateLegacyBrainRuntimeData() {
  if (migrationCache) return migrationCache;
  const paths = ensureBrainRuntimeHub();
  const result = {
    runtimeRoot: normalizeSlashes(paths.runtimeRoot),
    copied: {
      logFiles: copyTreeIfNeeded(paths.legacyLogsRoot, paths.logsRoot),
      sessionFiles: copyTreeIfNeeded(paths.legacySessionsRoot, paths.sessionsRoot),
      chatTurnFiles: copyTreeIfNeeded(paths.legacyReviewChatTurnsRoot, paths.chatTurnsRoot),
      sessionSnapshotFiles: copyTreeIfNeeded(
        paths.legacySessionSnapshotsRoot,
        paths.sessionSnapshotsRoot
      ),
      historicalSessionSnapshotFiles: copyTreeIfNeeded(
        paths.legacyHistoricalSessionSnapshotsRoot,
        paths.sessionSnapshotsRoot
      ),
      learningFiles: copyTreeIfNeeded(paths.legacyLearningRoot, paths.learningRoot),
      testArtifactFiles: copyTreeIfNeeded(paths.legacyTestArtifactsRoot, paths.testArtifactsRoot),
      trashFiles: copyTreeIfNeeded(paths.legacyTrashRoot, paths.trashRoot),
      learnedQaFile: copyFileIfNewer(paths.legacyLearnedQaFile, paths.learnedQaFile) ? 1 : 0,
    },
  };
  migrationCache = result;
  return result;
}

export function resetBrainRuntimeMigrationCache() {
  migrationCache = null;
}
