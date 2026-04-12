import { app, BrowserWindow, ipcMain, shell } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import {
  IPC_CHANNELS,
  CHAT_GOVERNED_TASK_EXECUTORS,
  WORKFLOW_FAMILIES,
  WORKFLOW_STEP_KINDS,
  type AwarenessAnswerMode,
  type AwarenessQueryAnswer,
  type AwarenessQueryRequest,
  type AwarenessRuntimeHealth,
  type AgentRuntimePreviewSummary,
  type CapabilityRegistryEntry,
  type CapabilityRegistrySnapshot,
  type GovernanceAuditEntry,
  type GovernanceAuditQuery,
  type GovernanceApprovalQueueSnapshot,
  type GovernanceCapabilitySummary,
  type GovernanceDashboardSnapshot,
  type GovernanceHistoryBacklogSummary,
  type GovernancePendingApprovalRecord,
  type DesktopActionProposal,
  type DesktopActionRequest,
  type DesktopActionResult,
  type AppHealth,
  type ChatReplyPolicy,
  type ChatMessage,
  type ChatGovernedTaskMetadata,
  type ContextRouteDecision,
  type ContextPreview,
  type ConversationWithMessages,
  type ModelHealth,
  type OfficialKnowledgeContext,
  type OfficialKnowledgeSourceStatus,
  type OfficialKnowledgeStatus,
  type PromptEvaluationCaseResult,
  type PromptIntentContract,
  type PromptEvaluationRequest,
  type PromptEvaluationResponse,
  type PromptEvaluationSettingsSnapshot,
  type PlanningPolicy,
  type ReasoningProfile,
  type RagContextPreview,
  type RagOptions,
  type RagToggleMode,
  type ReasoningTraceState,
  type RuntimeSelectionSummary,
  type RetrievalSourceStats,
  type RetrievedPromptBehaviorMemory,
  type SendChatRequest,
  type SendChatResponse,
  type WebSearchContext,
  type WebSearchResult
} from "@contracts";
import {
  buildGroundingSourceCatalog,
  completeTraceStage,
  createAwarenessApiServer,
  createEmptyRetrievalStats,
  createReasoningTraceState,
  detectReasoningMode,
  failTraceStage,
  finalizeReasoningTrace,
  groundAssistantReply,
  initializeAwarenessEngine,
  queryWorkspaceIndex,
  routeAwarenessIntent,
  startTraceStage,
  toReasoningTraceSummary,
  type AwarenessApiServer,
  updateTraceGrounding,
  updateTraceRetrieval,
  withRetrievalTotals,
  type AwarenessEngine
} from "@awareness";
import { loadRuntimeCapabilityRegistry } from "@awareness/runtime-capabilities";
import {
  checkOllamaHealth,
  createOllamaProvider,
  getOllamaConfig,
  isOllamaReachabilityErrorDetail,
  listOllamaModels
} from "@local-ai";
import {
  createChatExecutionService,
  createGovernanceApprovalQueueStore,
  queryGovernanceAuditEntries
} from "@governance-execution";
import {
  createDesktopActionService,
  resolveDefaultDesktopActionPaths
} from "./desktop-actions";
import type { AgentTask } from "@agent-runtime/contracts";
import { FileAuditStore } from "@agent-runtime/audit";
import { createAgentRuntimeService, FileAgentRuntimeStateStore } from "@agent-runtime/runtime";
import { createAgentRuntimeApprovalValidator } from "./agent-runtime-approval";
import { createDesktopActionRuntimeAdapter, createWorkflowRuntimeAdapter } from "./agent-runtime-adapters";
import { createGovernedChatService } from "./governed-chat";
import { createCapabilityRunService } from "./capability-runner";
import { createWorkflowOrchestrator } from "./workflow-orchestrator";
import { createImprovementRuntimeService, getImprovementRuntimeService } from "./improvement-runtime-service";
import { createValidatedIpcHandleRegistry } from "./ipc-registration";
import {
  logConversationTurn,
  exportConversationHistoryAsMarkdown,
  clearConversationHistory
} from "./conversationLogger";
import {
  appendChatMessage,
  buildPromptMessages,
  clearConversationMessages,
  configureMemoryDatabase,
  createConversationRecord,
  deleteConversationRecord,
  deleteMemoryRecord,
  extractAndStoreMemories,
  finalizePromptContext,
  listConversationRecords,
  listMemoryRecords,
  loadConversationRecord,
  memorySystemInstruction,
  markPromptBehaviorRecordsApplied,
  matchPromptBehaviorMemoryRecords,
  preparePromptContext,
  refreshRollingSummary,
  removeLastAssistantMessage,
  resolveContextCachePacks,
  resolveHybridContextPlan,
  searchMemoryRecords,
  upsertPromptBehaviorPreferenceRecord,
  upsertResolvedPromptPatternRecord,
  updateConversationTitleFromMessages
} from "@memory";
import { resolveRecentWebContext } from "@web-search";
import { featureRegistry } from "../src/features/feature-registry";
import {
  buildAwarenessMessageMetadata,
  buildLiveAwarenessMessageMetadata
} from "../src/features/local-chat/utils/awarenessCards";
import { isLiveUsageAnswer } from "../src/features/local-chat/utils/liveUsageReply";
import { cleanupPlainTextAnswer, formatAwarenessReply } from "./reply-formatting";
import {
  buildPromptEvaluationChatHistoryPath,
  buildPromptEvaluationReportPath,
  formatPromptEvaluationMarkdown,
  upsertPromptEvaluationChatHistory
} from "./prompt-eval";
import {
  buildPromptEvaluationRoutingReport,
  evaluatePromptEvaluationCase,
  normalizePromptEvaluationCases
} from "./prompt-eval-analysis";
import {
  filterWorkspaceHitsForReplyPolicy,
  getReplyPolicyDiagnostics,
  getRoutingSuppressionReason,
  resolveReplyPolicy,
  shouldBypassCleanup,
  summarizeWorkspacePaths
} from "./reply-policy";
import { applyPromptPolicies } from "./prompting/instruction-builders";
import {
  buildChatExecutionDiagnostics,
  buildRetrievedSourceSummary
} from "./prompting/diagnostics";
import {
  buildSeedPromptIntent,
  hasSimpleHumanStylePreference,
  shouldPreferOfficialWindowsKnowledge
} from "./prompting/intent-contract";
import { planPromptIntent } from "./prompting/planner";
import { createSynthesisMessages } from "./prompting/synthesizer";
import { classifyPromptTask, formatClassifierCategories } from "./prompting/task-classifier";
import {
  applyReasoningProfileModifiers,
  getReasoningProfileBehavior,
  normalizePlanningPolicy,
  normalizeReasoningProfile,
  resolveRuntimeTaskClass,
  resolveAwarenessRouting,
  resolveProfileAwareWebSearch,
  resolveReasoningProfileState,
  shouldRunPlanningStage
} from "./prompting/reasoning-profile";
import {
  attachPromptIntentBridgeToTask,
  shouldPersistResolvedPromptPattern
} from "./prompting/runtime-intent-bridge";

const provider = createOllamaProvider();
const chatExecution = createChatExecutionService({ provider });
const desktopActionPaths = resolveDefaultDesktopActionPaths(process.cwd());
const approvalQueue = createGovernanceApprovalQueueStore(desktopActionPaths.runtimeRoot);
const desktopActions = createDesktopActionService({
  workspaceRoot: desktopActionPaths.workspaceRoot,
  runtimeRoot: desktopActionPaths.runtimeRoot,
  approvalQueue,
  getInstalledAppsSnapshot: () => awarenessEngine?.machineAwareness?.installedAppsSnapshot ?? null
});
const workflowOrchestrator = createWorkflowOrchestrator({
  workspaceRoot: process.cwd(),
  runtimeRoot: desktopActionPaths.runtimeRoot,
  desktopActions,
  approvalQueue,
  getMachineAwareness: () => awarenessEngine?.machineAwareness ?? null,
  getFileAwareness: () => awarenessEngine?.fileAwareness?.summary ?? null,
  getScreenAwareness: () => awarenessEngine?.screenAwareness ?? null,
  emitProgress: (event) => {
    sendRendererEvent(IPC_CHANNELS.workflowProgress, event);
  }
});
const governedChatService = createGovernedChatService({
  workspaceRoot: process.cwd(),
  runtimeRoot: desktopActionPaths.runtimeRoot,
  desktopActions,
  workflowOrchestrator,
  approvalQueue,
  getMachineAwareness: () => awarenessEngine?.machineAwareness ?? null,
  getFileAwareness: () => awarenessEngine?.fileAwareness?.summary ?? null,
  getScreenAwareness: () => awarenessEngine?.screenAwareness ?? null
});
const agentRuntimeRoot = path.join(process.cwd(), ".runtime", "agent-runtime");
const agentRuntimeStateStore = new FileAgentRuntimeStateStore(agentRuntimeRoot);
const agentRuntimeAuditStore = new FileAuditStore(path.join(agentRuntimeRoot, "audit"));
const agentRuntimeService = createAgentRuntimeService({
  stateStore: agentRuntimeStateStore,
  auditStore: agentRuntimeAuditStore,
  actionAdapters: [
    createWorkflowRuntimeAdapter(workflowOrchestrator),
    createDesktopActionRuntimeAdapter(desktopActions)
  ],
  validateApproval: createAgentRuntimeApprovalValidator(),
  emitProgress: (event) => {
    sendRendererEvent(IPC_CHANNELS.agentRuntimeProgress, event);
  }
});
const improvementRuntimeService = createImprovementRuntimeService({
  runtimeRoot: desktopActionPaths.runtimeRoot,
  emitProgress: (msg: string) => console.log("[Improvement Runtime]", msg)
});
const startedAt = new Date().toISOString();
let mainWindow: BrowserWindow | null = null;
let busy = false;
let awarenessEngine: AwarenessEngine | null = null;
let awarenessApiServer: AwarenessApiServer | null = null;
const chatStreamObservers = new Map<string, Set<(content: string) => void>>();
const promptIntentBridgeByConversation = new Map<
  string,
  {
    promptIntent: PromptIntentContract;
    matchedPromptBehaviorMemories: RetrievedPromptBehaviorMemory[];
    updatedAt: number;
  }
>();
const MAX_PROMPT_INTENT_BRIDGE_CACHE = 24;

// Health-check cache — avoid re-checking Ollama after every successful reply
let lastHealthCheckMs = 0;
let lastKnownModelStatus: ModelHealth | null = null;
const HEALTH_CACHE_TTL_MS = 45_000;

const rememberPromptIntentBridgeContext = (
  conversationId: string,
  promptIntent: PromptIntentContract | null,
  matchedPromptBehaviorMemories: RetrievedPromptBehaviorMemory[]
): void => {
  if (!promptIntent) {
    return;
  }
  promptIntentBridgeByConversation.set(conversationId, {
    promptIntent,
    matchedPromptBehaviorMemories,
    updatedAt: Date.now()
  });

  if (promptIntentBridgeByConversation.size <= MAX_PROMPT_INTENT_BRIDGE_CACHE) {
    return;
  }

  const oldest = [...promptIntentBridgeByConversation.entries()].sort(
    (left, right) => left[1].updatedAt - right[1].updatedAt
  )[0];
  if (oldest) {
    promptIntentBridgeByConversation.delete(oldest[0]);
  }
};

const getPromptIntentBridgeContextForTask = (
  task: AgentTask
): { promptIntent: PromptIntentContract; matchedPromptBehaviorMemories: RetrievedPromptBehaviorMemory[] } | null => {
  const conversationId =
    typeof task.metadata?.conversationId === "string" ? task.metadata.conversationId : null;
  if (!conversationId) {
    return null;
  }
  const cached = promptIntentBridgeByConversation.get(conversationId);
  if (!cached) {
    return null;
  }
  return {
    promptIntent: cached.promptIntent,
    matchedPromptBehaviorMemories: cached.matchedPromptBehaviorMemories
  };
};

const confidenceScore = (confidence: "low" | "medium" | "high" | null | undefined): number => {
  switch (confidence) {
    case "high":
      return 0.9;
    case "medium":
      return 0.65;
    case "low":
      return 0.4;
    default:
      return 0.5;
  }
};

const shouldPersistPromptBehaviorPreference = (promptIntent: PromptIntentContract): boolean =>
  promptIntent.intentFamily !== "workflow-governed" &&
  promptIntent.intentFamily !== "agent-runtime" &&
  promptIntent.intentFamily !== "time-sensitive-live" &&
  promptIntent.intentFamily !== "windows-awareness" &&
  (promptIntent.intentFamily === "generic-writing" ||
    promptIntent.constraints.some((constraint) => hasSimpleHumanStylePreference(constraint)) ||
    hasSimpleHumanStylePreference(promptIntent.userGoal) ||
  (promptIntent.outputContract.preserveExactStructure ||
    promptIntent.sourceScope !== "workspace-only" ||
    promptIntent.requiredChecks.includes("decompose-first-time-task")));

const persistPromptBehaviorFromTurn = async (input: {
  conversationId: string;
  query: string;
  promptIntent: PromptIntentContract | null;
  taskClassification: ReturnType<typeof classifyPromptTask> | null;
  assistantReply: string;
  verificationConfidence: "low" | "medium" | "high" | null;
}): Promise<void> => {
  const { promptIntent, taskClassification } = input;
  if (!promptIntent || !taskClassification) {
    return;
  }

  const stylePreference = hasSimpleHumanStylePreference(input.query) ||
    hasSimpleHumanStylePreference(promptIntent.userGoal) ||
    promptIntent.constraints.some((constraint) => hasSimpleHumanStylePreference(constraint));
  const matchHints = [
    input.query,
    promptIntent.userGoal,
    ...promptIntent.constraints,
    ...promptIntent.requiredChecks,
    stylePreference ? "simple human easy to read" : ""
  ].filter(Boolean);
  const normalizedResolution = {
    intentFamily: promptIntent.intentFamily,
    sourceScope: promptIntent.sourceScope,
    outputShape: promptIntent.outputContract.shape,
    outputLength: promptIntent.outputContract.length,
    preserveExactStructure: promptIntent.outputContract.preserveExactStructure,
    requiredChecks: promptIntent.requiredChecks
  };
  const confidence = confidenceScore(input.verificationConfidence);

  if (shouldPersistPromptBehaviorPreference(promptIntent)) {
    await upsertPromptBehaviorPreferenceRecord({
      sourceConversationId: input.conversationId,
      summary: `Prompt behavior preference: ${promptIntent.userGoal}`,
      preferenceLabel: `${promptIntent.sourceScope} ${promptIntent.outputContract.shape}${stylePreference ? " style-simple-human" : ""}`,
      matchHints,
      resolution: normalizedResolution,
      confidence
    });
  }

  if (!shouldPersistResolvedPromptPattern(promptIntent, taskClassification)) {
    return;
  }

  await upsertResolvedPromptPatternRecord({
    sourceConversationId: input.conversationId,
    summary: `Resolved prompt pattern: ${promptIntent.userGoal}`,
    patternSummary: input.query.slice(0, 180),
    matchHints: [...matchHints, input.assistantReply.slice(0, 140)],
    resolution: normalizedResolution,
    confidence
  });
};
const awarenessRuntimeState: AwarenessRuntimeHealth = {
  initializing: false,
  ready: false,
  inFlightTargets: [],
  recentDurationsMs: {},
  lastInitDurationMs: null
};

const APP_VERSION = "0.1.0";
const DEFAULT_PROMPT_EVAL_SUITE_NAME = "Local AI prompt evaluation";

const normalizeAwarenessAnswerMode = (
  mode: AwarenessAnswerMode | undefined
): AwarenessAnswerMode => (mode === "llm-primary" ? "llm-primary" : "evidence-first");

const resolveToggleMode = (override: RagToggleMode | undefined, fallback: boolean): boolean => {
  if (override === "on") {
    return true;
  }
  if (override === "off") {
    return false;
  }
  return fallback;
};

const normalizeLine = (value: string): string => value.replace(/\s+/g, " ").trim();
const normalizeQuery = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const isFeatureSummaryQuery = (query: string, answer?: AwarenessQueryAnswer | null): boolean => {
  if (answer?.intent.family === "repo-change" && answer.scope === "previous-session") {
    return true;
  }

  const normalized = normalizeQuery(query);
  return (
    normalized.includes("whats new") ||
    normalized.includes("what s new") ||
    normalized.includes("new feature") ||
    normalized.includes("new features") ||
    normalized.includes("release notes") ||
    normalized.includes("changelog") ||
    normalized.includes("change log") ||
    normalized.includes("updates")
  );
};

const toOfficialKnowledgeContext = (answer: AwarenessQueryAnswer | null): OfficialKnowledgeContext | null => {
  if (!answer?.officialKnowledgeUsed || (answer.officialEvidence?.length ?? 0) === 0) {
    return null;
  }

  return {
    query: answer.query,
    policy: "mirror-first",
    used: true,
    source: answer.officialEvidence?.some((hit) => !hit.versionMatched) ? "live-fallback" : "mirror",
    generatedAt: answer.generatedAt,
    lastRefreshedAt: answer.officialEvidence?.[0]?.fetchedAt ?? null,
    mirrorFresh: true,
    hitCount: answer.officialEvidence?.length ?? 0,
    hits: answer.officialEvidence ?? []
  };
};

const toOfficialWebContext = (answer: AwarenessQueryAnswer | null): WebSearchContext => {
  if (!answer?.officialKnowledgeUsed || (answer.officialEvidence?.length ?? 0) === 0) {
    return {
      status: "off",
      query: answer?.query ?? "",
      results: []
    };
  }

  const results: WebSearchResult[] = (answer.officialEvidence ?? []).map((hit) => ({
    title: hit.title,
    url: hit.canonicalUrl,
    source: hit.domain,
    snippet: hit.extract,
    publishedAt: hit.fetchedAt
  }));

  return {
    status: results.length > 0 ? "used" : "off",
    query: answer.query,
    results
  };
};

const formatAwarenessEvidenceReply = (answer: AwarenessQueryAnswer): string => {
  const hotspots = answer.bundle.resourceHotspots ?? [];
  if (hotspots.length > 0) {
    const top = hotspots[0];
    const resourceLabel = top.resource === "disk" ? "Disk" : top.resource.toUpperCase();
    const groupingLabel = top.grouping === "program" ? "programs" : "processes";
    const maxLines = Math.min(hotspots.length, 4);
    const shareLabel = top.resource === "ram" ? "total RAM" : "sampled load";
    const lines = [
      `${top.label} is using the most ${resourceLabel}${
        top.resourceAmount ? ` (${top.resourceAmount})` : ""
      }${
        top.resourceShare != null ? ` and accounts for ${Math.round(top.resourceShare * 100)}% of ${shareLabel}` : ""
      }.`,
      `Top ${maxLines} ${groupingLabel} using ${resourceLabel}:`,
      ...hotspots.slice(0, maxLines).map(
        (entry) =>
          `- ${entry.rank}. ${entry.label} — ${entry.resourceAmount}${
            entry.resourceShare != null ? ` (${Math.round(entry.resourceShare * 100)}%)` : ""
          }`
      ),
      answer.bundle.likelyInterpretation.length > 0
        ? `Why it matters:\n- ${answer.bundle.likelyInterpretation.map(normalizeLine).filter(Boolean).slice(0, 2).join("\n- ")}`
        : null,
      answer.bundle.uncertainty.length > 0
        ? `Unclear:\n- ${answer.bundle.uncertainty.map(normalizeLine).filter(Boolean).slice(0, 2).join("\n- ")}`
        : null
    ].filter((section): section is string => Boolean(section));

    return lines.join("\n\n");
  }

  const verified = answer.bundle.verifiedFindings.map(normalizeLine).filter(Boolean).slice(0, 4);
  const inferred = answer.bundle.likelyInterpretation.map(normalizeLine).filter(Boolean).slice(0, 2);
  const uncertainty = answer.bundle.uncertainty.map(normalizeLine).filter(Boolean).slice(0, 2);

  const sections = [
    verified.length > 0 ? verified[0] : "I don't have enough verified local evidence yet.",
    verified.length > 1 ? `Key facts:\n- ${verified.slice(1).join("\n- ")}` : null,
    inferred.length > 0 ? `Why it matters:\n- ${inferred.join("\n- ")}` : null,
    uncertainty.length > 0 ? `Unclear:\n- ${uncertainty.join("\n- ")}` : null
  ].filter((section): section is string => Boolean(section));

  return sections.join("\n\n");
};

void formatAwarenessEvidenceReply;

const summarizeFeatureChangesWithLocalAi = async (
  answer: AwarenessQueryAnswer,
  modelOverride?: string
): Promise<string> => {
  const verified = answer.bundle.verifiedFindings.map(normalizeLine).filter(Boolean).slice(0, 8);
  const inferred = answer.bundle.likelyInterpretation.map(normalizeLine).filter(Boolean).slice(0, 4);
  const uncertainty = answer.bundle.uncertainty.map(normalizeLine).filter(Boolean).slice(0, 4);

  const messages: ChatMessage[] = [
    {
      id: "whats-new-system",
      conversationId: "system",
      role: "system",
      createdAt: new Date().toISOString(),
      content: [
        "You summarize local feature changes since the last app run.",
        "Use only the provided local evidence.",
        "Do not tell the user to manually look up data.",
        "Keep the answer short and simple.",
        "If no confirmed new feature exists, say that clearly.",
        "Format exactly:",
        "What's new:",
        "- bullet points",
        "Why it matters:",
        "- bullet points",
        "Use at most 3 bullets per section."
      ].join("\n")
    },
    {
      id: "whats-new-user",
      conversationId: "system",
      role: "user",
      createdAt: new Date().toISOString(),
      content: [
        "Summarize this evidence in simple language.",
        "Keep it short and easy to scan.",
        verified.length > 0 ? `Verified evidence:\n- ${verified.join("\n- ")}` : "Verified evidence: none",
        inferred.length > 0 ? `Likely interpretation:\n- ${inferred.join("\n- ")}` : "Likely interpretation: none",
        uncertainty.length > 0 ? `Uncertainty:\n- ${uncertainty.join("\n- ")}` : "Uncertainty: none"
      ].join("\n\n")
    }
  ];

  const summarized = await chatExecution.runChat(messages, {
    model: modelOverride
  });
  return cleanupPlainTextAnswer(summarized.trim()) || formatAwarenessReply(answer);
};

const shouldUseDeterministicAwarenessReply = (
  explicitWindowsAwarenessPrompt: boolean,
  awarenessAnswerMode: AwarenessAnswerMode,
  answer: AwarenessQueryAnswer | null,
  replyPolicy?: ChatReplyPolicy | null
): boolean => {
  if (answer === null || !explicitWindowsAwarenessPrompt) {
    return false;
  }

  if (replyPolicy?.formatPolicy === "preserve-exact-structure") {
    return false;
  }

  return (
    answer.clarification !== null ||
    (answer.bundle.verifiedFindings.length > 0 &&
      (answer.intent.family === "live-usage" ||
        answer.intent.family === "resource-hotspot" ||
        (awarenessAnswerMode === "evidence-first" &&
          (answer.intent.family === "hardware" ||
            answer.intent.family === "performance-diagnostic" ||
            (answer.includeInContext && answer.intent.confidence >= 0.45)))))
  );
};

const createWindow = async (): Promise<void> => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    backgroundColor: "#0a0f1a",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      void shell.openExternal(url);
      return { action: "deny" };
    }

    return { action: "allow" };
  });
};

const emptyContextPreview: ContextPreview = {
  reasoningProfile: "chat",
  planningPolicy: null,
  reasoningProfileDiagnostics: null,
  systemInstruction: memorySystemInstruction,
  stableMemories: [],
  retrievedMemories: [],
  summarySnippet: "",
  recentMessagesCount: 0,
  estimatedChars: 0,
  fileAwareness: null,
  awarenessQuery: null,
  awarenessAnswerMode: "evidence-first",
  awarenessGrounding: null,
  grounding: null,
  retrievalEval: null,
  runtimePreview: null,
  replyPolicy: null,
  promptIntent: null,
  webSearch: {
    status: "off",
    query: "",
    results: []
  }
};

const createModelStatus = (
  status: ModelHealth["status"],
  detail?: string,
  modelOverride?: string,
  resolvedModel?: string | null
): ModelHealth => {
  const config = getOllamaConfig((resolvedModel ?? modelOverride) ? { model: resolvedModel ?? modelOverride ?? undefined } : undefined);

  return {
    status,
    provider: "ollama",
    model: resolvedModel ?? config.model,
    baseUrl: config.baseUrl,
    detail,
    checkedAt: new Date().toISOString(),
    scheduler: provider.getSchedulerStatus?.() ?? null
  };
};

const resolveModelErrorStatus = (detail: string): ModelHealth["status"] => {
  return isOllamaReachabilityErrorDetail(detail) ? "disconnected" : "error";
};

const resolvePromptEvaluationSettings = (
  request: PromptEvaluationRequest
): PromptEvaluationSettingsSnapshot => {
  const ragOptions = request.ragOptions ?? {};
  const reasoningProfile = normalizeReasoningProfile(request.reasoningProfile);
  const planningPolicy =
    request.planningPolicy ?? getReasoningProfileBehavior(reasoningProfile).defaultPlanningPolicy;

  return {
    suiteMode: request.suiteMode ?? "chat-only",
    model: request.modelOverride?.trim() || null,
    reasoningProfile,
    planningPolicy,
    responseMode: request.responseMode ?? "balanced",
    awarenessAnswerMode: normalizeAwarenessAnswerMode(request.awarenessAnswerMode),
    codingModeEnabled: request.codingMode === "on",
    highQualityModeEnabled: request.highQualityMode === "on",
    ragEnabled: resolveToggleMode(ragOptions.enabled, ragOptions.defaultEnabled ?? true),
    useWebSearch:
      request.useWebSearch ?? resolveToggleMode(ragOptions.useWeb, ragOptions.defaultUseWeb ?? false),
    showTrace: resolveToggleMode(ragOptions.showTrace, ragOptions.defaultShowTrace ?? false),
    workspaceIndexingEnabled: ragOptions.workspaceIndexingEnabled ?? true
  };
};

const mergeRetrievalStats = (
  base: RetrievalSourceStats,
  patch: Partial<RetrievalSourceStats>
): RetrievalSourceStats =>
  withRetrievalTotals({
    ...base,
    ...patch,
    total: 0
  });

const subscribeChatStreamObserver = (
  requestId: string,
  listener: (content: string) => void
): (() => void) => {
  const listeners = chatStreamObservers.get(requestId) ?? new Set<(content: string) => void>();
  listeners.add(listener);
  chatStreamObservers.set(requestId, listeners);
  return () => {
    const current = chatStreamObservers.get(requestId);
    if (!current) {
      return;
    }
    current.delete(listener);
    if (current.size === 0) {
      chatStreamObservers.delete(requestId);
    }
  };
};

const sendRendererEvent = <T>(channel: string, payload: T): void => {
  mainWindow?.webContents.send(channel, payload);

  if (channel === IPC_CHANNELS.chatStream && payload && typeof payload === "object") {
    const record = payload as { requestId?: unknown; content?: unknown };
    const requestId = typeof record.requestId === "string" ? record.requestId : null;
    const content = typeof record.content === "string" ? record.content : null;
    if (!requestId || content === null) {
      return;
    }

    for (const listener of chatStreamObservers.get(requestId) ?? []) {
      listener(content);
    }
  }
};

const sendReasoningTrace = (trace: ReasoningTraceState): void => {
  if (!trace.visible) {
    return;
  }

  sendRendererEvent(IPC_CHANNELS.reasoningTrace, {
    requestId: trace.requestId,
    conversationId: trace.conversationId,
    trace
  });
};

const recordAwarenessDuration = (label: string, startedAtMs: number): void => {
  awarenessRuntimeState.recentDurationsMs = {
    ...(awarenessRuntimeState.recentDurationsMs ?? {}),
    [label]: Math.max(0, Date.now() - startedAtMs)
  };
};

const getAwarenessRuntimeHealth = (): AwarenessRuntimeHealth => {
  const engineRuntime = awarenessEngine?.getStatus().runtime;
  return {
    initializing: engineRuntime?.initializing ?? awarenessRuntimeState.initializing,
    ready: engineRuntime?.ready ?? awarenessRuntimeState.ready,
    inFlightTargets: engineRuntime?.inFlightTargets ?? awarenessRuntimeState.inFlightTargets,
    recentDurationsMs: {
      ...(awarenessRuntimeState.recentDurationsMs ?? {}),
      ...(engineRuntime?.recentDurationsMs ?? {})
    },
    lastInitDurationMs: engineRuntime?.lastInitDurationMs ?? awarenessRuntimeState.lastInitDurationMs ?? null
  };
};

const getActiveFeatureFlags = (): string[] =>
  featureRegistry.filter((feature) => feature.status === "active").map((feature) => feature.id);

const readJsonFile = async <T>(filePath: string): Promise<T | null> => {
  const raw = await readFile(filePath, "utf8").catch(() => null);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const buildLatestAgentRuntimePreview = async (): Promise<AgentRuntimePreviewSummary | null> => {
  const jobs = await agentRuntimeService.listJobs();
  const latestJob = [...jobs].sort((left, right) =>
    (right.finishedAt ?? right.startedAt ?? right.createdAt).localeCompare(
      left.finishedAt ?? left.startedAt ?? left.createdAt
    )
  )[0];

  if (!latestJob) {
    return null;
  }

  const inspection = await agentRuntimeService.inspectJob(latestJob.id);
  if (!inspection) {
    return null;
  }

  return {
    jobId: inspection.job.id,
    taskId: inspection.task?.id ?? inspection.job.taskId,
    taskTitle: inspection.task?.title ?? "Agent runtime task",
    jobStatus: inspection.job.status,
    resultStatus: inspection.result?.status ?? null,
    plannedStepCount:
      inspection.plannedSteps.length || inspection.plan?.steps.length || inspection.job.stepIds.length,
    policyDecisionType: inspection.policyDecision?.type ?? null,
    verificationStatus: inspection.verification?.status ?? null,
    checkpointId: inspection.latestCheckpoint?.id ?? null,
    checkpointSummary: inspection.latestCheckpoint?.summary ?? inspection.result?.summary ?? null,
    auditEventCount: inspection.auditTrail.length,
    bindingHash: inspection.policyDecision?.bindingHash ?? null,
    updatedAt:
      inspection.job.finishedAt ??
      inspection.latestCheckpoint?.createdAt ??
      inspection.job.startedAt ??
      inspection.job.createdAt
  };
};

const buildGovernanceCapabilitySummary = async (): Promise<GovernanceCapabilitySummary | null> => {
  const summaryPath = path.join(desktopActionPaths.runtimeRoot, "capability-eval", "latest-summary.json");
  const summary = await readJsonFile<Record<string, unknown>>(summaryPath);
  if (!summary) {
    return null;
  }

  const cardResults = Array.isArray(summary.cardResults) ? summary.cardResults : [];
  return {
    runId: typeof summary.runId === "string" ? summary.runId : "unknown",
    totals: {
      total: cardResults.length,
      passed: cardResults.filter((entry) => (entry as { status?: unknown }).status === "passed").length,
      failed: cardResults.filter((entry) => (entry as { status?: unknown }).status === "failed").length
    },
    artifactRoot: typeof summary.artifactRoot === "string" ? summary.artifactRoot : path.dirname(summaryPath),
    latestFailedCardIds: cardResults
      .filter((entry) => (entry as { status?: unknown }).status === "failed")
      .map((entry) => String((entry as { cardId?: unknown }).cardId ?? "unknown"))
  };
};

const buildGovernanceHistoryBacklogSummary = async (): Promise<GovernanceHistoryBacklogSummary | null> => {
  const backlogPath = path.join(desktopActionPaths.runtimeRoot, "governance-history", "latest-backlog.json");
  const backlog = await readJsonFile<Record<string, unknown>>(backlogPath);
  if (!backlog) {
    return null;
  }

  const findings = Array.isArray(backlog.findings) ? backlog.findings : [];
  const cardDrafts = Array.isArray(backlog.cardDrafts) ? backlog.cardDrafts : [];
  return {
    startedAt: typeof backlog.startedAt === "string" ? backlog.startedAt : new Date().toISOString(),
    conversationCount: typeof backlog.conversationCount === "number" ? backlog.conversationCount : 0,
    findingCount: findings.length,
    draftCount: cardDrafts.length,
    topFindings: findings.slice(0, 5).map((finding) => {
      const value = finding as Record<string, unknown>;
      return {
        recoveredIntent: String(value.recovered_intent ?? value.recoveredIntent ?? "unknown"),
        repeatedRequestCount: Number(value.repeated_request_count ?? value.repeatedRequestCount ?? 0),
        suggestedGap: String(value.suggested_gap ?? value.suggestedGap ?? "unknown"),
        userImpactScore: Number(value.user_impact_score ?? value.userImpactScore ?? 0),
        suggestedExecutor: String(value.suggested_executor ?? value.suggestedExecutor ?? "answer-only")
      };
    }),
    candidateCardIds: cardDrafts
      .slice(0, 10)
      .map((draft) => String((draft as { id?: unknown; cardId?: unknown }).id ?? (draft as { cardId?: unknown }).cardId ?? "unknown"))
  };
};

const buildPendingApprovals = async (): Promise<GovernancePendingApprovalRecord[]> => {
  const conversations = await listConversationRecords();
  const pending: GovernancePendingApprovalRecord[] = [];

  for (const conversation of conversations) {
    const loaded = await loadConversationRecord(conversation.id);
    const assistant = loaded?.messages
      .slice()
      .reverse()
      .find((message) => message.role === "assistant" && message.metadata?.task?.approvalState.pending);
    const task = assistant?.metadata?.task;
    if (!task) {
      continue;
    }

    pending.push({
      conversationId: conversation.id,
      requestId: task.requestId,
      actionType: task.actionType,
      decision: task.decision,
      approvalReason: task.approvalReason,
      approver: task.approvalState.approver,
      tokenId: task.approvalState.tokenId,
      expiresAt: task.approvalState.expiresAt,
      summary: task.executionSummary ?? task.reasoningSummary
    });
  }

  return pending.slice(0, 25);
};

const buildRecentAuditEntries = async (): Promise<GovernanceAuditEntry[]> => {
  return await queryGovernanceAuditEntries(
    desktopActionPaths.runtimeRoot,
    { limit: 25 },
    { agentRuntimeRoot }
  );
};

const buildApprovalQueueSnapshot = async (): Promise<GovernanceApprovalQueueSnapshot> =>
  await approvalQueue.list();

const buildCapabilityRegistrySnapshot = async (): Promise<CapabilityRegistrySnapshot> => {
  const entries: CapabilityRegistryEntry[] = [];
  const runtimeCapabilities = await loadRuntimeCapabilityRegistry(
    desktopActionPaths.runtimeRoot,
    desktopActionPaths.workspaceRoot
  );
  const desktopActionDefinitions = desktopActions.listDesktopActions();

  for (const action of desktopActionDefinitions) {
    entries.push({
      id: `desktop-action.${action.id}`,
      kind: "desktop-action",
      title: action.title,
      description: action.description,
      status: action.approvalRequired || action.riskClass === "high" || action.riskClass === "critical" ? "partial" : "active",
      riskClass: action.riskClass,
      approvalRequired: action.approvalRequired,
      source: "desktop-actions",
      metadata: {
        proposalId: action.id,
        scope: action.scope,
        targetKind: action.targetKind
      }
    });
  }

  for (const family of WORKFLOW_FAMILIES) {
    entries.push({
      id: `workflow-family.${family}`,
      kind: "workflow-family",
      title: family,
      description: `Workflow family ${family}.`,
      status: family === "general" || family.includes("service") || family.includes("registry") || family.includes("ui") || family.includes("browser") ? "partial" : "active",
      riskClass: "low",
      approvalRequired: false,
      source: "workflow-planner",
      metadata: { family }
    });
  }

  for (const stepKind of WORKFLOW_STEP_KINDS) {
    entries.push({
      id: `workflow-step.${stepKind}`,
      kind: "workflow-step",
      title: stepKind,
      description: `Workflow step ${stepKind}.`,
      status: stepKind.includes("service") || stepKind.includes("registry") || stepKind.includes("ui") || stepKind === "browser-interact" ? "partial" : "active",
      riskClass: "low",
      approvalRequired: false,
      source: "workflow-planner",
      metadata: { stepKind }
    });
  }

  for (const executor of CHAT_GOVERNED_TASK_EXECUTORS) {
    entries.push({
      id: `executor.${executor}`,
      kind: "executor",
      title: executor,
      description: `Governed executor ${executor}.`,
      status:
        executor === "ui-automation" || executor === "service-control" || executor === "registry-control" || executor === "browser-automation"
          ? "partial"
          : executor === "none"
            ? "blocked"
            : "active",
      riskClass:
        executor === "service-control" || executor === "registry-control"
          ? "high"
          : executor === "ui-automation" || executor === "browser-automation"
            ? "medium"
            : "low",
      approvalRequired: executor === "approval-queue" || executor === "service-control" || executor === "registry-control",
      source: "governed-chat",
      metadata: { executor }
    });
  }

  for (const capability of [
    { id: "browser.search", title: "Search browser", description: "Browser search", status: "active" as const, riskClass: "low" as const },
    { id: "browser.open", title: "Open browser URL", description: "Browser navigation", status: "active" as const, riskClass: "low" as const },
    { id: "browser.play", title: "Play YouTube video", description: "Browser playback", status: "active" as const, riskClass: "low" as const },
    { id: "browser.click", title: "Click browser UI", description: "Browser click automation", status: "partial" as const, riskClass: "medium" as const },
    { id: "browser.type", title: "Type browser input", description: "Browser text entry", status: "partial" as const, riskClass: "medium" as const },
    { id: "browser.hotkey", title: "Send browser hotkeys", description: "Browser keyboard automation", status: "partial" as const, riskClass: "medium" as const }
  ]) {
    entries.push({
      id: `browser-capability.${capability.id}`,
      kind: "browser-capability",
      title: capability.title,
      description: capability.description,
      status: capability.status,
      riskClass: capability.riskClass,
      approvalRequired: false,
      source: "browser-session"
    });
  }

  const combinedEntries = [...entries, ...runtimeCapabilities.entries];
  const totals = combinedEntries.reduce(
    (acc, entry) => {
      acc.total += 1;
      acc[entry.status] += 1;
      return acc;
    },
    { total: 0, active: 0, partial: 0, planned: 0, blocked: 0 }
  );

  return {
    capturedAt: new Date().toISOString(),
    totals,
    executors: [
      ...new Set([
        ...CHAT_GOVERNED_TASK_EXECUTORS,
        ...combinedEntries
          .filter((entry) => entry.kind === "executor")
          .map((entry) => String(entry.metadata?.executorId ?? entry.id))
      ])
    ],
    entries: combinedEntries,
    plugins: runtimeCapabilities.plugins
  };
};

const buildGovernanceDashboardSnapshot = async (): Promise<GovernanceDashboardSnapshot> => ({
  capturedAt: new Date().toISOString(),
  capabilitySummary: await buildGovernanceCapabilitySummary(),
  historyBacklog: await buildGovernanceHistoryBacklogSummary(),
  pendingApprovals: await buildPendingApprovals(),
  approvalQueue: await buildApprovalQueueSnapshot(),
  recentAuditEntries: await buildRecentAuditEntries(),
  capabilityRegistry: await buildCapabilityRegistrySnapshot(),
  officialKnowledge: (awarenessEngine?.getOfficialKnowledgeStatus() ?? null) as OfficialKnowledgeStatus | null
});

const scheduleConversationMaintenance = (
  conversationId: string,
  userText: string,
  assistantReply: string,
  modelOverride?: string,
  options?: { skipMemories?: boolean }
): void => {
  void (async () => {
    const maintenanceTasks: Promise<unknown>[] = [updateConversationTitleFromMessages(conversationId, userText)];
    if (!options?.skipMemories) {
      maintenanceTasks.unshift(
        extractAndStoreMemories(conversationId, `${userText}\n${assistantReply}`),
        refreshRollingSummary(conversationId)
      );
    }

    await Promise.allSettled(maintenanceTasks);

    const now = Date.now();
    const modelStatusPromise =
      now - lastHealthCheckMs > HEALTH_CACHE_TTL_MS
        ? checkOllamaHealth(false, modelOverride ? { model: modelOverride } : undefined)
            .then((status) => {
              lastHealthCheckMs = Date.now();
              lastKnownModelStatus = status;
              return status;
            })
            .catch((error) =>
              createModelStatus(
                "error",
                error instanceof Error ? error.message : "Background health check failed",
                modelOverride
              )
            )
        : Promise.resolve(
            lastKnownModelStatus ?? createModelStatus("connected", undefined, modelOverride)
          );

    const [conversations, modelStatus] = await Promise.all([
      listConversationRecords(),
      modelStatusPromise
    ]);

    sendRendererEvent(IPC_CHANNELS.backgroundSync, {
      conversationId,
      conversations,
      modelStatus
    });
  })();
};

const resolveConversation = async (conversationId: string): Promise<ConversationWithMessages> => {
  const loaded = await loadConversationRecord(conversationId);
  if (loaded) {
    return loaded;
  }
  const conversation = await createConversationRecord();
  return {
    conversation,
    messages: []
  };
};

const buildConversationAwarenessContext = (
  messages: ChatMessage[],
  latestUserMessage?: string
): AwarenessQueryRequest["conversationContext"] => {
  const recentUserMessages = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim())
    .filter(Boolean);
  const latestTrimmed = latestUserMessage?.trim();
  if (
    latestTrimmed &&
    recentUserMessages[recentUserMessages.length - 1]?.toLowerCase() !== latestTrimmed.toLowerCase()
  ) {
    recentUserMessages.push(latestTrimmed);
  }

  const lastAwarenessIntentFamily =
    [...messages]
      .reverse()
      .find((message) => message.role === "assistant" && message.metadata?.awareness?.intentFamily)
      ?.metadata?.awareness?.intentFamily ?? null;

  return {
    recentUserMessages: recentUserMessages.slice(-2),
    lastAwarenessIntentFamily
  };
};

const handleSendChat = async (payload: SendChatRequest): Promise<SendChatResponse> => {
  return handleSendChatAdvanced(payload);
  /*

  const sendChatStartedAtMs = Date.now();
  busy = true;
  const requestId = payload.requestId ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const modelOverride = payload.modelOverride?.trim() || undefined;
  const awarenessAnswerMode = normalizeAwarenessAnswerMode(payload.awarenessAnswerMode);
  let contextPreview = emptyContextPreview;

  try {
    const resolved = await resolveConversation(payload.conversationId);
    const conversationId = resolved.conversation.id;
    if (payload.regenerate) {
      await removeLastAssistantMessage(conversationId);
    } else {
      await appendChatMessage(conversationId, "user", payload.text);
    }

    // Gate awareness query on intent relevance — skip for generic conversational messages
    const conversationContext = buildConversationAwarenessContext(resolved.messages, payload.text);
    const intentRoute = awarenessEngine ? routeAwarenessIntent(payload.text, conversationContext) : null;
    const shouldQueryAwareness =
      awarenessEngine !== null &&
      intentRoute !== null &&
      (awarenessAnswerMode === "evidence-first" || intentRoute.confidence >= 0.35);
    const shouldRefreshAwareness =
      shouldQueryAwareness &&
      intentRoute !== null &&
      (intentRoute.confidence >= 0.45 || intentRoute.signals.length > 0);
    const preferOfficialWindowsKnowledge = shouldPreferOfficialWindowsKnowledge(payload.text, intentRoute);

    const [preparedPromptContext, recentWeb, awarenessQuery, runtimePreview] = await Promise.all([
      preparePromptContext(conversationId, payload.text),
      preferOfficialWindowsKnowledge && !payload.useWebSearch
        ? Promise.resolve({
            status: "off",
            query: payload.text,
            results: []
          } satisfies WebSearchContext)
        : resolveRecentWebContext(payload.text, Boolean(payload.useWebSearch)),
      shouldQueryAwareness
        ? awarenessEngine!.queryAwarenessLive({
            query: payload.text,
            awarenessAnswerMode,
            conversationContext,
            officialKnowledgePolicy: preferOfficialWindowsKnowledge ? "live-fallback" : "mirror-first",
            allowOfficialWindowsKnowledge: preferOfficialWindowsKnowledge,
            refresh: shouldRefreshAwareness,
            hints: {
              force: awarenessAnswerMode === "evidence-first",
              strictGrounding: awarenessAnswerMode === "evidence-first",
              maxScanMs: awarenessAnswerMode === "evidence-first" ? 300 : 200,
              officialKnowledgePolicy: preferOfficialWindowsKnowledge ? "live-fallback" : "mirror-first",
              allowOfficialWindowsKnowledge: preferOfficialWindowsKnowledge
            }
          })
        : Promise.resolve(null),
      buildLatestAgentRuntimePreview()
    ]);
    const awarenessDigest = awarenessEngine?.getDigest() ?? null;
    const machineAwareness = awarenessEngine?.machineAwareness ?? null;
    const fileAwareness = awarenessEngine?.fileAwareness ?? null;
    const screenAwareness = awarenessEngine?.screenAwareness ?? null;
    const officialKnowledge = toOfficialKnowledgeContext(awarenessQuery);
    const groundingSources = buildGroundingSourceCatalog({
      retrievedMemories: preparedPromptContext.retrievedMemories,
      workspaceHits: preparedPromptContext.workspaceHits,
      awarenessQuery,
      officialKnowledge,
      webSearch: recentWeb.status === "used" ? recentWeb : null
    });
    const officialWebContext = recentWeb.status === "used" ? recentWeb : toOfficialWebContext(awarenessQuery);
    const latestContext = finalizePromptContext(
      preparedPromptContext,
      officialWebContext,
      awarenessDigest,
      awarenessQuery,
      awarenessAnswerMode,
      officialKnowledge,
      machineAwareness,
      fileAwareness,
      screenAwareness,
      null,
      runtimePreview
    );
    contextPreview = latestContext.preview;
    const promptMessages = applyPromptPolicies(
      latestContext.promptMessages,
      payload.responseMode,
      awarenessAnswerMode
    );
    const liveUsageAnswer = isLiveUsageAnswer(awarenessQuery) ? awarenessQuery : null;
    const deterministicAwarenessReply = shouldUseDeterministicAwarenessReply(
      awarenessAnswerMode,
      awarenessQuery
    );
    let assistantReply: string;
    let assistantMetadata: ChatMessage["metadata"] | undefined;
    if (deterministicAwarenessReply && awarenessQuery) {
      assistantMetadata = buildAwarenessMessageMetadata(awarenessQuery, payload.text);
      const summarizeFeatureQuery = isFeatureSummaryQuery(payload.text, awarenessQuery);
      if (liveUsageAnswer) {
        assistantReply = formatAwarenessReply(liveUsageAnswer);
        assistantMetadata = buildLiveAwarenessMessageMetadata(liveUsageAnswer, payload.text);
      } else if (summarizeFeatureQuery) {
        try {
          assistantReply = await summarizeFeatureChangesWithLocalAi(awarenessQuery, modelOverride);
        } catch {
          assistantReply = formatAwarenessReply(awarenessQuery);
        }
      } else {
        assistantReply = formatAwarenessReply(awarenessQuery);
      }
      sendRendererEvent(IPC_CHANNELS.chatStream, {
        requestId,
        conversationId,
        content: assistantReply
      });
    } else {
      assistantReply = await provider.chatStream(
        promptMessages,
        (content) => {
          sendRendererEvent(IPC_CHANNELS.chatStream, {
            requestId,
            conversationId,
            content
          });
        },
        modelOverride ? { model: modelOverride } : undefined
      );
      assistantReply = cleanupPlainTextAnswer(assistantReply);
      sendRendererEvent(IPC_CHANNELS.chatStream, {
        requestId,
        conversationId,
        content: assistantReply
      });
    }
    const assistantSources = officialWebContext.status === "used" ? officialWebContext.results : undefined;
    const assistantMessage = await appendChatMessage(
      conversationId,
      "assistant",
      assistantReply,
      assistantSources,
      assistantMetadata
    );

    // Rec #11: use loadConversationRecord directly — conversation is guaranteed to exist here
    const conversationWithMessages =
      (await loadConversationRecord(conversationId)) ?? (await resolveConversation(conversationId));
    scheduleConversationMaintenance(conversationId, payload.text, assistantReply, modelOverride, {
      skipMemories: Boolean(liveUsageAnswer)
    });

    return {
      conversation: conversationWithMessages.conversation,
      assistantMessage,
      messages: conversationWithMessages.messages,
      contextPreview,
      modelStatus: createModelStatus("connected", undefined, modelOverride)
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown chat error";
    const resolved = await resolveConversation(payload.conversationId);
    const assistantMessage = await appendChatMessage(
      resolved.conversation.id,
      "assistant",
      `Local model error: ${detail}`
    );
    const conversationWithMessages = await resolveConversation(resolved.conversation.id);
    return {
      conversation: conversationWithMessages.conversation,
      assistantMessage,
      messages: conversationWithMessages.messages,
      contextPreview,
      modelStatus: createModelStatus(resolveModelErrorStatus(detail), detail, modelOverride)
    };
  } finally {
    busy = false;
    recordAwarenessDuration("sendChat", sendChatStartedAtMs);
  }
  */
};

const handleSendChatAdvanced = async (payload: SendChatRequest): Promise<SendChatResponse> => {
  const sendChatStartedAtMs = Date.now();
  busy = true;
  const requestId = payload.requestId ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const modelOverride = payload.modelOverride?.trim() || undefined;
  const awarenessAnswerMode = normalizeAwarenessAnswerMode(payload.awarenessAnswerMode);
  const reasoningProfile = normalizeReasoningProfile(payload.reasoningProfile);
  const evaluationSuiteMode = payload.runMode === "evaluation" ? payload.evaluationSuiteMode ?? null : null;
  let contextPreview = emptyContextPreview;
  let reasoningTrace: ReasoningTraceState | null = null;
  let rawIntentRoute: ReturnType<typeof routeAwarenessIntent> | null = null;
  let intentRoute: ReturnType<typeof routeAwarenessIntent> | null = null;
  let reasoningMode: ReturnType<typeof detectReasoningMode> | null = null;
  let replyPolicy: ChatReplyPolicy | null = null;
  let awarenessUsed = false;
  let deterministicAwarenessReply = false;
  let genericWritingPromptSuppressed = false;
  let cleanupBypassed = false;
  let routingSuppressionReason: string | null = null;
  let policyDiagnostics: NonNullable<SendChatResponse["diagnostics"]>["policyDiagnostics"] = null;
  let retrievedSourceSummary: NonNullable<SendChatResponse["diagnostics"]>["retrievedSourceSummary"] = null;
  let governedTaskState: ChatGovernedTaskMetadata | null = null;
  let promptIntent: PromptIntentContract | null = null;
  let taskClassification: ReturnType<typeof classifyPromptTask> | null = null;
  let routeDecision: ContextRouteDecision | null = null;
  let runtimeSelection: RuntimeSelectionSummary | null = null;
  let retrievalScopes: string[] = [];
  let selectedTaskSkills: ReturnType<typeof resolveHybridContextPlan>["selectedTaskSkills"] = [];
  let runtimeTaskClass: import("@contracts").RuntimeTaskClass = "general";
  let matchedPromptBehaviorMemories: RetrievedPromptBehaviorMemory[] = [];
  let profileBehavior = getReasoningProfileBehavior(reasoningProfile);
  const codingModeEnabled = payload.codingMode === "on";
  const highQualityModeEnabled = payload.highQualityMode === "on";
  const explicitPlanningPolicy = normalizePlanningPolicy(payload.planningPolicy);
  let resolvedPlanningPolicy: PlanningPolicy | null =
    explicitPlanningPolicy ?? profileBehavior.defaultPlanningPolicy;
  let planningPolicyReason: string | null = explicitPlanningPolicy
    ? "request-override"
    : "profile-default";
  contextPreview = {
    ...contextPreview,
    reasoningProfile,
    planningPolicy: resolvedPlanningPolicy,
    reasoningProfileDiagnostics: {
      planningReason: planningPolicyReason,
      retrievalMode: profileBehavior.retrievalMode,
      governedTaskPosture: profileBehavior.governedTaskPosture
    }
  };

  const buildExecutionDiagnostics = (): NonNullable<SendChatResponse["diagnostics"]> =>
    buildChatExecutionDiagnostics({
      reasoningProfile,
      planningPolicy: resolvedPlanningPolicy,
      routeDecision,
      runtimeSelection,
      intentRoute,
      rawIntentRoute,
      awarenessUsed,
      deterministicAwareness: deterministicAwarenessReply,
      genericWritingPromptSuppressed,
      replyPolicy,
      policyDiagnostics,
      cleanupBypassed,
      routingSuppressionReason,
      retrievedSourceSummary,
      reasoningMode: reasoningMode?.mode ?? null,
      evaluationSuiteMode,
      taskState: governedTaskState,
      promptIntent
    });

  try {
    const resolved = await resolveConversation(payload.conversationId);
    const conversationId = resolved.conversation.id;
    if (payload.regenerate) {
      await removeLastAssistantMessage(conversationId);
    } else {
      await appendChatMessage(conversationId, "user", payload.text);
    }

    const conversationAfterTurn =
      (await loadConversationRecord(conversationId)) ?? (await resolveConversation(conversationId));
    const governedTurn = await governedChatService.handleTurn({
      requestId,
      conversationId,
      text: payload.text,
      messages: conversationAfterTurn.messages,
      workspaceRoot: process.cwd(),
      desktopPath: app.getPath("desktop"),
      documentsPath: app.getPath("documents"),
      runtimeRoot: desktopActionPaths.runtimeRoot,
      desktopActions,
      workflowOrchestrator,
      getMachineAwareness: () => awarenessEngine?.machineAwareness ?? null,
      getFileAwareness: () => awarenessEngine?.fileAwareness?.summary ?? null,
      getScreenAwareness: () => awarenessEngine?.screenAwareness ?? null,
      reasoningProfile,
      preferGovernedTaskFraming: profileBehavior.governance.preferGovernedTaskFraming,
      clarifyBroadTargets: profileBehavior.governance.clarifyBroadTargets
    });

    if (governedTurn.handled) {
      governedTaskState = governedTurn.taskState;
      const assistantMetadata = governedTaskState ? { task: governedTaskState } : undefined;
      const assistantMessage = await appendChatMessage(
        conversationId,
        "assistant",
        governedTurn.assistantReply,
        undefined,
        assistantMetadata
      );
      const conversationWithMessages =
        (await loadConversationRecord(conversationId)) ?? (await resolveConversation(conversationId));
      if (payload.runMode !== "evaluation") {
        const maintenanceReply = governedTurn.taskState?.reportMarkdown?.trim()
          ? governedTurn.taskState.reportSummary ?? governedTurn.executionResult?.reportSummary ?? governedTurn.assistantReply
          : governedTurn.assistantReply;
        scheduleConversationMaintenance(conversationId, payload.text, maintenanceReply, modelOverride, {
          skipMemories: false
        });
      }

      return {
        conversation: conversationWithMessages.conversation,
        assistantMessage,
        messages: conversationWithMessages.messages,
        contextPreview,
        modelStatus: createModelStatus("connected", undefined, modelOverride),
        diagnostics: buildExecutionDiagnostics(),
        taskState: governedTaskState
      };
    }

    const ragOptions: RagOptions = payload.ragOptions ?? {};
    const ragEnabledByDefault = ragOptions.defaultEnabled ?? true;
    const showTrace = resolveToggleMode(ragOptions.showTrace, ragOptions.defaultShowTrace ?? false);
    const baseResolvedUseWeb =
      payload.useWebSearch ?? resolveToggleMode(ragOptions.useWeb, ragOptions.defaultUseWeb ?? false);
    const conversationContext = buildConversationAwarenessContext(resolved.messages, payload.text);
    rawIntentRoute = awarenessEngine ? routeAwarenessIntent(payload.text, conversationContext) : null;
    const isChatOnlyEvaluation =
      payload.runMode === "evaluation" && evaluationSuiteMode === "chat-only";
    taskClassification = classifyPromptTask(payload.text, {
      route: rawIntentRoute,
      useWebSearch: Boolean(baseResolvedUseWeb)
    });
    const resolvedUseWeb = resolveProfileAwareWebSearch({
      resolvedUseWeb: Boolean(baseResolvedUseWeb),
      taskClassification,
      behavior: profileBehavior
    });
    if (resolvedUseWeb !== Boolean(baseResolvedUseWeb)) {
      taskClassification = classifyPromptTask(payload.text, {
        route: rawIntentRoute,
        useWebSearch: resolvedUseWeb
      });
    }
    reasoningMode = detectReasoningMode({
      query: payload.text,
      ragEnabled: ragEnabledByDefault,
      override: ragOptions.enabled
    });
    const profileState = resolveReasoningProfileState({
      reasoningProfile,
      requestedPlanningPolicy: payload.planningPolicy,
      reasoningMode: reasoningMode.mode,
      taskClassification
    });
    profileBehavior = applyReasoningProfileModifiers(profileState.behavior, {
      codingMode: codingModeEnabled,
      highQualityMode: highQualityModeEnabled
    });
    resolvedPlanningPolicy = profileState.planningPolicy;
    planningPolicyReason = profileState.planningReason;
    const workspaceIndexingEnabled =
      (ragOptions.workspaceIndexingEnabled ?? true) && profileBehavior.retrieval.workspaceHitLimit > 0;

    const genericWritingPrompt = taskClassification.categories.generic_writing;
    const explicitWindowsAwarenessPrompt = taskClassification.categories.awareness_local_state;
    replyPolicy = resolveReplyPolicy(payload.text, {
      explicitWindowsAwarenessPrompt,
      useWebSearch: Boolean(resolvedUseWeb),
      overrides: payload.replyPolicy,
      classification: taskClassification,
      reasoningProfile
    });
    cleanupBypassed = shouldBypassCleanup(payload.runMode, replyPolicy);
    routingSuppressionReason = getRoutingSuppressionReason(payload.text, replyPolicy, {
      classification: taskClassification
    });
    policyDiagnostics = getReplyPolicyDiagnostics(payload.text, replyPolicy, {
      classification: taskClassification
    });
    intentRoute = rawIntentRoute;
    genericWritingPromptSuppressed = genericWritingPrompt && !isChatOnlyEvaluation;
    const awarenessRouting = resolveAwarenessRouting({
      explicitWindowsAwarenessPrompt,
      routeConfidence: intentRoute?.confidence ?? 0,
      hasRouteSignals: (intentRoute?.signals.length ?? 0) > 0,
      awarenessAnswerMode,
      isEvaluationChatOnly: isChatOnlyEvaluation,
      genericWritingPromptSuppressed: genericWritingPrompt && !isChatOnlyEvaluation,
      routingSuppressionReason,
      behavior: profileBehavior
    });
    const routePlan = resolveHybridContextPlan({
      query: payload.text,
      taskClassification,
      replyPolicySourceScope: replyPolicy?.sourceScope ?? null,
      codingMode: codingModeEnabled,
      highQualityMode: highQualityModeEnabled,
      hasImageEvidence: false,
      conversationMessageCount: resolved.messages.length
    });
    routeDecision = routePlan.routeDecision;
    selectedTaskSkills = routePlan.selectedTaskSkills;
    retrievalScopes = routePlan.retrievalScopes;
    runtimeTaskClass = resolveRuntimeTaskClass(
      {
        codingMode: codingModeEnabled,
        highQualityMode: highQualityModeEnabled
      },
      false
    );
    const shouldQueryAwareness =
      awarenessEngine !== null && intentRoute !== null && awarenessRouting.shouldQueryAwareness;
    const shouldRefreshAwareness =
      shouldQueryAwareness && intentRoute !== null && awarenessRouting.shouldRefreshAwareness;
    const preferOfficialWindowsKnowledge =
      shouldQueryAwareness && shouldPreferOfficialWindowsKnowledge(payload.text, intentRoute);

    reasoningTrace = createReasoningTraceState({
      requestId,
      conversationId,
      mode: reasoningMode.mode,
      triggerReason: reasoningMode.triggerReason,
      visible: showTrace,
      includeWeb: resolvedUseWeb,
      includeWorkspace:
        reasoningMode.mode === "advanced" &&
        workspaceIndexingEnabled &&
        routeDecision?.mode !== "cache_only"
    });
    reasoningTrace = startTraceStage(reasoningTrace, "route");
    reasoningTrace = completeTraceStage(reasoningTrace, "route", {
      summary: `${reasoningMode.mode} path`,
      detail: [
        reasoningMode.triggerReason,
        `score ${reasoningMode.complexityScore.toFixed(2)}`,
        `profile ${reasoningProfile}`,
        `runtime ${runtimeTaskClass}`,
        `planning ${resolvedPlanningPolicy ?? "none"}`,
        planningPolicyReason ? `planning reason ${planningPolicyReason}` : null,
        replyPolicy ? `scope ${replyPolicy.sourceScope}` : null,
        routeDecision ? `route ${routeDecision.mode}` : null,
        codingModeEnabled ? "coding mode" : null,
        highQualityModeEnabled ? "high quality mode" : null,
        `classifier ${formatClassifierCategories(policyDiagnostics?.classifier)}`,
        shouldQueryAwareness ? "awareness on" : "awareness off",
        genericWritingPromptSuppressed ? "generic writing prompt suppressed" : null,
        routingSuppressionReason
      ]
        .filter(Boolean)
        .join(" | ")
    });
    sendReasoningTrace(reasoningTrace);

    reasoningTrace = startTraceStage(reasoningTrace, "retrieve-memory");
    sendReasoningTrace(reasoningTrace);
    const preparedPromptContext = await preparePromptContext(conversationId, payload.text, {
      enableSemanticMemory: reasoningMode.mode === "advanced" && profileBehavior.retrieval.semanticMemory,
      memoryEmbedder:
        reasoningMode.mode === "advanced" && profileBehavior.retrieval.semanticMemory && provider.embeddings
          ? (text) =>
              provider.embeddings!(text, {
                taskClass: "embedding",
                codingMode: codingModeEnabled,
                highQualityMode: highQualityModeEnabled,
                reason: "memory retrieval embeddings"
              })
          : undefined,
      routeDecision,
      retrievalProfile: {
        stableMemoryLimit: profileBehavior.retrieval.stableMemoryLimit,
        keywordMemoryLimit: profileBehavior.retrieval.keywordMemoryLimit,
        semanticMemoryLimit: profileBehavior.retrieval.semanticMemoryLimit,
        maxRetrievedMemories: profileBehavior.retrieval.maxRetrievedMemories,
        promptBehaviorMemoryLimit: profileBehavior.retrieval.promptBehaviorMemoryLimit,
        workspaceHitLimit: profileBehavior.retrieval.workspaceHitLimit
      }
    });
    matchedPromptBehaviorMemories = preparedPromptContext.promptBehaviorMemories;
    reasoningTrace = updateTraceRetrieval(
      reasoningTrace,
      mergeRetrievalStats(createEmptyRetrievalStats(), preparedPromptContext.retrieval)
    );
    reasoningTrace = completeTraceStage(reasoningTrace, "retrieve-memory", {
      summary: `${preparedPromptContext.retrievedMemories.length} retrieved memories`,
      detail:
        preparedPromptContext.retrieval.memorySemantic > 0
          ? `${preparedPromptContext.retrieval.memoryKeyword} keyword | ${preparedPromptContext.retrieval.memorySemantic} semantic`
          : `${preparedPromptContext.retrieval.memoryKeyword} keyword`,
      sourceCount:
        preparedPromptContext.retrieval.memoryKeyword + preparedPromptContext.retrieval.memorySemantic
    });
    sendReasoningTrace(reasoningTrace);

    if (reasoningMode.mode === "advanced" && workspaceIndexingEnabled && routeDecision?.mode !== "cache_only") {
      reasoningTrace = startTraceStage(reasoningTrace, "retrieve-workspace");
      sendReasoningTrace(reasoningTrace);
      const workspaceResult = await queryWorkspaceIndex(payload.text, {
        workspaceRoot: process.cwd(),
        runtimeRoot: awarenessEngine?.paths.runtimeRoot ?? path.join(process.cwd(), ".runtime", "awareness"),
        enabled: true,
        mode: "incremental",
        retrievalHint: routeDecision?.retrievalHint ?? null,
        embedder:
          profileBehavior.retrieval.semanticMemory && provider.embeddings
            ? (text) =>
                provider.embeddings!(text, {
                  taskClass: "embedding",
                  codingMode: codingModeEnabled,
                  highQualityMode: highQualityModeEnabled,
                  reason: "workspace retrieval embeddings"
                })
            : undefined
      });
      const filteredWorkspaceHits = filterWorkspaceHitsForReplyPolicy(
        workspaceResult.hits,
        replyPolicy?.sourceScope ?? "workspace-only"
      );
      preparedPromptContext.workspaceHits = filteredWorkspaceHits.slice(
        0,
        profileBehavior.retrieval.workspaceHitLimit
      );
      preparedPromptContext.workspaceIndexStatus = workspaceResult.status;
      preparedPromptContext.retrieval = mergeRetrievalStats(preparedPromptContext.retrieval, {
        workspace: preparedPromptContext.workspaceHits.length
      });
      reasoningTrace = updateTraceRetrieval(reasoningTrace, preparedPromptContext.retrieval);
      reasoningTrace = completeTraceStage(reasoningTrace, "retrieve-workspace", {
        summary: `${preparedPromptContext.workspaceHits.length} workspace chunks`,
        detail:
          replyPolicy?.sourceScope && workspaceResult.hits.length !== preparedPromptContext.workspaceHits.length
            ? `${workspaceResult.status.detail ?? "workspace filtered"} | scoped to ${replyPolicy.sourceScope}${
                routeDecision?.retrievalHint ? " | route-hinted" : ""
              }`
            : workspaceResult.status.detail,
        sourceCount: preparedPromptContext.workspaceHits.length
      });
      sendReasoningTrace(reasoningTrace);
    } else {
      reasoningTrace = startTraceStage(reasoningTrace, "retrieve-workspace");
      reasoningTrace = completeTraceStage(reasoningTrace, "retrieve-workspace", {
        summary:
          routeDecision?.mode === "cache_only"
            ? "Workspace retrieval skipped by cache-only route"
            : "Workspace retrieval disabled",
        detail: routeDecision?.mode === "cache_only" ? routeDecision.reason : null
      });
      sendReasoningTrace(reasoningTrace);
    }

    reasoningTrace = startTraceStage(reasoningTrace, "retrieve-awareness");
    sendReasoningTrace(reasoningTrace);
    const awarenessQuery = shouldQueryAwareness
      ? await awarenessEngine!.queryAwarenessLive({
          query: payload.text,
          awarenessAnswerMode,
          conversationContext,
          officialKnowledgePolicy: preferOfficialWindowsKnowledge ? "live-fallback" : "mirror-first",
          allowOfficialWindowsKnowledge: preferOfficialWindowsKnowledge,
          refresh: shouldRefreshAwareness,
          hints: {
            force: awarenessAnswerMode === "evidence-first" && explicitWindowsAwarenessPrompt,
            strictGrounding: awarenessAnswerMode === "evidence-first" && explicitWindowsAwarenessPrompt,
            maxScanMs: awarenessAnswerMode === "evidence-first" && explicitWindowsAwarenessPrompt ? 300 : 200,
            officialKnowledgePolicy: preferOfficialWindowsKnowledge ? "live-fallback" : "mirror-first",
            allowOfficialWindowsKnowledge: preferOfficialWindowsKnowledge
          }
        })
      : null;
    awarenessUsed = awarenessQuery !== null;
    preparedPromptContext.retrieval = mergeRetrievalStats(preparedPromptContext.retrieval, {
      awareness: awarenessQuery ? Math.max(1, awarenessQuery.bundle.evidenceTraceIds.length) : 0
    });
    reasoningTrace = updateTraceRetrieval(reasoningTrace, preparedPromptContext.retrieval);
    reasoningTrace = completeTraceStage(reasoningTrace, "retrieve-awareness", {
      summary: awarenessQuery ? awarenessQuery.intent.label : "No awareness query used",
      detail: awarenessQuery ? awarenessQuery.bundle.confidenceLevel : null,
      sourceCount: awarenessQuery ? Math.max(1, awarenessQuery.bundle.evidenceTraceIds.length) : 0
    });
    sendReasoningTrace(reasoningTrace);

    if (resolvedUseWeb) {
      reasoningTrace = startTraceStage(reasoningTrace, "retrieve-web");
      sendReasoningTrace(reasoningTrace);
    }
    const recentWeb =
      preferOfficialWindowsKnowledge && !resolvedUseWeb
        ? ({
            status: "off",
            query: payload.text,
            results: []
          } satisfies WebSearchContext)
        : await resolveRecentWebContext(payload.text, Boolean(resolvedUseWeb));
    const awarenessDigest = awarenessEngine?.getDigest() ?? null;
    const machineAwareness = awarenessEngine?.machineAwareness ?? null;
    const fileAwareness = awarenessEngine?.fileAwareness ?? null;
    const screenAwareness = awarenessEngine?.screenAwareness ?? null;
    const officialKnowledge = toOfficialKnowledgeContext(awarenessQuery);
    const officialWebContext = recentWeb.status === "used" ? recentWeb : toOfficialWebContext(awarenessQuery);
    retrievedSourceSummary = buildRetrievedSourceSummary({
      memoryCount: preparedPromptContext.retrievedMemories.length,
      workspaceHitCount: preparedPromptContext.workspaceHits.length,
      workspacePaths: summarizeWorkspacePaths(preparedPromptContext.workspaceHits),
      awarenessSourceCount: awarenessQuery ? Math.max(1, awarenessQuery.bundle.evidenceTraceIds.length) : 0,
      webResultCount: officialWebContext.status === "used" ? officialWebContext.results.length : 0
    });
    promptIntent = buildSeedPromptIntent({
      query: payload.text,
      route: intentRoute,
      replyPolicy,
      responseMode: payload.responseMode,
      reasoningMode: reasoningMode.mode,
      taskClassification,
      hasWorkspaceHits: preparedPromptContext.workspaceHits.length > 0,
      hasAwarenessEvidence: awarenessQuery !== null,
      hasLiveWebResults: officialWebContext.status === "used" && officialWebContext.results.length > 0,
      useWebSearch: Boolean(resolvedUseWeb),
      preferOfficialWindowsKnowledge
    });
    matchedPromptBehaviorMemories = await matchPromptBehaviorMemoryRecords(payload.text, promptIntent);
    preparedPromptContext.promptBehaviorMemories = matchedPromptBehaviorMemories;
    const cachePackResult = await resolveContextCachePacks({
      workspaceRoot: process.cwd(),
      runtimeRoot: awarenessEngine?.paths.runtimeRoot ?? path.join(process.cwd(), ".runtime", "awareness"),
      routeDecision: routeDecision ?? {
        mode: "cache_plus_retrieval",
        reason: "fallback route",
        reasons: ["fallback route"],
        codingMode: codingModeEnabled,
        highQualityMode: highQualityModeEnabled,
        freshEvidenceRequired: false,
        selectedTaskSkillIds: [],
        selectedPackTypes: ["memory_context"],
        retrievalHint: null
      },
      selectedTaskSkills,
      conversationId,
      latestUserMessage: payload.text,
      summaryText: preparedPromptContext.summaryText,
      promptIntent,
      stableMemories: preparedPromptContext.stableMemories,
      retrievedMemories: preparedPromptContext.retrievedMemories,
      promptBehaviorMemories: matchedPromptBehaviorMemories,
      recentTouchedPaths: summarizeWorkspacePaths(preparedPromptContext.workspaceHits),
      awarenessDigest: awarenessEngine?.getDigest() ?? null
    });
    preparedPromptContext.cachePacks = cachePackResult.packs;
    preparedPromptContext.cachePackSummaries = cachePackResult.summaries;
    preparedPromptContext.routeDecision = routeDecision ?? null;
    const groundingSources = buildGroundingSourceCatalog({
      retrievedMemories: preparedPromptContext.retrievedMemories,
      workspaceHits: preparedPromptContext.workspaceHits,
      awarenessQuery,
      officialKnowledge,
      webSearch: officialWebContext.status === "used" ? officialWebContext : null
    });
    preparedPromptContext.retrieval = mergeRetrievalStats(preparedPromptContext.retrieval, {
      web: officialWebContext.status === "used" ? officialWebContext.results.length : 0
    });
    reasoningTrace = updateTraceRetrieval(reasoningTrace, preparedPromptContext.retrieval);
    if (resolvedUseWeb) {
      reasoningTrace = completeTraceStage(reasoningTrace, "retrieve-web", {
        summary:
          officialWebContext.status === "used"
            ? `${officialWebContext.results.length} web results`
            : recentWeb.status === "no_results"
              ? "No web results"
              : "Web retrieval unavailable",
        detail: recentWeb.status === "error" ? recentWeb.error ?? null : null,
        sourceCount: officialWebContext.status === "used" ? officialWebContext.results.length : 0
      });
      sendReasoningTrace(reasoningTrace);
    }

    const ragContextBase: RagContextPreview = {
      enabled: ragEnabledByDefault || ragOptions.enabled === "on",
      mode: reasoningMode.mode,
      triggerReason: reasoningMode.triggerReason,
      routeMode: routeDecision?.mode ?? null,
      retrievalScopes,
      retrieval: preparedPromptContext.retrieval,
      traceSummary: null,
      workspaceIndex: preparedPromptContext.workspaceIndexStatus,
      workspaceHits: preparedPromptContext.workspaceHits
    };
    const runtimePreview = await buildLatestAgentRuntimePreview();
    const latestContext = finalizePromptContext(
      preparedPromptContext,
      officialWebContext,
      awarenessDigest,
      awarenessQuery,
      awarenessAnswerMode,
      officialKnowledge,
      machineAwareness,
      fileAwareness,
      screenAwareness,
      ragContextBase,
      runtimePreview,
      {
        contextBudget: profileBehavior.contextBudget,
        reasoningProfile,
        planningPolicy: resolvedPlanningPolicy,
        routeDecision,
        cachePacks: preparedPromptContext.cachePacks ?? [],
        cachePackSummaries: preparedPromptContext.cachePackSummaries ?? [],
        reasoningProfileDiagnostics: {
          planningReason: planningPolicyReason,
          retrievalMode: profileBehavior.retrievalMode,
          governedTaskPosture: profileBehavior.governedTaskPosture
        }
      }
    );
    contextPreview = {
      ...latestContext.preview,
      replyPolicy,
      promptIntent
    };
    const promptMessages = applyPromptPolicies(
      latestContext.promptMessages,
      payload.responseMode,
      awarenessAnswerMode,
      reasoningMode.mode,
      replyPolicy,
      promptIntent,
      reasoningProfile,
      resolvedPlanningPolicy
    );
    const liveUsageAnswer = isLiveUsageAnswer(awarenessQuery) ? awarenessQuery : null;
    deterministicAwarenessReply = shouldUseDeterministicAwarenessReply(
      explicitWindowsAwarenessPrompt,
      awarenessAnswerMode,
      awarenessQuery,
      replyPolicy
    );
    let assistantReply: string;
    let assistantMetadata: ChatMessage["metadata"] | undefined;
    if (shouldRunPlanningStage(resolvedPlanningPolicy ?? "off", reasoningMode.mode)) {
      if (!deterministicAwarenessReply) {
        const seedPromptIntent = promptIntent!;
        reasoningTrace = startTraceStage(reasoningTrace, "plan");
        sendReasoningTrace(reasoningTrace);
        promptIntent = await planPromptIntent({
          promptMessages,
          query: payload.text,
          seedPromptIntent,
          model: modelOverride,
          runPlanner: (messages, options) =>
            chatExecution.runChat(messages, {
              ...options,
              taskClass: runtimeTaskClass,
              codingMode: codingModeEnabled,
              highQualityMode: highQualityModeEnabled,
              reason: "prompt planner"
            })
        });
        matchedPromptBehaviorMemories = await matchPromptBehaviorMemoryRecords(payload.text, promptIntent);
        reasoningTrace = completeTraceStage(reasoningTrace, "plan", {
          summary: promptIntent.userGoal || "Built a structured prompt intent",
          detail: [
            promptIntent.intentFamily,
            promptIntent.outputContract.shape,
            promptIntent.constraints.slice(0, 2).join(" | ")
          ]
            .filter(Boolean)
            .join(" | ")
        });
        sendReasoningTrace(reasoningTrace);
      } else {
        reasoningTrace = completeTraceStage(reasoningTrace, "plan", {
          summary: "Skipped plan for deterministic grounded reply"
        });
        sendReasoningTrace(reasoningTrace);
      }
    } else {
      reasoningTrace = completeTraceStage(reasoningTrace, "plan", {
        summary: "Planning disabled by policy"
      });
      sendReasoningTrace(reasoningTrace);
    }

    reasoningTrace = startTraceStage(reasoningTrace, "synthesize");
    sendReasoningTrace(reasoningTrace);
    if (deterministicAwarenessReply && awarenessQuery) {
      assistantMetadata = buildAwarenessMessageMetadata(awarenessQuery, payload.text);
      if (liveUsageAnswer) {
        assistantReply = formatAwarenessReply(liveUsageAnswer);
        assistantMetadata = buildLiveAwarenessMessageMetadata(liveUsageAnswer, payload.text);
      } else if (isFeatureSummaryQuery(payload.text, awarenessQuery)) {
        try {
          assistantReply = await summarizeFeatureChangesWithLocalAi(awarenessQuery, modelOverride);
        } catch {
          assistantReply = formatAwarenessReply(awarenessQuery);
        }
      } else {
        assistantReply = formatAwarenessReply(awarenessQuery);
      }
      sendRendererEvent(IPC_CHANNELS.chatStream, {
        requestId,
        conversationId,
        content: assistantReply
      });
      runtimeSelection = summarizeFeatureQuery ? provider.getRuntimeSelection?.() ?? null : null;
    } else {
      const synthesisMessages = createSynthesisMessages(
        promptMessages,
        reasoningMode.mode === "advanced" ? promptIntent : null
      );
      assistantReply = await chatExecution.runChatStream(
        synthesisMessages,
        (content) => {
          sendRendererEvent(IPC_CHANNELS.chatStream, {
            requestId,
            conversationId,
            content
          });
        },
        {
          model: modelOverride,
          taskClass: runtimeTaskClass,
          codingMode: codingModeEnabled,
          highQualityMode: highQualityModeEnabled,
          reason: "assistant synthesis"
        }
      );
      if (!cleanupBypassed) {
        assistantReply = cleanupPlainTextAnswer(assistantReply);
      }
      runtimeSelection = provider.getRuntimeSelection?.() ?? null;
      sendRendererEvent(IPC_CHANNELS.chatStream, {
        requestId,
        conversationId,
        content: assistantReply
      });
    }
    reasoningTrace = completeTraceStage(reasoningTrace, "synthesize", {
      summary: `Generated ${assistantReply.length} chars`,
      detail: deterministicAwarenessReply
        ? "Deterministic grounded reply"
        : `${promptIntent?.outputContract.shape ?? "streamed synthesis"} | ${promptIntent?.sourceScope ?? "default scope"}`
    });
    sendReasoningTrace(reasoningTrace);

    reasoningTrace = startTraceStage(reasoningTrace, "verify");
    reasoningTrace = updateTraceRetrieval(reasoningTrace, preparedPromptContext.retrieval);
    const groundedReply = await groundAssistantReply({
      answerText: assistantReply,
      sources: groundingSources,
      routeReason: reasoningMode.triggerReason,
      awarenessQuery,
      deterministicAwareness: deterministicAwarenessReply,
      sourceScopeApplied: replyPolicy?.sourceScope ?? null,
      runVerifier: profileBehavior.grounding.runModelVerifier
        ? (messages) =>
            chatExecution.runChat(messages, {
              model: modelOverride,
              taskClass: runtimeTaskClass,
              codingMode: codingModeEnabled,
              highQualityMode: highQualityModeEnabled,
              reason: "grounding verifier"
            })
        : undefined
    });
    const verificationConfidence = groundedReply.metadata.summary.overallConfidence;
    reasoningTrace = updateTraceGrounding(reasoningTrace, groundedReply.metadata.summary);
    reasoningTrace = completeTraceStage(reasoningTrace, "verify", {
      summary: `${verificationConfidence} confidence | ${Math.round(
        groundedReply.metadata.summary.citationCoverage * 100
      )}% cited`,
      detail: `Claims ${groundedReply.metadata.summary.claimCount} | unsupported ${groundedReply.metadata.summary.unsupportedClaimCount} | conflicts ${groundedReply.metadata.summary.conflictedClaimCount}`,
      sourceCount: groundedReply.metadata.summary.usedSourceCount
    });
    reasoningTrace = finalizeReasoningTrace(reasoningTrace, {
      confidence: verificationConfidence
    });
    sendReasoningTrace(reasoningTrace);

    const ragTraceSummary = toReasoningTraceSummary(reasoningTrace);
    const ragContext: RagContextPreview = {
      ...ragContextBase,
      retrieval: preparedPromptContext.retrieval,
      traceSummary: ragTraceSummary,
      workspaceIndex: preparedPromptContext.workspaceIndexStatus,
      workspaceHits: preparedPromptContext.workspaceHits
    };
    contextPreview = {
      ...contextPreview,
      workspaceHits: preparedPromptContext.workspaceHits,
      routeDecision,
      cachePacks: preparedPromptContext.cachePackSummaries ?? [],
      runtimeSelection,
      rag: ragContext,
      grounding: groundedReply.metadata.summary,
      retrievalEval: groundedReply.retrievalEval,
      promptIntent
    };
    assistantMetadata = {
      ...(assistantMetadata ?? {}),
      rag: {
        mode: ragContext.mode,
        triggerReason: ragContext.triggerReason,
        retrieval: ragContext.retrieval,
        traceSummary: ragTraceSummary
      },
      grounding: groundedReply.metadata
    };

    // Phase 3: Apply reply-policy overlay consumption (weak fallback rewriting)
    // This is the latest safe point before persistence, after grounding has completed.
    // The overlay service will:
    // 1. Check if reply looks like a weak fallback (keyword patterns)
    // 2. Find matching rules based on user context (category-specific matching)
    // 3. Apply highest-confidence rule if both user context and reply match
    let finalAssistantReply = assistantReply;
    if (getImprovementRuntimeService()) {
      try {
        const overlayService = getImprovementRuntimeService()!.getReplyPolicyOverlay();
        const overlayResult = await overlayService.applyOverlay(
          assistantReply,
          payload.text,  // CORRECTED: Pass user prompt for category-context matching
          undefined      // sourceEventIdHint not yet available at reply generation time
        );
        if (overlayResult.applied && overlayResult.adaptedReply) {
          finalAssistantReply = overlayResult.adaptedReply;
          // Store overlay metadata for analytics
          assistantMetadata = {
            ...assistantMetadata,
            overlayApplied: {
              ruleId: overlayResult.ruleId,
              matchedFingerprint: overlayResult.matchedFingerprint,
              confidence: overlayResult.confidence
            }
          };
        }
      } catch (err) {
        console.error("[Main] Error applying overlay:", err);
        // Graceful degradation: use original reply if overlay fails
      }
    }

    const assistantSources = officialWebContext.status === "used" ? officialWebContext.results : undefined;
    const assistantMessage = await appendChatMessage(
      conversationId,
      "assistant",
      finalAssistantReply,
      assistantSources,
      assistantMetadata
    );

    // Hook: Trigger improvement analysis (non-blocking, background execution)
    if (!payload.regenerate && getImprovementRuntimeService()) {
      const lastUserMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: payload.text,
        timestamp: new Date().toISOString()
      };
      void getImprovementRuntimeService()?.analyzeReply(lastUserMessage, assistantMessage);
    }

    const conversationWithMessages =
      (await loadConversationRecord(conversationId)) ?? (await resolveConversation(conversationId));
    if (payload.runMode !== "evaluation") {
      if (promptIntent) {
        rememberPromptIntentBridgeContext(conversationId, promptIntent, matchedPromptBehaviorMemories);
      }
      if (matchedPromptBehaviorMemories.length > 0) {
        await markPromptBehaviorRecordsApplied(
          matchedPromptBehaviorMemories.map((entry) => entry.entry.id)
        );
      }
      await persistPromptBehaviorFromTurn({
        conversationId,
        query: payload.text,
        promptIntent,
        taskClassification,
        assistantReply,
        verificationConfidence
      });
      scheduleConversationMaintenance(conversationId, payload.text, assistantReply, modelOverride, {
        skipMemories: Boolean(liveUsageAnswer)
      });
    }

    // Log conversation turn (prompts + replies) to persistent file
    try {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: payload.text,
        timestamp: new Date().toISOString()
      };
      const dataDir = path.join(process.cwd(), "data");
      await logConversationTurn(
        dataDir,
        conversationId,
        userMessage,
        assistantMessage,
        modelOverride || provider.model,
        {
          responseMode: payload.responseMode,
          ragEnabled: payload.ragOptions?.enabled !== "off",
          webSearchEnabled: payload.useWebSearch,
          codingModeEnabled: payload.codingMode === "on",
          highQualityModeEnabled: payload.highQualityMode === "on"
        },
        {
          requestId,
          reasoningProfile,
          planningPolicy: resolvedPlanningPolicy
        }
      );
    } catch (loggingError) {
      // Don't crash chat if logging fails
      console.warn(
        "Failed to log conversation turn:",
        loggingError instanceof Error ? loggingError.message : String(loggingError)
      );
    }

    return {
      conversation: conversationWithMessages.conversation,
      assistantMessage,
      messages: conversationWithMessages.messages,
      contextPreview,
      modelStatus: createModelStatus("connected", undefined, modelOverride, runtimeSelection?.model ?? null),
      diagnostics: buildExecutionDiagnostics()
    };
  } catch (error) {
    if (reasoningTrace) {
      reasoningTrace = failTraceStage(
        reasoningTrace,
        "synthesize",
        error instanceof Error ? error.message : "Unknown chat error"
      );
      reasoningTrace = finalizeReasoningTrace(reasoningTrace, { confidence: "low" });
      sendReasoningTrace(reasoningTrace);
    }
    const detail = error instanceof Error ? error.message : "Unknown chat error";
    const resolved = await resolveConversation(payload.conversationId);
    const assistantMessage = await appendChatMessage(
      resolved.conversation.id,
      "assistant",
      `Local model error: ${detail}`
    );
    const conversationWithMessages = await resolveConversation(resolved.conversation.id);
    return {
      conversation: conversationWithMessages.conversation,
      assistantMessage,
      messages: conversationWithMessages.messages,
      contextPreview,
      modelStatus: createModelStatus(
        resolveModelErrorStatus(detail),
        detail,
        modelOverride,
        runtimeSelection?.model ?? null
      ),
      diagnostics: buildExecutionDiagnostics()
    };
  } finally {
    busy = false;
    recordAwarenessDuration("sendChat", sendChatStartedAtMs);
  }
};

const runPromptEvaluation = async (
  request: PromptEvaluationRequest
): Promise<PromptEvaluationResponse> => {
  const normalizedCases = normalizePromptEvaluationCases(request.cases);
  if (normalizedCases.length === 0) {
    throw new Error("Add at least one prompt before running a prompt evaluation.");
  }

  const workspaceRoot = process.cwd();
  const suiteName = request.suiteName?.trim() || DEFAULT_PROMPT_EVAL_SUITE_NAME;
  const results: PromptEvaluationCaseResult[] = [];

  for (const entry of normalizedCases) {
    const startedAt = new Date().toISOString();
    let conversationId: string | null = null;

    try {
      const conversation = await createConversationRecord();
      conversationId = conversation.id;

      const response = await handleSendChatAdvanced({
        conversationId,
        text: entry.prompt,
        requestId: `prompt-eval-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        runMode: "evaluation",
        evaluationSuiteMode: request.suiteMode,
        reasoningProfile: entry.reasoningProfile ?? request.reasoningProfile,
        planningPolicy: entry.planningPolicy ?? request.planningPolicy,
        useWebSearch: request.useWebSearch,
        modelOverride: request.modelOverride,
        responseMode: request.responseMode,
        awarenessAnswerMode: request.awarenessAnswerMode,
        codingMode: request.codingMode,
        highQualityMode: request.highQualityMode,
        ragOptions: request.ragOptions,
        replyPolicy: {
          ...(entry.replyPolicy ?? {}),
          ...(entry.sourceScopeHint ? { sourceScope: entry.sourceScopeHint } : {}),
          ...(entry.formatPolicy ? { formatPolicy: entry.formatPolicy } : {})
        }
      });

      const completedAt = new Date().toISOString();
      const status = response.modelStatus.status === "error" ? "error" : "success";
      const routing = buildPromptEvaluationRoutingReport(response.diagnostics);
      const groundingSummary =
        response.assistantMessage.metadata?.grounding?.summary ?? response.contextPreview.grounding ?? null;
      const evaluation = evaluatePromptEvaluationCase(
        entry,
        response.assistantMessage.content,
        routing,
        status,
        groundingSummary
      );
      results.push({
        ...entry,
        reply: response.assistantMessage.content,
        startedAt,
        completedAt,
        durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
        status,
        qualityStatus: evaluation.qualityStatus,
        modelStatus: response.modelStatus,
        traceSummary:
          response.assistantMessage.metadata?.rag?.traceSummary ??
          response.contextPreview.rag?.traceSummary ??
          null,
        routing,
        checkResults: evaluation.checkResults
      });
    } catch (error) {
      const completedAt = new Date().toISOString();
      const detail = error instanceof Error ? error.message : "Unknown prompt evaluation error";
      const routing = buildPromptEvaluationRoutingReport(undefined);
      const evaluation = evaluatePromptEvaluationCase(
        entry,
        `Prompt evaluation failed: ${detail}`,
        routing,
        "error",
        null
      );
      results.push({
        ...entry,
        reply: `Prompt evaluation failed: ${detail}`,
        startedAt,
        completedAt,
        durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
        status: "error",
        qualityStatus: evaluation.qualityStatus,
        modelStatus: createModelStatus(
          resolveModelErrorStatus(detail),
          detail,
          request.modelOverride?.trim() || undefined
        ),
        traceSummary: null,
        routing,
        checkResults: evaluation.checkResults
      });
    } finally {
      if (conversationId) {
        await deleteConversationRecord(conversationId).catch(() => {});
      }
    }
  }

  const generatedAt = new Date().toISOString();
  const reportPath = buildPromptEvaluationReportPath(workspaceRoot, suiteName, generatedAt);
  const chatHistoryPath = buildPromptEvaluationChatHistoryPath(workspaceRoot);
  const report: PromptEvaluationResponse = {
    suiteName,
    generatedAt,
    reportPath,
    reportFileName: path.basename(reportPath),
    workspaceRoot,
    settings: resolvePromptEvaluationSettings(request),
    cases: results,
    summary: {
      total: results.length,
      successCount: results.filter((entry) => entry.status === "success").length,
      errorCount: results.filter((entry) => entry.status === "error").length,
      qualityPassCount: results.filter((entry) => entry.qualityStatus === "passed").length,
      qualityNeedsReviewCount: results.filter((entry) => entry.qualityStatus === "needs-review").length
    },
    comparison: null
  };

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, formatPromptEvaluationMarkdown(report), "utf8");
  const existingChatHistory = await readFile(chatHistoryPath, "utf8").catch(() => "");
  await writeFile(chatHistoryPath, upsertPromptEvaluationChatHistory(existingChatHistory, report), "utf8");

  return report;
};

const capabilityRunService = createCapabilityRunService({
  workspaceRoot: process.cwd(),
  runtimeRoot: path.join(process.cwd(), ".runtime"),
  executeCase: async ({ promptText, modelOverride, onStreamDelta }) => {
    const conversation = await createConversationRecord();
    const requestId = `capability-run-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const unsubscribe = onStreamDelta ? subscribeChatStreamObserver(requestId, onStreamDelta) : () => {};

    try {
      const response = await handleSendChatAdvanced({
        conversationId: conversation.id,
        text: promptText,
        requestId,
        runMode: "evaluation",
        modelOverride: modelOverride ?? undefined,
        responseMode: "smart",
        awarenessAnswerMode: "evidence-first",
        ragOptions: {
          defaultEnabled: true,
          defaultUseWeb: false,
          defaultShowTrace: false,
          workspaceIndexingEnabled: true
        }
      });

      return {
        response,
        providerName: "ollama",
        modelName: response.modelStatus.model ?? modelOverride ?? null
      };
    } finally {
      unsubscribe();
      await deleteConversationRecord(conversation.id).catch(() => {});
    }
  },
  emitEvent: (event) => {
    sendRendererEvent(IPC_CHANNELS.capabilityRunnerEvents, event);
  }
});

const startAwarenessEngine = async (): Promise<void> => {
  if (awarenessRuntimeState.initializing || awarenessEngine) {
    return;
  }

  const initStartedAtMs = Date.now();
  awarenessRuntimeState.initializing = true;
  awarenessRuntimeState.ready = false;
  awarenessRuntimeState.inFlightTargets = ["init"];

  try {
    const engine = await initializeAwarenessEngine({
      workspaceRoot: process.cwd(),
      appStartedAt: startedAt,
      activeFeatureFlags: getActiveFeatureFlags()
    });
    awarenessEngine = engine;
    awarenessRuntimeState.ready = true;
    awarenessRuntimeState.recentDurationsMs = {
      ...(awarenessRuntimeState.recentDurationsMs ?? {}),
      ...(engine.getStatus().runtime.recentDurationsMs ?? {})
    };
    try {
      awarenessApiServer = await createAwarenessApiServer(engine, { host: "127.0.0.1" });
    } catch (error) {
      console.warn(
        "Awareness API server failed to start:",
        error instanceof Error ? error.message : "unknown error"
      );
    }
  } catch (error) {
    awarenessRuntimeState.ready = false;
    console.warn(
      "Awareness engine failed to initialize:",
      error instanceof Error ? error.message : "unknown error"
    );
  } finally {
    awarenessRuntimeState.initializing = false;
    awarenessRuntimeState.inFlightTargets = [];
    awarenessRuntimeState.lastInitDurationMs = Math.max(0, Date.now() - initStartedAtMs);
    recordAwarenessDuration("init", initStartedAtMs);
  }
};

const registerIpcHandle = createValidatedIpcHandleRegistry({
  channelMap: IPC_CHANNELS,
  registerHandle: (channel, handler) => {
    ipcMain.handle(channel, handler);
  }
});

const registerIpc = (): void => {
  registerIpcHandle.reset();
  registerIpcHandle.register("appHealth", async (): Promise<AppHealth> => ({
    status: "ok",
    startedAt,
    version: APP_VERSION,
    awareness: getAwarenessRuntimeHealth(),
    startupDigest: awarenessEngine?.getStartupDigest() ?? null
  }));

  registerIpcHandle.register("modelHealth", async (_event, modelOverride?: string) =>
    checkOllamaHealth(busy, modelOverride ? { model: modelOverride } : undefined)
  );

  registerIpcHandle.register("listModels", async () => {
    try {
      return await listOllamaModels(getOllamaConfig());
    } catch {
      return [];
    }
  });

  registerIpcHandle.register("createConversation", async () => {
    const conversation = await createConversationRecord();
    return { conversation, messages: [] };
  });

  registerIpcHandle.register("listConversations", async () => listConversationRecords());

  registerIpcHandle.register("loadConversation", async (_event, conversationId: string) =>
    loadConversationRecord(conversationId)
  );

  registerIpcHandle.register("clearConversation", async (_event, conversationId: string) => {
    await clearConversationMessages(conversationId);
    return resolveConversation(conversationId);
  });

  registerIpcHandle.register("deleteConversation", async (_event, conversationId: string) => {
    await deleteConversationRecord(conversationId);
  });

  registerIpcHandle.register("sendChat", async (_event, payload: SendChatRequest) =>
    handleSendChat(payload)
  );

  registerIpcHandle.register("exportConversationHistory", async () => {
    try {
      const dataDir = path.join(process.cwd(), "data");
      const filePath = await exportConversationHistoryAsMarkdown(dataDir);
      return { success: true, filePath };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown export error";
      return { success: false, error: message };
    }
  });

  registerIpcHandle.register("clearConversationHistory", async () => {
    try {
      const dataDir = path.join(process.cwd(), "data");
      await clearConversationHistory(dataDir);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown clear error";
      return { success: false, error: message };
    }
  });

  registerIpcHandle.register("awarenessQuery", async (_event, request: AwarenessQueryRequest) =>
    awarenessEngine?.queryAwarenessLive(request) ?? null
  );

  registerIpcHandle.register("searchMemories", async (_event, query: string) =>
    searchMemoryRecords(query)
  );

  registerIpcHandle.register("listMemories", async () => listMemoryRecords());

  registerIpcHandle.register("deleteMemory", async (_event, memoryId: string) => {
    await deleteMemoryRecord(memoryId);
  });

  registerIpcHandle.register("desktopActionCatalog", async (): Promise<DesktopActionProposal[]> =>
    desktopActions.listDesktopActions()
  );

  registerIpcHandle.register("desktopActionSuggest",
    async (_event, prompt: string): Promise<DesktopActionProposal | null> =>
      desktopActions.suggestDesktopAction(prompt)
  );

  registerIpcHandle.register("desktopActionApprove",
    async (
      _event,
      request: DesktopActionRequest,
      approvedBy: string,
      ttlMs?: number
    ) => desktopActions.issueDesktopActionApproval(request, approvedBy, ttlMs)
  );

  registerIpcHandle.register("desktopActionExecute",
    async (_event, request: DesktopActionRequest): Promise<DesktopActionResult> =>
      desktopActions.executeDesktopAction(request)
  );

  registerIpcHandle.register("workflowPlanSuggest",
    async (_event, prompt: string) => workflowOrchestrator.suggestWorkflow(prompt)
  );

  registerIpcHandle.register("workflowApprove",
    async (_event, plan, approvedBy: string, ttlMs?: number) =>
      workflowOrchestrator.issueWorkflowApproval(plan, approvedBy, ttlMs)
  );

  registerIpcHandle.register("workflowExecute",
    async (_event, request) => workflowOrchestrator.executeWorkflow(request)
  );

  registerIpcHandle.register("rollbackDesktopAction",
    async (_event, commandId: string, approvedBy: string, dryRun?: boolean) =>
      desktopActions.rollbackDesktopAction(commandId, approvedBy, dryRun)
  );

  registerIpcHandle.register("governanceDashboard", async () => buildGovernanceDashboardSnapshot());

  registerIpcHandle.register("governanceApprovalQueue", async () => approvalQueue.list());

  registerIpcHandle.register("governanceAuditQuery",
    async (_event, query?: GovernanceAuditQuery) =>
      queryGovernanceAuditEntries(desktopActionPaths.runtimeRoot, query ?? {}, {
        agentRuntimeRoot
      })
  );

  registerIpcHandle.register("officialKnowledgeSources", async (): Promise<OfficialKnowledgeSourceStatus[]> =>
    awarenessEngine?.listOfficialKnowledgeSources() ?? []
  );

  registerIpcHandle.register("officialKnowledgeSourceUpdate",
    async (_event, sourceId: string, enabled: boolean): Promise<OfficialKnowledgeStatus> => {
      if (!awarenessEngine) {
        throw new Error("Awareness engine is not ready.");
      }
      return await awarenessEngine.setOfficialKnowledgeSourceEnabled(sourceId, enabled);
    }
  );

  registerIpcHandle.register("officialKnowledgeSourceRefresh",
    async (_event, sourceId: string): Promise<OfficialKnowledgeStatus> => {
    if (!awarenessEngine) {
      throw new Error("Awareness engine is not ready.");
    }
    return await awarenessEngine.refreshOfficialKnowledgeSource(sourceId);
  });

  registerIpcHandle.register("contextPreview",
    async (
      _event,
      conversationId: string,
      latestUserMessage: string,
      awarenessAnswerModeArg?: AwarenessAnswerMode,
      ragOptionsArg?: RagOptions,
      reasoningProfileArg?: ReasoningProfile
    ) => {
      const awarenessAnswerMode = normalizeAwarenessAnswerMode(awarenessAnswerModeArg);
      const ragOptions = ragOptionsArg ?? {};
      const previewReasoningProfile = normalizeReasoningProfile(reasoningProfileArg);
      const previewBehavior = getReasoningProfileBehavior(previewReasoningProfile);
      const conversation = await resolveConversation(conversationId);
      const conversationContext = buildConversationAwarenessContext(
        conversation.messages,
        latestUserMessage
      );
      const previewRoute = routeAwarenessIntent(latestUserMessage, conversationContext);
      const previewNeedsOfficial = shouldPreferOfficialWindowsKnowledge(latestUserMessage, previewRoute);
      const previewReasoningMode = detectReasoningMode({
        query: latestUserMessage,
        ragEnabled: ragOptions.defaultEnabled ?? true,
        override: ragOptions.enabled
      });
      const previewBaseUseWeb = resolveToggleMode(ragOptions.useWeb, ragOptions.defaultUseWeb ?? false);
      const previewTaskClassification = classifyPromptTask(latestUserMessage, {
        route: previewRoute,
        useWebSearch: previewBaseUseWeb
      });
      const previewResolvedUseWeb = resolveProfileAwareWebSearch({
        resolvedUseWeb: previewBaseUseWeb,
        taskClassification: previewTaskClassification,
        behavior: previewBehavior
      });
      const previewExplicitWindowsAwarenessPrompt =
        previewTaskClassification.categories.awareness_local_state;
      const previewReplyPolicy = resolveReplyPolicy(latestUserMessage, {
        explicitWindowsAwarenessPrompt: previewExplicitWindowsAwarenessPrompt,
        useWebSearch: previewResolvedUseWeb,
        classification: previewTaskClassification,
        reasoningProfile: previewReasoningProfile
      });
      const previewPlanningState = resolveReasoningProfileState({
        reasoningProfile: previewReasoningProfile,
        reasoningMode: previewReasoningMode.mode,
        taskClassification: previewTaskClassification
      });
      const previewAwarenessRouting = resolveAwarenessRouting({
        explicitWindowsAwarenessPrompt: previewExplicitWindowsAwarenessPrompt,
        routeConfidence: previewRoute?.confidence ?? 0,
        hasRouteSignals: (previewRoute?.signals.length ?? 0) > 0,
        awarenessAnswerMode,
        isEvaluationChatOnly: false,
        genericWritingPromptSuppressed: previewTaskClassification.categories.generic_writing,
        routingSuppressionReason: getRoutingSuppressionReason(latestUserMessage, previewReplyPolicy, {
          classification: previewTaskClassification
        }),
        behavior: previewBehavior
      });
      const previewAwarenessAnswer =
        previewAwarenessRouting.shouldQueryAwareness
          ? (await awarenessEngine?.queryAwarenessLive({
              query: latestUserMessage,
              awarenessAnswerMode,
              conversationContext,
              officialKnowledgePolicy: previewNeedsOfficial ? "live-fallback" : "mirror-first",
              allowOfficialWindowsKnowledge: previewNeedsOfficial,
              refresh: false,
              hints: {
                force: awarenessAnswerMode === "evidence-first",
                strictGrounding: awarenessAnswerMode === "evidence-first",
                maxScanMs: awarenessAnswerMode === "evidence-first" ? 300 : 200
              }
            })) ?? null
          : null;
      const previewPromptIntentSeed = buildSeedPromptIntent({
        query: latestUserMessage,
        route: previewRoute,
        replyPolicy: previewReplyPolicy,
        responseMode: undefined,
        reasoningMode: previewReasoningMode.mode,
        taskClassification: previewTaskClassification,
        hasWorkspaceHits: false,
        hasAwarenessEvidence: previewAwarenessAnswer !== null,
        hasLiveWebResults: false,
        useWebSearch: previewResolvedUseWeb,
        preferOfficialWindowsKnowledge: previewNeedsOfficial
      });
      const ragContext: RagContextPreview = {
        enabled: ragOptions.defaultEnabled ?? true,
        mode: previewReasoningMode.mode,
        triggerReason: previewReasoningMode.triggerReason,
        retrieval: createEmptyRetrievalStats(),
        traceSummary: null,
        workspaceIndex: null,
        workspaceHits: []
      };
      const runtimePreview = await buildLatestAgentRuntimePreview();
      const result = await buildPromptMessages(
        conversationId,
        latestUserMessage,
        undefined,
        awarenessEngine?.getDigest() ?? null,
        previewAwarenessAnswer,
        awarenessAnswerMode,
        toOfficialKnowledgeContext(previewAwarenessAnswer),
        awarenessEngine?.machineAwareness ?? null,
        awarenessEngine?.fileAwareness ?? null,
        awarenessEngine?.screenAwareness ?? null,
        ragContext,
        {
          enableSemanticMemory:
            previewReasoningMode.mode === "advanced" && previewBehavior.retrieval.semanticMemory,
          promptIntent: previewPromptIntentSeed,
          memoryEmbedder:
            previewReasoningMode.mode === "advanced" &&
            previewBehavior.retrieval.semanticMemory &&
            provider.embeddings
              ? (text) => provider.embeddings!(text)
              : undefined,
          retrievalProfile: {
            stableMemoryLimit: previewBehavior.retrieval.stableMemoryLimit,
            keywordMemoryLimit: previewBehavior.retrieval.keywordMemoryLimit,
            semanticMemoryLimit: previewBehavior.retrieval.semanticMemoryLimit,
            maxRetrievedMemories: previewBehavior.retrieval.maxRetrievedMemories,
            promptBehaviorMemoryLimit: previewBehavior.retrieval.promptBehaviorMemoryLimit,
            workspaceHitLimit: previewBehavior.retrieval.workspaceHitLimit
          },
          workspace:
            previewReasoningMode.mode === "advanced" && (ragOptions.workspaceIndexingEnabled ?? true)
              ? {
                  workspaceRoot: process.cwd(),
                  runtimeRoot: awarenessEngine?.paths.runtimeRoot ?? path.join(process.cwd(), ".runtime", "awareness"),
                  enabled: true,
                  mode: "incremental",
                  embedder:
                    previewBehavior.retrieval.semanticMemory && provider.embeddings
                      ? (text) => provider.embeddings!(text)
                      : undefined
                }
              : null
        },
        runtimePreview,
        {
          contextBudget: previewBehavior.contextBudget,
          reasoningProfile: previewReasoningProfile,
          planningPolicy: previewPlanningState.planningPolicy,
          reasoningProfileDiagnostics: {
            planningReason: previewPlanningState.planningReason,
            retrievalMode: previewBehavior.retrievalMode,
            governedTaskPosture: previewBehavior.governedTaskPosture
          }
        }
      );
      return {
        ...result.contextPreview,
        promptIntent: buildSeedPromptIntent({
          query: latestUserMessage,
          route: previewRoute,
          replyPolicy: previewReplyPolicy,
          responseMode: undefined,
          reasoningMode: previewReasoningMode.mode,
          taskClassification: previewTaskClassification,
          hasWorkspaceHits: (result.contextPreview.workspaceHits?.length ?? 0) > 0,
          hasAwarenessEvidence: previewAwarenessAnswer !== null,
          hasLiveWebResults: false,
          useWebSearch: previewResolvedUseWeb,
          preferOfficialWindowsKnowledge: previewNeedsOfficial
        })
      };
    }
  );

  registerIpcHandle.register("promptEvaluationRun", async (_event, request: PromptEvaluationRequest) =>
    runPromptEvaluation(request)
  );

  registerIpcHandle.register("capabilityRunnerCatalog", async () =>
    capabilityRunService.getCatalogSummary()
  );

  registerIpcHandle.register("capabilityRunnerRuns", async () =>
    capabilityRunService.listRuns()
  );

  registerIpcHandle.register("capabilityRunnerSnapshot", async (_event, runId?: string) =>
    capabilityRunService.getSnapshot(runId)
  );

  registerIpcHandle.register("capabilityRunnerStart", async (_event, request) =>
    capabilityRunService.startRun(request)
  );

  registerIpcHandle.register("capabilityRunnerPause", async (_event, runId: string) =>
    capabilityRunService.pauseAfterCurrent(runId)
  );

  registerIpcHandle.register("capabilityRunnerResume", async (_event, runId: string) =>
    capabilityRunService.resumeRun(runId)
  );

  registerIpcHandle.register("capabilityRunnerStop", async (_event, runId: string) =>
    capabilityRunService.stopAfterCurrent(runId)
  );

  registerIpcHandle.register("capabilityRunnerRerunFailed", async (_event, runId: string) =>
    capabilityRunService.rerunFailed(runId)
  );

  registerIpcHandle.register("capabilityRunnerExport", async (_event, runId: string) =>
    capabilityRunService.exportMarkdown(runId)
  );

  registerIpcHandle.register("screenStatus", async () => awarenessEngine?.getScreenStatus() ?? null);
  registerIpcHandle.register("screenForegroundWindow", async () => awarenessEngine?.screenAwareness?.foregroundWindow ?? null);
  registerIpcHandle.register("screenUiTree", async () => awarenessEngine?.screenAwareness?.uiTree ?? null);
  registerIpcHandle.register("screenLastEvents", async () => awarenessEngine?.screenAwareness?.recentEvents ?? []);
  registerIpcHandle.register("screenStartAssist", async (_event, options) =>
    awarenessEngine?.startAssistMode(options) ?? Promise.resolve(null)
  );
  registerIpcHandle.register("screenStopAssist", async (_event, payload?: { reason?: string }) =>
    awarenessEngine?.stopAssistMode(payload?.reason) ?? Promise.resolve(null)
  );

  registerIpcHandle.register("agentRuntimeRun", async (_event, task: AgentTask) => {
    const bridgeContext = getPromptIntentBridgeContextForTask(task);
    const taskWithBridge = bridgeContext
      ? attachPromptIntentBridgeToTask(
          task,
          bridgeContext.promptIntent,
          bridgeContext.matchedPromptBehaviorMemories
        )
      : task;
    return agentRuntimeService.startTask(taskWithBridge);
  });
  registerIpcHandle.register("agentRuntimeList", async () => agentRuntimeService.listJobs());
  registerIpcHandle.register("agentRuntimeInspect", async (_event, jobId: string) =>
    agentRuntimeService.inspectJob(jobId)
  );
  registerIpcHandle.register("agentRuntimeResume", async (_event, jobId: string) =>
    agentRuntimeService.resumeJob(jobId)
  );
  registerIpcHandle.register("agentRuntimeCancel", async (_event, jobId: string) =>
    agentRuntimeService.cancelJob(jobId)
  );
  registerIpcHandle.register("agentRuntimeRecover", async (_event, jobId: string) =>
    agentRuntimeService.recoverJob(jobId)
  );
};

app.whenReady().then(async () => {
  const databasePath = path.join(app.getPath("userData"), "synai-db.json");
  configureMemoryDatabase(databasePath);
  await capabilityRunService.initialize();
  
  // Initialize improvement runtime service
  try {
    await improvementRuntimeService.initialize();
  } catch (err) {
    console.error("[Improvement] Failed to initialize service:", err);
  }

  // Rec #1: Start awareness engine in background — do NOT await before creating the window.
  // All IPC handlers already null-guard awarenessEngine so they return safe defaults until ready.
  registerIpc();
  await createWindow();
  setImmediate(() => {
    void startAwarenessEngine();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});

app.on("before-quit", () => {
  void awarenessApiServer?.close();
  void awarenessEngine?.close();
  void workflowOrchestrator.close();
});






