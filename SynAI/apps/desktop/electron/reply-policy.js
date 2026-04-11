import * as path from "node:path";
import { deriveReplyPolicy, deriveRoutingSuppressionReasons } from "./prompting/policy-matrix";
import { buildPolicyDiagnostics, classifyPromptTask } from "./prompting/task-classifier";
const getClassification = (query, options) => options?.classification ?? classifyPromptTask(query);
export const inferReplyFormatPolicy = (query, override, classifierOptions) => {
    if (override) {
        return override;
    }
    return getClassification(query, classifierOptions).categories.exact_format
        ? "preserve-exact-structure"
        : "default";
};
export const inferReplySourceScope = (query, options) => {
    if (options.override) {
        return options.override;
    }
    const classification = options.classification ?? classifyPromptTask(query, {
        explicitWindowsAwarenessPrompt: options.explicitWindowsAwarenessPrompt,
        useWebSearch: options.useWebSearch
    });
    return deriveReplyPolicy(classification, {
        overrides: options.override ? { sourceScope: options.override } : undefined
    }).sourceScope;
};
export const inferReplyGroundingPolicy = (sourceScope, override) => {
    if (override) {
        return override;
    }
    if (sourceScope === "awareness-only") {
        return "awareness-direct";
    }
    if (sourceScope === "repo-wide" ||
        sourceScope === "readme-only" ||
        sourceScope === "docs-only" ||
        sourceScope === "workspace-only") {
        return "source-boundary";
    }
    return "default";
};
export const inferReplyRoutingPolicy = (sourceScope, override) => {
    if (override) {
        return override;
    }
    if (sourceScope === "awareness-only") {
        return "windows-explicit-only";
    }
    if (sourceScope === "repo-wide" || sourceScope === "readme-only" || sourceScope === "docs-only") {
        return "chat-first-source-scoped";
    }
    return "default";
};
export const resolveReplyPolicy = (query, options) => {
    const classification = options.classification ?? classifyPromptTask(query, {
        explicitWindowsAwarenessPrompt: options.explicitWindowsAwarenessPrompt,
        useWebSearch: options.useWebSearch
    });
    return deriveReplyPolicy(classification, {
        overrides: options.overrides
    });
};
export const shouldBypassCleanup = (runMode, policy) => runMode === "evaluation" || policy.formatPolicy === "preserve-exact-structure";
export const getRoutingSuppressionReason = (query, policy, classifierOptions) => deriveRoutingSuppressionReasons(getClassification(query, classifierOptions), policy)[0] ?? null;
export const getReplyPolicyDiagnostics = (query, policy, classifierOptions) => {
    const classification = getClassification(query, classifierOptions);
    return buildPolicyDiagnostics(classification, policy, deriveRoutingSuppressionReasons(classification, policy));
};
const isReadmePath = (relativePath) => /(^|[\\/])readme(?:\.[^.]+)?$/i.test(relativePath);
const isDocsPath = (relativePath) => /(^|[\\/])docs([\\/]|$)/i.test(relativePath) || isReadmePath(relativePath);
const isPreferredRepoGroundingPath = (relativePath) => isDocsPath(relativePath) || /(^|[\\/])changelog\.md$/i.test(relativePath);
const sortWithPreference = (hits, preferred) => [...hits].sort((left, right) => {
    const leftPreferred = preferred(left.relativePath) ? 1 : 0;
    const rightPreferred = preferred(right.relativePath) ? 1 : 0;
    if (leftPreferred !== rightPreferred) {
        return rightPreferred - leftPreferred;
    }
    return right.score - left.score;
});
export const filterWorkspaceHitsForReplyPolicy = (hits, sourceScope) => {
    switch (sourceScope) {
        case "readme-only":
            return sortWithPreference(hits.filter((hit) => isReadmePath(hit.relativePath)), (relativePath) => /(^|[\\/])synai[\\/]readme\.md$/i.test(relativePath));
        case "docs-only":
            return sortWithPreference(hits.filter((hit) => isDocsPath(hit.relativePath)), (relativePath) => /(^|[\\/])docs([\\/]|$)/i.test(relativePath));
        case "repo-wide":
            return sortWithPreference(hits, isPreferredRepoGroundingPath);
        case "awareness-only":
        case "time-sensitive-live":
            return [];
        case "workspace-only":
        default:
            return hits;
    }
};
export const summarizeWorkspacePaths = (hits, limit = 4) => [...new Set(hits.map((hit) => path.normalize(hit.relativePath)).filter(Boolean))].slice(0, limit);
