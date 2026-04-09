import * as path from "node:path";
import type {
  ChatReplyFormatPolicy,
  ChatReplyGroundingPolicy,
  ChatReplyPolicy,
  ChatReplyRoutingPolicy,
  ChatReplySourceScope,
  WorkspaceChunkHit
} from "@contracts";

const normalizeQuery = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const includesAny = (value: string, phrases: string[]): boolean => {
  const normalized = normalizeQuery(value);
  return phrases.some((phrase) => normalized.includes(normalizeQuery(phrase)));
};

const README_ONLY_PATTERNS = [
  "readme only",
  "using the current synai readme",
  "current synai readme",
  "based on the current readme",
  "based on the current synai readme"
];

const DOCS_ONLY_PATTERNS = [
  "docs only",
  "current repo docs",
  "repo docs",
  "architecture docs",
  "architecture doc",
  "based on the docs",
  "using the docs"
];

const REPO_WIDE_PATTERNS = [
  "based on the current repo",
  "based on the current synai repo",
  "current synai repo",
  "current build",
  "phase 1",
  "using only the facts below",
  "using the current repo",
  "based on the repo"
];

const EXACT_STRUCTURE_PATTERNS = [
  "exactly",
  "labeled",
  "labelled",
  "section titled",
  "sections titled",
  "start one with",
  "use exactly",
  "bullet",
  "bullets",
  "sentence",
  "sentences"
];

const TIME_SENSITIVE_PATTERNS = ["latest", "today", "right now", "news", "recent web search"];

const hasReadmeOnlySignals = (query: string): boolean => includesAny(query, README_ONLY_PATTERNS);
const hasDocsOnlySignals = (query: string): boolean => includesAny(query, DOCS_ONLY_PATTERNS);
const hasRepoWideSignals = (query: string): boolean => includesAny(query, REPO_WIDE_PATTERNS);

export const inferReplyFormatPolicy = (
  query: string,
  override?: ChatReplyFormatPolicy
): ChatReplyFormatPolicy => {
  if (override) {
    return override;
  }

  return includesAny(query, EXACT_STRUCTURE_PATTERNS) ? "preserve-exact-structure" : "default";
};

export const inferReplySourceScope = (
  query: string,
  options: {
    explicitWindowsAwarenessPrompt: boolean;
    useWebSearch: boolean;
    override?: ChatReplySourceScope;
  }
): ChatReplySourceScope => {
  if (options.override) {
    return options.override;
  }

  if (hasReadmeOnlySignals(query)) {
    return "readme-only";
  }
  if (hasDocsOnlySignals(query)) {
    return "docs-only";
  }
  if (hasRepoWideSignals(query)) {
    return "repo-wide";
  }
  if (options.explicitWindowsAwarenessPrompt) {
    return "awareness-only";
  }
  if (options.useWebSearch || includesAny(query, TIME_SENSITIVE_PATTERNS)) {
    return "time-sensitive-live";
  }

  return "workspace-only";
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
  }
): ChatReplyPolicy => {
  const sourceScope = inferReplySourceScope(query, {
    explicitWindowsAwarenessPrompt: options.explicitWindowsAwarenessPrompt,
    useWebSearch: options.useWebSearch,
    override: options.overrides?.sourceScope
  });
  const formatPolicy = inferReplyFormatPolicy(query, options.overrides?.formatPolicy);

  return {
    sourceScope,
    formatPolicy,
    groundingPolicy: inferReplyGroundingPolicy(sourceScope, options.overrides?.groundingPolicy),
    routingPolicy: inferReplyRoutingPolicy(sourceScope, options.overrides?.routingPolicy)
  };
};

export const shouldBypassCleanup = (
  runMode: "interactive" | "evaluation" | undefined,
  policy: ChatReplyPolicy
): boolean => runMode === "evaluation" || policy.formatPolicy === "preserve-exact-structure";

export const getRoutingSuppressionReason = (
  query: string,
  policy: ChatReplyPolicy
): string | null => {
  if (policy.routingPolicy !== "chat-first-source-scoped") {
    return null;
  }

  if (hasReadmeOnlySignals(query)) {
    return "readme-only scope suppresses awareness routing";
  }
  if (hasDocsOnlySignals(query)) {
    return "docs-only scope suppresses awareness routing";
  }
  if (hasRepoWideSignals(query)) {
    return "repo-grounded scope suppresses awareness routing";
  }

  return null;
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
