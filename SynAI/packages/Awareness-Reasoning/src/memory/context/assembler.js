import { clipByChars, DEFAULT_CONTEXT_BUDGET, MAX_WEB_RESULTS_IN_PROMPT } from "./budget";
import { buildAwarenessContextSection, buildOfficialKnowledgeContextSection, buildAwarenessQueryContextSection, buildFileAwarenessContextSection, buildMachineAwarenessContextSection, buildScreenAwarenessContextSection } from "@awareness";
const formatMemory = (memory) => `[${memory.category}] (${memory.importance.toFixed(2)}) ${memory.text}`;
const formatPromptBehaviorMemory = (memory) => {
    const summary = memory.entry.summary;
    const resolution = memory.entry.resolution;
    return `[${memory.entry.entryKind}] score ${memory.score.toFixed(2)} | ${resolution.sourceScope} | ${resolution.outputShape}${resolution.preserveExactStructure ? " | exact" : ""}\n${summary}`;
};
const formatWebResult = (result) => `${result.title} | ${result.source}${result.sourceFamily ? ` | ${result.sourceFamily}` : ""}${result.publishedAt ? ` | ${result.publishedAt}` : ""}\n${result.snippet}\n${result.url}`;
const formatWorkspaceHit = (hit, index) => `[WS${index + 1}] ${hit.relativePath}:${hit.startLine}-${hit.endLine} | ${hit.reason} | score ${hit.score.toFixed(2)}\n${hit.excerpt}`;
const buildRuntimePreviewSection = (preview) => {
    if (!preview) {
        return "";
    }
    const details = [
        `Task: ${preview.taskTitle}`,
        `Job: ${preview.jobStatus}${preview.resultStatus ? ` | result ${preview.resultStatus}` : ""}`,
        `Plan steps: ${preview.plannedStepCount}`,
        `Attempts: ${preview.attemptCount} | Resumes: ${preview.resumeCount}`,
        `Recovery: ${preview.recoverable ? "recoverable" : "not recoverable"} | ${preview.cancellable ? "cancellable" : "locked"}`,
        preview.policyDecisionType ? `Policy: ${preview.policyDecisionType}` : null,
        preview.verificationStatus ? `Verification: ${preview.verificationStatus}` : null,
        `Audit events: ${preview.auditEventCount}`,
        preview.latestObservationSummary ? `Latest observation: ${preview.latestObservationSummary}` : null,
        preview.continuationMode
            ? `Continuation: ${preview.continuationMode}${preview.continuationResumable ? " | resumable" : ""}`
            : null,
        preview.bindingHash ? `Binding: ${preview.bindingHash}` : null,
        preview.checkpointSummary ? `Checkpoint: ${preview.checkpointSummary}` : null
    ].filter((entry) => Boolean(entry));
    return `Recent agent runtime:\n${details.join("\n")}`;
};
const getLatestUserMessage = (messages) => [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
export const assembleContext = (input) => {
    const stable = [...input.stableMemories]
        .sort((a, b) => b.importance - a.importance)
        .slice(0, DEFAULT_CONTEXT_BUDGET.maxStableMemories);
    const retrieved = [...input.retrievedMemories]
        .sort((a, b) => b.score - a.score)
        .slice(0, DEFAULT_CONTEXT_BUDGET.maxRetrievedMemories);
    const promptBehaviorMemories = [...(input.promptBehaviorMemories ?? [])]
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
    const recentMessages = input.allMessages.slice(-DEFAULT_CONTEXT_BUDGET.maxRecentMessages);
    const webResults = [...input.webSearch.results].slice(0, MAX_WEB_RESULTS_IN_PROMPT);
    const workspaceHits = [...(input.workspaceHits ?? input.rag?.workspaceHits ?? [])].slice(0, 4);
    const latestUserMessage = getLatestUserMessage(input.allMessages);
    const machineSection = buildMachineAwarenessContextSection(input.machineAwareness, latestUserMessage, input.awareness?.awarenessMode ?? "observe");
    const fileSection = buildFileAwarenessContextSection(input.fileAwareness, latestUserMessage, input.awareness?.awarenessMode ?? "observe");
    const screenSection = buildScreenAwarenessContextSection(input.screenAwareness, latestUserMessage, input.awareness?.awarenessMode ?? "observe");
    const officialKnowledgeSection = buildOfficialKnowledgeContextSection(input.officialKnowledge);
    const awarenessQuerySection = buildAwarenessQueryContextSection(input.awarenessQuery, latestUserMessage, input.awareness?.awarenessMode ?? "observe");
    const sections = [
        input.systemInstruction,
        stable.length > 0 ? `Stable memory:\n${stable.map(formatMemory).join("\n")}` : "",
        retrieved.length > 0
            ? `Retrieved memory:\n${retrieved.map((item) => formatMemory(item.memory)).join("\n")}`
            : "",
        promptBehaviorMemories.length > 0
            ? `Prompt behavior memory:\n${promptBehaviorMemories.map((item) => formatPromptBehaviorMemory(item)).join("\n\n")}`
            : "",
        workspaceHits.length > 0
            ? `Workspace context:\n${workspaceHits.map((hit, index) => formatWorkspaceHit(hit, index)).join("\n\n")}`
            : "",
        buildAwarenessContextSection(input.awareness),
        officialKnowledgeSection,
        awarenessQuerySection,
        machineSection,
        fileSection,
        screenSection,
        buildRuntimePreviewSection(input.runtimePreview),
        input.summaryText ? `Rolling summary:\n${input.summaryText}` : "",
        input.webSearch.status === "used" && webResults.length > 0
            ? `Recent web results for "${input.webSearch.query}" (use these for time-sensitive facts and cite source names with dates when helpful):\n${webResults
                .map(formatWebResult)
                .join("\n\n")}`
            : ""
    ].filter(Boolean);
    const systemContent = clipByChars(sections.join("\n\n"), DEFAULT_CONTEXT_BUDGET.maxChars);
    const estimatedChars = systemContent.length +
        recentMessages.reduce((total, message) => total + message.content.length, 0);
    const promptMessages = [
        {
            id: "system-context",
            conversationId: recentMessages[0]?.conversationId ?? "system",
            role: "system",
            content: systemContent,
            createdAt: new Date().toISOString()
        },
        ...recentMessages
    ];
    return {
        promptMessages,
        preview: {
            systemInstruction: input.systemInstruction,
            stableMemories: stable,
            retrievedMemories: retrieved,
            promptBehaviorMemories,
            workspaceHits,
            summarySnippet: clipByChars(input.summaryText, 600),
            recentMessagesCount: recentMessages.length,
            estimatedChars,
            webSearch: input.webSearch,
            awareness: input.awareness && input.awareness.includeInContext ? input.awareness : null,
            awarenessQuery: input.awarenessQuery ?? null,
            awarenessAnswerMode: input.awarenessAnswerMode ?? null,
            awarenessGrounding: input.awarenessQuery
                ? {
                    status: input.awarenessQuery.bundle.groundingStatus,
                    confidenceLevel: input.awarenessQuery.bundle.confidenceLevel,
                    isFresh: input.awarenessQuery.bundle.freshness.isFresh,
                    ageMs: input.awarenessQuery.bundle.freshness.ageMs,
                    traceCount: input.awarenessQuery.bundle.evidenceTraceIds.length
                }
                : null,
            officialKnowledge: input.officialKnowledge ?? null,
            machineAwareness: machineSection ? input.machineAwareness?.summary ?? null : null,
            fileAwareness: fileSection ? input.fileAwareness?.summary ?? null : null,
            screenAwareness: screenSection ? input.screenAwareness?.summary ?? null : null,
            startupDigest: input.awareness?.startupDigest ?? null,
            awarenessRuntime: null,
            runtimePreview: input.runtimePreview ?? null,
            rag: input.rag ?? null
        }
    };
};
