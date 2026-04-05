import process from "node:process";
import { getAiTaskManagerPayload } from "./task-manager-ai.mjs";
import { getAiRuntimeSidebarModel } from "./runtime-manager/ai-runtime-service.mjs";
import {
  createAiTask,
  deleteAiTask,
  ensureAiTaskSchedulerStarted,
  getAiTaskPayload,
  runAiTaskNow,
  updateAiTask,
} from "./runtime-manager/ai-task-scheduler.mjs";
import { loadWindowsServices } from "./runtime-manager/windows-services-service.mjs";
import { buildChatReply } from "../portable_lib/brain-chat-reply.mjs";
import { getLocalLlmConfig } from "../portable_lib/brain-local-llm.mjs";
import {
  recordUserTurn,
  recordAssistantTurn,
  updateSessionHints,
} from "../portable_lib/brain-session-store.mjs";
import { getLatestOsSnapshot } from "../portable_lib/optimizer-telemetry.mjs";
import { loadProcessKnowledgeState } from "../portable_lib/process-knowledge-registry.mjs";
import {
  approveGovernedApproval,
  declineGovernedApproval,
  executeGovernedPlanDirect,
  getGovernedActionContracts,
  getPendingGovernedApprovals,
  rollbackGovernedRun,
} from "../portable_lib/governed-actions.mjs";
import {
  finalizeApprovedWorkflowExecution,
  maybeHandleWorkflowChatRequest,
} from "../portable_lib/workflow-execution-service.mjs";
import {
  getProcessKnowledgeEnrichmentSnapshot,
  runProcessKnowledgeEnrichmentOnce,
} from "../portable_lib/process-knowledge-enricher.mjs";
import { getProcessKnowledgeListenerSnapshot } from "../portable_lib/process-knowledge-listener.mjs";
import { buildProcessMonitorOverview } from "./runtime-manager/process-monitor-service.mjs";
import { compactText, formatBytes, formatPercent } from "../shared/utils.mjs";

ensureAiTaskSchedulerStarted();

async function loadConversationSnapshotStore() {
  return import("./conversation-snapshot-store.mjs");
}

const TOP_QUERY_RE = /\b(top|highest|biggest|heaviest|most|using the most)\b/i;
const RAM_QUERY_RE = /\b(ram|memory)\b/i;
const CPU_QUERY_RE = /\bcpu\b/i;
const GPU_QUERY_RE = /\bgpu\b/i;
const VRAM_QUERY_RE = /\b(vram|gpu memory)\b/i;
const PROCESS_COUNT_QUERY_RE = /\b(how many|count)\b.*\b(process|app|task)s?\b|\b(process|app|task)\s+count\b/i;
const RECOMMENDATION_QUERY_RE = /\b(recommend|recommendation|cleanup|close|suspend|stop|background task)\b/i;
const LOCAL_AI_QUERY_RE =
  /\b(local ai|local llm|local model|ollama|ai provider|llm provider)\b|(\bmodel\b.*\b(ai|llm|ollama|local)\b)|(\b(ai|llm|ollama|local)\b.*\bmodel\b)/i;
const LOCAL_AI_STATUS_HINT_RE =
  /\b(status|configured|configuration|running|offline|online|enabled|disabled|using|provider|which|what model|model am i using|base url|ready)\b/i;
const COMPLEX_GOAL_RE =
  /\b(workflow|schedule|scheduled|recurring|every weekday|every day|daily|weekly|monthly|briefing|brief|news|compare|scan|create|build|run)\b/i;
const RAM_USAGE_QUERY_RE = /\b(how much|used|usage|pressure|free|available)\b.*\b(ram|memory)\b|\b(ram|memory).*\b(used|usage|pressure|free|available)\b/i;

export function isDirectLocalAiStatusQuery(message = "") {
  const text = String(message || "").trim().toLowerCase();
  if (!LOCAL_AI_QUERY_RE.test(text)) return false;
  if (LOCAL_AI_STATUS_HINT_RE.test(text)) return true;
  return !COMPLEX_GOAL_RE.test(text);
}

function formatGroupLabel(group) {
  const name = compactText(group?.displayName || group?.name || "Unknown task", 72);
  const windowTitle = compactText(group?.mainWindowTitle || "", 72);
  if (windowTitle && !name.toLowerCase().includes(windowTitle.toLowerCase())) {
    return `${name} (${windowTitle})`;
  }
  return name;
}

async function readJsonBody(req) {
  const raw = await readBody(req);
  return raw ? JSON.parse(raw) : {};
}

function getTaskManagerChatContext() {
  const payload = getAiTaskManagerPayload();
  const snapshot = getLatestOsSnapshot();
  const overview = snapshot ? buildProcessMonitorOverview(snapshot, null, {}, {}) : null;
  return {
    payload,
    overview,
    localLlmConfig: getLocalLlmConfig(),
  };
}

function getVisibleProcessRows(overview) {
  return Array.isArray(overview?.rows) ? overview.rows.filter((row) => !row.protected) : [];
}

function rankRows(rows, selector) {
  return [...rows].sort(
    (left, right) =>
      selector(right) - selector(left) ||
      Number(right?.cpuPercent || 0) - Number(left?.cpuPercent || 0) ||
      Number(right?.ramBytes || 0) - Number(left?.ramBytes || 0) ||
      String(left?.name || "").localeCompare(String(right?.name || ""))
  );
}

function formatRunnerUpRows(rows, formatter, limit = 2) {
  return rows
    .slice(0, limit)
    .map((row) => `${formatGroupLabel(row)} ${formatter(row)}`)
    .join(" | ");
}

function createTopProcessReply({
  capturedAtLabel,
  hiddenProtectedCount,
  rows,
  metricText,
  valueFormatter,
  leaderDetailFormatter,
}) {
  const ranked = Array.isArray(rows) ? rows : [];
  if (!ranked.length) {
    return {
      reply: `I don't have any visible process groups with measurable ${metricText} right now. Snapshot ${capturedAtLabel}.`,
      source: "task-manager-runtime",
    };
  }

  const leader = ranked[0];
  const nextLabel = formatRunnerUpRows(ranked.slice(1), valueFormatter);
  const hiddenNote = hiddenProtectedCount > 0 ? ` ${hiddenProtectedCount} protected group(s) are hidden from this answer.` : "";

  return {
    reply: `${formatGroupLabel(leader)} is using the most ${metricText} right now at ${leaderDetailFormatter(
      leader
    )}.${nextLabel ? ` Next: ${nextLabel}.` : ""} Snapshot ${capturedAtLabel}.${hiddenNote}`,
    source: "task-manager-runtime",
  };
}

function tryBuildRuntimeReply(message, context) {
  const text = String(message || "").trim().toLowerCase();
  const capturedAt = context.overview?.snapshot?.capturedAt || context.payload?.capturedAt || new Date().toISOString();
  const capturedAtLabel = new Date(capturedAt).toLocaleTimeString();
  const providerRow = Array.isArray(context.payload?.rows)
    ? context.payload.rows.find((row) => row?.id === "provider-model")
    : null;

  if (isDirectLocalAiStatusQuery(text)) {
    if (!context.localLlmConfig) {
      return {
        reply: `${providerRow?.detail || "Local AI is not configured in the Task Manager server right now."} Status: ${providerRow?.status || "Offline"}.`,
        source: "task-manager-provider",
      };
    }

    return {
      reply: `Local AI is configured for ${context.localLlmConfig.model} at ${context.localLlmConfig.baseUrl}. Status: ${providerRow?.status || "Ready"}. ${providerRow?.detail || ""}`.trim(),
      source: "task-manager-provider",
    };
  }

  if (!context.overview) {
    if (
      PROCESS_COUNT_QUERY_RE.test(text) ||
      RECOMMENDATION_QUERY_RE.test(text) ||
      RAM_USAGE_QUERY_RE.test(text) ||
      (TOP_QUERY_RE.test(text) && (RAM_QUERY_RE.test(text) || CPU_QUERY_RE.test(text) || GPU_QUERY_RE.test(text) || VRAM_QUERY_RE.test(text)))
    ) {
      return {
        reply: `I don't have a live process snapshot yet, so I can't answer that from current system state. Wait for Task Manager to refresh and try again.`,
        source: "task-manager-runtime",
      };
    }
    return null;
  }

  const overview = context.overview;
  const visibleRows = getVisibleProcessRows(overview);
  const hiddenProtectedCount = Math.max(0, Number(overview.hiddenProtectedCount || 0));

  if (PROCESS_COUNT_QUERY_RE.test(text)) {
    return {
      reply: `I can currently see ${visibleRows.length} visible process group(s) across ${overview.snapshot.processes.length} live process row(s). Snapshot ${capturedAtLabel}.${
        hiddenProtectedCount > 0 ? ` ${hiddenProtectedCount} protected group(s) are hidden.` : ""
      }`,
      source: "task-manager-runtime",
    };
  }

  if (RECOMMENDATION_QUERY_RE.test(text)) {
    const recommendations = Array.isArray(overview.view?.recommendations) ? overview.view.recommendations : [];
    if (!recommendations.length) {
      return {
        reply: `I don't have any cleanup recommendations right now. CPU pressure is ${overview.view.cpuPressure}, RAM pressure is ${overview.view.memoryPressure}, and GPU pressure is ${overview.view.gpuPressure}. Snapshot ${capturedAtLabel}.`,
        source: "task-manager-runtime",
      };
    }

    const leader = recommendations[0];
    const nextLabel = recommendations
      .slice(1, 3)
      .map((entry) => `${formatGroupLabel(entry.group)} ${entry.actionLabel.toLowerCase()}`)
      .join(" | ");
    return {
      reply: `Top cleanup recommendation: ${formatGroupLabel(leader.group)}. ${compactText(
        leader.reason,
        180
      )}. Suggested action: ${leader.actionLabel}. Estimated relief: ${formatPercent(leader.estimatedReliefCpuPercent)} CPU and ${formatBytes(
        leader.estimatedReliefBytes
      )} private memory.${nextLabel ? ` Next: ${nextLabel}.` : ""} Snapshot ${capturedAtLabel}.`,
      source: "task-manager-recommendation",
    };
  }

  if (RAM_USAGE_QUERY_RE.test(text)) {
    const totalMemoryBytes = Math.max(0, Number(overview.snapshot.totalMemoryBytes) || 0);
    const usedMemoryBytes = Math.max(0, Number(overview.view.usedMemoryBytes) || 0);
    const freeMemoryBytes = Math.max(0, totalMemoryBytes - usedMemoryBytes);
    return {
      reply: `System RAM usage is ${formatBytes(usedMemoryBytes)} of ${formatBytes(totalMemoryBytes)} (${formatPercent(
        totalMemoryBytes > 0 ? (usedMemoryBytes / totalMemoryBytes) * 100 : 0
      )} used, ${formatBytes(freeMemoryBytes)} free). Memory pressure is ${overview.view.memoryPressure}. Snapshot ${capturedAtLabel}.`,
      source: "task-manager-runtime",
    };
  }

  if (TOP_QUERY_RE.test(text) && RAM_QUERY_RE.test(text)) {
    return createTopProcessReply({
      capturedAtLabel,
      hiddenProtectedCount,
      rows: rankRows(visibleRows, (row) => Number(row?.ramBytes || 0)).filter((row) => Number(row?.ramBytes || 0) > 0),
      metricText: "RAM",
      valueFormatter: (row) => `${formatBytes(row.ramBytes)}`,
      leaderDetailFormatter: (row) => `${formatBytes(row.ramBytes)} (${formatPercent(row.ramPercent)} of system RAM)`,
    });
  }

  if (TOP_QUERY_RE.test(text) && CPU_QUERY_RE.test(text)) {
    return createTopProcessReply({
      capturedAtLabel,
      hiddenProtectedCount,
      rows: rankRows(visibleRows, (row) => Number(row?.cpuPercent || 0)).filter((row) => Number(row?.cpuPercent || 0) > 0),
      metricText: "CPU",
      valueFormatter: (row) => `${formatPercent(row.cpuPercent)}`,
      leaderDetailFormatter: (row) => formatPercent(row.cpuPercent),
    });
  }

  if (TOP_QUERY_RE.test(text) && (VRAM_QUERY_RE.test(text) || GPU_QUERY_RE.test(text))) {
    const useVram = VRAM_QUERY_RE.test(text);
    return createTopProcessReply({
      capturedAtLabel,
      hiddenProtectedCount,
      rows: rankRows(visibleRows, (row) => Number(useVram ? row?.gpuMemoryBytes : row?.gpuPercent) || 0).filter((row) =>
        Number(useVram ? row?.gpuMemoryBytes : row?.gpuPercent) > 0
      ),
      metricText: useVram ? "VRAM" : "GPU",
      valueFormatter: (row) => (useVram ? `${formatBytes(row.gpuMemoryBytes)}` : `${formatPercent(row.gpuPercent)}`),
      leaderDetailFormatter: (row) => (useVram ? formatBytes(row.gpuMemoryBytes) : formatPercent(row.gpuPercent)),
    });
  }

  return null;
}

function buildTaskManagerContextAttachment(context) {
  const lines = [];
  const providerRow = Array.isArray(context.payload?.rows)
    ? context.payload.rows.find((row) => row?.id === "provider-model")
    : null;

  if (context.overview) {
    const visibleRows = getVisibleProcessRows(context.overview);
    const topRam = rankRows(visibleRows, (row) => Number(row?.ramBytes || 0))
      .slice(0, 5)
      .map((row, index) => `${index + 1}. ${formatGroupLabel(row)} - ${formatBytes(row.ramBytes)} RAM, ${formatPercent(row.cpuPercent)} CPU`);
    const topCpu = rankRows(visibleRows, (row) => Number(row?.cpuPercent || 0))
      .slice(0, 5)
      .map((row, index) => `${index + 1}. ${formatGroupLabel(row)} - ${formatPercent(row.cpuPercent)} CPU, ${formatBytes(row.ramBytes)} RAM`);
    const topGpu = rankRows(visibleRows, (row) => Number(row?.gpuPercent || 0))
      .slice(0, 5)
      .map((row, index) => `${index + 1}. ${formatGroupLabel(row)} - ${formatPercent(row.gpuPercent)} GPU, ${formatBytes(row.gpuMemoryBytes)} VRAM`);
    const recommendations = Array.isArray(context.overview.view?.recommendations)
      ? context.overview.view.recommendations.slice(0, 3).map((entry, index) => `${index + 1}. ${formatGroupLabel(entry.group)} - ${compactText(entry.reason, 160)}`)
      : [];

    lines.push(`Live task-manager snapshot: ${context.overview.snapshot.capturedAt}`);
    lines.push(
      `System summary: CPU ${formatPercent(context.overview.view.totalCpuPercent)} | GPU ${formatPercent(
        context.overview.view.totalGpuPercent
      )} | RAM ${formatBytes(context.overview.view.usedMemoryBytes)} / ${formatBytes(
        context.overview.snapshot.totalMemoryBytes
      )} | pressure CPU ${context.overview.view.cpuPressure}, RAM ${context.overview.view.memoryPressure}, GPU ${context.overview.view.gpuPressure}`
    );
    lines.push(`Visible process groups: ${visibleRows.length}`);
    if (topRam.length) lines.push(`Top RAM groups:\n${topRam.join("\n")}`);
    if (topCpu.length) lines.push(`Top CPU groups:\n${topCpu.join("\n")}`);
    if (topGpu.length) lines.push(`Top GPU groups:\n${topGpu.join("\n")}`);
    if (recommendations.length) lines.push(`Cleanup recommendations:\n${recommendations.join("\n")}`);
  }

  if (providerRow) {
    lines.push(`AI provider status: ${providerRow.status} | ${providerRow.detail}`);
  }
  if (context.localLlmConfig) {
    lines.push(`Local AI config: ${context.localLlmConfig.model} @ ${context.localLlmConfig.baseUrl}`);
  }

  return {
    name: "task-manager-live-context.txt",
    text: lines.join("\n\n") || "No live task-manager context is available.",
  };
}

function normalizeRequestAttachments(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => ({
      name: String(entry?.name || "attachment").slice(0, 160),
      text: String(entry?.text || "").slice(0, 12_000),
    }))
    .filter((entry) => entry.text.trim());
}

function buildWorkflowRoutePayload(workflowResult, extras = {}) {
  return {
    ...extras,
    reply: workflowResult.reply,
    source: workflowResult.source,
    status: workflowResult.status,
    workflowId: workflowResult.workflowId || null,
    workflowStatus: workflowResult.workflowStatus || null,
    plan: workflowResult.plan || null,
    run: workflowResult.run || null,
    approval: workflowResult.approval || null,
    executed: workflowResult.executed === true,
    verified: workflowResult.verified === true,
    verificationStrength: workflowResult.verificationStrength || "none",
    doneScore: typeof workflowResult.doneScore === "number" ? workflowResult.doneScore : 0,
    verification: workflowResult.verification || null,
    task: workflowResult.task || null,
    capturedAt: workflowResult.capturedAt || new Date().toISOString(),
    capture: workflowResult.capture || null,
    episode: workflowResult.episode || null,
    reflection: workflowResult.reflection || null,
  };
}

export function getTaskManagerSummaryPayload() {
  const payload = getAiTaskManagerPayload();
  return {
    capturedAt: payload.capturedAt,
    processCount: Number(payload.summary?.processCount || 0),
    activeTaskCount: Number(payload.summary?.activeTaskCount || 0),
    pendingRecommendations: Number(payload.optimizer?.pendingRecommendations || 0),
    sessionMode: payload.optimizer?.sessionMode || "idle",
    cpuPercent: Number(payload.summary?.cpuPercent || 0),
    gpuPercent: Number(payload.summary?.gpuPercent || 0),
    memoryBytes: Number(payload.summary?.memoryBytes || 0),
    totalMemoryBytes: Number(payload.summary?.totalMemoryBytes || 0),
    providerLabel:
      payload.provider?.provider && payload.provider?.model
        ? `${payload.provider.provider} | ${payload.provider.model}`
        : payload.provider?.provider || payload.provider?.model || null,
    pressureLevel: payload.optimizer?.pressure?.overall || "unknown",
  };
}

const MAX_REQUEST_BODY_BYTES = 2 * 1024 * 1024; // 2 MB

async function readBody(req) {
  const chunks = [];
  let totalLength = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalLength += buf.length;
    if (totalLength > MAX_REQUEST_BODY_BYTES) {
      const err = new Error("Request body too large.");
      err.statusCode = 413;
      throw err;
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString("utf8");
}

// Restrict CORS to the local Vite UI origin only.
// Accepting "*" would allow any local webpage to call the task-manager API.
const ALLOWED_CORS_ORIGINS = new Set(
  (process.env.HORIZONS_EXTRA_CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .concat([
      "http://127.0.0.1:5180",
      "http://localhost:5180",
      "http://127.0.0.1:4180",
      "http://localhost:4180",
    ])
);

function resolveCorsOrigin(req) {
  const origin = req?.headers?.origin;
  if (origin && ALLOWED_CORS_ORIGINS.has(origin)) return origin;
  return null;
}

function buildCorsHeaders(req) {
  const origin = resolveCorsOrigin(req);
  return {
    "Access-Control-Allow-Origin": origin || "http://127.0.0.1:5180",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    ...(origin ? { "Vary": "Origin" } : {}),
  };
}

export async function handleTaskManagerHttpRoute({ req, res, headers, pathname }) {
  // Handle OPTIONS pre-flight before any other logic
  if (req.method === "OPTIONS") {
    res.writeHead(204, { ...buildCorsHeaders(req), ...(headers || {}) });
    res.end();
    return true;
  }

  const responseHeaders = {
    ...buildCorsHeaders(req),
    "Cache-Control": "no-store",
    ...(headers || {}),
  };

  try {
    if (req.method === "GET" && pathname === "/api/task-manager/actions/contracts") {
      res.writeHead(200, responseHeaders);
      res.end(JSON.stringify(getGovernedActionContracts()));
      return true;
    }

    if (req.method === "GET" && pathname === "/api/task-manager/actions/pending-approvals") {
      res.writeHead(200, responseHeaders);
      res.end(JSON.stringify({ approvals: getPendingGovernedApprovals() }));
      return true;
    }

    if (req.method === "POST" && pathname === "/api/task-manager/actions/execute") {
      const body = await readJsonBody(req);
      const result = executeGovernedPlanDirect(body?.plan || body, {
        autoApprove: body?.autoApprove === true,
      });
      res.writeHead(200, responseHeaders);
      res.end(JSON.stringify(result));
      return true;
    }

    if (req.method === "POST" && pathname === "/api/task-manager/actions/approve") {
      const body = await readJsonBody(req);
      const approvalId = String(body?.id || "").trim();
      if (!approvalId) {
        res.writeHead(400, responseHeaders);
        res.end(JSON.stringify({ error: "id is required." }));
        return true;
      }
      const result = approveGovernedApproval(approvalId);
      if (!result) {
        res.writeHead(404, responseHeaders);
        res.end(JSON.stringify({ error: `Approval not found: ${approvalId}` }));
        return true;
      }
      const workflowResult = finalizeApprovedWorkflowExecution(result) || null;
      res.writeHead(200, responseHeaders);
      res.end(
        JSON.stringify(
          workflowResult
            ? {
                ok: true,
                ...result,
                ...buildWorkflowRoutePayload(workflowResult),
                workflow: workflowResult,
              }
            : {
                ok: true,
                ...result,
              }
        )
      );
      return true;
    }

    if (req.method === "POST" && pathname === "/api/task-manager/actions/decline") {
      const body = await readJsonBody(req);
      const approvalId = String(body?.id || "").trim();
      if (!approvalId) {
        res.writeHead(400, responseHeaders);
        res.end(JSON.stringify({ error: "id is required." }));
        return true;
      }
      const result = declineGovernedApproval(approvalId);
      if (!result) {
        res.writeHead(404, responseHeaders);
        res.end(JSON.stringify({ error: `Approval not found: ${approvalId}` }));
        return true;
      }
      res.writeHead(200, responseHeaders);
      res.end(JSON.stringify({ ok: true, approval: result }));
      return true;
    }

    if (req.method === "POST" && pathname === "/api/task-manager/actions/rollback") {
      const body = await readJsonBody(req);
      const runId = String(body?.runId || "").trim();
      if (!runId) {
        res.writeHead(400, responseHeaders);
        res.end(JSON.stringify({ error: "runId is required." }));
        return true;
      }
      const result = rollbackGovernedRun(runId);
      res.writeHead(result.ok ? 200 : 400, responseHeaders);
      res.end(
        JSON.stringify({
          ...result,
          source: "governed-actions",
          status: result.ok ? "executed" : "failed",
        })
      );
      return true;
    }

    if (req.method === "POST" && (pathname === "/api/task-manager/chat" || pathname === "/api/chat")) {
      const body = await readJsonBody(req);
      const message = String(body?.message || "").trim();
      if (!message) {
        res.writeHead(400, responseHeaders);
        res.end(JSON.stringify({ error: "message is required." }));
        return true;
      }

      const chatSessionId = typeof body?.sessionId === "string" ? body.sessionId : undefined;
      const context = getTaskManagerChatContext();

      const runtimeReply = tryBuildRuntimeReply(message, context);
      if (runtimeReply) {
        recordUserTurn(chatSessionId, message);
        recordAssistantTurn(chatSessionId, runtimeReply.reply);
        res.writeHead(200, responseHeaders);
        res.end(
          JSON.stringify({
            reply: runtimeReply.reply,
            source: runtimeReply.source,
            capturedAt: context.overview?.snapshot?.capturedAt || context.payload?.capturedAt || new Date().toISOString(),
            localLlmConfigured: Boolean(context.localLlmConfig),
          })
        );
        return true;
      }

      const workflowResult = await maybeHandleWorkflowChatRequest(message, {
        dryRun: body?.dryRun === true || body?.dry_run === true,
        sessionId: chatSessionId,
      });
      if (workflowResult?.handled) {
        recordUserTurn(chatSessionId, message);
        recordAssistantTurn(chatSessionId, workflowResult.reply);
        if (workflowResult.run?.runId) {
          updateSessionHints(chatSessionId, {
            lastRunId: workflowResult.run.runId,
            lastActionResult: workflowResult.reply,
          });
        }
        res.writeHead(200, responseHeaders);
        res.end(
          JSON.stringify(
            buildWorkflowRoutePayload(workflowResult, {
              localLlmConfigured: Boolean(getLocalLlmConfig()),
            })
          )
        );
        return true;
      }

      const response = await buildChatReply(
        message,
        typeof body?.profileName === "string" && body.profileName.trim() ? body.profileName.trim() : "repo-knowledge-pack",
        {
          sessionId: typeof body?.sessionId === "string" ? body.sessionId : undefined,
          localLlm: typeof body?.localLlm === "boolean" ? body.localLlm : true,
          internet: typeof body?.internet === "boolean" ? body.internet : false,
          fullBrainContext: body?.fullBrainContext === true,
          attachments: [buildTaskManagerContextAttachment(context), ...normalizeRequestAttachments(body?.attachments)],
        }
      );

      res.writeHead(200, responseHeaders);
      res.end(
        JSON.stringify({
          reply: response.reply,
          source: response.source,
          sources: response.sources || [],
          capturedAt: context.overview?.snapshot?.capturedAt || context.payload?.capturedAt || new Date().toISOString(),
          localLlmConfigured: Boolean(context.localLlmConfig),
        })
      );
      return true;
    }

    if (req.method === "GET" && pathname === "/api/task-manager/summary") {
      res.writeHead(200, responseHeaders);
      res.end(JSON.stringify(getTaskManagerSummaryPayload()));
      return true;
    }

    if (req.method === "GET" && pathname === "/api/task-manager/ai") {
      res.writeHead(200, responseHeaders);
      res.end(JSON.stringify(getAiTaskManagerPayload()));
      return true;
    }

    if (req.method === "GET" && pathname === "/api/process-knowledge/status") {
      res.writeHead(200, responseHeaders);
      res.end(
        JSON.stringify({
          listener: getProcessKnowledgeListenerSnapshot(),
          enricher: getProcessKnowledgeEnrichmentSnapshot(),
          state: loadProcessKnowledgeState(),
        })
      );
      return true;
    }

    if (req.method === "POST" && pathname === "/api/process-knowledge/enrich/once") {
      const body = await readJsonBody(req);
      const result = await runProcessKnowledgeEnrichmentOnce({
        logger: body?.logger === false ? null : console,
      });
      res.writeHead(200, responseHeaders);
      res.end(JSON.stringify(result));
      return true;
    }

    if (req.method === "GET" && pathname === "/api/runtime-manager/ai") {
      res.writeHead(200, responseHeaders);
      res.end(JSON.stringify(getAiRuntimeSidebarModel()));
      return true;
    }

    if (req.method === "GET" && pathname === "/api/runtime-manager/windows-services") {
      const payload = await loadWindowsServices();
      res.writeHead(200, responseHeaders);
      res.end(JSON.stringify(payload));
      return true;
    }

    if (req.method === "GET" && pathname === "/api/runtime-manager/ai-tasks") {
      res.writeHead(200, responseHeaders);
      res.end(JSON.stringify(getAiTaskPayload()));
      return true;
    }

    if (req.method === "POST" && pathname === "/api/runtime-manager/ai-tasks") {
      const body = await readJsonBody(req);
      createAiTask(body);
      res.writeHead(200, responseHeaders);
      res.end(JSON.stringify(getAiTaskPayload()));
      return true;
    }

    const aiTaskRouteMatch = /^\/api\/runtime-manager\/ai-tasks\/([^/]+?)(?:\/(run|delete))?$/.exec(pathname);
    if (req.method === "POST" && aiTaskRouteMatch) {
      const [, rawTaskId, action = "update"] = aiTaskRouteMatch;
      const taskId = decodeURIComponent(rawTaskId);
      const body = action === "update" ? await readJsonBody(req) : {};

      if (action === "run") {
        await runAiTaskNow(taskId);
      } else if (action === "delete") {
        deleteAiTask(taskId);
      } else {
        updateAiTask(taskId, body);
      }

      res.writeHead(200, responseHeaders);
      res.end(JSON.stringify(getAiTaskPayload()));
      return true;
    }

    if (req.method === "GET" && pathname === "/api/task-manager/conversations") {
      const { getConversationSnapshot } = await loadConversationSnapshotStore();
      res.writeHead(200, responseHeaders);
      res.end(JSON.stringify(getConversationSnapshot()));
      return true;
    }

    if (req.method === "POST" && pathname === "/api/task-manager/conversations/snapshot") {
      const { publishConversationSnapshot } = await loadConversationSnapshotStore();
      const body = await readJsonBody(req);
      res.writeHead(200, responseHeaders);
      res.end(JSON.stringify(publishConversationSnapshot(body)));
      return true;
    }
  } catch (error) {
    const statusCode = typeof error?.statusCode === "number" ? error.statusCode : 500;
    const message = String(error?.message || error || "Unknown route error.");
    console.error(`[taskmanager-api] route failed for ${req.method || "GET"} ${pathname}: ${message}`);
    if (!res.headersSent && !res.writableEnded && !res.destroyed) {
      res.writeHead(statusCode, responseHeaders);
      res.end(JSON.stringify({ error: message }));
      return true;
    }
    if (!res.writableEnded && !res.destroyed) {
      res.end();
    }
    return true;
  }

  return false;
}
