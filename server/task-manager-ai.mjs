import fs from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getDensePilotSettings } from "../portable_lib/brain-embeddings-local.mjs";
import { getIdleTrainingSystemSnapshot } from "../portable_lib/brain-idle-training.mjs";
import { getLocalLlmConfig } from "../portable_lib/brain-local-llm.mjs";
import { densePilotReady } from "../portable_lib/brain-retrieval-dense-lancedb.mjs";
import { getInternetProvider } from "../portable_lib/brain-web-context.mjs";
import { getRecommendations } from "../portable_lib/optimizer-actions.mjs";
import { getRecentAuditEvents } from "../portable_lib/optimizer-audit.mjs";
import { getOptimizerStatus } from "../portable_lib/optimizer-control-loop.mjs";
import { getAllModules } from "../portable_lib/optimizer-registry.mjs";
import { collectTelemetry, getLatestOsSnapshot } from "../portable_lib/optimizer-telemetry.mjs";
import { getProviderUsageSnapshot, listProviderUsageSnapshots } from "../portable_lib/provider-usage-telemetry.mjs";
import {
  parseBrainIntent,
  decomposeBrainIntent,
  planBrainWorkflow,
  compileBrainActions,
  summarizeTasks,
  compileActionSummary,
} from "../brain/scripts/ai-toolkit/index.mjs";
import { toNumber, round1, compactText } from "../shared/utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_FILE = resolve(__dirname, "..", ".runtime", "launcher-workspace-snapshot.json");
const MB = 1024 * 1024;
const EMPTY_CONVERSATION_SNAPSHOT = Object.freeze({
  publishedAt: null,
  activeThreadId: null,
  activeSurfaceId: null,
  activeSurfaceTitle: null,
  threads: [],
  workspace: null,
});

function extractRecentTargets(lines = []) {
  const found = [];
  const pattern = /https?:\/\/(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?/gi;
  for (const line of lines) {
    const matches = String(line || "").match(pattern) || [];
    for (const match of matches) {
      const cleaned = match.replace(/[),.;]+$/g, "").trim();
      if (!cleaned) continue;
      found.push(cleaned);
      if (found.length >= 8) break;
    }
    if (found.length >= 8) break;
  }
  return [...new Set(found)].slice(0, 4);
}

function latestWorkspaceMessage(messages, role) {
  const list = Array.isArray(messages) ? messages : [];
  for (let index = list.length - 1; index >= 0; index -= 1) {
    if (list[index]?.role === role) return list[index];
  }
  return null;
}

function messageRoleLabel(role) {
  if (role === "assistant") return "Horizons";
  if (role === "user") return "You";
  return "Latest";
}

function getConversationSnapshot() {
  try {
    if (!fs.existsSync(SNAPSHOT_FILE)) return { ...EMPTY_CONVERSATION_SNAPSHOT };
    const raw = fs.readFileSync(SNAPSHOT_FILE, "utf8");
    if (!raw.trim()) return { ...EMPTY_CONVERSATION_SNAPSHOT };
    const parsed = JSON.parse(raw);
    return {
      publishedAt: typeof parsed?.publishedAt === "string" ? parsed.publishedAt : null,
      activeThreadId: typeof parsed?.activeThreadId === "string" ? parsed.activeThreadId : null,
      activeSurfaceId: typeof parsed?.activeSurfaceId === "string" ? parsed.activeSurfaceId : null,
      activeSurfaceTitle: typeof parsed?.activeSurfaceTitle === "string" ? parsed.activeSurfaceTitle : null,
      threads: Array.isArray(parsed?.threads) ? parsed.threads : [],
      workspace: parsed?.workspace && typeof parsed.workspace === "object" ? parsed.workspace : null,
    };
  } catch {
    return { ...EMPTY_CONVERSATION_SNAPSHOT };
  }
}

function getActiveConversation(snapshot) {
  const threads = Array.isArray(snapshot?.threads) ? snapshot.threads : [];
  if (!threads.length) return null;
  if (snapshot?.activeThreadId) {
    const current = threads.find((entry) => entry?.id === snapshot.activeThreadId);
    if (current) return current;
  }
  return threads[0] || null;
}

function extractHorizonsTotals(osSnapshot) {
  const processes = Array.isArray(osSnapshot?.processes) ? osSnapshot.processes : [];
  const pidSet = new Set((Array.isArray(osSnapshot?.appProcessPids) ? osSnapshot.appProcessPids : []).map((value) => Number(value)));
  const totals = {
    cpuPercent: 0,
    gpuPercent: 0,
    memoryBytes: 0,
    privateBytes: 0,
    gpuMemoryBytes: 0,
    processCount: 0,
  };

  for (const row of processes) {
    if (!pidSet.has(Number(row?.pid))) continue;
    totals.cpuPercent += toNumber(row?.cpuPercentHint);
    totals.gpuPercent += toNumber(row?.gpuPercent);
    totals.memoryBytes += Math.max(0, toNumber(row?.workingSetBytes));
    totals.privateBytes += Math.max(0, toNumber(row?.privateBytes));
    totals.gpuMemoryBytes += Math.max(0, toNumber(row?.gpuDedicatedBytes)) + Math.max(0, toNumber(row?.gpuSharedBytes));
    totals.processCount += 1;
  }

  return {
    cpuPercent: round1(totals.cpuPercent),
    gpuPercent: round1(totals.gpuPercent),
    memoryBytes: totals.memoryBytes,
    privateBytes: totals.privateBytes,
    gpuMemoryBytes: totals.gpuMemoryBytes,
    processCount: totals.processCount,
    totalMemoryBytes: Math.max(0, toNumber(osSnapshot?.totalMemoryBytes)),
    freeMemoryBytes: Math.max(0, toNumber(osSnapshot?.freeMemoryBytes)),
    logicalCpuCount: Math.max(1, toNumber(osSnapshot?.logicalCpuCount, 1)),
  };
}

function statusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("rate")) return "warning";
  if (normalized.includes("error") || normalized.includes("offline") || normalized.includes("kill")) return "error";
  if (normalized.includes("running") || normalized.includes("ready")) return "active";
  if (normalized.includes("waiting")) return "warning";
  return "neutral";
}

function aggregateModuleHints(modules, matchFn) {
  return modules
    .filter(matchFn)
    .reduce(
      (sum, module) => ({
        cpuPercent: sum.cpuPercent + toNumber(module?.resourceHints?.cpuPercent),
        memoryBytes: sum.memoryBytes + Math.max(0, toNumber(module?.resourceHints?.memoryMB) * MB),
        gpuPercent: sum.gpuPercent + toNumber(module?.resourceHints?.gpuPercent),
      }),
      { cpuPercent: 0, memoryBytes: 0, gpuPercent: 0 }
    );
}

function recommendationSeverity(count) {
  if (count >= 3) return "high";
  if (count >= 1) return "medium";
  return "low";
}

export function getAiTaskManagerPayload() {
  const telemetry = collectTelemetry();
  const optimizer = getOptimizerStatus();
  const recommendations = getRecommendations();
  const auditEvents = getRecentAuditEvents(20);
  const modules = getAllModules();
  const crawlerSystem = getIdleTrainingSystemSnapshot();
  const osSnapshot = getLatestOsSnapshot();
  const totals = extractHorizonsTotals(osSnapshot);
  const localConfig = getLocalLlmConfig();
  const internetProvider = getInternetProvider();
  const denseSettings = getDensePilotSettings();
  const localUsage = getProviderUsageSnapshot("local-llm");
  const internetUsage = getProviderUsageSnapshot("internet");
  const providerUsage = localUsage || internetUsage || null;
  const conversationSnapshot = getConversationSnapshot();
  const activeConversation = getActiveConversation(conversationSnapshot);
  const workspace = conversationSnapshot?.workspace || null;
  const attachmentNames = Array.isArray(workspace?.attachments)
    ? workspace.attachments.map((entry) => entry?.name).filter(Boolean).slice(0, 4)
    : [];
  const recentTargets = extractRecentTargets(workspace?.idleTrainingTerminalLines || []);
  const activeSurfaceLabel =
    workspace?.activeSurfaceTitle ||
    activeConversation?.surfaceTitle ||
    conversationSnapshot?.activeSurfaceTitle ||
    conversationSnapshot?.activeSurfaceId ||
    null;
  const latestUser = latestWorkspaceMessage(workspace?.chatMessages, "user");
  const latestAssistant = latestWorkspaceMessage(workspace?.chatMessages, "assistant");
  const latestUserQuery = latestUser?.text || workspace?.chatDraft || activeSurfaceLabel || "";
  const brainIntent = parseBrainIntent(latestUserQuery, { profileName: workspace?.profileName || null });
  const brainDecomposition = decomposeBrainIntent(brainIntent, { profileName: workspace?.profileName || null });
  const brainWorkflow = planBrainWorkflow(brainDecomposition);
  const brainActions = compileBrainActions(brainWorkflow, { dryRun: true });
  const activeConversationPreview = compactText(activeConversation?.lastMessagePreview, 120);
  const activeConversationLabel = activeConversation
    ? `${messageRoleLabel(activeConversation.lastMessageRole)}: ${activeConversationPreview || "Waiting for messages."}`
    : "No launcher conversation published yet.";
  const chatPipelineStatus =
    workspace?.chatSubmitting || telemetry.sessionMode === "active"
      ? "Running"
      : activeConversation
        ? "Ready"
        : telemetry.sessionMode === "idle"
          ? "Waiting"
          : "Idle";

  const retrievalHints = aggregateModuleHints(
    modules,
    (module) =>
      String(module?.id || "").includes("brain-runtime-cache") ||
      String(module?.id || "").includes("scenario-index") ||
      String(module?.id || "").includes("bm25-index") ||
      String(module?.id || "").includes("embedding-model")
  );
  const crawlerHints = aggregateModuleHints(modules, (module) => String(module?.type) === "crawler");

  const providerStatus =
    providerUsage?.status === "rate_limited"
      ? "Rate limited"
      : providerUsage?.status === "online"
        ? "Running"
        : localConfig || internetProvider
          ? "Waiting"
          : "Offline";

  const rows = [
    {
      id: "chat-pipeline",
      name: "Chat Pipeline",
      status: chatPipelineStatus,
      tone: statusTone(chatPipelineStatus),
      cpuPercent: telemetry.sessionMode === "active" ? totals.cpuPercent : 0,
      memoryBytes: Math.max(0, toNumber(telemetry?.ram?.heapUsedMB) * MB),
      gpuPercent: 0,
      type: "Runtime",
      detail:
        workspace?.chatSubmitting || telemetry.sessionMode === "active"
          ? `${toNumber(telemetry.interactiveRequestCount)} active request(s) in flight`
          : activeConversation
            ? `${activeConversation.title || workspace?.chatThreadTitle || "Conversation"} on ${
                activeSurfaceLabel || "Launcher Workspace"
              }`
            : "No active assistant request right now.",
      contextItems: [
        activeSurfaceLabel ? `Surface: ${activeSurfaceLabel}` : null,
        workspace?.chatThreadTitle
          ? `Thread: ${workspace.chatThreadTitle}`
          : activeConversation?.title
            ? `Thread: ${activeConversation.title}`
            : null,
        workspace ? `Chat window: ${workspace.chatWindowOpen ? "open" : "closed"}` : null,
        attachmentNames.length ? `Attachments: ${attachmentNames.join(", ")}` : "Attachments: 0",
        latestUser ? `Latest prompt: ${compactText(latestUser.text, 96)}` : null,
        latestAssistant ? `Latest reply: ${compactText(latestAssistant.text, 96)}` : null,
        activeConversationLabel,
        `Session mode: ${telemetry.sessionMode}`,
        `Node heap: ${toNumber(telemetry?.ram?.heapUsedMB)} MB`,
      ],
    },
    {
      id: "provider-model",
      name: "Provider / Model",
      status: providerStatus,
      tone: statusTone(providerStatus),
      cpuPercent: 0,
      memoryBytes: 0,
      gpuPercent: 0,
      type: "Provider",
      detail:
        [
          localConfig ? `Local: ${localConfig.model}` : null,
          internetProvider ? `Web: ${internetProvider}` : null,
          providerUsage?.lastSuccessAt
            ? `Last success ${new Date(providerUsage.lastSuccessAt).toLocaleTimeString()}`
            : null,
        ]
          .filter(Boolean)
          .join(" | ") || "No AI provider is configured.",
      contextItems: [
        workspace
          ? `Local LLM: ${workspace.localLlmEnabled ? "enabled" : "disabled"}`
          : localConfig
            ? `Base URL: ${localConfig.baseUrl}`
            : "Local LLM unavailable",
        workspace
          ? `Internet: ${
              workspace.internetEnabled
                ? workspace.internetProvider
                  ? `enabled via ${workspace.internetProvider}`
                  : "enabled"
                : "disabled"
            }`
          : internetProvider
            ? `Internet provider: ${internetProvider}`
            : "Internet provider disabled",
        localConfig ? `Base URL: ${localConfig.baseUrl}` : null,
      ],
      rateLimits: providerUsage?.rateLimits ?? null,
    },
    {
      id: "crawler-fleet",
      name: "Crawler Fleet",
      status:
        Number(workspace?.activeCrawlerCount ?? crawlerSystem.activeCrawlerCount ?? 0) > 0
          ? "Running"
          : Number(workspace?.enabledCrawlerCount ?? crawlerSystem.enabledCrawlerCount ?? 0) > 0
            ? "Waiting"
            : "Idle",
      tone: statusTone(
        Number(workspace?.activeCrawlerCount ?? crawlerSystem.activeCrawlerCount ?? 0) > 0
          ? "running"
          : Number(workspace?.enabledCrawlerCount ?? crawlerSystem.enabledCrawlerCount ?? 0) > 0
            ? "waiting"
            : "idle"
      ),
      cpuPercent: round1(crawlerHints.cpuPercent),
      memoryBytes: crawlerHints.memoryBytes,
      gpuPercent: round1(crawlerHints.gpuPercent),
      type: "Background",
      detail: `${Number(workspace?.activeCrawlerCount ?? crawlerSystem.activeCrawlerCount ?? 0)}/${Number(
        workspace?.crawlerCount ?? crawlerSystem.crawlers.length ?? 0
      )} active | queue ${Number(workspace?.idleTrainingQueueSize ?? crawlerSystem.totalQueueSize ?? 0)} | fetchers ${Number(
        workspace?.idleTrainingActiveFetchWorkers ?? crawlerSystem.totalActiveFetchWorkers ?? 0
      )}`,
      contextItems: [
        workspace?.selectedCrawlerId ? `Selected crawler: ${workspace.selectedCrawlerId}` : null,
        workspace ? `Enabled crawlers: ${workspace.enabledCrawlerCount}/${workspace.crawlerCount}` : null,
        workspace?.idleTrainingLastRunAt
          ? `Last run: ${new Date(workspace.idleTrainingLastRunAt).toLocaleTimeString()}`
          : null,
        workspace ? `Last promotions: ${workspace.idleTrainingLastPromotionCount}` : null,
        ...recentTargets.map((target) => `Recent target: ${target}`),
        workspace?.idleTrainingError ? `Error: ${workspace.idleTrainingError}` : null,
        ...(crawlerSystem.crawlers || []).slice(0, 4).map((crawler) => {
          const state = crawler.idleTrainingActive ? "active" : crawler.idleTrainingEnabled ? "armed" : "stopped";
          return `${crawler.crawlerId}: ${state} | queue ${Number(crawler.idleTrainingQueueSize || 0)}`;
        }),
      ].filter(Boolean),
    },
    {
      id: "brain-browser",
      name: "Brain Browser",
      status: workspace?.brainBrowserOpen ? "Active" : activeSurfaceLabel ? "Available" : "Available",
      tone: workspace?.brainBrowserOpen ? "active" : "neutral",
      cpuPercent: 0,
      memoryBytes: 0,
      gpuPercent: 0,
      type: "Context",
      detail: workspace?.brainBrowserOpen
        ? "Brain Browser popout is open."
        : activeSurfaceLabel
          ? `Launcher focused on ${activeSurfaceLabel}.`
          : "Client-side context browser and editor bridge.",
      contextItems: [
        workspace?.chatThreadTitle
          ? `Conversation: ${workspace.chatThreadTitle}`
          : activeConversation?.title
            ? `Conversation: ${activeConversation.title}`
            : "No launcher conversation published yet.",
        activeConversationLabel,
        `Brain Browser: ${workspace?.brainBrowserOpen ? "open" : "closed"}`,
        `Crawler terminal: ${workspace?.crawlTerminalOpen ? "open" : "closed"}`,
        attachmentNames.length ? `Attached files: ${attachmentNames.join(", ")}` : "No attached files.",
      ],
    },
    {
      id: "retrieval-dense-pilot",
      name: "Retrieval / Dense Pilot",
      status: denseSettings.enabled ? (densePilotReady() ? "Ready" : "Waiting") : "Idle",
      tone: statusTone(denseSettings.enabled ? (densePilotReady() ? "ready" : "waiting") : "idle"),
      cpuPercent: round1(retrievalHints.cpuPercent),
      memoryBytes: retrievalHints.memoryBytes,
      gpuPercent: round1(retrievalHints.gpuPercent),
      type: "Retrieval",
      detail: denseSettings.enabled
        ? `Dense pilot ${densePilotReady() ? "ready" : "requested"} | ${denseSettings.model || "default model"}`
        : "Dense pilot disabled; BM25 still available.",
      contextItems: [
        `Model: ${denseSettings.model || "default"}`,
        densePilotReady() ? "Dense store is ready." : "Dense store is not built yet.",
      ],
    },
    {
      id: "ingestion-build-jobs",
      name: "Ingestion / Build Jobs",
      status:
        Number(telemetry?.builds?.activeCount || 0) > 0
          ? "Running"
          : Number(telemetry?.builds?.pendingCount || 0) > 0
            ? "Waiting"
            : "Idle",
      tone: statusTone(
        Number(telemetry?.builds?.activeCount || 0) > 0
          ? "running"
          : Number(telemetry?.builds?.pendingCount || 0) > 0
            ? "waiting"
            : "idle"
      ),
      cpuPercent: 0,
      memoryBytes: 0,
      gpuPercent: 0,
      type: "Build",
      detail: `${Number(telemetry?.builds?.activeCount || 0)} active | ${Number(
        telemetry?.builds?.pendingCount || 0
      )} pending`,
      contextItems: [
        telemetry?.builds?.lastCompletedAt
          ? `Last completed ${new Date(telemetry.builds.lastCompletedAt).toLocaleTimeString()}`
          : "No recent build completion recorded.",
      ],
    },
    {
      id: "optimizer",
      name: "Optimizer",
      status: optimizer.killSwitchActive ? "Kill switch" : optimizer.running ? "Running" : "Idle",
      tone: statusTone(optimizer.killSwitchActive ? "kill" : optimizer.running ? "running" : "idle"),
      cpuPercent: 0,
      memoryBytes: 0,
      gpuPercent: 0,
      type: "Supervisor",
      detail: `${optimizer.pendingRecommendations} recommendation(s) | gate ${
        optimizer.supervisor?.healthGateOpen ? "open" : "closed"
      } | pressure ${optimizer.pressure?.overall || "unknown"}`,
      contextItems: [
        `Pending health checks: ${Number(optimizer.supervisor?.pendingHealthCheckCount || 0)}`,
        `Kill switch: ${optimizer.killSwitchActive ? "active" : "inactive"}`,
      ],
    },
  ];

  return {
    capturedAt: telemetry.capturedAt || new Date().toISOString(),
    summary: {
      cpuPercent: totals.cpuPercent,
      gpuPercent: totals.gpuPercent,
      memoryBytes: totals.memoryBytes,
      privateBytes: totals.privateBytes,
      gpuMemoryBytes: totals.gpuMemoryBytes,
      processCount: totals.processCount,
      activeTaskCount: rows.filter((row) => ["Running", "Waiting", "Rate limited"].includes(row.status)).length,
      totalMemoryBytes: totals.totalMemoryBytes,
      memoryUsedRatio:
        totals.totalMemoryBytes > 0 ? Math.max(0, Math.min(1, (totals.totalMemoryBytes - totals.freeMemoryBytes) / totals.totalMemoryBytes)) : 0,
    },
    provider: providerUsage,
    providers: listProviderUsageSnapshots(),
    rateLimits: providerUsage?.rateLimits ?? null,
    optimizer: {
      running: optimizer.running,
      killSwitchActive: optimizer.killSwitchActive,
      pendingRecommendations: optimizer.pendingRecommendations,
      sessionMode: optimizer.sessionMode,
      pressure: optimizer.pressure,
      capturedAt: optimizer.capturedAt,
      supervisor: optimizer.supervisor,
      auditSummary: optimizer.auditSummary,
    },
    recommendations: recommendations.map((entry) => ({
      id: entry.id,
      moduleId: entry.moduleId || null,
      moduleDisplayName: entry.moduleDisplayName || "Optimizer recommendation",
      action: entry.action,
      reason: entry.reason,
      confidence: toNumber(entry.confidence),
      tierLabel: entry.tierLabel || entry.tier || "recommend",
      severity: recommendationSeverity(recommendations.length),
      createdAt: entry.createdAt,
      status: entry.status,
      snoozedUntil: entry.snoozedUntil,
    })),
    rows,
    recentActivity: [
      recentTargets[0]
        ? {
            id: "workspace-target",
            title: "Latest crawl target",
            detail: recentTargets[0],
            at: workspace?.idleTrainingLastRunAt || null,
            status: workspace?.idleTrainingActive ? "running" : "info",
          }
        : null,
      attachmentNames.length
        ? {
            id: "workspace-attachments",
            title: "Context files",
            detail: attachmentNames.join(", "),
            at: conversationSnapshot?.publishedAt || null,
            status: "info",
          }
        : null,
      activeConversation
        ? {
            id: `launcher-${activeConversation.id}`,
            title: activeConversation.title || "Launcher conversation",
            detail: activeConversationLabel,
            at: conversationSnapshot?.publishedAt || null,
            status: "info",
          }
        : null,
      ...auditEvents.slice(0, 8).map((event, index) => ({
        id: `${event.type || "event"}-${index}`,
        title: event.action || event.type || "activity",
        detail: event.reason || event.moduleId || "No detail recorded.",
        at: event.at || event.createdAt || event.timestamp || null,
        status: event.result || "info",
      })),
    ].filter(Boolean),
    meta: {
      localLlmConfigured: Boolean(localConfig),
      internetProvider: internetProvider || null,
      densePilotRequested: denseSettings.enabled,
      densePilotReady: densePilotReady(),
      densePilotModel: denseSettings.model || null,
      moduleCount: modules.length,
      brainToolkit: {
        intent: brainIntent.intent,
        confidence: brainIntent.confidence,
        taskCount: brainDecomposition.tasks.length,
        taskSummary: summarizeTasks(brainDecomposition),
        stepCount: brainWorkflow.totalSteps,
        actionCount: brainActions.actions.length,
        actionSummary: compileActionSummary(brainActions),
      },
      launcherConversation: activeConversation
        ? {
            publishedAt: conversationSnapshot?.publishedAt || null,
            activeSurfaceTitle: activeSurfaceLabel,
            activeThreadId: activeConversation.id,
            activeThreadTitle: activeConversation.title || "Conversation",
            chatSubmitting: workspace?.chatSubmitting || false,
            chatWindowOpen: workspace?.chatWindowOpen || false,
          }
        : null,
    },
  };
}
