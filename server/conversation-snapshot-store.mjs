import fs from "node:fs";
import { dirname } from "node:path";
import { getTaskmanagerPaths } from "../portable_lib/taskmanager-paths.mjs";
import { toNumber } from "../shared/utils.mjs";

const SNAPSHOT_FILE = `${getTaskmanagerPaths().appRuntimeStateRoot}/launcher-workspace-snapshot.json`;

const MAX_THREADS = 80;
const MAX_TITLE_CHARS = 120;
const MAX_PREVIEW_CHARS = 220;
const MAX_WORKSPACE_MESSAGES = 24;
const MAX_WORKSPACE_ATTACHMENTS = 20;
const MAX_WORKSPACE_TERMINAL_LINES = 80;

const EMPTY_SNAPSHOT = Object.freeze({
  publishedAt: null,
  activeThreadId: null,
  activeSurfaceId: null,
  activeSurfaceTitle: null,
  threads: [],
  workspace: null,
});

function toText(value, fallback = "") {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function compactText(value, maxLength) {
  const normalized = toText(value).replace(/\s+/g, " ");
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function toTimestamp(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? Date.now() : date.getTime();
}

function normalizeRole(value) {
  return value === "user" || value === "assistant" ? value : null;
}

function toBoolean(value) {
  return value === true;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function persistSnapshot(snapshot) {
  try {
    fs.mkdirSync(dirname(SNAPSHOT_FILE), { recursive: true });
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2), "utf8");
  } catch {
    /* best effort cache */
  }
}

function loadPersistedSnapshot() {
  try {
    if (!fs.existsSync(SNAPSHOT_FILE)) return clone(EMPTY_SNAPSHOT);
    const raw = fs.readFileSync(SNAPSHOT_FILE, "utf8");
    if (!raw.trim()) return clone(EMPTY_SNAPSHOT);
    return normalizeConversationSnapshot(JSON.parse(raw));
  } catch {
    return clone(EMPTY_SNAPSHOT);
  }
}

function normalizeThreadSummary(input, activeThreadId) {
  const id = toText(input?.id);
  if (!id) return null;

  return {
    id,
    title: compactText(input?.title || "Conversation", MAX_TITLE_CHARS) || "Conversation",
    surfaceId: toText(input?.surfaceId || "assistant", "assistant"),
    surfaceTitle: compactText(input?.surfaceTitle || input?.surfaceId || "Assistant", MAX_TITLE_CHARS) || "Assistant",
    updatedAt: toTimestamp(input?.updatedAt),
    messageCount: Math.max(0, toNumber(input?.messageCount || 0)),
    lastMessageRole: normalizeRole(input?.lastMessageRole),
    lastMessagePreview: compactText(input?.lastMessagePreview, MAX_PREVIEW_CHARS),
    active: id === activeThreadId || input?.active === true,
  };
}

function normalizeWorkspaceMessage(input) {
  const text = compactText(input?.text, MAX_PREVIEW_CHARS);
  const role = normalizeRole(input?.role);
  if (!text || !role) return null;
  return {
    role,
    text,
    source: toText(input?.source) || null,
    provenanceLabel: compactText(input?.provenanceLabel, 120) || null,
  };
}

function normalizeWorkspaceAttachment(input) {
  const id = toText(input?.id);
  const name = compactText(input?.name, MAX_TITLE_CHARS);
  if (!id || !name) return null;
  return { id, name };
}

function normalizeWorkspace(input, fallback = {}) {
  if (!input || typeof input !== "object") return null;

  const terminalLines = Array.isArray(input?.idleTrainingTerminalLines)
    ? input.idleTrainingTerminalLines
        .map((entry) => compactText(entry, 240))
        .filter(Boolean)
        .slice(-MAX_WORKSPACE_TERMINAL_LINES)
    : [];

  const attachments = Array.isArray(input?.attachments)
    ? input.attachments
        .map((entry) => normalizeWorkspaceAttachment(entry))
        .filter(Boolean)
        .slice(0, MAX_WORKSPACE_ATTACHMENTS)
    : [];

  const chatMessages = Array.isArray(input?.chatMessages)
    ? input.chatMessages
        .map((entry) => normalizeWorkspaceMessage(entry))
        .filter(Boolean)
        .slice(-MAX_WORKSPACE_MESSAGES)
    : [];

  return {
    appName: compactText(input?.appName || "Horizons AI", MAX_TITLE_CHARS) || "Horizons AI",
    activeSurfaceId: toText(input?.activeSurfaceId || fallback.activeSurfaceId) || null,
    activeSurfaceTitle: compactText(input?.activeSurfaceTitle || fallback.activeSurfaceTitle, MAX_TITLE_CHARS) || null,
    chatThreadTitle: compactText(input?.chatThreadTitle, MAX_TITLE_CHARS) || null,
    chatSubmitting: toBoolean(input?.chatSubmitting),
    chatWindowOpen: toBoolean(input?.chatWindowOpen),
    brainBrowserOpen: toBoolean(input?.brainBrowserOpen),
    crawlTerminalOpen: toBoolean(input?.crawlTerminalOpen),
    localLlmEnabled: toBoolean(input?.localLlmEnabled),
    internetEnabled: toBoolean(input?.internetEnabled),
    internetProvider: compactText(input?.internetProvider, MAX_TITLE_CHARS) || null,
    densePilotRequested: toBoolean(input?.densePilotRequested),
    densePilotReady: toBoolean(input?.densePilotReady),
    densePilotModel: compactText(input?.densePilotModel, MAX_TITLE_CHARS) || null,
    selectedCrawlerId: compactText(input?.selectedCrawlerId, MAX_TITLE_CHARS) || null,
    idleTrainingEnabled: toBoolean(input?.idleTrainingEnabled),
    idleTrainingActive: toBoolean(input?.idleTrainingActive),
    idleTrainingLastRunAt: toText(input?.idleTrainingLastRunAt) || null,
    idleTrainingLastPromotionCount: Math.max(0, toNumber(input?.idleTrainingLastPromotionCount)),
    idleTrainingParallelFetchWorkers: Math.max(0, toNumber(input?.idleTrainingParallelFetchWorkers)),
    idleTrainingActiveFetchWorkers: Math.max(0, toNumber(input?.idleTrainingActiveFetchWorkers)),
    idleTrainingQueueSize: Math.max(0, toNumber(input?.idleTrainingQueueSize)),
    idleTrainingModeSummary:
      input?.idleTrainingModeSummary && typeof input.idleTrainingModeSummary === "object"
        ? {
            sourceScope: compactText(input.idleTrainingModeSummary.sourceScope, MAX_TITLE_CHARS) || null,
            promotionMode: compactText(input.idleTrainingModeSummary.promotionMode, MAX_TITLE_CHARS) || null,
            logAccessMode: compactText(input.idleTrainingModeSummary.logAccessMode, MAX_TITLE_CHARS) || null,
          }
        : {},
    idleTrainingTerminalLines: terminalLines,
    idleTrainingError: compactText(input?.idleTrainingError, MAX_PREVIEW_CHARS) || null,
    crawlerCount: Math.max(0, toNumber(input?.crawlerCount)),
    enabledCrawlerCount: Math.max(0, toNumber(input?.enabledCrawlerCount)),
    activeCrawlerCount: Math.max(0, toNumber(input?.activeCrawlerCount)),
    attachments,
    chatMessages,
  };
}

function normalizeConversationSnapshot(input) {
  const activeThreadId = toText(input?.activeThreadId) || null;
  const activeSurfaceId = toText(input?.activeSurfaceId) || null;
  const activeSurfaceTitle = compactText(input?.activeSurfaceTitle, MAX_TITLE_CHARS) || null;
  const threads = Array.isArray(input?.threads)
    ? input.threads
        .map((entry) => normalizeThreadSummary(entry, activeThreadId))
        .filter(Boolean)
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .slice(0, MAX_THREADS)
    : [];
  const workspace = normalizeWorkspace(input?.workspace, {
    activeSurfaceId,
    activeSurfaceTitle,
  });

  return {
    publishedAt: toText(input?.publishedAt) || null,
    activeThreadId,
    activeSurfaceId,
    activeSurfaceTitle,
    threads,
    workspace,
  };
}

let latestConversationSnapshot = loadPersistedSnapshot();

export function getConversationSnapshot() {
  return clone(latestConversationSnapshot);
}

export function publishConversationSnapshot(input) {
  latestConversationSnapshot = {
    ...normalizeConversationSnapshot(input),
    publishedAt: new Date().toISOString(),
  };
  persistSnapshot(latestConversationSnapshot);
  return getConversationSnapshot();
}

export function clearConversationSnapshot() {
  latestConversationSnapshot = clone(EMPTY_SNAPSHOT);
  persistSnapshot(latestConversationSnapshot);
  return getConversationSnapshot();
}
