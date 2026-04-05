import fs from "node:fs";
import path from "node:path";
import { ensureDir, normalizeSlashes, writeJsonStable } from "./brain-build-utils.mjs";
import { ensureBrainRuntimeHub, getBrainRuntimeHubPaths, migrateLegacyBrainRuntimeData } from "./brain-runtime-hub.mjs";

function safeSessionKey(sessionId) {
  return String(sessionId ?? "anon")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .slice(0, 80) || "anon";
}

function summaryText(snapshot) {
  const pinned = Array.isArray(snapshot.pinnedDocIds) && snapshot.pinnedDocIds.length
    ? snapshot.pinnedDocIds.slice(0, 5).map((id) => `- ${id}`).join("\n")
    : "- none";
  return [
    "---",
    `id: hz.runtime.session.${snapshot.snapshotKey}`,
    `title: "Session snapshot ${snapshot.snapshotKey}"`,
    "domain: runtime",
    "app: assistant",
    "kind: snapshot",
    "status: canonical",
    `confidence: ${snapshot.turnCount > 0 ? "0.72" : "0.6"}`,
    `reviewedAt: "${snapshot.updatedAt}"`,
    "---",
    "",
    `# Session Snapshot ${snapshot.snapshotKey}`,
    "",
    `Last updated: ${snapshot.updatedAt}`,
    "",
    "## Overview",
    "",
    `- App: ${snapshot.app}`,
    `- Retrieval profile: ${snapshot.retrievalProfile}`,
    `- Turn count: ${snapshot.turnCount}`,
    `- Last draft source: ${snapshot.lastSource || "unknown"}`,
    "",
    "## Referenced docs",
    "",
    pinned,
    "",
    "## Safety",
    "",
    "This snapshot stores metadata only. Raw message bodies and secrets are excluded from runtime storage.",
    "",
  ].join("\n");
}

export function persistSessionSnapshot(entry = {}) {
  if (!entry.sessionId) return null;
  migrateLegacyBrainRuntimeData();
  const paths = ensureBrainRuntimeHub();
  const snapshotKey = safeSessionKey(entry.sessionId);
  const jsonPath = path.join(paths.sessionSnapshotsRoot, `session-${snapshotKey}.json`);
  const summaryPath = path.join(paths.sessionSnapshotsRoot, `session-${snapshotKey}.summary.md`);
  let previous = null;
  if (fs.existsSync(jsonPath)) {
    try {
      previous = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    } catch {
      previous = null;
    }
  }
  const now = new Date().toISOString();
  const pinnedDocIds = [...new Set((Array.isArray(entry.pinnedDocIds) ? entry.pinnedDocIds : []).filter(Boolean))];
  const snapshot = {
    artifactType: "session-snapshot",
    schemaVersion: "1.0",
    snapshotKey,
    sessionId: String(entry.sessionId),
    app: String(entry.app || previous?.app || "assistant"),
    retrievalProfile: String(entry.retrievalProfile || previous?.retrievalProfile || "repo-knowledge-pack"),
    startedAt: previous?.startedAt || now,
    updatedAt: now,
    turnCount: Math.max(0, Number(entry.turnCount ?? previous?.turnCount ?? 0) || 0),
    lastSource: String(entry.lastSource || previous?.lastSource || ""),
    localLlm: entry.localLlm === true,
    pinnedDocIds,
    stageMatched: String(entry.stageMatched || ""),
  };
  ensureDir(path.dirname(jsonPath));
  writeJsonStable(jsonPath, snapshot);
  fs.writeFileSync(summaryPath, summaryText(snapshot), "utf8");
  return {
    jsonPath: normalizeSlashes(jsonPath),
    summaryPath: normalizeSlashes(summaryPath),
    snapshot,
  };
}
