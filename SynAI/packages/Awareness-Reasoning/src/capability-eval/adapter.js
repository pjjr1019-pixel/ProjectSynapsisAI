import * as path from "node:path";
import { CAPABILITY_CARDS_ROOT } from "@capability-catalog";
import { createChatExecutionService } from "@governance-execution";
import { createOllamaProvider } from "../local-ai";
import { initializeAwarenessEngine } from "../bootstrap";
import { buildLocalAiEvalSystemPrompt, parseLocalAiEvalOutput } from "./contract";
import { resolveCapabilityContext } from "./context";
import { listWindowsActionDefinitions, suggestWindowsActionFromPrompt } from "./actions/windows-action-layer";
const serializeContextForPrompt = (request) => JSON.stringify({
    card_id: request.cardId,
    allowed_tools: request.allowedTools,
    forbidden_tools: request.forbiddenTools,
    context: {
        required: request.context.required.map((entry) => ({
            id: entry.id,
            source: entry.source,
            summary: entry.summary,
            missing: entry.missing,
            payload: entry.payload
        })),
        optional: request.context.optional.map((entry) => ({
            id: entry.id,
            source: entry.source,
            summary: entry.summary,
            missing: entry.missing,
            payload: entry.payload
        }))
    }
}, null, 2);
const toChatMessages = (systemPrompt, userPrompt, cardId) => {
    const now = new Date().toISOString();
    const conversationId = `capability-${cardId}`;
    return [
        {
            id: `${cardId}-system-${now}`,
            conversationId,
            role: "system",
            createdAt: now,
            content: systemPrompt
        },
        {
            id: `${cardId}-user-${now}`,
            conversationId,
            role: "user",
            createdAt: now,
            content: userPrompt
        }
    ];
};
export const createCapabilityEvalAdapter = (options) => {
    const provider = options.provider ?? createOllamaProvider();
    const chatExecution = createChatExecutionService({ provider });
    let awarenessEngine = options.awarenessEngine ?? null;
    let awarenessInitPromise = null;
    const ensureAwarenessEngine = async () => {
        if (awarenessEngine) {
            return awarenessEngine;
        }
        if (awarenessInitPromise) {
            return awarenessInitPromise;
        }
        awarenessInitPromise = initializeAwarenessEngine({
            workspaceRoot: options.workspaceRoot,
            appStartedAt: new Date().toISOString(),
            ...(options.awarenessOptions ?? {})
        }).catch(() => null);
        awarenessEngine = await awarenessInitPromise;
        return awarenessEngine;
    };
    return {
        getWorkspaceRoot: () => options.workspaceRoot,
        async execute(card) {
            const engine = await ensureAwarenessEngine();
            const context = await resolveCapabilityContext(card, {
                workspaceRoot: options.workspaceRoot,
                awarenessEngine: engine,
                awarenessRefresh: true
            });
            const awarenessAnswer = [...context.required, ...context.optional]
                .map((entry) => entry.payload)
                .find((payload) => typeof payload === "object" &&
                payload !== null &&
                "id" in payload &&
                "intent" in payload &&
                "bundle" in payload) ?? null;
            const systemPrompt = buildLocalAiEvalSystemPrompt(card);
            const actionCatalog = listWindowsActionDefinitions();
            const userPrompt = [
                "Solve this capability task.",
                `Task prompt: ${card.prompt}`,
                `Success definition: ${card.success_definition}`,
                card.action_intent ? `Action intent: ${card.action_intent}` : null,
                card.expected_governance_decision ? `Expected governance decision: ${card.expected_governance_decision}` : null,
                card.expected_executor ? `Expected executor: ${card.expected_executor}` : null,
                card.expected_preflight?.length ? `Expected preflight: ${card.expected_preflight.join(" | ")}` : null,
                card.expected_verification?.length ? `Expected verification: ${card.expected_verification.join(" | ")}` : null,
                "Use the provided context and honor allowed/forbidden tool boundaries.",
                "If execution is risky or disallowed, refuse safely and clearly.",
                `Approval token provided: ${options.approvalToken ? "yes" : "no"}`,
                "Windows action layer is proposal-only unless external governed executor is attached.",
                "",
                "Known action catalog:",
                JSON.stringify(actionCatalog, null, 2),
                "",
                "Structured context:",
                serializeContextForPrompt({
                    prompt: card.prompt,
                    systemPrompt,
                    context,
                    allowedTools: card.allowed_tools,
                    forbiddenTools: card.forbidden_tools,
                    cardId: card.id,
                    approvalTokenProvided: Boolean(options.approvalToken),
                    approvedBy: options.approvedBy?.trim() || null
                }),
                "",
                card.notes ? `Card notes: ${card.notes}` : null,
                "Respond only as JSON per schema."
            ]
                .filter((entry) => typeof entry === "string" && entry.length > 0)
                .join("\n");
            const request = {
                prompt: card.prompt,
                systemPrompt,
                context,
                allowedTools: card.allowed_tools,
                forbiddenTools: card.forbidden_tools,
                cardId: card.id,
                approvalTokenProvided: Boolean(options.approvalToken),
                approvedBy: options.approvedBy?.trim() || null
            };
            const messages = toChatMessages(systemPrompt, userPrompt, card.id);
            const timeoutMs = card.timeout_ms ?? 45_000;
            const rawResponseText = await chatExecution.runChat(messages, {
                timeoutMs,
                label: `Capability card ${card.id}`
            });
            const output = parseLocalAiEvalOutput(rawResponseText);
            if (output.answer_or_action.mode === "action" && (output.answer_or_action.proposed_actions?.length ?? 0) === 0) {
                const fallbackAction = suggestWindowsActionFromPrompt(card.prompt);
                if (fallbackAction) {
                    output.answer_or_action.proposed_actions = [fallbackAction];
                    output.safety_flags = [...new Set([...output.safety_flags, "action-fallback-suggested"])];
                }
            }
            if (card.approval_required &&
                output.answer_or_action.mode === "action" &&
                !output.answer_or_action.proposed_actions?.every((proposal) => proposal.approvalRequired)) {
                output.safety_flags = [...new Set([...output.safety_flags, "approval-required"])];
            }
            if (context.missingRequired.length > 0) {
                output.artifacts = {
                    ...output.artifacts,
                    missing_required_context: context.missingRequired.map((entry) => entry.id)
                };
            }
            output.artifacts = {
                ...output.artifacts,
                action_layer_mode: "proposal-only",
                available_action_ids: actionCatalog.map((entry) => entry.id)
            };
            return {
                request,
                rawResponseText,
                output,
                awarenessAnswer
            };
        },
        async close() {
            await awarenessEngine?.close();
            awarenessEngine = null;
        }
    };
};
export const resolveDefaultCapabilityRoots = (workspaceRoot) => ({
    cardsRoot: path.join(workspaceRoot, CAPABILITY_CARDS_ROOT),
    artifactsRoot: path.join(workspaceRoot, ".runtime", "capability-eval")
});
