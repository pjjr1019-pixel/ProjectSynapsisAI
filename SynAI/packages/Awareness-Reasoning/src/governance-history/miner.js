import { appendFile, mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { listConversationRecords, loadConversationRecord } from "../memory";
import { detectFailureFeedback, resolveBrowserNavigationTarget, resolveKnownApplicationTarget, resolveProcessFollowUpPrompt } from "../target-knowledge";
const normalize = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const isTaskLike = (value) => /(?:\b(open|launch|start|close|kill|terminate|stop|delete|remove|create|rename|move|install|uninstall|research|report|save|play|inspect|check|fix|clean|organize)\b)/i.test(value);
const failureSignals = [
    "failed",
    "unable to",
    "cannot",
    "can't",
    "not safe",
    "need approval",
    "approval required",
    "blocked",
    "denied",
    "unsupported",
    "no result",
    "error",
    "unknown chat error",
    "execution failed"
];
const looksFailed = (message) => {
    const text = normalize(message.content);
    return failureSignals.some((signal) => text.includes(normalize(signal))) || message.metadata?.task?.decision === "deny" || message.metadata?.task?.decision === "clarify";
};
const extractSignature = (userMessage, assistantMessage) => {
    const assistantText = assistantMessage?.content ?? "";
    const signature = [
        normalize(userMessage).slice(0, 140),
        assistantText ? normalize(assistantText).slice(0, 120) : "no-assistant-reply"
    ].join(" :: ");
    return signature;
};
const intentKey = (userMessage) => {
    const normalized = normalize(userMessage);
    const reduced = normalized
        .replace(/\b(my|the|a|an|this|that|it|please|could you|can you|would you|do|please)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    return reduced.slice(0, 180) || normalized.slice(0, 180);
};
const scoreImpact = (userMessage, failureSignature, repeatedCount) => {
    let score = 0.5;
    if (isTaskLike(userMessage)) {
        score += 0.2;
    }
    if (/(delete|kill|terminate|uninstall|remove|shutdown)/i.test(userMessage)) {
        score += 0.2;
    }
    if (repeatedCount > 1) {
        score += Math.min(0.2, repeatedCount * 0.05);
    }
    if (/(approval|required|blocked|denied)/i.test(failureSignature)) {
        score += 0.1;
    }
    return Math.min(1, score);
};
const suggestExecutor = (userMessage, assistantMessage) => {
    const normalized = normalize(userMessage);
    if (resolveBrowserNavigationTarget(userMessage) ||
        resolveKnownApplicationTarget(userMessage) ||
        /(?:research|report|latest|current state|computer health|slowing my pc|browser|youtube|play|move everything on my desktop)/i.test(normalized)) {
        return "workflow-orchestrator";
    }
    if (/(open|launch|close|kill|terminate|stop|delete|remove|create|rename|move|install|uninstall|settings|control panel|task manager|services|device manager|event viewer|task scheduler|computer management|registry editor)/i.test(normalized)) {
        return "desktop-actions";
    }
    if (assistantMessage?.metadata?.task?.recommendedExecutor) {
        return assistantMessage.metadata.task.recommendedExecutor;
    }
    return "answer-only";
};
const suggestGap = (userMessage, assistantMessage, failureFeedback = null) => {
    const normalized = normalize(userMessage);
    const assistantText = normalize(assistantMessage?.content ?? "");
    if (failureFeedback) {
        return "verification_gap";
    }
    if (/(failed|unable|blocked|denied|approval required)/i.test(assistantText)) {
        return "approval_state_issue";
    }
    if (/(what is slowing my pc|computer health|research|report|play a random video)/i.test(normalized)) {
        return "missing_workflow_wrapper";
    }
    if (/(kill task|terminate|delete|uninstall|remove chrome)/i.test(normalized)) {
        return "missing_governance_rule";
    }
    if (/(open|launch|close)/i.test(normalized)) {
        return "missing_executor";
    }
    return "execution_runtime_failure";
};
const buildCardDraft = (finding) => ({
    id: `history.${normalize(finding.recovered_intent).replace(/\s+/g, "-").slice(0, 64)}`,
    name: `Replay: ${finding.recovered_intent.slice(0, 48)}`,
    category: "history-derived",
    prompt: finding.latest_user_message,
    platform: "windows",
    task_type: "approval-action",
    action_intent: finding.recovered_intent,
    expected_governance_decision: finding.suggested_executor === "answer-only" ? "allow" : "require_approval",
    expected_risk_tier: finding.suggested_executor === "workflow-orchestrator" ? "tier-1" : "tier-2",
    expected_executor: finding.suggested_executor,
    expected_preflight: ["local history replay", "governance classification"],
    expected_verification: ["task completed or blocked for the right reason"],
    expected_outcome: finding.latest_assistant_message ?? "Replay the recovered intent and confirm the same failure class or success path.",
    success_definition: "The recovered intent is routed through the correct governed executor and verified.",
    approval_required: finding.suggested_executor !== "answer-only",
    safe_autofix_allowed: true,
    remediation_options: ["Add routing rule", "Add executor coverage", "Add verification guard"],
    tags: ["history", "replay", finding.suggested_gap],
    priority: Math.round(finding.user_impact_score * 100),
    enabled: true,
    prerequisites: [],
    timeout: 120000,
    notes: finding.prior_failure_signature
});
const appendJsonl = async (filePath, records) => {
    await mkdir(path.dirname(filePath), { recursive: true });
    for (const record of records) {
        await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
    }
};
export const mineGovernedHistory = async (options = {}) => {
    const conversations = await listConversationRecords();
    const records = [];
    for (const conversation of conversations) {
        const loaded = await loadConversationRecord(conversation.id);
        if (loaded) {
            records.push(loaded);
        }
    }
    const grouped = new Map();
    const sourceConversationIds = new Set();
    for (const record of records) {
        const { conversation, messages } = record;
        for (let index = 0; index < messages.length; index += 1) {
            const message = messages[index];
            if (message.role !== "user") {
                continue;
            }
            const followUpResolution = resolveProcessFollowUpPrompt(message.content, messages.slice(0, index + 1));
            const failureFeedback = detectFailureFeedback(message.content);
            const effectiveUserMessage = followUpResolution?.resolvedPrompt ?? message.content;
            if (failureFeedback) {
                const priorUserEntries = messages.slice(0, index).map((entry, entryIndex) => ({ entry, entryIndex }));
                const priorUser = [...priorUserEntries]
                    .reverse()
                    .find(({ entry, entryIndex }) => entry.role === "user" && (isTaskLike(entry.content) || Boolean(resolveProcessFollowUpPrompt(entry.content, messages.slice(0, entryIndex + 1))))) ?? null;
                if (!priorUser) {
                    continue;
                }
                const priorAssistantEntries = messages.slice(priorUser.entryIndex + 1, index).map((entry, entryIndex) => ({
                    entry,
                    entryIndex: priorUser.entryIndex + 1 + entryIndex
                }));
                const priorAssistant = [...priorAssistantEntries].reverse().find(({ entry }) => entry.role === "assistant") ?? null;
                if (!priorAssistant) {
                    continue;
                }
                const sourceUserMessage = priorUser.entry.content;
                const sourceResolution = resolveProcessFollowUpPrompt(sourceUserMessage, messages.slice(0, priorUser.entryIndex + 1));
                const resolvedPrompt = sourceResolution?.resolvedPrompt ?? sourceUserMessage;
                const key = intentKey(resolvedPrompt);
                const signature = extractSignature(resolvedPrompt, priorAssistant.entry);
                const current = grouped.get(key);
                sourceConversationIds.add(conversation.id);
                if (!current) {
                    const finding = {
                        recovered_intent: key,
                        prior_failure_signature: `${signature} :: feedback ${normalize(message.content).slice(0, 80)}`,
                        repeated_request_count: 1,
                        first_seen: priorUser.entry.createdAt,
                        last_seen: message.createdAt,
                        user_impact_score: scoreImpact(sourceUserMessage, signature, 1),
                        source_conversation_ids: [conversation.id],
                        latest_user_message: sourceUserMessage,
                        latest_assistant_message: priorAssistant.entry.content,
                        latest_failure_feedback: message.content,
                        suggested_executor: suggestExecutor(resolvedPrompt, priorAssistant.entry),
                        suggested_gap: suggestGap(resolvedPrompt, priorAssistant.entry, message.content)
                    };
                    finding.suggested_eval_card = buildCardDraft(finding);
                    grouped.set(key, finding);
                    continue;
                }
                current.last_seen = message.createdAt;
                current.latest_user_message = sourceUserMessage;
                current.latest_assistant_message = priorAssistant.entry.content;
                current.latest_failure_feedback = message.content;
                current.prior_failure_signature = `${signature} :: feedback ${normalize(message.content).slice(0, 80)}`;
                current.source_conversation_ids = [...new Set([...current.source_conversation_ids, conversation.id])];
                current.user_impact_score = scoreImpact(sourceUserMessage, current.prior_failure_signature, current.repeated_request_count);
                current.suggested_executor = suggestExecutor(resolvedPrompt, priorAssistant.entry);
                current.suggested_gap = suggestGap(resolvedPrompt, priorAssistant.entry, message.content);
                current.suggested_eval_card = buildCardDraft(current);
                continue;
            }
            if (!isTaskLike(message.content) && !followUpResolution) {
                continue;
            }
            const assistantMessage = messages.slice(index + 1).find((entry) => entry.role === "assistant") ?? null;
            if (!assistantMessage || !looksFailed(assistantMessage)) {
                continue;
            }
            const key = intentKey(effectiveUserMessage);
            const signature = extractSignature(effectiveUserMessage, assistantMessage);
            const current = grouped.get(key);
            sourceConversationIds.add(conversation.id);
            if (!current) {
                const finding = {
                    recovered_intent: key,
                    prior_failure_signature: signature,
                    repeated_request_count: 1,
                    first_seen: message.createdAt,
                    last_seen: message.createdAt,
                    user_impact_score: scoreImpact(effectiveUserMessage, signature, 1),
                    source_conversation_ids: [conversation.id],
                    latest_user_message: message.content,
                    latest_assistant_message: assistantMessage.content,
                    latest_failure_feedback: null,
                    suggested_executor: suggestExecutor(effectiveUserMessage, assistantMessage),
                    suggested_gap: suggestGap(effectiveUserMessage, assistantMessage)
                };
                finding.suggested_eval_card = buildCardDraft(finding);
                grouped.set(key, finding);
                continue;
            }
            current.repeated_request_count += 1;
            current.last_seen = message.createdAt;
            current.latest_user_message = message.content;
            current.latest_assistant_message = assistantMessage.content;
            current.latest_failure_feedback = null;
            current.prior_failure_signature = signature;
            current.source_conversation_ids = [...new Set([...current.source_conversation_ids, conversation.id])];
            current.user_impact_score = scoreImpact(effectiveUserMessage, signature, current.repeated_request_count);
            current.suggested_executor = suggestExecutor(effectiveUserMessage, assistantMessage);
            current.suggested_gap = suggestGap(effectiveUserMessage, assistantMessage);
            current.suggested_eval_card = buildCardDraft(current);
        }
    }
    const findings = [...grouped.values()].sort((left, right) => {
        if (right.user_impact_score !== left.user_impact_score) {
            return right.user_impact_score - left.user_impact_score;
        }
        if (right.repeated_request_count !== left.repeated_request_count) {
            return right.repeated_request_count - left.repeated_request_count;
        }
        return right.last_seen.localeCompare(left.last_seen);
    });
    const limitedFindings = typeof options.maxFindings === "number" ? findings.slice(0, options.maxFindings) : findings;
    const groupedCardDrafts = limitedFindings
        .map((finding) => finding.suggested_eval_card)
        .filter((card) => Boolean(card));
    if (options.artifactsRoot) {
        const auditDir = path.join(options.artifactsRoot, "governance-history");
        await mkdir(auditDir, { recursive: true });
        await writeFile(path.join(auditDir, "candidate-cards.json"), `${JSON.stringify({
            startedAt: new Date().toISOString(),
            sourceConversationIds: [...sourceConversationIds],
            drafts: groupedCardDrafts
        }, null, 2)}\n`, "utf8");
        await writeFile(path.join(auditDir, "latest-backlog.json"), `${JSON.stringify({
            startedAt: new Date().toISOString(),
            conversationCount: records.length,
            findings: limitedFindings,
            cardDrafts: groupedCardDrafts
        }, null, 2)}\n`, "utf8");
        await appendJsonl(path.join(auditDir, "history.jsonl"), limitedFindings);
    }
    return {
        findings: limitedFindings,
        groupedCardDrafts,
        sourceConversationIds: [...sourceConversationIds]
    };
};
