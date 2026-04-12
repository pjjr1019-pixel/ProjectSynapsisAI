import { app, BrowserWindow, ipcMain, shell } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { IPC_CHANNELS, CHAT_GOVERNED_TASK_EXECUTORS, WORKFLOW_FAMILIES, WORKFLOW_STEP_KINDS } from "@contracts";
import { buildGroundingSourceCatalog, completeTraceStage, createAwarenessApiServer, createEmptyRetrievalStats, createReasoningTraceState, detectReasoningMode, failTraceStage, finalizeReasoningTrace, groundAssistantReply, initializeAwarenessEngine, queryWorkspaceIndex, routeAwarenessIntent, startTraceStage, toReasoningTraceSummary, updateTraceGrounding, updateTraceRetrieval, withRetrievalTotals } from "@awareness";
import { loadRuntimeCapabilityRegistry } from "@awareness/runtime-capabilities";
import { checkOllamaHealth, createOllamaProvider, getOllamaConfig, isOllamaReachabilityErrorDetail, listOllamaModels } from "@local-ai";
import { createChatExecutionService, createGovernanceApprovalQueueStore, queryGovernanceAuditEntries } from "@governance-execution";
import { createDesktopActionService, resolveDefaultDesktopActionPaths } from "./desktop-actions";
import { FileAuditStore } from "@agent-runtime/audit";
import { createAgentRuntimeService, FileAgentRuntimeStateStore } from "@agent-runtime/runtime";
import { createAgentRuntimeApprovalValidator } from "./agent-runtime-approval";
import { createDesktopActionRuntimeAdapter, createWorkflowRuntimeAdapter } from "./agent-runtime-adapters";
import { createGovernedChatService } from "./governed-chat";
import { createWorkflowOrchestrator } from "./workflow-orchestrator";
import { appendChatMessage, buildPromptMessages, clearConversationMessages, configureMemoryDatabase, createConversationRecord, deleteConversationRecord, deleteMemoryRecord, extractAndStoreMemories, finalizePromptContext, listConversationRecords, listMemoryRecords, loadConversationRecord, memorySystemInstruction, preparePromptContext, refreshRollingSummary, removeLastAssistantMessage, searchMemoryRecords, updateConversationTitleFromMessages } from "@memory";
import { resolveRecentWebContext } from "@web-search";
import { featureRegistry } from "../src/features/feature-registry";
import { buildAwarenessMessageMetadata, buildLiveAwarenessMessageMetadata } from "../src/features/local-chat/utils/awarenessCards";
import { isLiveUsageAnswer } from "../src/features/local-chat/utils/liveUsageReply";
import { cleanupPlainTextAnswer, formatAwarenessReply } from "./reply-formatting";
import { buildPromptEvaluationChatHistoryPath, buildPromptEvaluationReportPath, formatPromptEvaluationMarkdown, upsertPromptEvaluationChatHistory } from "./prompt-eval";
import { filterWorkspaceHitsForReplyPolicy, getRoutingSuppressionReason, resolveReplyPolicy, shouldBypassCleanup, summarizeWorkspacePaths } from "./reply-policy";
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
const startedAt = new Date().toISOString();
let mainWindow = null;
let busy = false;
let awarenessEngine = null;
let awarenessApiServer = null;
// Health-check cache — avoid re-checking Ollama after every successful reply
let lastHealthCheckMs = 0;
let lastKnownModelStatus = null;
const HEALTH_CACHE_TTL_MS = 45_000;
const awarenessRuntimeState = {
    initializing: false,
    ready: false,
    inFlightTargets: [],
    recentDurationsMs: {},
    lastInitDurationMs: null
};
const APP_VERSION = "0.1.0";
const DEFAULT_PROMPT_EVAL_SUITE_NAME = "Local AI prompt evaluation";
const responseModeInstruction = (mode) => {
    switch (mode) {
        case "fast":
            return "Reply style: prioritize quick, direct answers. Keep the response very short and easy to scan.";
        case "smart":
            return "Reply style: be careful and context-aware, but still keep the answer simple. Use a short summary first, then only the most useful details.";
        default:
            return "Reply style: be clear, concise, and easy to read. Prefer a short direct answer and a few short bullets over long paragraphs.";
    }
};
const normalizeAwarenessAnswerMode = (mode) => (mode === "llm-primary" ? "llm-primary" : "evidence-first");
const awarenessAnswerModeInstruction = (mode) => {
    if (mode === "llm-primary") {
        return "Awareness answer mode: llm-primary. Use awareness context when relevant, but keep normal conversational behavior.";
    }
    return [
        "Awareness answer mode: evidence-first.",
        "Use retrieved local evidence first and avoid unsupported claims.",
        "If verified local evidence already answers the question, answer directly from that evidence.",
        "Do not tell the user to manually look up information you already have.",
        "Keep answers short and simple by default.",
        "Use this order when helpful:",
        "Direct answer",
        "Key facts",
        "Unclear or next checks only if needed"
    ].join("\n");
};
const ragModeInstruction = (mode) => mode === "advanced"
    ? [
        "Advanced RAG mode is active.",
        "Use retrieved memory, workspace evidence, awareness context, and optional web results together.",
        "Build a short internal plan, then answer from the evidence.",
        "Do not expose hidden chain-of-thought. Keep the final answer concise and grounded."
    ].join("\n")
    : "Fast mode is active. Answer directly and stay concise.";
const replyPolicyInstruction = (policy) => {
    const lines = [`Reply policy: source scope = ${policy.sourceScope}.`];
    switch (policy.sourceScope) {
        case "readme-only":
            lines.push("Use only README evidence already present in context for product facts.");
            break;
        case "docs-only":
            lines.push("Use only docs and README evidence already present in context for product facts.");
            break;
        case "repo-wide":
            lines.push("Use only current repo evidence already present in context for product facts.");
            break;
        case "awareness-only":
            lines.push("Use awareness evidence first for Windows and system answers.");
            break;
        case "time-sensitive-live":
            lines.push("Prefer recent live evidence for time-sensitive facts and keep dates or source names clear.");
            break;
        default:
            lines.push("Use local workspace evidence when it is available.");
            break;
    }
    if (policy.formatPolicy === "preserve-exact-structure") {
        lines.push("Follow the user's exact bullets, labels, sections, and counts.");
    }
    if (policy.groundingPolicy === "source-boundary") {
        lines.push("Do not add facts beyond the allowed source scope. If evidence is missing, omit the claim or say it is not confirmed.");
    }
    else if (policy.groundingPolicy === "awareness-direct") {
        lines.push("Answer directly from evidence. If evidence is incomplete, state uncertainty and give the single best next check.");
    }
    if (policy.routingPolicy === "chat-first-source-scoped") {
        lines.push("Treat this as a repo-grounded chat request, not a Windows awareness request.");
    }
    else if (policy.routingPolicy === "windows-explicit-only") {
        lines.push("Use Windows awareness only when the question is explicitly about Windows or local machine state.");
    }
    return lines.join("\n");
};
const resolveToggleMode = (override, fallback) => {
    if (override === "on") {
        return true;
    }
    if (override === "off") {
        return false;
    }
    return fallback;
};
const capitalize = (value) => value.length > 0 ? `${value.slice(0, 1).toUpperCase()}${value.slice(1)}` : value;
const normalizeLine = (value) => value.replace(/\s+/g, " ").trim();
const normalizeQuery = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const GENERIC_WRITING_PROMPT_PATTERNS = [
    "rewrite this",
    "rewrite this reply",
    "sound calmer",
    "more helpful without changing its meaning",
    "without changing its meaning",
    "use only the facts below",
    "exactly 3 short bullets",
    "be very detailed",
    "extremely brief",
    "one sentence while staying useful",
    "write a better reply",
    "best compromise"
];
const WINDOWS_AWARENESS_ROUTE_FAMILIES = new Set([
    "live-usage",
    "hardware",
    "resource-hotspot",
    "performance-diagnostic",
    "process-service-startup",
    "settings-control-panel",
    "registry"
]);
const WINDOWS_AWARENESS_KEYWORDS = [
    "windows",
    "cpu",
    "processor",
    "ram",
    "memory",
    "storage",
    "drive",
    "disk",
    "gpu",
    "vram",
    "bluetooth",
    "control panel",
    "registry",
    "event log",
    "startup",
    "service",
    "process",
    "task manager",
    "uptime",
    "print spooler"
];
const isGenericWritingPrompt = (query) => {
    const normalized = normalizeQuery(query);
    return GENERIC_WRITING_PROMPT_PATTERNS.some((pattern) => normalized.includes(pattern));
};
const isExplicitWindowsAwarenessPrompt = (query, route) => {
    const normalized = normalizeQuery(query);
    const hasWindowsKeyword = WINDOWS_AWARENESS_KEYWORDS.some((keyword) => normalized.includes(keyword));
    const hasStrongWindowsRoute = route !== null &&
        WINDOWS_AWARENESS_ROUTE_FAMILIES.has(route.family) &&
        (route.confidence >= 0.35 || route.signals.length > 0);
    return hasWindowsKeyword || hasStrongWindowsRoute;
};
const countBulletLines = (value) => value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^(?:[-*•]|\d+\.)\s+/.test(line)).length;
const containsNormalizedPhrase = (text, phrase) => {
    const normalizedText = ` ${normalizeQuery(text)} `;
    const normalizedPhrase = normalizeQuery(phrase);
    if (!normalizedPhrase) {
        return false;
    }
    return normalizedText.includes(` ${normalizedPhrase} `);
};
const countSentences = (value) => {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized) {
        return 0;
    }
    const matches = normalized.match(/[^.!?]+[.!?]+/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
    if (matches.length > 0) {
        const matchedLength = matches.join(" ").length;
        const remainder = normalized.slice(matchedLength).trim();
        return matches.length + (remainder.length > 0 ? 1 : 0);
    }
    return 1;
};
const isFeatureSummaryQuery = (query, answer) => {
    if (answer?.intent.family === "repo-change" && answer.scope === "previous-session") {
        return true;
    }
    const normalized = normalizeQuery(query);
    return (normalized.includes("whats new") ||
        normalized.includes("what s new") ||
        normalized.includes("new feature") ||
        normalized.includes("new features") ||
        normalized.includes("release notes") ||
        normalized.includes("changelog") ||
        normalized.includes("change log") ||
        normalized.includes("updates"));
};
const shouldPreferOfficialWindowsKnowledge = (query, route) => {
    const normalized = normalizeQuery(query);
    if (!route) {
        return false;
    }
    if (route.family === "settings-control-panel" ||
        route.family === "registry" ||
        normalized.includes("windows update") ||
        normalized.includes("release health") ||
        normalized.includes("known issue") ||
        normalized.includes("ms settings") ||
        normalized.includes("control panel")) {
        return true;
    }
    return false;
};
const toOfficialKnowledgeContext = (answer) => {
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
const toOfficialWebContext = (answer) => {
    if (!answer?.officialKnowledgeUsed || (answer.officialEvidence?.length ?? 0) === 0) {
        return {
            status: "off",
            query: answer?.query ?? "",
            results: []
        };
    }
    const results = (answer.officialEvidence ?? []).map((hit) => ({
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
const formatAwarenessEvidenceReply = (answer) => {
    const hotspots = answer.bundle.resourceHotspots ?? [];
    if (hotspots.length > 0) {
        const top = hotspots[0];
        const resourceLabel = top.resource === "disk" ? "Disk" : top.resource.toUpperCase();
        const groupingLabel = top.grouping === "program" ? "programs" : "processes";
        const maxLines = Math.min(hotspots.length, 4);
        const shareLabel = top.resource === "ram" ? "total RAM" : "sampled load";
        const lines = [
            `${top.label} is using the most ${resourceLabel}${top.resourceAmount ? ` (${top.resourceAmount})` : ""}${top.resourceShare != null ? ` and accounts for ${Math.round(top.resourceShare * 100)}% of ${shareLabel}` : ""}.`,
            `Top ${maxLines} ${groupingLabel} using ${resourceLabel}:`,
            ...hotspots.slice(0, maxLines).map((entry) => `- ${entry.rank}. ${entry.label} — ${entry.resourceAmount}${entry.resourceShare != null ? ` (${Math.round(entry.resourceShare * 100)}%)` : ""}`),
            answer.bundle.likelyInterpretation.length > 0
                ? `Why it matters:\n- ${answer.bundle.likelyInterpretation.map(normalizeLine).filter(Boolean).slice(0, 2).join("\n- ")}`
                : null,
            answer.bundle.uncertainty.length > 0
                ? `Unclear:\n- ${answer.bundle.uncertainty.map(normalizeLine).filter(Boolean).slice(0, 2).join("\n- ")}`
                : null
        ].filter((section) => Boolean(section));
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
    ].filter((section) => Boolean(section));
    return sections.join("\n\n");
};
void formatAwarenessEvidenceReply;
const summarizeFeatureChangesWithLocalAi = async (answer, modelOverride) => {
    const verified = answer.bundle.verifiedFindings.map(normalizeLine).filter(Boolean).slice(0, 8);
    const inferred = answer.bundle.likelyInterpretation.map(normalizeLine).filter(Boolean).slice(0, 4);
    const uncertainty = answer.bundle.uncertainty.map(normalizeLine).filter(Boolean).slice(0, 4);
    const messages = [
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
const shouldUseDeterministicAwarenessReply = (query, awarenessAnswerMode, answer, replyPolicy) => {
    if (answer === null || !isExplicitWindowsAwarenessPrompt(query, answer.intent)) {
        return false;
    }
    if (replyPolicy?.formatPolicy === "preserve-exact-structure") {
        return false;
    }
    return (answer.clarification !== null ||
        (answer.bundle.verifiedFindings.length > 0 &&
            (answer.intent.family === "live-usage" ||
                answer.intent.family === "resource-hotspot" ||
                (awarenessAnswerMode === "evidence-first" &&
                    (answer.intent.family === "hardware" ||
                        answer.intent.family === "performance-diagnostic" ||
                        (answer.includeInContext && answer.intent.confidence >= 0.45))))));
};
const createWindow = async () => {
    mainWindow = new BrowserWindow({
        width: 520,
        height: 900,
        minWidth: 480,
        minHeight: 760,
        backgroundColor: "#0a0f1a",
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "../preload/preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    if (process.env.ELECTRON_RENDERER_URL) {
        await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    }
    else {
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
const emptyContextPreview = {
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
    webSearch: {
        status: "off",
        query: "",
        results: []
    }
};
const createModelStatus = (status, detail, modelOverride) => {
    const config = getOllamaConfig(modelOverride ? { model: modelOverride } : undefined);
    return {
        status,
        provider: "ollama",
        model: config.model,
        baseUrl: config.baseUrl,
        detail,
        checkedAt: new Date().toISOString()
    };
};
const resolveModelErrorStatus = (detail) => {
    return isOllamaReachabilityErrorDetail(detail) ? "disconnected" : "error";
};
const resolvePromptEvaluationSettings = (request) => {
    const ragOptions = request.ragOptions ?? {};
    return {
        suiteMode: request.suiteMode ?? "chat-only",
        model: request.modelOverride?.trim() || null,
        responseMode: request.responseMode ?? "balanced",
        awarenessAnswerMode: normalizeAwarenessAnswerMode(request.awarenessAnswerMode),
        ragEnabled: resolveToggleMode(ragOptions.enabled, ragOptions.defaultEnabled ?? true),
        useWebSearch: request.useWebSearch ?? resolveToggleMode(ragOptions.useWeb, ragOptions.defaultUseWeb ?? false),
        showTrace: resolveToggleMode(ragOptions.showTrace, ragOptions.defaultShowTrace ?? false),
        workspaceIndexingEnabled: ragOptions.workspaceIndexingEnabled ?? true
    };
};
const mergeRetrievalStats = (base, patch) => withRetrievalTotals({
    ...base,
    ...patch,
    total: 0
});
const applyPromptPolicies = (promptMessages, responseMode, awarenessAnswerMode, ragMode = "fast", replyPolicy) => promptMessages.map((message, index) => index === 0 && message.role === "system"
    ? {
        ...message,
        content: [
            message.content,
            responseModeInstruction(responseMode),
            awarenessAnswerModeInstruction(awarenessAnswerMode),
            ragModeInstruction(ragMode),
            replyPolicy ? replyPolicyInstruction(replyPolicy) : ""
        ]
            .filter(Boolean)
            .join("\n\n")
    }
    : message);
const createPlanningMessages = (promptMessages, query) => [
    ...promptMessages,
    {
        id: "advanced-plan-system",
        conversationId: promptMessages[0]?.conversationId ?? "system",
        role: "system",
        createdAt: new Date().toISOString(),
        content: [
            "Create a short answer plan before the final response.",
            "Use only retrieved evidence already in context.",
            "Return 2 to 4 short bullets with sub-questions or checks.",
            "Do not answer the user directly yet."
        ].join("\n")
    },
    {
        id: "advanced-plan-user",
        conversationId: promptMessages[0]?.conversationId ?? "system",
        role: "user",
        createdAt: new Date().toISOString(),
        content: `Question to plan for: ${query}`
    }
];
const createSynthesisMessages = (promptMessages, planText) => !planText
    ? promptMessages
    : [
        ...promptMessages,
        {
            id: "advanced-plan-note",
            conversationId: promptMessages[0]?.conversationId ?? "system",
            role: "system",
            createdAt: new Date().toISOString(),
            content: `Working plan:\n${planText}\n\nFollow the plan, but only present the final grounded answer.`
        }
    ];
const sendRendererEvent = (channel, payload) => {
    mainWindow?.webContents.send(channel, payload);
};
const sendReasoningTrace = (trace) => {
    if (!trace.visible) {
        return;
    }
    sendRendererEvent(IPC_CHANNELS.reasoningTrace, {
        requestId: trace.requestId,
        conversationId: trace.conversationId,
        trace
    });
};
const recordAwarenessDuration = (label, startedAtMs) => {
    awarenessRuntimeState.recentDurationsMs = {
        ...(awarenessRuntimeState.recentDurationsMs ?? {}),
        [label]: Math.max(0, Date.now() - startedAtMs)
    };
};
const getAwarenessRuntimeHealth = () => {
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
const getActiveFeatureFlags = () => featureRegistry.filter((feature) => feature.status === "active").map((feature) => feature.id);
const readJsonFile = async (filePath) => {
    const raw = await readFile(filePath, "utf8").catch(() => null);
    if (!raw) {
        return null;
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
};
const buildLatestAgentRuntimePreview = async () => {
    const jobs = await agentRuntimeService.listJobs();
    const latestJob = [...jobs].sort((left, right) => (right.finishedAt ?? right.startedAt ?? right.createdAt).localeCompare(left.finishedAt ?? left.startedAt ?? left.createdAt))[0];
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
        plannedStepCount: inspection.plannedSteps.length || inspection.plan?.steps.length || inspection.job.stepIds.length,
        policyDecisionType: inspection.policyDecision?.type ?? null,
        verificationStatus: inspection.verification?.status ?? null,
        checkpointId: inspection.latestCheckpoint?.id ?? null,
        checkpointSummary: inspection.latestCheckpoint?.summary ?? inspection.result?.summary ?? null,
        auditEventCount: inspection.auditTrail.length,
        bindingHash: inspection.policyDecision?.bindingHash ?? null,
        updatedAt: inspection.job.finishedAt ??
            inspection.latestCheckpoint?.createdAt ??
            inspection.job.startedAt ??
            inspection.job.createdAt
    };
};
const buildGovernanceCapabilitySummary = async () => {
    const summaryPath = path.join(desktopActionPaths.runtimeRoot, "capability-eval", "latest-summary.json");
    const summary = await readJsonFile(summaryPath);
    if (!summary) {
        return null;
    }
    const cardResults = Array.isArray(summary.cardResults) ? summary.cardResults : [];
    return {
        runId: typeof summary.runId === "string" ? summary.runId : "unknown",
        totals: {
            total: cardResults.length,
            passed: cardResults.filter((entry) => entry.status === "passed").length,
            failed: cardResults.filter((entry) => entry.status === "failed").length
        },
        artifactRoot: typeof summary.artifactRoot === "string" ? summary.artifactRoot : path.dirname(summaryPath),
        latestFailedCardIds: cardResults
            .filter((entry) => entry.status === "failed")
            .map((entry) => String(entry.cardId ?? "unknown"))
    };
};
const buildGovernanceHistoryBacklogSummary = async () => {
    const backlogPath = path.join(desktopActionPaths.runtimeRoot, "governance-history", "latest-backlog.json");
    const backlog = await readJsonFile(backlogPath);
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
            const value = finding;
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
            .map((draft) => String(draft.id ?? draft.cardId ?? "unknown"))
    };
};
const buildPendingApprovals = async () => {
    const conversations = await listConversationRecords();
    const pending = [];
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
const buildRecentAuditEntries = async () => {
    return await queryGovernanceAuditEntries(desktopActionPaths.runtimeRoot, { limit: 25 }, { agentRuntimeRoot });
};
const buildApprovalQueueSnapshot = async () => await approvalQueue.list();
const buildCapabilityRegistrySnapshot = async () => {
    const entries = [];
    const runtimeCapabilities = await loadRuntimeCapabilityRegistry(desktopActionPaths.runtimeRoot, desktopActionPaths.workspaceRoot);
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
            status: executor === "ui-automation" || executor === "service-control" || executor === "registry-control" || executor === "browser-automation"
                ? "partial"
                : executor === "none"
                    ? "blocked"
                    : "active",
            riskClass: executor === "service-control" || executor === "registry-control"
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
        { id: "browser.search", title: "Search browser", description: "Browser search", status: "active", riskClass: "low" },
        { id: "browser.open", title: "Open browser URL", description: "Browser navigation", status: "active", riskClass: "low" },
        { id: "browser.play", title: "Play YouTube video", description: "Browser playback", status: "active", riskClass: "low" },
        { id: "browser.click", title: "Click browser UI", description: "Browser click automation", status: "partial", riskClass: "medium" },
        { id: "browser.type", title: "Type browser input", description: "Browser text entry", status: "partial", riskClass: "medium" },
        { id: "browser.hotkey", title: "Send browser hotkeys", description: "Browser keyboard automation", status: "partial", riskClass: "medium" }
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
    const totals = combinedEntries.reduce((acc, entry) => {
        acc.total += 1;
        acc[entry.status] += 1;
        return acc;
    }, { total: 0, active: 0, partial: 0, planned: 0, blocked: 0 });
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
const buildGovernanceDashboardSnapshot = async () => ({
    capturedAt: new Date().toISOString(),
    capabilitySummary: await buildGovernanceCapabilitySummary(),
    historyBacklog: await buildGovernanceHistoryBacklogSummary(),
    pendingApprovals: await buildPendingApprovals(),
    approvalQueue: await buildApprovalQueueSnapshot(),
    recentAuditEntries: await buildRecentAuditEntries(),
    capabilityRegistry: await buildCapabilityRegistrySnapshot(),
    officialKnowledge: (awarenessEngine?.getOfficialKnowledgeStatus() ?? null)
});
const scheduleConversationMaintenance = (conversationId, userText, assistantReply, modelOverride, options) => {
    void (async () => {
        const maintenanceTasks = [updateConversationTitleFromMessages(conversationId, userText)];
        if (!options?.skipMemories) {
            maintenanceTasks.unshift(extractAndStoreMemories(conversationId, `${userText}\n${assistantReply}`), refreshRollingSummary(conversationId));
        }
        await Promise.allSettled(maintenanceTasks);
        const now = Date.now();
        const modelStatusPromise = now - lastHealthCheckMs > HEALTH_CACHE_TTL_MS
            ? checkOllamaHealth(false, modelOverride ? { model: modelOverride } : undefined)
                .then((status) => {
                lastHealthCheckMs = Date.now();
                lastKnownModelStatus = status;
                return status;
            })
                .catch((error) => createModelStatus("error", error instanceof Error ? error.message : "Background health check failed", modelOverride))
            : Promise.resolve(lastKnownModelStatus ?? createModelStatus("connected", undefined, modelOverride));
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
const resolveConversation = async (conversationId) => {
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
const normalizePromptEvaluationCases = (cases) => cases
    .map((entry, index) => ({
    id: entry.id?.trim() || `prompt-${index + 1}`,
    label: entry.label?.trim() || `${capitalize(entry.difficulty)} prompt`,
    difficulty: entry.difficulty,
    prompt: entry.prompt.trim(),
    checks: (entry.checks ?? []).map((check, checkIndex) => ({
        id: check.id?.trim() || `${entry.id?.trim() || `prompt-${index + 1}`}-check-${checkIndex + 1}`,
        kind: check.kind,
        description: check.description?.trim() || `Check ${checkIndex + 1}`,
        category: check.category,
        values: check.values?.map((value) => value.trim()).filter(Boolean),
        exact: check.exact,
        min: check.min,
        max: check.max
    })),
    sourceScopeHint: entry.sourceScopeHint,
    formatPolicy: entry.formatPolicy,
    replyPolicy: entry.replyPolicy ? { ...entry.replyPolicy } : undefined,
    routingExpectations: entry.routingExpectations ? { ...entry.routingExpectations } : undefined,
    groundingExpectations: entry.groundingExpectations ? { ...entry.groundingExpectations } : undefined
}))
    .filter((entry) => entry.prompt.length > 0);
const buildPromptEvaluationRoutingReport = (diagnostics) => ({
    routeFamily: diagnostics?.routeFamily ?? "none",
    routeConfidence: diagnostics?.routeConfidence ?? null,
    rawRouteFamily: diagnostics?.rawRouteFamily ?? "none",
    rawRouteConfidence: diagnostics?.rawRouteConfidence ?? null,
    awarenessUsed: diagnostics?.awarenessUsed ?? false,
    deterministicAwareness: diagnostics?.deterministicAwareness ?? false,
    genericWritingPromptSuppressed: diagnostics?.genericWritingPromptSuppressed ?? false,
    sourceScope: diagnostics?.sourceScope ?? null,
    replyPolicy: diagnostics?.replyPolicy ?? null,
    cleanupBypassed: diagnostics?.cleanupBypassed ?? false,
    routingSuppressionReason: diagnostics?.routingSuppressionReason ?? null,
    retrievedSourceSummary: diagnostics?.retrievedSourceSummary ?? null,
    reasoningMode: diagnostics?.reasoningMode ?? null
});
const defaultPromptCheckCategory = (check) => check.category ?? (check.kind === "bullet-count" || check.kind === "sentence-count" ? "format" : "content");
const countPromptEvaluationAssertions = (entry) => {
    const routingExpectationCount = Object.values(entry.routingExpectations ?? {}).filter((value) => value !== undefined).length;
    const groundingExpectationCount = Object.values(entry.groundingExpectations ?? {}).filter((value) => value !== undefined).length;
    return ((entry.checks?.length ?? 0) +
        routingExpectationCount +
        groundingExpectationCount +
        (entry.sourceScopeHint ? 1 : 0) +
        (entry.formatPolicy ? 1 : 0));
};
const buildSkippedPromptCheckResults = (entry) => {
    const textChecks = (entry.checks ?? []).map((check) => ({
        id: check.id,
        description: check.description,
        passed: false,
        detail: "Skipped because the prompt returned an error.",
        category: defaultPromptCheckCategory(check)
    }));
    const routingExpectations = entry.routingExpectations ?? {};
    const routingChecks = [];
    if (routingExpectations.routeFamily !== undefined) {
        routingChecks.push({
            id: `${entry.id}-route-family`,
            description: `Expected route family ${routingExpectations.routeFamily}.`,
            passed: false,
            detail: "Skipped because the prompt returned an error.",
            category: "routing"
        });
    }
    if (routingExpectations.awarenessUsed !== undefined) {
        routingChecks.push({
            id: `${entry.id}-awareness-used`,
            description: `Expected awareness used = ${routingExpectations.awarenessUsed ? "yes" : "no"}.`,
            passed: false,
            detail: "Skipped because the prompt returned an error.",
            category: "routing"
        });
    }
    if (routingExpectations.deterministicAwareness !== undefined) {
        routingChecks.push({
            id: `${entry.id}-deterministic-awareness`,
            description: `Expected deterministic awareness = ${routingExpectations.deterministicAwareness ? "yes" : "no"}.`,
            passed: false,
            detail: "Skipped because the prompt returned an error.",
            category: "routing"
        });
    }
    if (routingExpectations.genericWritingPromptSuppressed !== undefined) {
        routingChecks.push({
            id: `${entry.id}-generic-writing-suppressed`,
            description: `Expected generic writing suppression = ${routingExpectations.genericWritingPromptSuppressed ? "yes" : "no"}.`,
            passed: false,
            detail: "Skipped because the prompt returned an error.",
            category: "routing"
        });
    }
    if (entry.sourceScopeHint !== undefined) {
        routingChecks.push({
            id: `${entry.id}-source-scope`,
            description: `Expected source scope ${entry.sourceScopeHint}.`,
            passed: false,
            detail: "Skipped because the prompt returned an error.",
            category: "source-scope"
        });
    }
    if (entry.formatPolicy !== undefined) {
        routingChecks.push({
            id: `${entry.id}-format-policy`,
            description: `Expected format policy ${entry.formatPolicy}.`,
            passed: false,
            detail: "Skipped because the prompt returned an error.",
            category: "format"
        });
    }
    const groundingExpectations = entry.groundingExpectations ?? {};
    const groundingChecks = [];
    if (groundingExpectations.minGroundedClaims !== undefined) {
        groundingChecks.push({
            id: `${entry.id}-grounded-claims`,
            description: `Expected at least ${groundingExpectations.minGroundedClaims} grounded claims.`,
            passed: false,
            detail: "Skipped because the prompt returned an error.",
            category: "grounding"
        });
    }
    if (groundingExpectations.maxUnsupportedClaims !== undefined) {
        groundingChecks.push({
            id: `${entry.id}-unsupported-claims`,
            description: `Expected unsupported claims <= ${groundingExpectations.maxUnsupportedClaims}.`,
            passed: false,
            detail: "Skipped because the prompt returned an error.",
            category: "unsupported-claim"
        });
    }
    if (groundingExpectations.maxConflictedClaims !== undefined) {
        groundingChecks.push({
            id: `${entry.id}-conflicted-claims`,
            description: `Expected conflicted claims <= ${groundingExpectations.maxConflictedClaims}.`,
            passed: false,
            detail: "Skipped because the prompt returned an error.",
            category: "grounding"
        });
    }
    if (groundingExpectations.minCitationCoverage !== undefined) {
        groundingChecks.push({
            id: `${entry.id}-citation-coverage`,
            description: `Expected citation coverage >= ${Math.round(groundingExpectations.minCitationCoverage * 100)}%.`,
            passed: false,
            detail: "Skipped because the prompt returned an error.",
            category: "grounding"
        });
    }
    return [...textChecks, ...routingChecks, ...groundingChecks];
};
const evaluatePromptCheck = (reply, check) => {
    const normalizedValues = (check.values ?? []).map((value) => value.trim()).filter(Boolean);
    switch (check.kind) {
        case "includes-all": {
            const matched = normalizedValues.filter((value) => containsNormalizedPhrase(reply, value));
            const passed = matched.length === normalizedValues.length;
            return {
                id: check.id,
                description: check.description,
                passed,
                category: defaultPromptCheckCategory(check),
                detail: passed
                    ? `Found all ${normalizedValues.length} required phrases.`
                    : `Found ${matched.length}/${normalizedValues.length} required phrases.`
            };
        }
        case "includes-any": {
            const matched = normalizedValues.find((value) => containsNormalizedPhrase(reply, value)) ?? null;
            return {
                id: check.id,
                description: check.description,
                passed: matched !== null,
                category: defaultPromptCheckCategory(check),
                detail: matched ? `Matched phrase: ${matched}.` : "No allowed phrase was found."
            };
        }
        case "excludes-all": {
            const blocked = normalizedValues.filter((value) => containsNormalizedPhrase(reply, value));
            return {
                id: check.id,
                description: check.description,
                passed: blocked.length === 0,
                category: defaultPromptCheckCategory(check),
                detail: blocked.length === 0
                    ? "No blocked phrases found."
                    : `Blocked phrases found: ${blocked.join(", ")}.`
            };
        }
        case "bullet-count": {
            const bulletCount = countBulletLines(reply);
            const min = check.exact ?? check.min ?? 0;
            const max = check.exact ?? check.max ?? Number.POSITIVE_INFINITY;
            const passed = bulletCount >= min && bulletCount <= max;
            const expectedLabel = check.exact != null
                ? `exactly ${check.exact}`
                : `${check.min ?? 0}${check.max != null ? ` to ${check.max}` : "+"}`;
            return {
                id: check.id,
                description: check.description,
                passed,
                category: defaultPromptCheckCategory(check),
                detail: `Found ${bulletCount} bullets. Expected ${expectedLabel}.`
            };
        }
        case "sentence-count": {
            const sentenceCount = countSentences(reply);
            const min = check.exact ?? check.min ?? 0;
            const max = check.exact ?? check.max ?? Number.POSITIVE_INFINITY;
            const passed = sentenceCount >= min && sentenceCount <= max;
            const expectedLabel = check.exact != null
                ? `exactly ${check.exact}`
                : `${check.min ?? 0}${check.max != null ? ` to ${check.max}` : "+"}`;
            return {
                id: check.id,
                description: check.description,
                passed,
                category: defaultPromptCheckCategory(check),
                detail: `Found ${sentenceCount} sentences. Expected ${expectedLabel}.`
            };
        }
    }
};
const evaluateRoutingExpectations = (entry, routing) => {
    const expectations = entry.routingExpectations ?? {};
    const results = [];
    if (expectations.routeFamily !== undefined) {
        results.push({
            id: `${entry.id}-route-family`,
            description: `Expected route family ${expectations.routeFamily}.`,
            passed: routing.routeFamily === expectations.routeFamily,
            detail: `Actual route family: ${routing.routeFamily}.`,
            category: "routing"
        });
    }
    if (expectations.awarenessUsed !== undefined) {
        results.push({
            id: `${entry.id}-awareness-used`,
            description: `Expected awareness used = ${expectations.awarenessUsed ? "yes" : "no"}.`,
            passed: routing.awarenessUsed === expectations.awarenessUsed,
            detail: `Actual awareness used: ${routing.awarenessUsed ? "yes" : "no"}.`,
            category: "routing"
        });
    }
    if (expectations.deterministicAwareness !== undefined) {
        results.push({
            id: `${entry.id}-deterministic-awareness`,
            description: `Expected deterministic awareness = ${expectations.deterministicAwareness ? "yes" : "no"}.`,
            passed: routing.deterministicAwareness === expectations.deterministicAwareness,
            detail: `Actual deterministic awareness: ${routing.deterministicAwareness ? "yes" : "no"}.`,
            category: "routing"
        });
    }
    if (expectations.genericWritingPromptSuppressed !== undefined) {
        results.push({
            id: `${entry.id}-generic-writing-suppressed`,
            description: `Expected generic writing suppression = ${expectations.genericWritingPromptSuppressed ? "yes" : "no"}.`,
            passed: routing.genericWritingPromptSuppressed === expectations.genericWritingPromptSuppressed,
            detail: `Actual generic writing suppression: ${routing.genericWritingPromptSuppressed ? "yes" : "no"}.`,
            category: "routing"
        });
    }
    if (entry.sourceScopeHint !== undefined) {
        results.push({
            id: `${entry.id}-source-scope`,
            description: `Expected source scope ${entry.sourceScopeHint}.`,
            passed: routing.sourceScope === entry.sourceScopeHint,
            detail: `Actual source scope: ${routing.sourceScope ?? "none"}.`,
            category: "source-scope"
        });
    }
    if (entry.formatPolicy !== undefined) {
        results.push({
            id: `${entry.id}-format-policy`,
            description: `Expected format policy ${entry.formatPolicy}.`,
            passed: routing.replyPolicy?.formatPolicy === entry.formatPolicy,
            detail: `Actual format policy: ${routing.replyPolicy?.formatPolicy ?? "none"}.`,
            category: "format"
        });
    }
    return results;
};
const evaluateGroundingExpectations = (entry, groundingSummary) => {
    const expectations = entry.groundingExpectations ?? {};
    const results = [];
    if (expectations.minGroundedClaims !== undefined) {
        results.push({
            id: `${entry.id}-grounded-claims`,
            description: `Expected at least ${expectations.minGroundedClaims} grounded claims.`,
            passed: groundingSummary != null && groundingSummary.groundedClaimCount >= expectations.minGroundedClaims,
            category: "grounding",
            detail: groundingSummary == null
                ? "No grounding summary was available."
                : `Actual grounded claims: ${groundingSummary.groundedClaimCount}.`
        });
    }
    if (expectations.maxUnsupportedClaims !== undefined) {
        results.push({
            id: `${entry.id}-unsupported-claims`,
            description: `Expected unsupported claims <= ${expectations.maxUnsupportedClaims}.`,
            passed: groundingSummary != null && groundingSummary.unsupportedClaimCount <= expectations.maxUnsupportedClaims,
            category: "unsupported-claim",
            detail: groundingSummary == null
                ? "No grounding summary was available."
                : `Actual unsupported claims: ${groundingSummary.unsupportedClaimCount}.`
        });
    }
    if (expectations.maxConflictedClaims !== undefined) {
        results.push({
            id: `${entry.id}-conflicted-claims`,
            description: `Expected conflicted claims <= ${expectations.maxConflictedClaims}.`,
            passed: groundingSummary != null && groundingSummary.conflictedClaimCount <= expectations.maxConflictedClaims,
            category: "grounding",
            detail: groundingSummary == null
                ? "No grounding summary was available."
                : `Actual conflicted claims: ${groundingSummary.conflictedClaimCount}.`
        });
    }
    if (expectations.minCitationCoverage !== undefined) {
        results.push({
            id: `${entry.id}-citation-coverage`,
            description: `Expected citation coverage >= ${Math.round(expectations.minCitationCoverage * 100)}%.`,
            passed: groundingSummary != null && groundingSummary.citationCoverage >= expectations.minCitationCoverage,
            category: "grounding",
            detail: groundingSummary == null
                ? "No grounding summary was available."
                : `Actual citation coverage: ${Math.round(groundingSummary.citationCoverage * 100)}%.`
        });
    }
    return results;
};
const evaluatePromptEvaluationCase = (entry, reply, routing, status, groundingSummary) => {
    const totalAssertions = countPromptEvaluationAssertions(entry);
    if (status === "error") {
        return {
            checkResults: buildSkippedPromptCheckResults(entry),
            qualityStatus: "needs-review"
        };
    }
    const checkResults = [
        ...(entry.checks ?? []).map((check) => evaluatePromptCheck(reply, check)),
        ...evaluateRoutingExpectations(entry, routing),
        ...evaluateGroundingExpectations(entry, groundingSummary)
    ];
    if (totalAssertions === 0) {
        return {
            checkResults,
            qualityStatus: "needs-review"
        };
    }
    return {
        checkResults,
        qualityStatus: checkResults.some((check) => !check.passed) ? "needs-review" : "passed"
    };
};
const buildConversationAwarenessContext = (messages, latestUserMessage) => {
    const recentUserMessages = messages
        .filter((message) => message.role === "user")
        .map((message) => message.content.trim())
        .filter(Boolean);
    const latestTrimmed = latestUserMessage?.trim();
    if (latestTrimmed &&
        recentUserMessages[recentUserMessages.length - 1]?.toLowerCase() !== latestTrimmed.toLowerCase()) {
        recentUserMessages.push(latestTrimmed);
    }
    const lastAwarenessIntentFamily = [...messages]
        .reverse()
        .find((message) => message.role === "assistant" && message.metadata?.awareness?.intentFamily)
        ?.metadata?.awareness?.intentFamily ?? null;
    return {
        recentUserMessages: recentUserMessages.slice(-2),
        lastAwarenessIntentFamily
    };
};
const handleSendChat = async (payload) => {
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
const handleSendChatAdvanced = async (payload) => {
    const sendChatStartedAtMs = Date.now();
    busy = true;
    const requestId = payload.requestId ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const modelOverride = payload.modelOverride?.trim() || undefined;
    const awarenessAnswerMode = normalizeAwarenessAnswerMode(payload.awarenessAnswerMode);
    const evaluationSuiteMode = payload.runMode === "evaluation" ? payload.evaluationSuiteMode ?? null : null;
    let contextPreview = emptyContextPreview;
    let reasoningTrace = null;
    let rawIntentRoute = null;
    let intentRoute = null;
    let reasoningMode = null;
    let replyPolicy = null;
    let awarenessUsed = false;
    let deterministicAwarenessReply = false;
    let genericWritingPromptSuppressed = false;
    let cleanupBypassed = false;
    let routingSuppressionReason = null;
    let retrievedSourceSummary = null;
    let governedTaskState = null;
    const buildExecutionDiagnostics = () => ({
        routeFamily: routingSuppressionReason ? "generic-writing" : intentRoute?.family ?? null,
        routeConfidence: routingSuppressionReason ? null : intentRoute?.confidence ?? null,
        rawRouteFamily: rawIntentRoute?.family ?? null,
        rawRouteConfidence: rawIntentRoute?.confidence ?? null,
        awarenessUsed,
        deterministicAwareness: deterministicAwarenessReply,
        genericWritingPromptSuppressed,
        sourceScope: replyPolicy?.sourceScope ?? null,
        replyPolicy,
        cleanupBypassed,
        routingSuppressionReason,
        retrievedSourceSummary,
        reasoningMode: reasoningMode?.mode ?? null,
        evaluationSuiteMode,
        taskState: governedTaskState
    });
    try {
        const resolved = await resolveConversation(payload.conversationId);
        const conversationId = resolved.conversation.id;
        if (payload.regenerate) {
            await removeLastAssistantMessage(conversationId);
        }
        else {
            await appendChatMessage(conversationId, "user", payload.text);
        }
        const conversationAfterTurn = (await loadConversationRecord(conversationId)) ?? (await resolveConversation(conversationId));
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
            getScreenAwareness: () => awarenessEngine?.screenAwareness ?? null
        });
        if (governedTurn.handled) {
            governedTaskState = governedTurn.taskState;
            const assistantMetadata = governedTaskState ? { task: governedTaskState } : undefined;
            const assistantMessage = await appendChatMessage(conversationId, "assistant", governedTurn.assistantReply, undefined, assistantMetadata);
            const conversationWithMessages = (await loadConversationRecord(conversationId)) ?? (await resolveConversation(conversationId));
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
        const ragOptions = payload.ragOptions ?? {};
        const ragEnabledByDefault = ragOptions.defaultEnabled ?? true;
        const showTrace = resolveToggleMode(ragOptions.showTrace, ragOptions.defaultShowTrace ?? false);
        const resolvedUseWeb = payload.useWebSearch ?? resolveToggleMode(ragOptions.useWeb, ragOptions.defaultUseWeb ?? false);
        const workspaceIndexingEnabled = ragOptions.workspaceIndexingEnabled ?? true;
        const conversationContext = buildConversationAwarenessContext(resolved.messages, payload.text);
        rawIntentRoute = awarenessEngine ? routeAwarenessIntent(payload.text, conversationContext) : null;
        const isChatOnlyEvaluation = payload.runMode === "evaluation" && evaluationSuiteMode === "chat-only";
        const genericWritingPrompt = isGenericWritingPrompt(payload.text);
        const explicitWindowsAwarenessPrompt = isExplicitWindowsAwarenessPrompt(payload.text, rawIntentRoute);
        replyPolicy = resolveReplyPolicy(payload.text, {
            explicitWindowsAwarenessPrompt,
            useWebSearch: Boolean(resolvedUseWeb),
            overrides: payload.replyPolicy
        });
        cleanupBypassed = shouldBypassCleanup(payload.runMode, replyPolicy);
        routingSuppressionReason = getRoutingSuppressionReason(payload.text, replyPolicy);
        intentRoute = rawIntentRoute;
        genericWritingPromptSuppressed = genericWritingPrompt && !isChatOnlyEvaluation;
        const shouldQueryAwareness = awarenessEngine !== null &&
            intentRoute !== null &&
            !isChatOnlyEvaluation &&
            !genericWritingPrompt &&
            routingSuppressionReason == null &&
            ((awarenessAnswerMode === "evidence-first" && explicitWindowsAwarenessPrompt) ||
                intentRoute.confidence >= 0.35);
        const shouldRefreshAwareness = shouldQueryAwareness &&
            intentRoute !== null &&
            (explicitWindowsAwarenessPrompt || intentRoute.confidence >= 0.45 || intentRoute.signals.length > 0);
        const preferOfficialWindowsKnowledge = shouldQueryAwareness && shouldPreferOfficialWindowsKnowledge(payload.text, intentRoute);
        reasoningMode = detectReasoningMode({
            query: payload.text,
            ragEnabled: ragEnabledByDefault,
            override: ragOptions.enabled
        });
        reasoningTrace = createReasoningTraceState({
            requestId,
            conversationId,
            mode: reasoningMode.mode,
            triggerReason: reasoningMode.triggerReason,
            visible: showTrace,
            includeWeb: resolvedUseWeb,
            includeWorkspace: reasoningMode.mode === "advanced" && workspaceIndexingEnabled
        });
        reasoningTrace = startTraceStage(reasoningTrace, "route");
        reasoningTrace = completeTraceStage(reasoningTrace, "route", {
            summary: `${reasoningMode.mode} path`,
            detail: [
                reasoningMode.triggerReason,
                `score ${reasoningMode.complexityScore.toFixed(2)}`,
                replyPolicy ? `scope ${replyPolicy.sourceScope}` : null,
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
            enableSemanticMemory: reasoningMode.mode === "advanced",
            memoryEmbedder: provider.embeddings ? (text) => provider.embeddings(text) : undefined
        });
        reasoningTrace = updateTraceRetrieval(reasoningTrace, mergeRetrievalStats(createEmptyRetrievalStats(), preparedPromptContext.retrieval));
        reasoningTrace = completeTraceStage(reasoningTrace, "retrieve-memory", {
            summary: `${preparedPromptContext.retrievedMemories.length} retrieved memories`,
            detail: preparedPromptContext.retrieval.memorySemantic > 0
                ? `${preparedPromptContext.retrieval.memoryKeyword} keyword | ${preparedPromptContext.retrieval.memorySemantic} semantic`
                : `${preparedPromptContext.retrieval.memoryKeyword} keyword`,
            sourceCount: preparedPromptContext.retrieval.memoryKeyword + preparedPromptContext.retrieval.memorySemantic
        });
        sendReasoningTrace(reasoningTrace);
        if (reasoningMode.mode === "advanced" && workspaceIndexingEnabled) {
            reasoningTrace = startTraceStage(reasoningTrace, "retrieve-workspace");
            sendReasoningTrace(reasoningTrace);
            const workspaceResult = await queryWorkspaceIndex(payload.text, {
                workspaceRoot: process.cwd(),
                runtimeRoot: awarenessEngine?.paths.runtimeRoot ?? path.join(process.cwd(), ".runtime", "awareness"),
                enabled: true,
                mode: "incremental",
                embedder: provider.embeddings ? (text) => provider.embeddings(text) : undefined
            });
            preparedPromptContext.workspaceHits = filterWorkspaceHitsForReplyPolicy(workspaceResult.hits, replyPolicy?.sourceScope ?? "workspace-only");
            preparedPromptContext.workspaceIndexStatus = workspaceResult.status;
            preparedPromptContext.retrieval = mergeRetrievalStats(preparedPromptContext.retrieval, {
                workspace: preparedPromptContext.workspaceHits.length
            });
            reasoningTrace = updateTraceRetrieval(reasoningTrace, preparedPromptContext.retrieval);
            reasoningTrace = completeTraceStage(reasoningTrace, "retrieve-workspace", {
                summary: `${preparedPromptContext.workspaceHits.length} workspace chunks`,
                detail: replyPolicy?.sourceScope && workspaceResult.hits.length !== preparedPromptContext.workspaceHits.length
                    ? `${workspaceResult.status.detail ?? "workspace filtered"} | scoped to ${replyPolicy.sourceScope}`
                    : workspaceResult.status.detail,
                sourceCount: preparedPromptContext.workspaceHits.length
            });
            sendReasoningTrace(reasoningTrace);
        }
        reasoningTrace = startTraceStage(reasoningTrace, "retrieve-awareness");
        sendReasoningTrace(reasoningTrace);
        const awarenessQuery = shouldQueryAwareness
            ? await awarenessEngine.queryAwarenessLive({
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
        const recentWeb = preferOfficialWindowsKnowledge && !resolvedUseWeb
            ? {
                status: "off",
                query: payload.text,
                results: []
            }
            : await resolveRecentWebContext(payload.text, Boolean(resolvedUseWeb));
        const awarenessDigest = awarenessEngine?.getDigest() ?? null;
        const machineAwareness = awarenessEngine?.machineAwareness ?? null;
        const fileAwareness = awarenessEngine?.fileAwareness ?? null;
        const screenAwareness = awarenessEngine?.screenAwareness ?? null;
        const officialKnowledge = toOfficialKnowledgeContext(awarenessQuery);
        const officialWebContext = recentWeb.status === "used" ? recentWeb : toOfficialWebContext(awarenessQuery);
        retrievedSourceSummary = {
            memoryCount: preparedPromptContext.retrievedMemories.length,
            workspaceHitCount: preparedPromptContext.workspaceHits.length,
            workspacePaths: summarizeWorkspacePaths(preparedPromptContext.workspaceHits),
            awarenessSourceCount: awarenessQuery ? Math.max(1, awarenessQuery.bundle.evidenceTraceIds.length) : 0,
            webResultCount: officialWebContext.status === "used" ? officialWebContext.results.length : 0
        };
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
                summary: officialWebContext.status === "used"
                    ? `${officialWebContext.results.length} web results`
                    : recentWeb.status === "no_results"
                        ? "No web results"
                        : "Web retrieval unavailable",
                detail: recentWeb.status === "error" ? recentWeb.error ?? null : null,
                sourceCount: officialWebContext.status === "used" ? officialWebContext.results.length : 0
            });
            sendReasoningTrace(reasoningTrace);
        }
        const ragContextBase = {
            enabled: ragEnabledByDefault || ragOptions.enabled === "on",
            mode: reasoningMode.mode,
            triggerReason: reasoningMode.triggerReason,
            retrieval: preparedPromptContext.retrieval,
            traceSummary: null,
            workspaceIndex: preparedPromptContext.workspaceIndexStatus,
            workspaceHits: preparedPromptContext.workspaceHits
        };
        const runtimePreview = await buildLatestAgentRuntimePreview();
        const latestContext = finalizePromptContext(preparedPromptContext, officialWebContext, awarenessDigest, awarenessQuery, awarenessAnswerMode, officialKnowledge, machineAwareness, fileAwareness, screenAwareness, ragContextBase, runtimePreview);
        contextPreview = {
            ...latestContext.preview,
            replyPolicy
        };
        const promptMessages = applyPromptPolicies(latestContext.promptMessages, payload.responseMode, awarenessAnswerMode, reasoningMode.mode, replyPolicy);
        const liveUsageAnswer = isLiveUsageAnswer(awarenessQuery) ? awarenessQuery : null;
        deterministicAwarenessReply = shouldUseDeterministicAwarenessReply(payload.text, awarenessAnswerMode, awarenessQuery, replyPolicy);
        let planText = null;
        let assistantReply;
        let assistantMetadata;
        if (reasoningMode.mode === "advanced") {
            if (!deterministicAwarenessReply) {
                reasoningTrace = startTraceStage(reasoningTrace, "plan");
                sendReasoningTrace(reasoningTrace);
                planText = cleanupPlainTextAnswer(await chatExecution.runChat(createPlanningMessages(promptMessages, payload.text), {
                    model: modelOverride
                }));
                reasoningTrace = completeTraceStage(reasoningTrace, "plan", {
                    summary: planText.split(/\r?\n/)[0]?.trim() || "Built a short plan",
                    detail: planText.slice(0, 240) || null
                });
                sendReasoningTrace(reasoningTrace);
            }
            else {
                reasoningTrace = completeTraceStage(reasoningTrace, "plan", {
                    summary: "Skipped plan for deterministic grounded reply"
                });
                sendReasoningTrace(reasoningTrace);
            }
        }
        reasoningTrace = startTraceStage(reasoningTrace, "synthesize");
        sendReasoningTrace(reasoningTrace);
        if (deterministicAwarenessReply && awarenessQuery) {
            assistantMetadata = buildAwarenessMessageMetadata(awarenessQuery, payload.text);
            if (liveUsageAnswer) {
                assistantReply = formatAwarenessReply(liveUsageAnswer);
                assistantMetadata = buildLiveAwarenessMessageMetadata(liveUsageAnswer, payload.text);
            }
            else if (isFeatureSummaryQuery(payload.text, awarenessQuery)) {
                try {
                    assistantReply = await summarizeFeatureChangesWithLocalAi(awarenessQuery, modelOverride);
                }
                catch {
                    assistantReply = formatAwarenessReply(awarenessQuery);
                }
            }
            else {
                assistantReply = formatAwarenessReply(awarenessQuery);
            }
            sendRendererEvent(IPC_CHANNELS.chatStream, {
                requestId,
                conversationId,
                content: assistantReply
            });
        }
        else {
            const synthesisMessages = createSynthesisMessages(promptMessages, planText);
            assistantReply = await chatExecution.runChatStream(synthesisMessages, (content) => {
                sendRendererEvent(IPC_CHANNELS.chatStream, {
                    requestId,
                    conversationId,
                    content
                });
            }, {
                model: modelOverride
            });
            if (!cleanupBypassed) {
                assistantReply = cleanupPlainTextAnswer(assistantReply);
            }
            sendRendererEvent(IPC_CHANNELS.chatStream, {
                requestId,
                conversationId,
                content: assistantReply
            });
        }
        reasoningTrace = completeTraceStage(reasoningTrace, "synthesize", {
            summary: `Generated ${assistantReply.length} chars`,
            detail: deterministicAwarenessReply ? "Deterministic grounded reply" : "Streamed synthesis"
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
            runVerifier: (messages) => chatExecution.runChat(messages, {
                model: modelOverride
            })
        });
        const verificationConfidence = groundedReply.metadata.summary.overallConfidence;
        reasoningTrace = updateTraceGrounding(reasoningTrace, groundedReply.metadata.summary);
        reasoningTrace = completeTraceStage(reasoningTrace, "verify", {
            summary: `${verificationConfidence} confidence | ${Math.round(groundedReply.metadata.summary.citationCoverage * 100)}% cited`,
            detail: `Claims ${groundedReply.metadata.summary.claimCount} | unsupported ${groundedReply.metadata.summary.unsupportedClaimCount} | conflicts ${groundedReply.metadata.summary.conflictedClaimCount}`,
            sourceCount: groundedReply.metadata.summary.usedSourceCount
        });
        reasoningTrace = finalizeReasoningTrace(reasoningTrace, {
            confidence: verificationConfidence
        });
        sendReasoningTrace(reasoningTrace);
        const ragTraceSummary = toReasoningTraceSummary(reasoningTrace);
        const ragContext = {
            ...ragContextBase,
            retrieval: preparedPromptContext.retrieval,
            traceSummary: ragTraceSummary,
            workspaceIndex: preparedPromptContext.workspaceIndexStatus,
            workspaceHits: preparedPromptContext.workspaceHits
        };
        contextPreview = {
            ...contextPreview,
            workspaceHits: preparedPromptContext.workspaceHits,
            rag: ragContext,
            grounding: groundedReply.metadata.summary,
            retrievalEval: groundedReply.retrievalEval
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
        const assistantSources = officialWebContext.status === "used" ? officialWebContext.results : undefined;
        const assistantMessage = await appendChatMessage(conversationId, "assistant", assistantReply, assistantSources, assistantMetadata);
        const conversationWithMessages = (await loadConversationRecord(conversationId)) ?? (await resolveConversation(conversationId));
        if (payload.runMode !== "evaluation") {
            scheduleConversationMaintenance(conversationId, payload.text, assistantReply, modelOverride, {
                skipMemories: Boolean(liveUsageAnswer)
            });
        }
        return {
            conversation: conversationWithMessages.conversation,
            assistantMessage,
            messages: conversationWithMessages.messages,
            contextPreview,
            modelStatus: createModelStatus("connected", undefined, modelOverride),
            diagnostics: buildExecutionDiagnostics()
        };
    }
    catch (error) {
        if (reasoningTrace) {
            reasoningTrace = failTraceStage(reasoningTrace, "synthesize", error instanceof Error ? error.message : "Unknown chat error");
            reasoningTrace = finalizeReasoningTrace(reasoningTrace, { confidence: "low" });
            sendReasoningTrace(reasoningTrace);
        }
        const detail = error instanceof Error ? error.message : "Unknown chat error";
        const resolved = await resolveConversation(payload.conversationId);
        const assistantMessage = await appendChatMessage(resolved.conversation.id, "assistant", `Local model error: ${detail}`);
        const conversationWithMessages = await resolveConversation(resolved.conversation.id);
        return {
            conversation: conversationWithMessages.conversation,
            assistantMessage,
            messages: conversationWithMessages.messages,
            contextPreview,
            modelStatus: createModelStatus(resolveModelErrorStatus(detail), detail, modelOverride),
            diagnostics: buildExecutionDiagnostics()
        };
    }
    finally {
        busy = false;
        recordAwarenessDuration("sendChat", sendChatStartedAtMs);
    }
};
const runPromptEvaluation = async (request) => {
    const normalizedCases = normalizePromptEvaluationCases(request.cases);
    if (normalizedCases.length === 0) {
        throw new Error("Add at least one prompt before running a prompt evaluation.");
    }
    const workspaceRoot = process.cwd();
    const suiteName = request.suiteName?.trim() || DEFAULT_PROMPT_EVAL_SUITE_NAME;
    const results = [];
    for (const entry of normalizedCases) {
        const startedAt = new Date().toISOString();
        let conversationId = null;
        try {
            const conversation = await createConversationRecord();
            conversationId = conversation.id;
            const response = await handleSendChatAdvanced({
                conversationId,
                text: entry.prompt,
                requestId: `prompt-eval-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                runMode: "evaluation",
                evaluationSuiteMode: request.suiteMode,
                useWebSearch: request.useWebSearch,
                modelOverride: request.modelOverride,
                responseMode: request.responseMode,
                awarenessAnswerMode: request.awarenessAnswerMode,
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
            const groundingSummary = response.assistantMessage.metadata?.grounding?.summary ?? response.contextPreview.grounding ?? null;
            const evaluation = evaluatePromptEvaluationCase(entry, response.assistantMessage.content, routing, status, groundingSummary);
            results.push({
                ...entry,
                reply: response.assistantMessage.content,
                startedAt,
                completedAt,
                durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
                status,
                qualityStatus: evaluation.qualityStatus,
                modelStatus: response.modelStatus,
                traceSummary: response.assistantMessage.metadata?.rag?.traceSummary ??
                    response.contextPreview.rag?.traceSummary ??
                    null,
                routing,
                checkResults: evaluation.checkResults
            });
        }
        catch (error) {
            const completedAt = new Date().toISOString();
            const detail = error instanceof Error ? error.message : "Unknown prompt evaluation error";
            const routing = buildPromptEvaluationRoutingReport(undefined);
            const evaluation = evaluatePromptEvaluationCase(entry, `Prompt evaluation failed: ${detail}`, routing, "error", null);
            results.push({
                ...entry,
                reply: `Prompt evaluation failed: ${detail}`,
                startedAt,
                completedAt,
                durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
                status: "error",
                qualityStatus: evaluation.qualityStatus,
                modelStatus: createModelStatus(resolveModelErrorStatus(detail), detail, request.modelOverride?.trim() || undefined),
                traceSummary: null,
                routing,
                checkResults: evaluation.checkResults
            });
        }
        finally {
            if (conversationId) {
                await deleteConversationRecord(conversationId).catch(() => { });
            }
        }
    }
    const generatedAt = new Date().toISOString();
    const reportPath = buildPromptEvaluationReportPath(workspaceRoot, suiteName, generatedAt);
    const chatHistoryPath = buildPromptEvaluationChatHistoryPath(workspaceRoot);
    const report = {
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
const startAwarenessEngine = async () => {
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
        }
        catch (error) {
            console.warn("Awareness API server failed to start:", error instanceof Error ? error.message : "unknown error");
        }
    }
    catch (error) {
        awarenessRuntimeState.ready = false;
        console.warn("Awareness engine failed to initialize:", error instanceof Error ? error.message : "unknown error");
    }
    finally {
        awarenessRuntimeState.initializing = false;
        awarenessRuntimeState.inFlightTargets = [];
        awarenessRuntimeState.lastInitDurationMs = Math.max(0, Date.now() - initStartedAtMs);
        recordAwarenessDuration("init", initStartedAtMs);
    }
};
const registerIpc = () => {
    ipcMain.handle(IPC_CHANNELS.appHealth, async () => ({
        status: "ok",
        startedAt,
        version: APP_VERSION,
        awareness: getAwarenessRuntimeHealth(),
        startupDigest: awarenessEngine?.getStartupDigest() ?? null
    }));
    ipcMain.handle(IPC_CHANNELS.modelHealth, async (_event, modelOverride) => checkOllamaHealth(busy, modelOverride ? { model: modelOverride } : undefined));
    ipcMain.handle(IPC_CHANNELS.listModels, async () => {
        try {
            return await listOllamaModels(getOllamaConfig());
        }
        catch {
            return [];
        }
    });
    ipcMain.handle(IPC_CHANNELS.createConversation, async () => {
        const conversation = await createConversationRecord();
        return { conversation, messages: [] };
    });
    ipcMain.handle(IPC_CHANNELS.listConversations, async () => listConversationRecords());
    ipcMain.handle(IPC_CHANNELS.loadConversation, async (_event, conversationId) => loadConversationRecord(conversationId));
    ipcMain.handle(IPC_CHANNELS.clearConversation, async (_event, conversationId) => {
        await clearConversationMessages(conversationId);
        return resolveConversation(conversationId);
    });
    ipcMain.handle(IPC_CHANNELS.deleteConversation, async (_event, conversationId) => {
        await deleteConversationRecord(conversationId);
    });
    ipcMain.handle(IPC_CHANNELS.sendChat, async (_event, payload) => handleSendChat(payload));
    ipcMain.handle(IPC_CHANNELS.awarenessQuery, async (_event, request) => awarenessEngine?.queryAwarenessLive(request) ?? null);
    ipcMain.handle(IPC_CHANNELS.searchMemories, async (_event, query) => searchMemoryRecords(query));
    ipcMain.handle(IPC_CHANNELS.listMemories, async () => listMemoryRecords());
    ipcMain.handle(IPC_CHANNELS.deleteMemory, async (_event, memoryId) => {
        await deleteMemoryRecord(memoryId);
    });
    ipcMain.handle(IPC_CHANNELS.desktopActionCatalog, async () => desktopActions.listDesktopActions());
    ipcMain.handle(IPC_CHANNELS.desktopActionSuggest, async (_event, prompt) => desktopActions.suggestDesktopAction(prompt));
    ipcMain.handle(IPC_CHANNELS.desktopActionApprove, async (_event, request, approvedBy, ttlMs) => desktopActions.issueDesktopActionApproval(request, approvedBy, ttlMs));
    ipcMain.handle(IPC_CHANNELS.desktopActionExecute, async (_event, request) => desktopActions.executeDesktopAction(request));
    ipcMain.handle(IPC_CHANNELS.workflowPlanSuggest, async (_event, prompt) => workflowOrchestrator.suggestWorkflow(prompt));
    ipcMain.handle(IPC_CHANNELS.workflowApprove, async (_event, plan, approvedBy, ttlMs) => workflowOrchestrator.issueWorkflowApproval(plan, approvedBy, ttlMs));
    ipcMain.handle(IPC_CHANNELS.workflowExecute, async (_event, request) => workflowOrchestrator.executeWorkflow(request));
    ipcMain.handle(IPC_CHANNELS.rollbackDesktopAction, async (_event, commandId, approvedBy, dryRun) => desktopActions.rollbackDesktopAction(commandId, approvedBy, dryRun));
    ipcMain.handle(IPC_CHANNELS.governanceDashboard, async () => buildGovernanceDashboardSnapshot());
    ipcMain.handle(IPC_CHANNELS.governanceApprovalQueue, async () => approvalQueue.list());
    ipcMain.handle(IPC_CHANNELS.governanceAuditQuery, async (_event, query) => queryGovernanceAuditEntries(desktopActionPaths.runtimeRoot, query ?? {}, {
        agentRuntimeRoot
    }));
    ipcMain.handle(IPC_CHANNELS.officialKnowledgeSources, async () => awarenessEngine?.listOfficialKnowledgeSources() ?? []);
    ipcMain.handle(IPC_CHANNELS.officialKnowledgeSourceUpdate, async (_event, sourceId, enabled) => {
        if (!awarenessEngine) {
            throw new Error("Awareness engine is not ready.");
        }
        return await awarenessEngine.setOfficialKnowledgeSourceEnabled(sourceId, enabled);
    });
    ipcMain.handle(IPC_CHANNELS.officialKnowledgeSourceRefresh, async (_event, sourceId) => {
        if (!awarenessEngine) {
            throw new Error("Awareness engine is not ready.");
        }
        return await awarenessEngine.refreshOfficialKnowledgeSource(sourceId);
    });
    ipcMain.handle(IPC_CHANNELS.contextPreview, async (_event, conversationId, latestUserMessage, awarenessAnswerModeArg, ragOptionsArg) => {
        const awarenessAnswerMode = normalizeAwarenessAnswerMode(awarenessAnswerModeArg);
        const ragOptions = ragOptionsArg ?? {};
        const conversation = await resolveConversation(conversationId);
        const conversationContext = buildConversationAwarenessContext(conversation.messages, latestUserMessage);
        const previewRoute = routeAwarenessIntent(latestUserMessage, conversationContext);
        const previewNeedsOfficial = shouldPreferOfficialWindowsKnowledge(latestUserMessage, previewRoute);
        const previewReasoningMode = detectReasoningMode({
            query: latestUserMessage,
            ragEnabled: ragOptions.defaultEnabled ?? true,
            override: ragOptions.enabled
        });
        const previewAwarenessAnswer = (await awarenessEngine?.queryAwarenessLive({
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
        })) ?? null;
        const ragContext = {
            enabled: ragOptions.defaultEnabled ?? true,
            mode: previewReasoningMode.mode,
            triggerReason: previewReasoningMode.triggerReason,
            retrieval: createEmptyRetrievalStats(),
            traceSummary: null,
            workspaceIndex: null,
            workspaceHits: []
        };
        const runtimePreview = await buildLatestAgentRuntimePreview();
        return buildPromptMessages(conversationId, latestUserMessage, undefined, awarenessEngine?.getDigest() ?? null, previewAwarenessAnswer, awarenessAnswerMode, toOfficialKnowledgeContext(previewAwarenessAnswer), awarenessEngine?.machineAwareness ?? null, awarenessEngine?.fileAwareness ?? null, awarenessEngine?.screenAwareness ?? null, ragContext, {
            enableSemanticMemory: previewReasoningMode.mode === "advanced",
            memoryEmbedder: provider.embeddings ? (text) => provider.embeddings(text) : undefined,
            workspace: previewReasoningMode.mode === "advanced" && (ragOptions.workspaceIndexingEnabled ?? true)
                ? {
                    workspaceRoot: process.cwd(),
                    runtimeRoot: awarenessEngine?.paths.runtimeRoot ?? path.join(process.cwd(), ".runtime", "awareness"),
                    enabled: true,
                    mode: "incremental",
                    embedder: provider.embeddings ? (text) => provider.embeddings(text) : undefined
                }
                : null
        }, runtimePreview).then((result) => result.contextPreview);
    });
    ipcMain.handle(IPC_CHANNELS.promptEvaluationRun, async (_event, request) => runPromptEvaluation(request));
    ipcMain.handle(IPC_CHANNELS.screenStatus, async () => awarenessEngine?.getScreenStatus() ?? null);
    ipcMain.handle(IPC_CHANNELS.screenForegroundWindow, async () => awarenessEngine?.screenAwareness?.foregroundWindow ?? null);
    ipcMain.handle(IPC_CHANNELS.screenUiTree, async () => awarenessEngine?.screenAwareness?.uiTree ?? null);
    ipcMain.handle(IPC_CHANNELS.screenLastEvents, async () => awarenessEngine?.screenAwareness?.recentEvents ?? []);
    ipcMain.handle(IPC_CHANNELS.screenStartAssist, async (_event, options) => awarenessEngine?.startAssistMode(options) ?? Promise.resolve(null));
    ipcMain.handle(IPC_CHANNELS.screenStopAssist, async (_event, payload) => awarenessEngine?.stopAssistMode(payload?.reason) ?? Promise.resolve(null));
    ipcMain.handle(IPC_CHANNELS.agentRuntimeRun, async (_event, task) => agentRuntimeService.startTask(task));
    ipcMain.handle(IPC_CHANNELS.agentRuntimeList, async () => agentRuntimeService.listJobs());
    ipcMain.handle(IPC_CHANNELS.agentRuntimeInspect, async (_event, jobId) => agentRuntimeService.inspectJob(jobId));
    ipcMain.handle(IPC_CHANNELS.agentRuntimeResume, async (_event, jobId) => agentRuntimeService.resumeJob(jobId));
    ipcMain.handle(IPC_CHANNELS.agentRuntimeCancel, async (_event, jobId) => agentRuntimeService.cancelJob(jobId));
    ipcMain.handle(IPC_CHANNELS.agentRuntimeRecover, async (_event, jobId) => agentRuntimeService.recoverJob(jobId));
};
app.whenReady().then(async () => {
    const databasePath = path.join(app.getPath("userData"), "synai-db.json");
    configureMemoryDatabase(databasePath);
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
