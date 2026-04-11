import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { queryWorkspaceIndex } from "../retrieval";
const summarizeText = (value, maxChars = 600) => {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length <= maxChars) {
        return normalized;
    }
    return `${normalized.slice(0, Math.max(32, maxChars - 1))}…`;
};
const toEvidence = (requirement, payload, summary, missing) => ({
    id: requirement.id,
    source: requirement.source,
    payload,
    summary,
    missing
});
const resolveWorkspacePath = (workspaceRoot, candidatePath) => path.isAbsolute(candidatePath) ? candidatePath : path.join(workspaceRoot, candidatePath);
const toAwarenessSummary = (answer) => [
    answer.summary,
    answer.bundle.verifiedFindings.length > 0 ? `Verified: ${answer.bundle.verifiedFindings.slice(0, 3).join(" | ")}` : "",
    answer.bundle.uncertainty.length > 0 ? `Unclear: ${answer.bundle.uncertainty.slice(0, 2).join(" | ")}` : ""
]
    .filter(Boolean)
    .join(" | ");
const loadCapabilityRetrievalHints = async (workspaceRoot) => {
    const hintsPath = path.join(workspaceRoot, "capability", "retrieval", "index-hints.json");
    const raw = await readFile(hintsPath, "utf8").catch(() => null);
    if (!raw) {
        return {};
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return {};
    }
    if (typeof parsed !== "object" || parsed === null) {
        return {};
    }
    return parsed;
};
const resolveOneContext = async (requirement, options, card, retrievalHints) => {
    const maxChars = requirement.maxChars ?? 1200;
    if (requirement.source === "inline") {
        if (typeof requirement.value !== "string") {
            return toEvidence(requirement, null, "Inline value missing.", true);
        }
        return toEvidence(requirement, requirement.value, summarizeText(requirement.value, maxChars), false);
    }
    if (requirement.source === "workspace.file") {
        if (!requirement.path) {
            return toEvidence(requirement, null, "Missing file path.", true);
        }
        const absolutePath = resolveWorkspacePath(options.workspaceRoot, requirement.path);
        const content = await readFile(absolutePath, "utf8").catch(() => null);
        if (content == null) {
            return toEvidence(requirement, null, `File not found: ${absolutePath}`, true);
        }
        const snippet = content.slice(0, maxChars);
        return toEvidence(requirement, {
            path: absolutePath,
            content: snippet
        }, `Loaded ${absolutePath}`, false);
    }
    if (requirement.source === "workspace.search") {
        if (!requirement.query) {
            return toEvidence(requirement, null, "Search query missing.", true);
        }
        const hintEntry = retrievalHints.cards?.[card.id] ?? null;
        const queryAugments = hintEntry?.queryAugments
            ?.filter((entry) => typeof entry === "string" && entry.trim().length > 0)
            .slice(0, 8) ?? [];
        const effectiveQuery = [requirement.query, ...queryAugments].join(" ").trim();
        const result = await queryWorkspaceIndex(effectiveQuery, {
            workspaceRoot: options.workspaceRoot,
            runtimeRoot: path.join(options.workspaceRoot, ".runtime", "awareness"),
            enabled: true,
            mode: "incremental"
        }).catch(() => null);
        if (!result || result.hits.length === 0) {
            return toEvidence(requirement, {
                result,
                effectiveQuery,
                queryAugments
            }, `No workspace hits for "${effectiveQuery}".`, true);
        }
        return toEvidence(requirement, {
            result,
            effectiveQuery,
            queryAugments,
            preferredTags: hintEntry?.preferredTags ?? []
        }, `Workspace hits: ${result.hits
            .slice(0, 3)
            .map((hit) => `${hit.relativePath}:${hit.startLine}-${hit.endLine}`)
            .join(" | ")}${queryAugments.length > 0 ? ` | augments: ${queryAugments.join(", ")}` : ""}`, false);
    }
    if (requirement.source === "awareness.live-usage" ||
        requirement.source === "awareness.resource-hotspot" ||
        requirement.source === "awareness.settings-map" ||
        requirement.source === "awareness.general") {
        if (!options.awarenessEngine) {
            return toEvidence(requirement, null, "Awareness engine unavailable.", true);
        }
        if (!requirement.query) {
            return toEvidence(requirement, null, "Awareness query missing.", true);
        }
        const answer = await options.awarenessEngine
            .queryAwarenessLive({
            query: requirement.query,
            awarenessAnswerMode: "evidence-first",
            refresh: options.awarenessRefresh ?? true,
            hints: {
                strictGrounding: true,
                force: true,
                maxScanMs: 350
            }
        })
            .catch(() => null);
        if (!answer) {
            return toEvidence(requirement, null, `No awareness answer for "${requirement.query}".`, true);
        }
        return toEvidence(requirement, answer, toAwarenessSummary(answer), false);
    }
    return toEvidence(requirement, null, `Unsupported context source "${requirement.source}".`, true);
};
export const resolveCapabilityContext = async (card, options) => {
    const retrievalHints = await loadCapabilityRetrievalHints(options.workspaceRoot);
    const required = await Promise.all(card.required_context.map((requirement) => resolveOneContext(requirement, options, card, retrievalHints)));
    const optional = await Promise.all(card.optional_context.map((requirement) => resolveOneContext(requirement, options, card, retrievalHints)));
    const missingRequired = required.filter((entry) => entry.missing);
    return {
        required,
        optional,
        missingRequired,
        retrievalStats: {
            requiredResolved: required.length - missingRequired.length,
            requiredMissing: missingRequired.length,
            optionalResolved: optional.filter((entry) => !entry.missing).length
        }
    };
};
