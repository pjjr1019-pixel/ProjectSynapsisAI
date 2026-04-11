import { detectFailureFeedback, resolveBrowserNavigationTarget, resolveProcessFollowUpPrompt } from "@awareness/target-knowledge";
const normalizeText = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const containsAny = (value, needles) => needles.some((needle) => value.includes(needle));
const isBrowserAutomationPrompt = (normalized) => containsAny(normalized, [
    "browser",
    "web page",
    "web site",
    "website",
    "web form",
    "search the web",
    "search browser",
    "submit form",
    "click link",
    "open the page",
    "open the site"
]);
const isServiceControlPrompt = (normalized) => containsAny(normalized, [
    "start service",
    "stop service",
    "restart service",
    "service control",
    "service manager",
    "print spooler",
    "windows update service"
]) && containsAny(normalized, ["start", "stop", "restart", "cycle", "enable", "disable"]);
const isRegistryControlPrompt = (normalized) => containsAny(normalized, [
    "registry value",
    "registry key",
    "registry editor",
    "regedit",
    "set registry",
    "delete registry",
    "modify registry",
    "change registry"
]);
const isUiAutomationPrompt = (normalized) => containsAny(normalized, [
    "click ",
    "click the",
    "press ",
    "type ",
    "enter text",
    "fill ",
    "hotkey",
    "keyboard shortcut",
    "choose ",
    "select ",
    "select the",
    "activate ",
    "submit ",
    "open dialog",
    "open menu"
]);
const riskTierFromAction = (actionType) => {
    if (!actionType) {
        return "tier-0";
    }
    if (containsAny(actionType, ["deny", "clarify", "plan-only"])) {
        return "tier-0";
    }
    if (containsAny(actionType, ["answer-only", "inspection", "browser-session"])) {
        return "tier-0";
    }
    if (containsAny(actionType, ["browser-automation", "workflow", "report", "launch", "open", "browse"])) {
        return "tier-1";
    }
    if (containsAny(actionType, ["ui-automation", "window"])) {
        return "tier-1";
    }
    if (containsAny(actionType, ["create", "rename", "move", "settings"])) {
        return "tier-2";
    }
    if (containsAny(actionType, ["delete", "terminate", "uninstall", "shutdown", "service", "registry"])) {
        return "tier-3";
    }
    return "tier-1";
};
const defaultApprovalState = (reason, approvedBy = null) => ({
    required: Boolean(reason),
    pending: Boolean(reason),
    reason,
    approver: approvedBy,
    tokenId: null,
    expiresAt: null
});
const detectConfirmation = (normalized) => /^(approve|approved|confirm|confirmed|proceed|proceed with it|yes|yes please|go ahead|do it|run it|continue)$/.test(normalized);
const detectAnswerOnlyPrompt = (normalized) => {
    const actionWords = [
        "open",
        "launch",
        "start",
        "run",
        "close",
        "kill",
        "terminate",
        "stop",
        "delete",
        "remove",
        "create",
        "rename",
        "move",
        "install",
        "uninstall",
        "save",
        "write",
        "click",
        "type",
        "hotkey",
        "press",
        "submit",
        "research",
        "report",
        "youtube",
        "video",
        "control panel",
        "task manager",
        "computer health",
        "health report",
        "slowing my pc",
        "make my computer faster",
        "clean up my desktop",
        "organize my files",
        "disk space",
        "storage",
        "startup",
        "performance",
        "slowing my pc down",
        "make my pc faster",
        "organize",
        "organise",
        "orginaze",
        "cleanup",
        "clean up",
        "tidy",
        "sort"
    ];
    return !containsAny(normalized, actionWords);
};
const detectWorkflowIntent = (normalized) => containsAny(normalized, [
    "research",
    "report",
    "computer health",
    "health report",
    "current state",
    "latest",
    "youtube",
    "play a random video",
    "play video",
    "slowing my pc",
    "make my computer faster",
    "clean up my desktop",
    "organize my files",
    "disk space",
    "storage",
    "startup",
    "performance",
    "create file",
    "create folder",
    "rename file",
    "rename folder",
    "move file",
    "move folder",
    "delete file",
    "delete folder",
    "save it in",
    "save it to",
    "my desktop",
    "my documents",
    "do what i asked yesterday that failed",
    "what is slowing my pc down",
    "browser",
    "website",
    "web page",
    "web form",
    "service",
    "registry",
    "click",
    "type",
    "hotkey"
]);
const detectDesktopIntent = (normalized) => containsAny(normalized, [
    "open ",
    "launch ",
    "start ",
    "close ",
    "kill ",
    "terminate ",
    "stop process",
    "create file",
    "create folder",
    "rename ",
    "move ",
    "delete ",
    "remove ",
    "open settings",
    "focus ",
    "bring to front",
    "switch to",
    "activate ",
    "show window",
    "add or remove programs",
    "control panel",
    "task manager",
    "services",
    "device manager",
    "event viewer",
    "task scheduler",
    "computer management",
    "registry editor",
    "uninstall",
    "focus ",
    "bring to front",
    "switch to",
    "activate ",
    "show window",
    "chrome"
]);
const detectAmbiguity = (normalized) => {
    const ambiguousTargets = [
        "this",
        "that",
        "it",
        "task",
        "process",
        "folder",
        "file",
        "app",
        "thing",
        "one",
        "whatever",
        "button",
        "field",
        "dialog",
        "menu",
        "control",
        "shortcut"
    ];
    const hasAction = containsAny(normalized, [
        "open",
        "close",
        "kill",
        "terminate",
        "delete",
        "remove",
        "move",
        "rename",
        "uninstall",
        "stop"
    ]);
    return (hasAction &&
        ambiguousTargets.some((word) => normalized.includes(word)) &&
        !containsAny(normalized, [
            "chrome",
            "notepad",
            "settings",
            "panel",
            "desktop",
            "documents",
            "task manager",
            "open file",
            "open folder",
            "open directory",
            "file directory"
        ]));
};
const detectApprovalNeed = (normalized) => {
    if (containsAny(normalized, ["delete", "remove", "terminate", "kill", "uninstall", "shutdown", "stop service", "restart service", "set registry", "delete registry", "modify registry"])) {
        return "This task can change or remove system state, so it needs fresh approval.";
    }
    if (containsAny(normalized, ["change my windows theme", "install", "storage settings", "startup apps", "change system settings"])) {
        return "This task changes system settings and should be approval-gated.";
    }
    return null;
};
const isSystemNavigationPrompt = (normalized) => containsAny(normalized, [
    "open settings",
    "open windows settings",
    "windows settings",
    "windows settings app",
    "settings app",
    "control panel",
    "task manager",
    "services",
    "service manager",
    "device manager",
    "event viewer",
    "task scheduler",
    "computer management",
    "registry editor",
    "startup apps",
    "storage settings",
    "add or remove programs",
    "add remove program",
    "add remove programs",
    "apps and features",
    "open explorer",
    "open file explorer",
    "windows explorer",
    "file explorer",
    "explorer.exe",
    "open registry"
]);
const isBrowserNavigationPrompt = (rawText) => resolveBrowserNavigationTarget(rawText) !== null;
const isApplicationLaunchPrompt = (normalized) => (containsAny(normalized, ["open", "launch", "start", "run"]) ||
    containsAny(normalized, ["cmd", "command prompt", "powershell", "terminal", "notepad", "notepad plus plus"])) &&
    !containsAny(normalized, [
        "settings",
        "control panel",
        "task manager",
        "services",
        "device manager",
        "event viewer",
        "task scheduler",
        "computer management",
        "registry",
        "registry editor",
        "file explorer",
        "explorer",
        "file",
        "folder",
        "directory",
        "browser",
        "website",
        "web page",
        "url",
        "youtube",
        "duckduckgo",
        "facebook",
        "process",
        "task",
        "kill",
        "terminate",
        "close",
        "quit",
        "exit",
        "shutdown",
        "desktop",
        "documents",
        "add or remove programs",
        "apps and features"
    ]);
const isFileWorkflowPrompt = (normalized) => containsAny(normalized, [
    "open folder",
    "open directory",
    "open file directory",
    "browse folder",
    "organize my desktop",
    "orginaze my desktop",
    "organize my files",
    "tidy my desktop",
    "sort my desktop",
    "clean up my desktop"
]);
const isProcessWorkflowPrompt = (normalized) => containsAny(normalized, ["kill", "terminate", "end task", "stop task"]) && containsAny(normalized, ["process", "processes", "task manager"]);
const isCloseWorkflowPrompt = (normalized) => containsAny(normalized, ["close", "quit", "exit", "shut down", "shutdown"]);
const detectExecutor = (actionType) => {
    if (!actionType) {
        return "answer-only";
    }
    if (actionType.startsWith("workflow")) {
        return "workflow-orchestrator";
    }
    if (containsAny(actionType, ["browser-automation"])) {
        return "browser-automation";
    }
    if (containsAny(actionType, ["service-control"])) {
        return "service-control";
    }
    if (containsAny(actionType, ["registry-control"])) {
        return "registry-control";
    }
    if (containsAny(actionType, ["ui-automation"])) {
        return "ui-automation";
    }
    if (containsAny(actionType, ["browser"])) {
        return "browser-session";
    }
    if (containsAny(actionType, ["history"])) {
        return "history-replay";
    }
    if (containsAny(actionType, ["approval"])) {
        return "approval-queue";
    }
    if (containsAny(actionType, ["answer"])) {
        return "answer-only";
    }
    return "desktop-actions";
};
const summarizeSignals = (signals) => signals.length > 0 ? signals.join(" | ") : "No special routing signals matched.";
const buildClarificationPlan = (request, reason) => ({
    requestId: request.requestId,
    conversationId: request.conversationId,
    normalizedText: normalizeText(request.text),
    decision: "clarify",
    actionType: "clarification",
    riskTier: "tier-0",
    requiresExecution: false,
    approvalRequired: false,
    approvalReason: null,
    denialReason: null,
    clarificationNeeded: [reason],
    executionAllowed: false,
    verificationRequired: false,
    recommendedExecutor: "answer-only",
    policyRulesTriggered: ["clarification-needed"],
    reasoningSummary: reason,
    approvalState: defaultApprovalState(null),
    plan: null,
    desktopAction: null,
    workflowRequest: null,
    desktopRequest: null,
    artifacts: {
        route: "clarify",
        reason
    }
});
const buildDeniedPlan = (request, reason, ruleId) => ({
    requestId: request.requestId,
    conversationId: request.conversationId,
    normalizedText: normalizeText(request.text),
    decision: "deny",
    actionType: "denied",
    riskTier: "tier-4",
    requiresExecution: false,
    approvalRequired: false,
    approvalReason: null,
    denialReason: reason,
    clarificationNeeded: [],
    executionAllowed: false,
    verificationRequired: false,
    recommendedExecutor: "answer-only",
    policyRulesTriggered: [ruleId],
    reasoningSummary: reason,
    approvalState: defaultApprovalState(null),
    plan: null,
    desktopAction: null,
    workflowRequest: null,
    desktopRequest: null,
    artifacts: {
        route: "deny",
        ruleId
    }
});
const resolveHistoryReplay = (normalizedText, historyFindings) => {
    if (!containsAny(normalizedText, ["yesterday", "last time", "failed", "again", "repeat", "rerun", "do what i asked"])) {
        return null;
    }
    const candidates = historyFindings
        .filter((finding) => finding.repeated_request_count > 0)
        .sort((left, right) => {
        if (right.user_impact_score !== left.user_impact_score) {
            return right.user_impact_score - left.user_impact_score;
        }
        return right.last_seen.localeCompare(left.last_seen);
    });
    return candidates[0] ?? null;
};
export const routeGovernedChatTask = async (input) => {
    const normalizedText = normalizeText(input.request.text);
    const rawText = input.request.text;
    if (detectConfirmation(normalizedText)) {
        return {
            requestId: input.request.requestId,
            conversationId: input.request.conversationId,
            normalizedText,
            decision: "allow",
            actionType: "approval-confirmation",
            riskTier: "tier-0",
            requiresExecution: true,
            approvalRequired: false,
            approvalReason: null,
            denialReason: null,
            clarificationNeeded: [],
            executionAllowed: true,
            verificationRequired: true,
            recommendedExecutor: "approval-queue",
            policyRulesTriggered: ["explicit-confirmation"],
            reasoningSummary: "User confirmed a pending governed action.",
            approvalState: defaultApprovalState(null),
            plan: null,
            desktopAction: null,
            workflowRequest: null,
            desktopRequest: null,
            artifacts: {
                route: "approval-confirmation"
            }
        };
    }
    const replayCandidate = resolveHistoryReplay(normalizedText, input.historyFindings ?? []);
    if (replayCandidate) {
        const replayApprovalReason = detectApprovalNeed(normalizedText);
        const replayExecutor = replayCandidate.suggested_executor === "answer-only" ? "workflow-orchestrator" : replayCandidate.suggested_executor;
        return {
            requestId: input.request.requestId,
            conversationId: input.request.conversationId,
            normalizedText,
            decision: replayApprovalReason ? "require_approval" : "allow_with_verification",
            actionType: "history-replay",
            riskTier: riskTierFromAction(replayExecutor),
            requiresExecution: true,
            approvalRequired: Boolean(replayApprovalReason),
            approvalReason: null,
            denialReason: null,
            clarificationNeeded: [],
            executionAllowed: true,
            verificationRequired: true,
            recommendedExecutor: replayExecutor,
            policyRulesTriggered: ["history-replay", ...(replayApprovalReason ? ["approval-gate"] : [])],
            reasoningSummary: `Recovered prior failure signature: ${replayCandidate.prior_failure_signature} and routed it to ${replayExecutor}.`,
            approvalState: defaultApprovalState(replayApprovalReason),
            plan: null,
            desktopAction: null,
            workflowRequest: null,
            desktopRequest: null,
            artifacts: {
                route: "history-replay",
                recoveredIntent: replayCandidate.recovered_intent,
                failureSignature: replayCandidate.prior_failure_signature,
                repeatedRequestCount: replayCandidate.repeated_request_count,
                latestUserMessage: replayCandidate.latest_user_message,
                latestAssistantMessage: replayCandidate.latest_assistant_message,
                suggestedExecutor: replayCandidate.suggested_executor,
                suggestedGap: replayCandidate.suggested_gap
            }
        };
    }
    const processFollowUpResolution = resolveProcessFollowUpPrompt(rawText, input.request.messages ?? []);
    const routingText = processFollowUpResolution?.resolvedPrompt ?? normalizedText;
    const explicitFailureFeedback = detectFailureFeedback(rawText);
    if (detectAnswerOnlyPrompt(normalizedText) && !processFollowUpResolution && !explicitFailureFeedback) {
        return {
            requestId: input.request.requestId,
            conversationId: input.request.conversationId,
            normalizedText,
            decision: "allow",
            actionType: "answer-only",
            riskTier: "tier-0",
            requiresExecution: false,
            approvalRequired: false,
            approvalReason: null,
            denialReason: null,
            clarificationNeeded: [],
            executionAllowed: false,
            verificationRequired: false,
            recommendedExecutor: "answer-only",
            policyRulesTriggered: ["informational-query"],
            reasoningSummary: "Prompt is informational rather than executable.",
            approvalState: defaultApprovalState(null),
            plan: null,
            desktopAction: null,
            workflowRequest: null,
            desktopRequest: null,
            artifacts: {
                route: "answer-only"
            }
        };
    }
    if (explicitFailureFeedback && !processFollowUpResolution) {
        return {
            requestId: input.request.requestId,
            conversationId: input.request.conversationId,
            normalizedText,
            decision: "allow",
            actionType: "answer-only",
            riskTier: "tier-0",
            requiresExecution: false,
            approvalRequired: false,
            approvalReason: null,
            denialReason: null,
            clarificationNeeded: [],
            executionAllowed: false,
            verificationRequired: false,
            recommendedExecutor: "answer-only",
            policyRulesTriggered: ["user-failure-feedback"],
            reasoningSummary: "User reported a failure. Captured the feedback for history mining.",
            approvalState: defaultApprovalState(null),
            plan: null,
            desktopAction: null,
            workflowRequest: null,
            desktopRequest: null,
            artifacts: {
                route: "answer-only",
                normalizedText,
                userFailureFeedback: rawText
            }
        };
    }
    if (detectAmbiguity(normalizedText) && !processFollowUpResolution && !explicitFailureFeedback) {
        return buildClarificationPlan(input.request, "The request is executable, but the target is ambiguous. Please name the exact file, folder, app, process, or setting.");
    }
    const approvalReasonCandidate = detectApprovalNeed(routingText);
    const browserAutomationIntent = isBrowserAutomationPrompt(normalizedText);
    const browserNavigationIntent = isBrowserNavigationPrompt(rawText);
    const applicationLaunchIntent = isApplicationLaunchPrompt(normalizedText);
    const fileWorkflowIntent = isFileWorkflowPrompt(normalizedText);
    const processWorkflowIntent = isProcessWorkflowPrompt(normalizedText) || Boolean(processFollowUpResolution);
    const closeWorkflowIntent = isCloseWorkflowPrompt(normalizedText);
    const serviceControlIntent = isServiceControlPrompt(normalizedText);
    const registryControlIntent = isRegistryControlPrompt(normalizedText);
    const uiAutomationIntent = isUiAutomationPrompt(normalizedText);
    const systemNavigationIntent = isSystemNavigationPrompt(normalizedText);
    const registryNavigationIntent = systemNavigationIntent && containsAny(normalizedText, ["open registry", "registry editor", "regedit"]);
    const systemNavigationApprovalExempt = systemNavigationIntent &&
        containsAny(normalizedText, [
            "open settings",
            "open windows settings",
            "windows settings",
            "windows settings app",
            "settings app",
            "control panel",
            "task manager",
            "services",
            "service manager",
            "device manager",
            "event viewer",
            "task scheduler",
            "computer management",
            "registry editor",
            "startup apps",
            "storage settings",
            "add or remove programs",
            "add remove program",
            "add remove programs",
            "apps and features",
            "open explorer",
            "open file explorer",
            "windows explorer",
            "file explorer",
            "explorer.exe",
            "open registry"
        ]);
    const approvalReason = systemNavigationApprovalExempt ? null : approvalReasonCandidate;
    const workflowIntent = (detectWorkflowIntent(normalizedText) && !registryNavigationIntent) ||
        browserAutomationIntent ||
        browserNavigationIntent ||
        applicationLaunchIntent ||
        fileWorkflowIntent ||
        processWorkflowIntent ||
        closeWorkflowIntent ||
        serviceControlIntent ||
        registryControlIntent ||
        uiAutomationIntent;
    const desktopIntent = detectDesktopIntent(normalizedText) ||
        serviceControlIntent ||
        registryControlIntent ||
        uiAutomationIntent ||
        systemNavigationIntent;
    const actionType = workflowIntent
        ? browserAutomationIntent
            ? "browser-automation"
            : serviceControlIntent
                ? "service-control"
                : registryControlIntent
                    ? "registry-control"
                    : uiAutomationIntent
                        ? "ui-automation"
                        : "workflow"
        : desktopIntent
            ? containsAny(normalizedText, ["uninstall"])
                ? "desktop-uninstall"
                : containsAny(normalizedText, ["kill", "terminate", "stop process"])
                    ? "desktop-process-control"
                    : containsAny(normalizedText, ["focus", "bring to front", "switch to", "activate", "show window"])
                        ? "desktop-window-control"
                        : systemNavigationIntent
                            ? "desktop-system-navigation"
                            : containsAny(normalizedText, ["delete", "remove"])
                                ? "desktop-file-mutation"
                                : containsAny(normalizedText, ["create", "rename", "move"])
                                    ? "desktop-file-mutation"
                                    : "desktop-action"
            : "answer-only";
    const riskTier = riskTierFromAction(actionType);
    const approvalRequired = Boolean(approvalReason) ||
        serviceControlIntent ||
        registryControlIntent ||
        (containsAny(routingText, ["delete", "remove", "terminate", "kill", "uninstall", "shutdown", "restart", "stop service"]) &&
            !systemNavigationApprovalExempt);
    const decision = approvalRequired ? "require_approval" : workflowIntent || desktopIntent ? "allow_with_verification" : "allow";
    const executionAllowed = decision === "allow_with_verification" || decision === "allow";
    const verificationRequired = executionAllowed && actionType !== "answer-only";
    const clarificationNeeded = [];
    const policyRulesTriggered = [
        workflowIntent ? "workflow-intent" : null,
        desktopIntent ? "desktop-intent" : null,
        browserAutomationIntent ? "browser-automation-intent" : null,
        browserNavigationIntent ? "browser-navigation-intent" : null,
        applicationLaunchIntent ? "application-launch-intent" : null,
        fileWorkflowIntent ? "file-workflow-intent" : null,
        processWorkflowIntent ? "process-workflow-intent" : null,
        processFollowUpResolution ? "process-follow-up-intent" : null,
        closeWorkflowIntent ? "close-workflow-intent" : null,
        serviceControlIntent ? "service-control-intent" : null,
        registryControlIntent ? "registry-control-intent" : null,
        uiAutomationIntent ? "ui-automation-intent" : null,
        systemNavigationIntent ? "system-navigation-intent" : null,
        explicitFailureFeedback ? "user-failure-feedback" : null,
        approvalRequired ? "approval-gate" : null,
        riskTier === "tier-3" ? "high-risk" : null
    ].filter((entry) => Boolean(entry));
    const reasoningSummary = summarizeSignals([
        workflowIntent ? "workflow" : null,
        desktopIntent ? "desktop" : null,
        browserAutomationIntent ? "browser automation" : null,
        browserNavigationIntent ? "browser navigation" : null,
        applicationLaunchIntent ? "application launch" : null,
        fileWorkflowIntent ? "file workflow" : null,
        processWorkflowIntent ? "process workflow" : null,
        processFollowUpResolution ? `process follow-up -> ${processFollowUpResolution.resolvedPrompt}` : null,
        closeWorkflowIntent ? "close workflow" : null,
        serviceControlIntent ? "service control" : null,
        registryControlIntent ? "registry control" : null,
        uiAutomationIntent ? "ui automation" : null,
        systemNavigationIntent ? "system navigation" : null,
        explicitFailureFeedback ? "explicit failure feedback" : null,
        approvalReason ? "approval required" : null
    ].filter((entry) => Boolean(entry)));
    if (!workflowIntent && !desktopIntent) {
        return buildClarificationPlan(input.request, "I can answer this directly, but I do not yet have a deterministic executable path for it.");
    }
    if (approvalRequired && riskTier === "tier-4") {
        return buildDeniedPlan(input.request, "The request maps to a prohibited or too-broad system-changing action.", "tier-4-block");
    }
    const recommendedExecutor = workflowIntent ? "workflow-orchestrator" : detectExecutor(actionType);
    return {
        requestId: input.request.requestId,
        conversationId: input.request.conversationId,
        normalizedText,
        decision,
        actionType,
        riskTier,
        requiresExecution: true,
        approvalRequired,
        approvalReason,
        denialReason: null,
        clarificationNeeded,
        executionAllowed,
        verificationRequired,
        recommendedExecutor,
        policyRulesTriggered,
        reasoningSummary,
        approvalState: defaultApprovalState(approvalRequired ? approvalReason : null),
        plan: null,
        desktopAction: null,
        workflowRequest: null,
        desktopRequest: null,
        artifacts: {
            route: actionType,
            normalizedText,
            resolvedPrompt: processFollowUpResolution?.resolvedPrompt ?? null,
            processTargets: processFollowUpResolution?.targets ?? [],
            processFollowUpSourceAssistantMessage: processFollowUpResolution?.sourceAssistantMessage ?? null,
            processFollowUpSourceUserMessage: processFollowUpResolution?.sourceUserMessage ?? null,
            userFailureFeedback: explicitFailureFeedback ? rawText : null
        }
    };
};
export const buildGovernedTaskMetadata = (requestId, route) => ({
    requestId,
    interpretedIntent: route.reasoningSummary,
    actionType: route.actionType,
    riskTier: route.riskTier,
    decision: route.decision,
    requiresExecution: route.requiresExecution,
    approvalRequired: route.approvalRequired,
    approvalReason: route.approvalReason,
    denialReason: route.denialReason,
    clarificationNeeded: [...route.clarificationNeeded],
    executionAllowed: route.executionAllowed,
    verificationRequired: route.verificationRequired,
    recommendedExecutor: route.recommendedExecutor,
    policyRulesTriggered: [...route.policyRulesTriggered],
    reasoningSummary: route.reasoningSummary,
    approvalState: {
        required: route.approvalState.pending,
        ...route.approvalState
    },
    executionSummary: null,
    verificationSummary: null,
    rollbackSummary: null,
    gapClass: null,
    remediationSummary: null,
    artifacts: [
        {
            kind: "audit",
            summary: route.reasoningSummary,
            metadata: route.artifacts
        }
    ]
});
