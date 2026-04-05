import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { URL } from "node:url";

import { handleTaskManagerHttpRoute } from "./http-routes.mjs";
import { getAiRuntimeSidebarModel } from "./runtime-manager/ai-runtime-service.mjs";
import { clearConversationSnapshot, getConversationSnapshot } from "./conversation-snapshot-store.mjs";
import { getAiTaskManagerPayload } from "./task-manager-ai.mjs";
import { acceptOsSnapshot } from "../portable_lib/optimizer-telemetry.mjs";
import { getPolicyDiagnostics } from "../portable_lib/optimizer-policy.mjs";
import { getAuditSummary, getRecentAuditEvents } from "../portable_lib/optimizer-audit.mjs";
import { getAllModules, setModulePolicy } from "../portable_lib/optimizer-registry.mjs";
import {
  acceptRecommendation,
  getPendingApprovals,
  getRecommendations,
  ignoreRecommendation,
  approvePendingAction,
  snoozeRecommendation,
  declinePendingAction,
} from "../portable_lib/optimizer-actions.mjs";
import {
  getOptimizerStatus,
  setKillSwitch,
  setPerformanceMode,
  startOptimizerControlLoop,
  stopOptimizerControlLoop,
} from "../portable_lib/optimizer-control-loop.mjs";
import {
  startProcessKnowledgeListener,
  stopProcessKnowledgeListener,
} from "../portable_lib/process-knowledge-listener.mjs";
import {
  startProcessKnowledgeEnrichmentWorker,
  stopProcessKnowledgeEnrichmentWorker,
} from "../portable_lib/process-knowledge-enricher.mjs";
import { buildChatReply, streamBuildChatReply } from "../portable_lib/brain-chat-reply.mjs";
import { getLocalLlmConfig } from "../portable_lib/brain-local-llm.mjs";
import { readDeveloperModeSettings, updateDeveloperModeSettings } from "../portable_lib/developer-mode-settings.mjs";
import {
  parseBrainIntent,
  decomposeBrainIntent,
  planBrainWorkflow,
  selectBrainTools,
  compileBrainActions,
  detectHotspots,
  explainOptimizerHealth,
  validateBrainResponse,
} from "../brain/scripts/ai-toolkit/index.mjs";
import {
  EXECUTION_POLICIES,
  getSpecialistOrchestrator,
} from "../portable_lib/specialist/index.mjs";
import {
  approveGovernedApproval,
  declineGovernedApproval,
  getPendingGovernedApprovals,
} from "../portable_lib/governed-actions.mjs";
import {
  ensureTaskmanagerPathDirs,
  getTaskmanagerPaths,
} from "../portable_lib/taskmanager-paths.mjs";

ensureTaskmanagerPathDirs();
const taskmanagerPaths = getTaskmanagerPaths();
const port = Number(process.env.HORIZONS_FORCE_CHAT_API_PORT || process.env.CHAT_API_PORT || 8787);
const host = "127.0.0.1";
const RUNTIME_LOGS_ROOT = taskmanagerPaths.brain.generated.runtime.logsRoot;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

function createStartupPhase(status = "pending", extras = {}) {
  return {
    status,
    ready: status === "ready",
    startedAt: status === "pending" ? null : new Date().toISOString(),
    readyAt: status === "ready" ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
    elapsedMs: null,
    retryCount: 0,
    lastError: null,
    ...extras,
  };
}

const startupState = {
  startedAt: new Date().toISOString(),
  backgroundBootStartedAt: null,
  backgroundBootCompletedAt: null,
  phases: {
    core: createStartupPhase("booting"),
    optimizer: createStartupPhase(),
    process_knowledge: createStartupPhase("pending", {
      details: {
        listener: "pending",
        enrichmentWorker: "pending",
      },
    }),
    specialist: createStartupPhase(),
  },
};

let backgroundStartupPromise = null;

function updateStartupPhase(name, patch = {}) {
  const current = startupState.phases[name];
  if (!current) return null;
  const next = {
    ...current,
    ...patch,
    details:
      patch.details && typeof patch.details === "object"
        ? {
            ...(current.details || {}),
            ...patch.details,
          }
        : current.details,
    updatedAt: new Date().toISOString(),
  };
  startupState.phases[name] = next;
  return next;
}

function markStartupPhaseStarting(name, patch = {}) {
  const current = startupState.phases[name];
  return updateStartupPhase(name, {
    status: "starting",
    ready: false,
    startedAt: current?.startedAt || new Date().toISOString(),
    readyAt: null,
    lastError: null,
    ...patch,
  });
}

function markStartupPhaseReady(name, patch = {}) {
  const current = startupState.phases[name];
  const now = new Date().toISOString();
  const startedAt = current?.startedAt || now;
  const elapsedMs = new Date(now).getTime() - new Date(startedAt).getTime();
  return updateStartupPhase(name, {
    status: "ready",
    ready: true,
    startedAt,
    readyAt: now,
    elapsedMs,
    lastError: null,
    ...patch,
  });
}

function markStartupPhaseError(name, error, patch = {}) {
  const current = startupState.phases[name];
  const now = new Date().toISOString();
  const startedAt = current?.startedAt || now;
  const elapsedMs = new Date(now).getTime() - new Date(startedAt).getTime();
  return updateStartupPhase(name, {
    status: "error",
    ready: false,
    readyAt: null,
    elapsedMs,
    lastError: String(error?.message || error || "Unknown startup error."),
    ...patch,
  });
}

function buildHealthPayload() {
  const phases = startupState.phases;
  const backgroundWarming = Object.entries(phases).some(
    ([name, phase]) => name !== "core" && phase.status !== "ready" && phase.status !== "disabled"
  );
  const degraded = Object.entries(phases)
    .filter(([name, phase]) => name !== "core" && phase.status === "error")
    .map(([name]) => name);
  return {
    ok: true,
    service: "taskmanager-api",
    port,
    startedAt: startupState.startedAt,
    backgroundBootStartedAt: startupState.backgroundBootStartedAt,
    backgroundBootCompletedAt: startupState.backgroundBootCompletedAt,
    backgroundWarming,
    degraded,
    phases,
  };
}

function loadDotEnvFile() {
  const envPath = path.join(taskmanagerPaths.taskmanagerRoot, ".env");
  if (!fs.existsSync(envPath)) return;

  try {
    const raw = fs.readFileSync(envPath, "utf8");
    for (const rawLine of raw.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) continue;
      const key = line.slice(0, separatorIndex).trim();
      if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) continue;
      let value = line.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // Ignore malformed local env files and fall back to the process environment.
  }
}

loadDotEnvFile();

function logSubsystemStartupWarning(name, error) {
  console.warn(
    `[taskmanager-api] ${name} startup failed: ${String(error?.message || error)}`
  );
}

async function startOptimizerSubsystem() {
  markStartupPhaseStarting("optimizer");
  try {
    startOptimizerControlLoop({ logger: console });
    markStartupPhaseReady("optimizer");
  } catch (error) {
    markStartupPhaseError("optimizer", error);
    logSubsystemStartupWarning("optimizer", error);
  }
}

async function startProcessKnowledgeSubsystem() {
  markStartupPhaseStarting("process_knowledge", {
    details: {
      listener: "starting",
      enrichmentWorker: "starting",
    },
  });

  try {
    startProcessKnowledgeListener({ logger: console });
    updateStartupPhase("process_knowledge", {
      details: {
        listener: "ready",
      },
    });
    startProcessKnowledgeEnrichmentWorker({ logger: console });
    markStartupPhaseReady("process_knowledge", {
      details: {
        listener: "ready",
        enrichmentWorker: "ready",
      },
    });
  } catch (error) {
    markStartupPhaseError("process_knowledge", error, {
      details: {
        listener: "error",
        enrichmentWorker: "error",
      },
    });
    logSubsystemStartupWarning("process knowledge", error);
  }
}

async function startSpecialistSubsystem() {
  markStartupPhaseStarting("specialist", {
    detail: "reindexing",
  });
  try {
    await getSpecialistOrchestrator().reindex();
    markStartupPhaseReady("specialist", {
      detail: "ready",
    });
  } catch (error) {
    markStartupPhaseError("specialist", error, {
      detail: "reindex_failed",
    });
    logSubsystemStartupWarning("specialist reindex", error);
  }
}

function startBackgroundSubsystems() {
  if (backgroundStartupPromise) return backgroundStartupPromise;
  startupState.backgroundBootStartedAt = new Date().toISOString();
  backgroundStartupPromise = Promise.allSettled([
    startOptimizerSubsystem(),
    startProcessKnowledgeSubsystem(),
    startSpecialistSubsystem(),
  ]).finally(() => {
    startupState.backgroundBootCompletedAt = new Date().toISOString();
  });
  return backgroundStartupPromise;
}

/**
 * Retry a single failed background subsystem.
 * Returns the updated phase state.
 */
async function retrySubsystem(name) {
  const phase = startupState.phases[name];
  if (!phase) return { ok: false, error: `Unknown subsystem: ${name}` };
  if (phase.status === "ready") return { ok: true, status: "already_ready" };
  const retryCount = (phase.retryCount || 0) + 1;
  updateStartupPhase(name, { retryCount });
  try {
    if (name === "optimizer") await startOptimizerSubsystem();
    else if (name === "process_knowledge") await startProcessKnowledgeSubsystem();
    else if (name === "specialist") await startSpecialistSubsystem();
    else return { ok: false, error: `No retry handler for: ${name}` };
    return { ok: true, status: startupState.phases[name]?.status, retryCount };
  } catch (error) {
    return { ok: false, error: String(error?.message || error), retryCount };
  }
}

function writeJson(res, statusCode, payload) {
  if (res.writableEnded || res.destroyed) {
    return false;
  }
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...CORS_HEADERS,
  });
  res.end(JSON.stringify(payload));
  return true;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (!chunks.length) return {};

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function getLimit(searchParams, fallback = 24) {
  const parsed = Number(searchParams.get("limit"));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getDeveloperLogSource(searchParams, fallback = "all") {
  const value = String(searchParams.get("source") || fallback).trim().toLowerCase();
  return ["all", "audit", "chat", "workspace", "activity"].includes(value) ? value : fallback;
}

function getBooleanParam(searchParams, key, fallback = false) {
  const value = searchParams.get(key);
  if (value == null) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function toIsoString(value) {
  if (!value) return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return new Date(numeric).toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseLogLevelFromText(input) {
  const text = String(input || "").toLowerCase();
  if (text.includes("failed") || text.includes("error") || text.includes("critical")) return "error";
  if (text.includes("violation") || text.includes("warning") || text.includes("blocked") || text.includes("declined")) return "warning";
  if (text.includes("success") || text.includes("active") || text.includes("running") || text.includes("ok")) return "info";
  return "debug";
}

function makeLogEntry(source, entry) {
  return {
    id: entry.id,
    source,
    ts: entry.ts || null,
    level: entry.level || "debug",
    message: entry.message || "",
    detail: entry.detail || null,
    raw: entry.raw ?? null,
  };
}

function readLastJsonLines(filePath, limit) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-limit)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return { ts: null, message: line };
        }
      });
  } catch {
    return [];
  }
}

function getLatestLogFile(dirPath, filePattern) {
  try {
    if (!fs.existsSync(dirPath)) return null;
    const names = fs.readdirSync(dirPath).filter((name) => filePattern.test(name)).sort();
    if (!names.length) return null;
    return path.join(dirPath, names[names.length - 1]);
  } catch {
    return null;
  }
}

function createBrainPipelineResponse(query, profileName = null) {
  const intent = parseBrainIntent(query, { profileName });
  const decomposed = decomposeBrainIntent(intent, { profileName });
  const workflow = planBrainWorkflow(decomposed);
  const toolSelections = selectBrainTools(workflow.steps.flatMap((step) => step.tasks || []), { dryRun: true });
  const compiled = compileBrainActions(workflow, { dryRun: true });
  const modules = getAllModules();
  const telemetry = getOptimizerStatus();
  const hotspots = detectHotspots(telemetry, modules).hotspots;
  const health = explainOptimizerHealth(telemetry, hotspots, []);
  const response = {
    query,
    intent,
    tasks: decomposed.tasks,
    workflow,
    toolSelections,
    compiled,
    hotspots,
    health,
  };
  const validation = validateBrainResponse({
    output: response,
    criteria: {
      schema: { required: ["query", "intent", "tasks", "workflow", "toolSelections", "compiled", "hotspots", "health"] },
      format: "json",
      assertions: [
        (value) => Array.isArray(value?.workflow?.steps),
        (value) => typeof value?.intent?.confidence === "number",
      ],
    },
  });

  return { ...response, validation };
}

function collectDeveloperLogs({ source = "all", limit = 80 }) {
  const conversationSnapshot = getConversationSnapshot();
  const taskPayload = getAiTaskManagerPayload();
  const auditEvents = getRecentAuditEvents(limit).map((event, index) =>
    makeLogEntry("audit", {
      id: `audit-${index}-${event.tick || index}`,
      ts: event.ts || null,
      level: parseLogLevelFromText(event.result || event.type || event.reason),
      message: [event.action || event.type || "audit", event.moduleDisplayName || event.moduleId || ""].filter(Boolean).join(" | "),
      detail: event.reason || null,
      raw: event,
    })
  );

  const latestChatLog = getLatestLogFile(path.join(RUNTIME_LOGS_ROOT, "chat-turns"), /\.jsonl$/i);
  const chatEntries = readLastJsonLines(latestChatLog, limit).map((entry, index) =>
    makeLogEntry("chat", {
      id: `chat-${index}`,
      ts: entry.ts || null,
      level: entry.error ? "error" : entry.localLlm ? "info" : "debug",
      message: entry.userMessage ? `prompt: ${String(entry.userMessage).slice(0, 120)}` : "chat turn",
      detail: entry.error || entry.draftSource || null,
      raw: entry,
    })
  );

  const workspaceEntries = Array.isArray(conversationSnapshot.workspace?.idleTrainingTerminalLines)
    ? conversationSnapshot.workspace.idleTrainingTerminalLines.map((line, index) =>
        makeLogEntry("workspace", {
          id: `workspace-${index}`,
          ts: conversationSnapshot.publishedAt || null,
          level: parseLogLevelFromText(line),
          message: line,
          detail: conversationSnapshot.workspace?.selectedCrawlerId || null,
          raw: { line },
        })
      )
    : [];

  const activityEntries = Array.isArray(taskPayload.recentActivity)
    ? taskPayload.recentActivity.map((entry, index) =>
        makeLogEntry("activity", {
          id: entry.id || `activity-${index}`,
          ts: entry.at || null,
          level: parseLogLevelFromText(entry.status || entry.title),
          message: entry.title || "activity",
          detail: entry.detail || null,
          raw: entry,
        })
      )
    : [];

  return [...auditEvents, ...chatEntries, ...workspaceEntries, ...activityEntries]
    .filter((entry) => source === "all" || entry.source === source)
    .sort((left, right) => {
      const leftTs = left.ts ? new Date(left.ts).getTime() : 0;
      const rightTs = right.ts ? new Date(right.ts).getTime() : 0;
      return rightTs - leftTs;
    })
    .slice(0, limit);
}

function buildDeveloperSnapshot({ verbose = false } = {}) {
  const taskPayload = getAiTaskManagerPayload();
  const runtimePayload = getAiRuntimeSidebarModel();
  const optimizer = getOptimizerStatus();
  const modules = getAllModules();
  const recommendations = getRecommendations();
  const approvals = getPendingApprovals();
  const auditEvents = getRecentAuditEvents(48);
  const conversation = getConversationSnapshot();
  const developerSettings = readDeveloperModeSettings();
  const localLlm = getLocalLlmConfig();
  const specialist = getSpecialistOrchestrator().getDiagnostics();
  const hotspots = detectHotspots(optimizer, modules).hotspots;
  const health = explainOptimizerHealth(optimizer, hotspots, []);
  const warnings = auditEvents.filter((entry) => parseLogLevelFromText(entry.result || entry.type || entry.reason) === "warning").length;
  const errors = auditEvents.filter((entry) => parseLogLevelFromText(entry.result || entry.type || entry.reason) === "error").length;

  const snapshot = {
    capturedAt: new Date().toISOString(),
    summary: taskPayload.summary,
    provider: taskPayload.provider,
    optimizer,
    runtime: {
      pressure: runtimePayload.pressure,
      residency: runtimePayload.residency,
      telemetryLine: runtimePayload.telemetryLine,
      rows: runtimePayload.rows.slice(0, 14),
      recentActivity: Array.isArray(runtimePayload.recentActivity) ? runtimePayload.recentActivity.slice(0, 12) : [],
    },
    brainToolkit: taskPayload.meta?.brainToolkit || null,
    health,
    hotspots,
    recommendations: recommendations.slice(0, 10),
    approvals: approvals.slice(0, 10),
    auditSummary: getAuditSummary(),
    policyDiagnostics: getPolicyDiagnostics(auditEvents),
    conversation,
    localLlm: localLlm
      ? {
          configured: true,
          baseUrl: localLlm.baseUrl,
          model: localLlm.model,
          mode: localLlm.mode,
          timeoutMs: localLlm.timeoutMs,
        }
      : {
          configured: false,
          baseUrl: null,
          model: null,
          mode: null,
          timeoutMs: null,
        },
    counts: {
      modulesTotal: modules.length,
      modulesActive: modules.filter((module) => String(module.state || "").toLowerCase().includes("active")).length,
      modulesFailed: modules.filter((module) => String(module.state || "").toLowerCase().includes("fail")).length,
      protectedModules: modules.filter((module) => module.neverAutoTouch || String(module.protectionLevel || "").toLowerCase() === "critical").length,
      warnings,
      errors,
      recommendations: recommendations.length,
      approvals: approvals.length,
      activeCrawlers: Array.isArray(optimizer.crawlers) ? optimizer.crawlers.filter((crawler) => crawler.active).length : 0,
      totalCrawlers: Array.isArray(optimizer.crawlers) ? optimizer.crawlers.length : 0,
      conversationThreads: Array.isArray(conversation.threads) ? conversation.threads.length : 0,
      workspaceMessages: Array.isArray(conversation.workspace?.chatMessages) ? conversation.workspace.chatMessages.length : 0,
    },
    modules: modules.slice(0, 24),
    developerSettings,
    implementationSignals: {
      intent: taskPayload.meta?.brainToolkit?.intent || null,
      taskCount: taskPayload.meta?.brainToolkit?.taskCount || 0,
      stepCount: taskPayload.meta?.brainToolkit?.stepCount || 0,
      actionCount: taskPayload.meta?.brainToolkit?.actionCount || 0,
      telemetryCapturedAt: optimizer.capturedAt || taskPayload.capturedAt,
      lastActivity: Array.isArray(taskPayload.recentActivity) ? taskPayload.recentActivity[0] || null : null,
    },
    specialist,
  };

  if (verbose) {
    snapshot.payloads = {
      taskManager: taskPayload,
      runtimeManager: runtimePayload,
    };
  }

  return snapshot;
}

async function handleOptimizerRoute(req, res, pathname, searchParams) {
  if (req.method === "GET" && pathname === "/api/optimizer/status") {
    writeJson(res, 200, getOptimizerStatus());
    return true;
  }

  if (req.method === "GET" && pathname === "/api/optimizer/recommendations") {
    writeJson(res, 200, { recommendations: getRecommendations() });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/optimizer/pending-approvals") {
    const optimizerApprovals = getPendingApprovals();
    const governedApprovals = getPendingGovernedApprovals();
    writeJson(res, 200, { approvals: [...optimizerApprovals, ...governedApprovals] });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/optimizer/registry") {
    writeJson(res, 200, { modules: getAllModules() });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/optimizer/audit") {
    writeJson(res, 200, { events: getRecentAuditEvents(getLimit(searchParams)) });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/optimizer/policies") {
    writeJson(res, 200, getPolicyDiagnostics(getRecentAuditEvents(getLimit(searchParams))));
    return true;
  }

  if (req.method === "POST" && pathname === "/api/optimizer/os-snapshot") {
    const body = await readJsonBody(req);
    acceptOsSnapshot(body);
    writeJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/optimizer/recommendation/accept") {
    const body = await readJsonBody(req);
    if (body?.id != null) await acceptRecommendation(body.id);
    writeJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/optimizer/recommendation/ignore") {
    const body = await readJsonBody(req);
    if (body?.id != null) ignoreRecommendation(body.id);
    writeJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/optimizer/recommendation/snooze") {
    const body = await readJsonBody(req);
    if (body?.id != null) snoozeRecommendation(body.id, Number(body?.durationMs) || 60 * 60 * 1000);
    writeJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/optimizer/approve") {
    const body = await readJsonBody(req);
    if (body?.id != null) {
      const approvalId = String(body.id);
      if (approvalId.startsWith("gov-")) {
        approveGovernedApproval(approvalId);
      } else {
        await approvePendingAction(body.id);
      }
    }
    writeJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/optimizer/decline") {
    const body = await readJsonBody(req);
    if (body?.id != null) {
      const approvalId = String(body.id);
      if (approvalId.startsWith("gov-")) {
        declineGovernedApproval(approvalId);
      } else {
        declinePendingAction(body.id);
      }
    }
    writeJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/optimizer/kill-switch") {
    const body = await readJsonBody(req);
    setKillSwitch(body?.active === true);
    writeJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/optimizer/performance-mode") {
    const body = await readJsonBody(req);
    setPerformanceMode(String(body?.mode || "balanced"));
    writeJson(res, 200, { ok: true });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/optimizer/module-policy") {
    const body = await readJsonBody(req);
    if (body?.moduleId) setModulePolicy(body.moduleId, body);
    writeJson(res, 200, { ok: true });
    return true;
  }

  return false;
}

async function handleBrainToolkitRoute(req, res, pathname) {
  if (req.method !== "POST" || pathname !== "/api/brain/pipeline") {
    return false;
  }

  const body = await readJsonBody(req);
  const query = String(body?.query || "").trim();
  const profileName = typeof body?.profileName === "string" ? body.profileName : null;
  writeJson(res, 200, createBrainPipelineResponse(query, profileName));
  return true;
}

async function handleDeveloperModeRoute(req, res, pathname, searchParams) {
  const specialist = getSpecialistOrchestrator();

  if (req.method === "GET" && pathname === "/api/developer-mode/specialist/status") {
    writeJson(res, 200, specialist.getDiagnostics());
    return true;
  }

  if (req.method === "POST" && pathname === "/api/developer-mode/specialist/query") {
    const body = await readJsonBody(req);
    const request = String(body?.request || "").trim();
    if (!request) {
      writeJson(res, 400, { error: "request is required." });
      return true;
    }
    const executionPolicy =
      typeof body?.executionPolicy === "string" && body.executionPolicy.trim()
        ? body.executionPolicy.trim()
        : specialist.getDiagnostics().executionPolicy || EXECUTION_POLICIES.ASK_FIRST;
    const result = await specialist.run({ request, executionPolicy });
    writeJson(res, 200, {
      ok: true,
      capturedAt: new Date().toISOString(),
      result,
      specialist: specialist.getDiagnostics(),
    });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/developer-mode/snapshot") {
    writeJson(res, 200, buildDeveloperSnapshot({ verbose: getBooleanParam(searchParams, "verbose", false) }));
    return true;
  }

  if (req.method === "GET" && pathname === "/api/developer-mode/logs") {
    writeJson(res, 200, {
      entries: collectDeveloperLogs({
        source: getDeveloperLogSource(searchParams),
        limit: Math.min(getLimit(searchParams, 80), 200),
      }),
    });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/developer-mode/flags") {
    writeJson(res, 200, readDeveloperModeSettings());
    return true;
  }

  if (req.method === "POST" && pathname === "/api/developer-mode/flags") {
    const body = await readJsonBody(req);
    writeJson(res, 200, updateDeveloperModeSettings(body?.patch && typeof body.patch === "object" ? body.patch : body));
    return true;
  }

  if (req.method === "POST" && pathname === "/api/developer-mode/actions") {
    const body = await readJsonBody(req);
    const action = String(body?.action || "").trim();

    if (action === "refresh-snapshot") {
      writeJson(res, 200, { ok: true, action, snapshot: buildDeveloperSnapshot({ verbose: body?.verbose === true }) });
      return true;
    }

    if (action === "run-pipeline") {
      const query = String(body?.query || "what's using the most CPU?").trim();
      writeJson(res, 200, { ok: true, action, result: createBrainPipelineResponse(query, body?.profileName || null) });
      return true;
    }

    if (action === "summarize-health") {
      const optimizer = getOptimizerStatus();
      const modules = getAllModules();
      const hotspots = detectHotspots(optimizer, modules).hotspots;
      writeJson(res, 200, {
        ok: true,
        action,
        result: {
          capturedAt: new Date().toISOString(),
          hotspots,
          health: explainOptimizerHealth(optimizer, hotspots, []),
        },
      });
      return true;
    }

    if (action === "set-kill-switch") {
      setKillSwitch(body?.active === true);
      writeJson(res, 200, { ok: true, action, optimizer: getOptimizerStatus() });
      return true;
    }

    if (action === "set-performance-mode") {
      setPerformanceMode(String(body?.mode || "balanced"));
      writeJson(res, 200, { ok: true, action, optimizer: getOptimizerStatus() });
      return true;
    }

    if (action === "set-module-policy") {
      if (!body?.moduleId) {
        writeJson(res, 400, { error: "moduleId is required." });
        return true;
      }
      setModulePolicy(body.moduleId, body);
      writeJson(res, 200, { ok: true, action, modules: getAllModules() });
      return true;
    }

    if (action === "clear-conversation-snapshot") {
      writeJson(res, 200, {
        ok: true,
        action,
        result: clearConversationSnapshot(),
        snapshot: buildDeveloperSnapshot({ verbose: body?.verbose === true }),
      });
      return true;
    }

    if (action === "specialist-reindex") {
      const result = await specialist.reindex();
      writeJson(res, 200, {
        ok: true,
        action,
        result,
        specialist: specialist.getDiagnostics(),
      });
      return true;
    }

    if (action === "specialist-warm-models") {
      const result = await specialist.warmModels();
      writeJson(res, 200, {
        ok: true,
        action,
        result,
        specialist: specialist.getDiagnostics(),
      });
      return true;
    }

    if (action === "specialist-set-policy") {
      const policy = specialist.setExecutionPolicy(String(body?.policy || EXECUTION_POLICIES.ASK_FIRST));
      writeJson(res, 200, {
        ok: true,
        action,
        result: { policy },
        specialist: specialist.getDiagnostics(),
      });
      return true;
    }

    if (action === "specialist-query") {
      const request = String(body?.request || "").trim();
      if (!request) {
        writeJson(res, 400, { error: "request is required." });
        return true;
      }
      const result = await specialist.run({ request, executionPolicy: body?.executionPolicy });
      writeJson(res, 200, {
        ok: true,
        action,
        result,
        specialist: specialist.getDiagnostics(),
      });
      return true;
    }

    if (action === "retry-subsystem") {
      const subsystem = String(body?.subsystem || "").trim();
      if (!subsystem) {
        writeJson(res, 400, { error: "subsystem name is required (optimizer, process_knowledge, specialist)." });
        return true;
      }
      const result = await retrySubsystem(subsystem);
      writeJson(res, 200, {
        ok: true,
        action,
        result,
        phases: startupState.phases,
      });
      return true;
    }

    writeJson(res, 400, { error: `Unsupported developer action: ${action || "unknown"}` });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/developer-mode/chat") {
    const body = await readJsonBody(req);
    const settings = readDeveloperModeSettings();
    const message = String(body?.message || "").trim();
    if (!message) {
      writeJson(res, 400, { error: "message is required." });
      return true;
    }

    const response = await buildChatReply(
      message,
      typeof body?.profileName === "string" && body.profileName.trim() ? body.profileName.trim() : settings.chat.profileName,
      {
        sessionId: typeof body?.sessionId === "string" ? body.sessionId : undefined,
        localLlm: typeof body?.localLlm === "boolean" ? body.localLlm : settings.chat.localLlm,
        internet: typeof body?.internet === "boolean" ? body.internet : settings.chat.internet,
        fullBrainContext: true,
        attachments: Array.isArray(body?.attachments)
          ? body.attachments
              .map((entry) => ({
                name: String(entry?.name || "attachment").slice(0, 160),
                text: String(entry?.text || "").slice(0, 12_000),
              }))
              .filter((entry) => entry.text.trim())
          : [],
      }
    );

    writeJson(res, 200, {
      ok: true,
      capturedAt: new Date().toISOString(),
      response,
      localLlmConfigured: Boolean(getLocalLlmConfig()),
    });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/developer-mode/chat/stream") {
    const body = await readJsonBody(req);
    const settings = readDeveloperModeSettings();
    const message = String(body?.message || "").trim();
    if (!message) {
      writeJson(res, 400, { error: "message is required." });
      return true;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      ...CORS_HEADERS,
    });

    const writeEvent = (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      for await (const event of streamBuildChatReply(
        message,
        typeof body?.profileName === "string" && body.profileName.trim() ? body.profileName.trim() : settings.chat.profileName,
        {
          sessionId: typeof body?.sessionId === "string" ? body.sessionId : undefined,
          localLlm: typeof body?.localLlm === "boolean" ? body.localLlm : settings.chat.localLlm,
          internet: typeof body?.internet === "boolean" ? body.internet : settings.chat.internet,
          fullBrainContext: true,
        }
      )) {
        writeEvent(event);
      }
      writeEvent({ type: "complete" });
      res.end();
    } catch (error) {
      writeEvent({ type: "error", message: String(error?.message || error) });
      res.end();
    }
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || `${host}:${port}`}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        ...CORS_HEADERS,
        "Cache-Control": "no-store",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/health") {
      writeJson(res, 200, buildHealthPayload());
      return;
    }

    if (await handleOptimizerRoute(req, res, requestUrl.pathname, requestUrl.searchParams)) {
      return;
    }

    if (await handleBrainToolkitRoute(req, res, requestUrl.pathname)) {
      return;
    }

    if (await handleDeveloperModeRoute(req, res, requestUrl.pathname, requestUrl.searchParams)) {
      return;
    }

    if (await handleTaskManagerHttpRoute({ req, res, headers: { "Content-Type": "application/json; charset=utf-8" }, pathname: requestUrl.pathname })) {
      return;
    }

    writeJson(res, 404, { error: "Not found" });
  } catch (error) {
    const requestLabel = `${req.method || "GET"} ${req.url || "/"}`;
    const message = String(error?.message || error || "Unknown server error.");
    console.error(`[taskmanager-api] request failed for ${requestLabel}: ${message}`);
    if (!res.headersSent && !res.writableEnded && !res.destroyed) {
      writeJson(res, 500, { error: message });
      return;
    }
    if (!res.writableEnded && !res.destroyed) {
      res.end();
    }
  }
});

server.listen(port, host, () => {
  markStartupPhaseReady("core", {
    detail: `listening on http://${host}:${port}`,
  });
  console.log(`[taskmanager-api] listening on http://${host}:${port}`);
  void startBackgroundSubsystems();
});

function shutdown(signal) {
  stopProcessKnowledgeListener();
  stopProcessKnowledgeEnrichmentWorker();
  stopOptimizerControlLoop();
  server.close(() => {
    process.exit(0);
  });
  process.exitCode = 0;
  if (signal) {
    console.log(`[taskmanager-api] received ${signal}, shutting down.`);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
