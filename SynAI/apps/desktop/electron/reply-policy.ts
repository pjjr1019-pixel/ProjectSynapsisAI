import * as path from "node:path";
import type {
  ChatReplyPolicyDiagnostics,
  ChatReplyFormatPolicy,
  ChatReplyGroundingPolicy,
  ChatReplyPolicy,
  ChatReplyRoutingPolicy,
  ChatReplySourceScope,
  ReasoningProfile,
  WorkspaceChunkHit
} from "@contracts";
import { deriveReplyPolicy, deriveRoutingSuppressionReasons } from "./prompting/policy-matrix";
import {
  buildPolicyDiagnostics,
  classifyPromptTask,
  type PromptTaskClassificationResult
} from "./prompting/task-classifier";

interface ReplyPolicyClassifierOptions {
  classification?: PromptTaskClassificationResult;
}

const getClassification = (
  query: string,
  options?: ReplyPolicyClassifierOptions
): PromptTaskClassificationResult => options?.classification ?? classifyPromptTask(query);

export const inferReplyFormatPolicy = (
  query: string,
  override?: ChatReplyFormatPolicy,
  classifierOptions?: ReplyPolicyClassifierOptions
): ChatReplyFormatPolicy => {
  if (override) {
    return override;
  }

  return getClassification(query, classifierOptions).categories.exact_format
    ? "preserve-exact-structure"
    : "default";
};

export const inferReplySourceScope = (
  query: string,
  options: {
    explicitWindowsAwarenessPrompt: boolean;
    useWebSearch: boolean;
    override?: ChatReplySourceScope;
    classification?: PromptTaskClassificationResult;
    reasoningProfile?: ReasoningProfile;
  }
): ChatReplySourceScope => {
  if (options.override) {
    return options.override;
  }

  const classification =
    options.classification ??
    classifyPromptTask(query, {
      explicitWindowsAwarenessPrompt: options.explicitWindowsAwarenessPrompt,
      useWebSearch: options.useWebSearch
    });

  return deriveReplyPolicy(classification, {
    overrides: options.override ? { sourceScope: options.override } : undefined,
    reasoningProfile: options.reasoningProfile
  }).sourceScope;
};

export const inferReplyGroundingPolicy = (
  sourceScope: ChatReplySourceScope,
  override?: ChatReplyGroundingPolicy
): ChatReplyGroundingPolicy => {
  if (override) {
    return override;
  }

  if (sourceScope === "awareness-only") {
    return "awareness-direct";
  }
  if (
    sourceScope === "repo-wide" ||
    sourceScope === "readme-only" ||
    sourceScope === "docs-only" ||
    sourceScope === "workspace-only"
  ) {
    return "source-boundary";
  }

  return "default";
};

export const inferReplyRoutingPolicy = (
  sourceScope: ChatReplySourceScope,
  override?: ChatReplyRoutingPolicy
): ChatReplyRoutingPolicy => {
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

export const resolveReplyPolicy = (
  query: string,
  options: {
    explicitWindowsAwarenessPrompt: boolean;
    useWebSearch: boolean;
    overrides?: Partial<ChatReplyPolicy>;
    classification?: PromptTaskClassificationResult;
    reasoningProfile?: ReasoningProfile;
  }
): ChatReplyPolicy => {
  const classification =
    options.classification ??
    classifyPromptTask(query, {
      explicitWindowsAwarenessPrompt: options.explicitWindowsAwarenessPrompt,
      useWebSearch: options.useWebSearch
    });

  return deriveReplyPolicy(classification, {
    overrides: options.overrides,
    reasoningProfile: options.reasoningProfile
  });
};

export const shouldBypassCleanup = (
  runMode: "interactive" | "evaluation" | undefined,
  policy: ChatReplyPolicy
): boolean => runMode === "evaluation" || policy.formatPolicy === "preserve-exact-structure";

export const getRoutingSuppressionReason = (
  query: string,
  policy: ChatReplyPolicy,
  classifierOptions?: ReplyPolicyClassifierOptions
): string | null => {
  const classification = getClassification(query, classifierOptions);
  return deriveRoutingSuppressionReasons(classification, policy)[0] ?? null;
};

export const getReplyPolicyDiagnostics = (
  query: string,
  policy: ChatReplyPolicy,
  classifierOptions?: ReplyPolicyClassifierOptions
): ChatReplyPolicyDiagnostics => {
  const classification = getClassification(query, classifierOptions);
  return buildPolicyDiagnostics(classification, policy, deriveRoutingSuppressionReasons(classification, policy));
};

const isReadmePath = (relativePath: string): boolean => /(^|[\\/])readme(?:\.[^.]+)?$/i.test(relativePath);
const isDocsPath = (relativePath: string): boolean =>
  /(^|[\\/])docs([\\/]|$)/i.test(relativePath) || isReadmePath(relativePath);
const isPreferredRepoGroundingPath = (relativePath: string): boolean =>
  isDocsPath(relativePath) || /(^|[\\/])changelog\.md$/i.test(relativePath);

const sortWithPreference = (
  hits: WorkspaceChunkHit[],
  preferred: (relativePath: string) => boolean
): WorkspaceChunkHit[] =>
  [...hits].sort((left, right) => {
    const leftPreferred = preferred(left.relativePath) ? 1 : 0;
    const rightPreferred = preferred(right.relativePath) ? 1 : 0;
    if (leftPreferred !== rightPreferred) {
      return rightPreferred - leftPreferred;
    }
    return right.score - left.score;
  });

export const filterWorkspaceHitsForReplyPolicy = (
  hits: WorkspaceChunkHit[],
  sourceScope: ChatReplySourceScope
): WorkspaceChunkHit[] => {
  switch (sourceScope) {
    case "readme-only":
      return sortWithPreference(
        hits.filter((hit) => isReadmePath(hit.relativePath)),
        (relativePath) => /(^|[\\/])synai[\\/]readme\.md$/i.test(relativePath)
      );
    case "docs-only":
      return sortWithPreference(
        hits.filter((hit) => isDocsPath(hit.relativePath)),
        (relativePath) => /(^|[\\/])docs([\\/]|$)/i.test(relativePath)
      );
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

export const summarizeWorkspacePaths = (hits: WorkspaceChunkHit[], limit = 4): string[] =>
  [...new Set(hits.map((hit) => path.normalize(hit.relativePath)).filter(Boolean))].slice(0, limit);
