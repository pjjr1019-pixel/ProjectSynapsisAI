import { appendFile, mkdir } from "node:fs/promises";
import * as path from "node:path";
import { buildGovernedTaskMetadata, routeGovernedChatTask } from "@governance-execution/governed-chat/router";
import { classifyGovernedTaskGap } from "@governance-execution/governed-chat/gap-classifier";
import { planGovernedTaskRemediation, } from "@governance-execution/governed-chat/remediation";
import { summarizeVerification, verifyGovernedTaskExecution, } from "@governance-execution/governed-chat/verification";
import { mineGovernedHistory } from "@awareness/governance-history/miner";
import { appendGovernanceReplayEnvelope, findLatestGovernanceReplayEnvelope } from "@awareness/governance-history/replay-envelope";
const normalize = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const approvalConfirmations = new Set(["approve", "approved", "confirm", "confirmed", "proceed", "yes", "yes please", "go ahead", "do it", "run it", "continue"]);
const isApprovalConfirmation = (value) => approvalConfirmations.has(normalize(value));
const REPORT_SUMMARY_PATTERNS = [
    /\bsummar(?:ize|ise|y)\b/i,
    /\brecap\b/i,
    /\bresults?\b/i,
    /\bfindings?\b/i,
    /\bwhat did (?:it|you) find\b/i,
    /\bwhat(?:'s| is) the results?\b/i,
    /\bshort summary\b/i,
    /\bbrief summary\b/i
];
const isReportSummaryRequest = (value) => REPORT_SUMMARY_PATTERNS.some((pattern) => pattern.test(value));
const extractQuotedText = (value) => {
    const quoted = value.match(/["'`]{1}([^"'`]{2,})["'`]{1}/)?.[1]?.trim();
    return quoted?.length ? quoted : null;
};
const buildTargetFromPrompt = (prompt, defaultTarget) => {
    const quoted = extractQuotedText(prompt);
    if (quoted) {
        return quoted;
    }
    return defaultTarget ?? "";
};
const resolveExecutionPrompt = (route, fallback) => {
    const resolvedPrompt = route.artifacts.resolvedPrompt;
    return typeof resolvedPrompt === "string" && resolvedPrompt.trim().length > 0 ? resolvedPrompt : fallback;
};
const writeAuditRecord = async (auditPath, record) => {
    await mkdir(path.dirname(auditPath), { recursive: true });
    await appendFile(auditPath, `${JSON.stringify(record)}\n`, "utf8");
};
const buildPendingApprovalReply = (summary, reason) => [
    summary,
    "",
    reason,
    "Reply with `approve` to continue, or use the Actions tab if you want to issue a token manually."
].join("\n");
const buildClarificationReply = (reason) => [reason, "", "Please give me the exact target so I can continue safely."].join("\n");
const buildDenialReply = (reason) => [reason, "", "Iâ€™m not going to guess on this one."].join("\n");
const summarizeReportMarkdown = (markdown, fallback = null) => {
    const lines = markdown.split(/\r?\n/).map((line) => line.trim());
    const summaryIndex = lines.findIndex((line) => line === "## Summary");
    if (summaryIndex >= 0) {
        const collected = [];
        for (const line of lines.slice(summaryIndex + 1)) {
            if (line.startsWith("## ")) {
                break;
            }
            if (line) {
                collected.push(line);
            }
        }
        if (collected.length > 0) {
            return collected.join(" ");
        }
    }
    const heading = lines.find((line) => line.startsWith("# "));
    const body = lines
        .filter((line) => line && !line.startsWith("#") && !line.startsWith("Generated:") && !line.startsWith("Saved to:"))
        .slice(0, 4)
        .join(" ");
    return fallback ?? heading ?? body ?? markdown.slice(0, 600);
};
const findLatestReportPayload = (messages) => {
    const lastAssistant = [...messages]
        .reverse()
        .find((message) => message.role === "assistant" &&
        Boolean(message.metadata?.task?.reportMarkdown || message.metadata?.task?.reportSummary));
    if (!lastAssistant?.metadata?.task) {
        return null;
    }
    return {
        reportMarkdown: lastAssistant.metadata.task.reportMarkdown ?? null,
        reportSummary: lastAssistant.metadata.task.reportSummary ?? null,
        task: lastAssistant.metadata.task
    };
};
const findPendingApproval = (messages) => {
    const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant" && message.metadata?.task?.approvalState.pending);
    if (!lastAssistant?.metadata?.task) {
        return null;
    }
    const metadata = lastAssistant.metadata.task;
    const approvalArtifact = metadata.artifacts.find((artifact) => artifact.kind === "audit" || artifact.kind === "workflow-plan" || artifact.kind === "desktop-action");
    const rawArtifacts = approvalArtifact?.metadata ??
        (approvalArtifact?.path
            ? { path: approvalArtifact?.path }
            : {});
    return {
        task: metadata,
        rawArtifacts
    };
};
const toTaskPlanRequest = async (input, recentWebContext) => ({
    requestId: input.requestId,
    conversationId: input.conversationId,
    text: input.text,
    messages: input.messages,
    workspaceRoot: input.workspaceRoot,
    desktopPath: input.desktopPath,
    documentsPath: input.documentsPath,
    machineAwareness: input.getMachineAwareness(),
    fileAwareness: input.getFileAwareness(),
    screenAwareness: input.getScreenAwareness(),
    recentWebContext: recentWebContext !== undefined
        ? recentWebContext
        : input.getRecentWebContext
            ? await input.getRecentWebContext(input.text)
            : null
});
const buildTaskState = (requestId, route, overrides = {}) => ({
    ...buildGovernedTaskMetadata(requestId, route),
    ...overrides,
    artifacts: overrides.artifacts ?? buildGovernedTaskMetadata(requestId, route).artifacts
});
const summarizeWorkflowResult = (result) => result.reportSummary?.trim().length
    ? result.reportSummary
    : result.status === "executed"
        ? result.summary || "Workflow executed."
        : result.status === "simulated"
            ? result.summary || "Workflow simulated."
            : result.error ?? result.summary;
const summarizeDesktopResult = (result) => result.status === "executed"
    ? result.summary || "Desktop action executed."
    : result.status === "simulated"
        ? result.summary || "Desktop action simulated."
        : result.status === "clarification_needed"
            ? result.clarification?.question ?? result.reason ?? result.message ?? result.summary
        : result.error ?? result.summary;
const buildDesktopExecutionReply = (result, verification) => {
    if (result.status === "clarification_needed") {
        const followUp = result.clarification?.question ?? result.reason ?? result.message ?? result.summary;
        return `I need one detail before I can continue: ${followUp}`;
    }
    return verification.passed
        ? `Completed the desktop action: ${result.summary}`
        : `I ran the desktop action, but verification failed: ${verification.reasons[0] ?? result.summary}`;
};
const summarizeRollbackSummary = (result) => {
    if ("plan" in result) {
        return result.rollback?.length ? result.rollback.map((entry) => entry.summary).join(" | ") : null;
    }
    return result.rollback?.summary ?? null;
};
const buildTaskMetadataArtifact = (payload) => [
    {
        kind: "audit",
        summary: "Governed chat task state.",
        metadata: payload
    }
];
const recordApprovalQueueState = async (approvalQueue, input) => {
    if (!approvalQueue) {
        return;
    }
    await approvalQueue.record({
        id: input.requestId,
        source: "governed-chat",
        commandId: input.requestId,
        commandHash: input.requestId,
        commandName: input.actionType ?? "governed-chat",
        actionType: input.actionType,
        riskClass: input.riskTier.startsWith("tier-3") || input.riskTier.startsWith("tier-4") ? "high" : "medium",
        scope: null,
        targetKind: null,
        status: input.pending ? "pending" : "consumed",
        approvedBy: input.approvedBy,
        tokenId: input.tokenId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: input.expiresAt,
        summary: input.summary,
        metadata: {
            requestId: input.requestId,
            actionType: input.actionType,
            pending: input.pending
        }
    });
};
const recordReplayEnvelope = async (runtimeRoot, envelope) => {
    try {
        await appendGovernanceReplayEnvelope(runtimeRoot, envelope);
    }
    catch {
        // Replay logging is best-effort and must not block the task itself.
    }
};
export const createGovernedChatService = (options) => {
    const auditPath = path.join(options.runtimeRoot, "governed-chat.commands.jsonl");
    const approvalQueue = options.approvalQueue ?? null;
    const mineHistory = async () => {
        const result = await mineGovernedHistory({ artifactsRoot: options.runtimeRoot, maxFindings: 8 });
        return result.findings;
    };
    const handleTurn = async (input) => {
        const pending = findPendingApproval(input.messages);
        const historyFindings = await mineHistory();
        const webContext = input.getRecentWebContext ? await input.getRecentWebContext(input.text) : null;
        const route = await routeGovernedChatTask({
            request: await toTaskPlanRequest(input, webContext),
            historyFindings
        });
        const approvedBy = input.approvedBy?.trim() || "local-chat-user";
        const latestReport = findLatestReportPayload(input.messages);
        if (latestReport && isReportSummaryRequest(input.text)) {
            const assistantReply = latestReport.reportSummary ??
                (latestReport.reportMarkdown ? summarizeReportMarkdown(latestReport.reportMarkdown, latestReport.task.reportSummary ?? null) : null) ??
                "I found the last report, but I could not summarize it.";
            return {
                handled: true,
                assistantReply,
                taskState: null,
                route: null,
                executionResult: null,
                verification: null,
                gap: null,
                remediation: null
            };
        }
        if (route.actionType === "answer-only" && route.decision === "allow") {
            return {
                handled: false,
                assistantReply: "",
                taskState: null,
                route: null,
                executionResult: null,
                verification: null,
                gap: null,
                remediation: null
            };
        }
        if (route.decision === "clarify") {
            const taskState = buildTaskState(input.requestId, route, {
                approvalState: {
                    required: false,
                    pending: false,
                    reason: null,
                    approver: null,
                    tokenId: null,
                    expiresAt: null
                },
                artifacts: buildTaskMetadataArtifact({ route: "clarify", clarificationNeeded: route.clarificationNeeded })
            });
            await writeAuditRecord(auditPath, {
                requestId: input.requestId,
                conversationId: input.conversationId,
                route,
                handled: true,
                outcome: "clarify"
            });
            return {
                handled: true,
                assistantReply: buildClarificationReply(route.clarificationNeeded[0] ?? route.reasoningSummary),
                taskState,
                route,
                executionResult: null,
                verification: null,
                gap: null,
                remediation: null
            };
        }
        if (route.decision === "deny") {
            const taskState = buildTaskState(input.requestId, route, {
                approvalState: {
                    required: false,
                    pending: false,
                    reason: null,
                    approver: null,
                    tokenId: null,
                    expiresAt: null
                },
                artifacts: buildTaskMetadataArtifact({ route: "deny", denialReason: route.denialReason })
            });
            await writeAuditRecord(auditPath, {
                requestId: input.requestId,
                conversationId: input.conversationId,
                route,
                handled: true,
                outcome: "deny"
            });
            return {
                handled: true,
                assistantReply: buildDenialReply(route.denialReason ?? route.reasoningSummary),
                taskState,
                route,
                executionResult: null,
                verification: null,
                gap: null,
                remediation: null
            };
        }
        const pendingConfirmed = isApprovalConfirmation(input.text) && pending !== null;
        const approvalAllowed = pendingConfirmed || route.approvalState.pending === false;
        const pendingArtifacts = pending?.rawArtifacts ?? {};
        const pendingRoute = pending
            ? {
                requestId: pending.task.requestId,
                conversationId: input.conversationId,
                normalizedText: typeof pendingArtifacts.normalizedText === "string" ? pendingArtifacts.normalizedText : pending.task.interpretedIntent,
                decision: pending.task.decision,
                actionType: pending.task.actionType,
                riskTier: pending.task.riskTier,
                requiresExecution: pending.task.requiresExecution,
                approvalRequired: pending.task.approvalRequired,
                approvalReason: pending.task.approvalReason,
                denialReason: pending.task.denialReason,
                clarificationNeeded: [...pending.task.clarificationNeeded],
                executionAllowed: pending.task.executionAllowed,
                verificationRequired: pending.task.verificationRequired,
                recommendedExecutor: pending.task.recommendedExecutor,
                policyRulesTriggered: [...pending.task.policyRulesTriggered],
                reasoningSummary: pending.task.reasoningSummary,
                approvalState: { ...pending.task.approvalState },
                plan: null,
                desktopAction: null,
                workflowRequest: null,
                desktopRequest: null,
                artifacts: pendingArtifacts
            }
            : null;
        const executeWorkflowTask = async (executionRoute, plan, workflowRequest, sourceLabel) => {
            const machineBefore = options.getMachineAwareness();
            const fileBefore = options.getFileAwareness();
            const screenBefore = options.getScreenAwareness();
            if (plan.clarificationNeeded.length > 0) {
                const clarifyingRoute = {
                    ...executionRoute,
                    decision: "clarify",
                    clarificationNeeded: [...new Set([...executionRoute.clarificationNeeded, ...plan.clarificationNeeded])]
                };
                const taskState = buildTaskState(input.requestId, clarifyingRoute, {
                    artifacts: buildTaskMetadataArtifact({ route: "clarify", plan })
                });
                await writeAuditRecord(auditPath, {
                    requestId: input.requestId,
                    conversationId: input.conversationId,
                    route: clarifyingRoute,
                    handled: true,
                    outcome: "clarify"
                });
                return {
                    handled: true,
                    assistantReply: buildClarificationReply(plan.clarificationNeeded[0] ?? executionRoute.reasoningSummary),
                    taskState,
                    route: clarifyingRoute,
                    executionResult: null,
                    verification: null,
                    gap: null,
                    remediation: null
                };
            }
            if (plan.approvalRequired && !approvalAllowed) {
                const taskState = buildTaskState(input.requestId, executionRoute, {
                    approvalState: {
                        required: true,
                        pending: true,
                        reason: executionRoute.approvalReason ?? plan.approvalReason ?? "Approval is required for this workflow.",
                        approver: null,
                        tokenId: null,
                        expiresAt: null
                    },
                    artifacts: buildTaskMetadataArtifact({ route: sourceLabel, workflowRequest, workflowPlan: plan })
                });
                void recordApprovalQueueState(approvalQueue, {
                    requestId: input.requestId,
                    actionType: executionRoute.actionType,
                    summary: executionRoute.reasoningSummary,
                    approvedBy: null,
                    pending: true,
                    tokenId: null,
                    expiresAt: null,
                    riskTier: executionRoute.riskTier
                });
                await writeAuditRecord(auditPath, {
                    requestId: input.requestId,
                    conversationId: input.conversationId,
                    route: executionRoute,
                    handled: true,
                    outcome: "approval-required",
                    workflowRequest
                });
                return {
                    handled: true,
                    assistantReply: buildPendingApprovalReply(`I can run this workflow: ${plan.summary}.`, executionRoute.approvalReason ?? plan.approvalReason ?? "Approval is required before I can continue."),
                    taskState,
                    route: executionRoute,
                    executionResult: null,
                    verification: null,
                    gap: null,
                    remediation: null
                };
            }
            const token = plan.approvalRequired ? await options.workflowOrchestrator.issueWorkflowApproval(plan, approvedBy, 15 * 60 * 1000) : null;
            const executionResult = await options.workflowOrchestrator.executeWorkflow({
                ...workflowRequest,
                approvedBy,
                approvalToken: token
            });
            const verification = await verifyGovernedTaskExecution({
                route: executionRoute,
                executionResult,
                machineAwarenessAfter: options.getMachineAwareness(),
                fileAwarenessAfter: options.getFileAwareness(),
                screenAwarenessAfter: options.getScreenAwareness()
            });
            const gap = verification.passed
                ? null
                : classifyGovernedTaskGap({
                    route: executionRoute,
                    verification,
                    executionResult,
                    failureText: summarizeWorkflowResult(executionResult)
                });
            const remediation = gap ? planGovernedTaskRemediation({ route: executionRoute, gap }) : null;
            const taskState = buildTaskState(input.requestId, executionRoute, {
                approvalState: {
                    required: Boolean(token || plan.approvalRequired),
                    pending: false,
                    reason: executionRoute.approvalReason ?? plan.approvalReason ?? null,
                    approver: approvedBy,
                    tokenId: token?.tokenId ?? null,
                    expiresAt: token?.expiresAt ?? null
                },
                executionSummary: summarizeWorkflowResult(executionResult),
                verificationSummary: summarizeVerification(verification),
                rollbackSummary: summarizeRollbackSummary(executionResult),
                gapClass: gap?.primary_gap ?? null,
                remediationSummary: remediation?.patch_summary ?? null,
                reportMarkdown: executionResult.reportMarkdown ?? null,
                reportSummary: executionResult.reportSummary ?? null,
                artifacts: buildTaskMetadataArtifact({
                    route: sourceLabel,
                    workflowRequest,
                    workflowPlan: plan,
                    executionResult,
                    verification,
                    gap,
                    remediation
                })
            });
            const reportReply = executionResult.reportMarkdown?.trim() && (executionResult.status === "executed" || executionResult.status === "simulated")
                ? executionResult.reportMarkdown
                : null;
            await writeAuditRecord(auditPath, {
                requestId: input.requestId,
                conversationId: input.conversationId,
                route: executionRoute,
                handled: true,
                outcome: executionResult.status,
                verification,
                gap,
                remediation
            });
            await recordReplayEnvelope(options.runtimeRoot, {
                requestId: input.requestId,
                conversationId: input.conversationId,
                capturedAt: new Date().toISOString(),
                sourceRoute: sourceLabel,
                sourceFailureSignature: executionRoute.artifacts.failureSignature ?? null,
                recoveredIntent: executionRoute.artifacts.recoveredIntent ?? null,
                resolvedPrompt: executionRoute.artifacts.resolvedPrompt ?? executionRoute.normalizedText,
                recommendedExecutor: executionRoute.recommendedExecutor,
                decision: executionRoute.decision,
                actionType: executionRoute.actionType,
                approvalState: {
                    required: Boolean(token || plan.approvalRequired),
                    pending: false,
                    reason: executionRoute.approvalReason ?? null,
                    approver: approvedBy,
                    tokenId: token?.tokenId ?? null,
                    expiresAt: token?.expiresAt ?? null
                },
                machineAwarenessBefore: machineBefore,
                fileAwarenessBefore: fileBefore,
                screenAwarenessBefore: screenBefore,
                webContextBefore: webContext,
                workflowPlan: plan,
                workflowRequest,
                desktopProposal: null,
                desktopRequest: null,
                executionResult,
                verification,
                gap,
                remediation,
                artifacts: taskState.artifacts.reduce((acc, artifact) => {
                    acc[artifact.kind] = artifact.metadata ?? artifact.summary;
                    return acc;
                }, {})
            });
            return {
                handled: true,
                assistantReply: reportReply ?? (verification.passed
                    ? `Completed the workflow: ${executionResult.summary}`
                    : `I ran the workflow, but verification failed: ${verification.reasons[0] ?? executionResult.summary}`),
                taskState,
                route: executionRoute,
                executionResult,
                verification,
                gap,
                remediation
            };
        };
        const executeDesktopTask = async (executionRoute, desktopRequest, proposal, sourceLabel) => {
            const machineBefore = options.getMachineAwareness();
            const fileBefore = options.getFileAwareness();
            const screenBefore = options.getScreenAwareness();
            const requestTarget = desktopRequest.target.trim().length > 0
                ? desktopRequest.target.trim()
                : buildTargetFromPrompt(input.text, proposal.defaultTarget);
            if (!requestTarget && proposal.targetPlaceholder && !proposal.defaultTarget) {
                const clarificationRoute = {
                    ...executionRoute,
                    decision: "clarify",
                    clarificationNeeded: [
                        `Please provide the exact ${proposal.targetPlaceholder.toLowerCase()} for "${proposal.title}".`
                    ]
                };
                const taskState = buildTaskState(input.requestId, clarificationRoute, {
                    artifacts: buildTaskMetadataArtifact({ route: "clarify", proposal })
                });
                await writeAuditRecord(auditPath, {
                    requestId: input.requestId,
                    conversationId: input.conversationId,
                    route: clarificationRoute,
                    handled: true,
                    outcome: "clarify"
                });
                return {
                    handled: true,
                    assistantReply: buildClarificationReply(clarificationRoute.clarificationNeeded[0]),
                    taskState,
                    route: clarificationRoute,
                    executionResult: null,
                    verification: null,
                    gap: null,
                    remediation: null
                };
            }
            const finalizedDesktopRequest = {
                ...desktopRequest,
                target: requestTarget,
                approvedBy,
                approvalToken: null,
                metadata: {
                    ...(desktopRequest.metadata ?? {}),
                    route: sourceLabel,
                    requestId: input.requestId
                }
            };
            if (proposal.approvalRequired && !approvalAllowed) {
                const taskState = buildTaskState(input.requestId, executionRoute, {
                    approvalState: {
                        required: true,
                        pending: true,
                        reason: executionRoute.approvalReason ?? "Approval is required for this desktop action.",
                        approver: null,
                        tokenId: null,
                        expiresAt: null
                    },
                    artifacts: buildTaskMetadataArtifact({ route: sourceLabel, desktopRequest: finalizedDesktopRequest, proposal })
                });
                void recordApprovalQueueState(approvalQueue, {
                    requestId: input.requestId,
                    actionType: executionRoute.actionType,
                    summary: executionRoute.reasoningSummary,
                    approvedBy: null,
                    pending: true,
                    tokenId: null,
                    expiresAt: null,
                    riskTier: executionRoute.riskTier
                });
                await writeAuditRecord(auditPath, {
                    requestId: input.requestId,
                    conversationId: input.conversationId,
                    route: executionRoute,
                    handled: true,
                    outcome: "approval-required",
                    desktopRequest: finalizedDesktopRequest
                });
                return {
                    handled: true,
                    assistantReply: buildPendingApprovalReply(`I can do this desktop action: ${proposal.title}.`, executionRoute.approvalReason ?? "Approval is required before I can continue."),
                    taskState,
                    route: executionRoute,
                    executionResult: null,
                    verification: null,
                    gap: null,
                    remediation: null
                };
            }
            const token = proposal.approvalRequired
                ? await options.desktopActions.issueDesktopActionApproval(finalizedDesktopRequest, approvedBy, 15 * 60 * 1000)
                : null;
            const executionResult = await options.desktopActions.executeDesktopAction({
                ...finalizedDesktopRequest,
                approvalToken: token
            });
            const verification = await verifyGovernedTaskExecution({
                route: executionRoute,
                executionResult,
                machineAwarenessAfter: options.getMachineAwareness(),
                fileAwarenessAfter: options.getFileAwareness(),
                screenAwarenessAfter: options.getScreenAwareness()
            });
            const gap = verification.passed
                ? null
                : classifyGovernedTaskGap({
                    route: executionRoute,
                    verification,
                    executionResult,
                    failureText: summarizeDesktopResult(executionResult)
                });
            const remediation = gap ? planGovernedTaskRemediation({ route: executionRoute, gap }) : null;
            const taskState = buildTaskState(input.requestId, executionRoute, {
                approvalState: {
                    required: Boolean(token || proposal.approvalRequired),
                    pending: false,
                    reason: executionRoute.approvalReason ?? null,
                    approver: approvedBy,
                    tokenId: token?.tokenId ?? null,
                    expiresAt: token?.expiresAt ?? null
                },
                executionSummary: summarizeDesktopResult(executionResult),
                verificationSummary: summarizeVerification(verification),
                rollbackSummary: summarizeRollbackSummary(executionResult),
                gapClass: gap?.primary_gap ?? null,
                remediationSummary: remediation?.patch_summary ?? null,
                artifacts: buildTaskMetadataArtifact({
                    route: sourceLabel,
                    desktopRequest: finalizedDesktopRequest,
                    desktopAction: proposal,
                    executionResult,
                    verification,
                    gap,
                    remediation
                })
            });
            await writeAuditRecord(auditPath, {
                requestId: input.requestId,
                conversationId: input.conversationId,
                route: executionRoute,
                handled: true,
                outcome: executionResult.status,
                verification,
                gap,
                remediation
            });
            await recordReplayEnvelope(options.runtimeRoot, {
                requestId: input.requestId,
                conversationId: input.conversationId,
                capturedAt: new Date().toISOString(),
                sourceRoute: sourceLabel,
                sourceFailureSignature: executionRoute.artifacts.failureSignature ?? null,
                recoveredIntent: executionRoute.artifacts.recoveredIntent ?? null,
                resolvedPrompt: executionRoute.artifacts.resolvedPrompt ?? executionRoute.normalizedText,
                recommendedExecutor: executionRoute.recommendedExecutor,
                decision: executionRoute.decision,
                actionType: executionRoute.actionType,
                approvalState: {
                    required: Boolean(token || proposal.approvalRequired),
                    pending: false,
                    reason: executionRoute.approvalReason ?? null,
                    approver: approvedBy,
                    tokenId: token?.tokenId ?? null,
                    expiresAt: token?.expiresAt ?? null
                },
                machineAwarenessBefore: machineBefore,
                fileAwarenessBefore: fileBefore,
                screenAwarenessBefore: screenBefore,
                webContextBefore: webContext,
                workflowPlan: null,
                workflowRequest: null,
                desktopProposal: proposal,
                desktopRequest: finalizedDesktopRequest,
                executionResult,
                verification,
                gap,
                remediation,
                artifacts: taskState.artifacts.reduce((acc, artifact) => {
                    acc[artifact.kind] = artifact.metadata ?? artifact.summary;
                    return acc;
                }, {})
            });
            return {
                handled: true,
                assistantReply: buildDesktopExecutionReply(executionResult, verification),
                taskState,
                route: executionRoute,
                executionResult,
                verification,
                gap,
                remediation
            };
        };
        if (route.actionType === "history-replay") {
            const replayEnvelope = await findLatestGovernanceReplayEnvelope(options.runtimeRoot, {
                sourceFailureSignature: typeof route.artifacts.failureSignature === "string" ? route.artifacts.failureSignature : null,
                recoveredIntent: typeof route.artifacts.recoveredIntent === "string" ? route.artifacts.recoveredIntent : null,
                resolvedPrompt: typeof route.artifacts.resolvedPrompt === "string" ? route.artifacts.resolvedPrompt : null,
                sourceRoute: typeof route.artifacts.route === "string" ? route.artifacts.route : route.actionType
            });
            const replayPrompt = typeof replayEnvelope?.resolvedPrompt === "string" && replayEnvelope.resolvedPrompt.trim().length > 0
                ? replayEnvelope.resolvedPrompt
                : typeof route.artifacts.latestUserMessage === "string" && route.artifacts.latestUserMessage.trim().length > 0
                    ? resolveExecutionPrompt(route, route.artifacts.latestUserMessage)
                    : resolveExecutionPrompt(route, input.text);
            if (replayEnvelope?.workflowRequest && replayEnvelope.workflowPlan) {
                return await executeWorkflowTask(route, replayEnvelope.workflowPlan, replayEnvelope.workflowRequest, "history-replay");
            }
            if (replayEnvelope?.desktopRequest && replayEnvelope.desktopProposal) {
                return await executeDesktopTask(route, replayEnvelope.desktopRequest, replayEnvelope.desktopProposal, "history-replay");
            }
            if (route.recommendedExecutor === "workflow-orchestrator" || route.recommendedExecutor === "browser-automation") {
                const plan = await options.workflowOrchestrator.suggestWorkflow(replayPrompt);
                if (plan) {
                    return await executeWorkflowTask(route, plan, {
                        prompt: replayPrompt,
                        plan,
                        dryRun: false,
                        approvedBy,
                        approvalToken: null
                    }, "history-replay");
                }
            }
            const proposal = options.desktopActions.suggestDesktopAction(replayPrompt);
            if (proposal) {
                const desktopRequest = {
                    proposalId: proposal.id,
                    kind: proposal.kind,
                    scope: proposal.scope,
                    targetKind: proposal.targetKind,
                    target: proposal.defaultTarget ?? proposal.targetPlaceholder ?? replayPrompt,
                    destinationTarget: null,
                    args: [],
                    workingDirectory: null,
                    workspaceRoot: input.workspaceRoot,
                    riskClass: proposal.riskClass,
                    destructive: proposal.riskClass === "high" || proposal.riskClass === "critical",
                    dryRun: false,
                    approvedBy,
                    approvalToken: null,
                    metadata: {
                        replayOf: route.artifacts.failureSignature ?? replayEnvelope?.sourceFailureSignature ?? null,
                        replayPrompt,
                        route: "history-replay",
                        replayEnvelope
                    }
                };
                return await executeDesktopTask(route, desktopRequest, proposal, "history-replay");
            }
            const verification = {
                passed: false,
                score: 0,
                reasons: ["History replay was recognized, but no runnable executor could be selected."],
                evidence: [],
                observed_state: {
                    repeatedRequestCount: route.artifacts.repeatedRequestCount ?? 1,
                    recoveredIntent: route.artifacts.recoveredIntent ?? null,
                    suggestedExecutor: route.recommendedExecutor
                },
                expected_state_summary: "History replay should map to a runnable executor."
            };
            const gap = classifyGovernedTaskGap({
                route,
                verification,
                executionResult: null,
                failureText: "history replay no executor"
            });
            const remediation = planGovernedTaskRemediation({ route, gap });
            const taskState = buildTaskState(input.requestId, route, {
                approvalState: {
                    required: false,
                    pending: false,
                    reason: null,
                    approver: null,
                    tokenId: null,
                    expiresAt: null
                },
                executionSummary: "Recovered a prior failure signature, but no runnable executor was available.",
                verificationSummary: summarizeVerification(verification),
                rollbackSummary: null,
                gapClass: gap.primary_gap,
                remediationSummary: remediation.patch_summary,
                artifacts: buildTaskMetadataArtifact({
                    route: "history-replay",
                    historyFindings,
                    replayPrompt,
                    verification,
                    gap,
                    remediation
                })
            });
            await writeAuditRecord(auditPath, {
                requestId: input.requestId,
                conversationId: input.conversationId,
                route,
                handled: true,
                outcome: "blocked",
                gap,
                remediation
            });
            return {
                handled: true,
                assistantReply: `I found a prior failed task: ${route.reasoningSummary}. ${remediation.patch_summary}`,
                taskState,
                route,
                executionResult: null,
                verification,
                gap,
                remediation
            };
        }
        if (route.actionType === "approval-confirmation") {
            if (!pending || !pendingRoute) {
                const taskState = buildTaskState(input.requestId, route, {
                    approvalState: {
                        required: false,
                        pending: false,
                        reason: "No pending approval was found to confirm.",
                        approver: null,
                        tokenId: null,
                        expiresAt: null
                    },
                    artifacts: buildTaskMetadataArtifact({ route: "approval-confirmation", pending: false })
                });
                await writeAuditRecord(auditPath, {
                    requestId: input.requestId,
                    conversationId: input.conversationId,
                    route,
                    handled: true,
                    outcome: "clarify"
                });
                return {
                    handled: true,
                    assistantReply: "I do not see a pending approved task to confirm yet.",
                    taskState,
                    route,
                    executionResult: null,
                    verification: null,
                    gap: null,
                    remediation: null
                };
            }
            if (pendingArtifacts.workflowPlan && pendingArtifacts.workflowRequest) {
                return await executeWorkflowTask(pendingRoute, pendingArtifacts.workflowPlan, pendingArtifacts.workflowRequest, "approval-confirmation");
            }
            if (pendingArtifacts.desktopRequest && pendingArtifacts.desktopAction) {
                return await executeDesktopTask(pendingRoute, pendingArtifacts.desktopRequest, pendingArtifacts.desktopAction, "approval-confirmation");
            }
            const taskState = buildTaskState(input.requestId, route, {
                approvalState: {
                    required: false,
                    pending: false,
                    reason: "The pending approval could not be reconstructed from the stored task artifacts.",
                    approver: null,
                    tokenId: null,
                    expiresAt: null
                },
                artifacts: buildTaskMetadataArtifact({ route: "approval-confirmation", artifacts: pendingArtifacts })
            });
            await writeAuditRecord(auditPath, {
                requestId: input.requestId,
                conversationId: input.conversationId,
                route,
                handled: true,
                outcome: "blocked",
                reason: "Unable to reconstruct pending approved task."
            });
            return {
                handled: true,
                assistantReply: "I found a pending approval, but I could not reconstruct the original task safely. Please re-issue the request so I can build a fresh governed plan.",
                taskState,
                route,
                executionResult: null,
                verification: null,
                gap: null,
                remediation: null
            };
        }
        if (route.recommendedExecutor === "workflow-orchestrator" || route.recommendedExecutor === "browser-automation") {
            const workflowPrompt = resolveExecutionPrompt(route, input.text);
            const plan = await options.workflowOrchestrator.suggestWorkflow(workflowPrompt);
            if (!plan) {
                const taskState = buildTaskState(input.requestId, route, {
                    artifacts: buildTaskMetadataArtifact({ route: "workflow", error: "No workflow plan available." })
                });
                const verification = {
                    passed: false,
                    score: 0,
                    reasons: ["Workflow planner did not return a plan."],
                    evidence: [],
                    observed_state: null,
                    expected_state_summary: "A workflow plan is required."
                };
                const gap = classifyGovernedTaskGap({
                    route,
                    verification,
                    executionResult: null,
                    failureText: "No workflow plan available."
                });
                const remediation = planGovernedTaskRemediation({ route, gap });
                await writeAuditRecord(auditPath, {
                    requestId: input.requestId,
                    conversationId: input.conversationId,
                    route,
                    handled: true,
                    outcome: "missing-workflow-plan",
                    gap,
                    remediation
                });
                return {
                    handled: true,
                    assistantReply: "I could not build a workflow plan for that task yet.",
                    taskState,
                    route,
                    executionResult: null,
                    verification,
                    gap,
                    remediation
                };
            }
            if (plan.clarificationNeeded.length > 0) {
                const clarifyingRoute = {
                    ...route,
                    decision: "clarify",
                    clarificationNeeded: [...new Set([...route.clarificationNeeded, ...plan.clarificationNeeded])]
                };
                const taskState = buildTaskState(input.requestId, clarifyingRoute, {
                    artifacts: buildTaskMetadataArtifact({ route: "clarify", plan })
                });
                await writeAuditRecord(auditPath, {
                    requestId: input.requestId,
                    conversationId: input.conversationId,
                    route: clarifyingRoute,
                    handled: true,
                    outcome: "clarify"
                });
                return {
                    handled: true,
                    assistantReply: buildClarificationReply(plan.clarificationNeeded[0] ?? route.reasoningSummary),
                    taskState,
                    route: clarifyingRoute,
                    executionResult: null,
                    verification: null,
                    gap: null,
                    remediation: null
                };
            }
            const workflowRequest = {
                prompt: workflowPrompt,
                plan,
                dryRun: false,
                approvedBy,
                approvalToken: null
            };
            if (plan.approvalRequired && !approvalAllowed) {
                const taskState = buildTaskState(input.requestId, route, {
                    approvalState: {
                        required: true,
                        pending: true,
                        reason: route.approvalReason ?? plan.approvalReason ?? "Approval is required for this workflow.",
                        approver: null,
                        tokenId: null,
                        expiresAt: null
                    },
                    artifacts: buildTaskMetadataArtifact({ route: "workflow", workflowRequest, workflowPlan: plan })
                });
                void recordApprovalQueueState(approvalQueue, {
                    requestId: input.requestId,
                    actionType: route.actionType,
                    summary: route.reasoningSummary,
                    approvedBy: null,
                    pending: true,
                    tokenId: null,
                    expiresAt: null,
                    riskTier: route.riskTier
                });
                await writeAuditRecord(auditPath, {
                    requestId: input.requestId,
                    conversationId: input.conversationId,
                    route,
                    handled: true,
                    outcome: "approval-required",
                    workflowRequest
                });
                return {
                    handled: true,
                    assistantReply: buildPendingApprovalReply(`I can run this workflow: ${plan.summary}.`, route.approvalReason ?? plan.approvalReason ?? "Approval is required before I can continue."),
                    taskState,
                    route,
                    executionResult: null,
                    verification: null,
                    gap: null,
                    remediation: null
                };
            }
            const token = plan.approvalRequired ? await options.workflowOrchestrator.issueWorkflowApproval(plan, approvedBy, 15 * 60 * 1000) : null;
            const executionResult = await options.workflowOrchestrator.executeWorkflow({
                ...workflowRequest,
                approvedBy,
                approvalToken: token
            });
            const verification = await verifyGovernedTaskExecution({
                route,
                executionResult,
                machineAwarenessAfter: options.getMachineAwareness(),
                fileAwarenessAfter: options.getFileAwareness(),
                screenAwarenessAfter: options.getScreenAwareness()
            });
            const gap = verification.passed
                ? null
                : classifyGovernedTaskGap({
                    route,
                    verification,
                    executionResult,
                    failureText: summarizeWorkflowResult(executionResult)
                });
            const remediation = gap ? planGovernedTaskRemediation({ route, gap }) : null;
            const taskState = buildTaskState(input.requestId, route, {
                approvalState: {
                    required: Boolean(token || plan.approvalRequired),
                    pending: false,
                    reason: route.approvalReason ?? plan.approvalReason ?? null,
                    approver: approvedBy,
                    tokenId: token?.tokenId ?? null,
                    expiresAt: token?.expiresAt ?? null
                },
                executionSummary: summarizeWorkflowResult(executionResult),
                verificationSummary: summarizeVerification(verification),
                rollbackSummary: summarizeRollbackSummary(executionResult),
                gapClass: gap?.primary_gap ?? null,
                remediationSummary: remediation?.patch_summary ?? null,
                reportMarkdown: executionResult.reportMarkdown ?? null,
                reportSummary: executionResult.reportSummary ?? null,
                artifacts: buildTaskMetadataArtifact({
                    route: "workflow",
                    workflowRequest,
                    workflowPlan: plan,
                    executionResult,
                    verification,
                    gap,
                    remediation
                })
            });
            const reportReply = executionResult.reportMarkdown?.trim() && (executionResult.status === "executed" || executionResult.status === "simulated")
                ? executionResult.reportMarkdown
                : null;
            await writeAuditRecord(auditPath, {
                requestId: input.requestId,
                conversationId: input.conversationId,
                route,
                handled: true,
                outcome: executionResult.status,
                verification,
                gap,
                remediation
            });
            return {
                handled: true,
                assistantReply: reportReply ?? (verification.passed
                    ? `Completed the workflow: ${executionResult.summary}`
                    : `I ran the workflow, but verification failed: ${verification.reasons[0] ?? executionResult.summary}`),
                taskState,
                route,
                executionResult,
                verification,
                gap,
                remediation
            };
        }
        const desktopPrompt = resolveExecutionPrompt(route, input.text);
        const proposal = options.desktopActions.suggestDesktopAction(desktopPrompt);
        if (!proposal) {
            const taskState = buildTaskState(input.requestId, route, {
                artifacts: buildTaskMetadataArtifact({ route: "desktop-action", error: "No desktop action proposal available." })
            });
            const verification = {
                passed: false,
                score: 0,
                reasons: ["Desktop action catalog could not propose a matching action."],
                evidence: [],
                observed_state: null,
                expected_state_summary: "A desktop action proposal is required."
            };
            const gap = classifyGovernedTaskGap({
                route,
                verification,
                executionResult: null,
                failureText: "No desktop action proposal available."
            });
            const remediation = planGovernedTaskRemediation({ route, gap });
            await writeAuditRecord(auditPath, {
                requestId: input.requestId,
                conversationId: input.conversationId,
                route,
                handled: true,
                outcome: "missing-desktop-action",
                gap,
                remediation
            });
            return {
                handled: true,
                assistantReply: "I could not match that to a governed desktop action yet.",
                taskState,
                route,
                executionResult: null,
                verification,
                gap,
                remediation
            };
        }
        const requestTarget = buildTargetFromPrompt(desktopPrompt, proposal.defaultTarget);
        if (!requestTarget && proposal.targetPlaceholder && !proposal.defaultTarget) {
            const clarificationRoute = {
                ...route,
                decision: "clarify",
                clarificationNeeded: [
                    `Please provide the exact ${proposal.targetPlaceholder.toLowerCase()} for "${proposal.title}".`
                ]
            };
            const taskState = buildTaskState(input.requestId, clarificationRoute, {
                artifacts: buildTaskMetadataArtifact({ route: "clarify", proposal })
            });
            await writeAuditRecord(auditPath, {
                requestId: input.requestId,
                conversationId: input.conversationId,
                route: clarificationRoute,
                handled: true,
                outcome: "clarify"
            });
            return {
                handled: true,
                assistantReply: buildClarificationReply(clarificationRoute.clarificationNeeded[0]),
                taskState,
                route: clarificationRoute,
                executionResult: null,
                verification: null,
                gap: null,
                remediation: null
            };
        }
        const desktopRequest = {
            proposalId: proposal.id,
            kind: proposal.kind,
            scope: proposal.scope,
            targetKind: proposal.targetKind,
            target: requestTarget,
            destinationTarget: null,
            args: [],
            workingDirectory: null,
            workspaceRoot: input.workspaceRoot,
            riskClass: proposal.riskClass,
            destructive: proposal.approvalRequired || proposal.riskClass === "high" || proposal.riskClass === "critical",
            dryRun: false,
            approvedBy,
            approvalToken: null,
            metadata: {
                route: route.actionType,
                requestId: input.requestId
            }
        };
        if (proposal.approvalRequired && !approvalAllowed) {
            const taskState = buildTaskState(input.requestId, route, {
                approvalState: {
                    required: true,
                    pending: true,
                    reason: route.approvalReason ?? "Approval is required for this desktop action.",
                    approver: null,
                    tokenId: null,
                    expiresAt: null
                },
                artifacts: buildTaskMetadataArtifact({ route: "desktop-action", desktopRequest, proposal })
            });
            void recordApprovalQueueState(approvalQueue, {
                requestId: input.requestId,
                actionType: route.actionType,
                summary: route.reasoningSummary,
                approvedBy: null,
                pending: true,
                tokenId: null,
                expiresAt: null,
                riskTier: route.riskTier
            });
            await writeAuditRecord(auditPath, {
                requestId: input.requestId,
                conversationId: input.conversationId,
                route,
                handled: true,
                outcome: "approval-required",
                desktopRequest
            });
            return {
                handled: true,
                assistantReply: buildPendingApprovalReply(`I can do this desktop action: ${proposal.title}.`, route.approvalReason ?? "Approval is required before I can continue."),
                taskState,
                route,
                executionResult: null,
                verification: null,
                gap: null,
                remediation: null
            };
        }
        const token = proposal.approvalRequired ? await options.desktopActions.issueDesktopActionApproval(desktopRequest, approvedBy, 15 * 60 * 1000) : null;
        const executionResult = await options.desktopActions.executeDesktopAction({
            ...desktopRequest,
            approvalToken: token
        });
        const verification = await verifyGovernedTaskExecution({
            route,
            executionResult,
            machineAwarenessAfter: options.getMachineAwareness(),
            fileAwarenessAfter: options.getFileAwareness(),
            screenAwarenessAfter: options.getScreenAwareness()
        });
        const gap = verification.passed
            ? null
            : classifyGovernedTaskGap({
                route,
                verification,
                executionResult,
                failureText: summarizeDesktopResult(executionResult)
            });
        const remediation = gap ? planGovernedTaskRemediation({ route, gap }) : null;
        const taskState = buildTaskState(input.requestId, route, {
            approvalState: {
                required: Boolean(token || proposal.approvalRequired),
                pending: false,
                reason: route.approvalReason ?? null,
                approver: approvedBy,
                tokenId: token?.tokenId ?? null,
                expiresAt: token?.expiresAt ?? null
            },
            executionSummary: summarizeDesktopResult(executionResult),
            verificationSummary: summarizeVerification(verification),
            rollbackSummary: summarizeRollbackSummary(executionResult),
            gapClass: gap?.primary_gap ?? null,
            remediationSummary: remediation?.patch_summary ?? null,
            artifacts: buildTaskMetadataArtifact({
                route: "desktop-action",
                desktopRequest,
                desktopAction: proposal,
                executionResult,
                verification,
                gap,
                remediation
            })
        });
        await writeAuditRecord(auditPath, {
            requestId: input.requestId,
            conversationId: input.conversationId,
            route,
            handled: true,
            outcome: executionResult.status,
            verification,
            gap,
            remediation
        });
        return {
            handled: true,
            assistantReply: buildDesktopExecutionReply(executionResult, verification),
            taskState,
            route,
            executionResult,
            verification,
            gap,
            remediation
        };
    };
    return {
        handleTurn
    };
};
