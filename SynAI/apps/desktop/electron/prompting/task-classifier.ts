import type {
  AwarenessIntentFamily,
  ChatReplyPolicyDiagnostics,
  ChatReplyRepoGroundingSubtype,
  ChatReplyTaskClassifierResult
} from "@contracts";

export interface PromptTaskClassifierRouteLike {
  family: AwarenessIntentFamily;
  confidence: number;
  signals: string[];
}

export interface PromptTaskClassifierOptions {
  route?: PromptTaskClassifierRouteLike | null;
  explicitWindowsAwarenessPrompt?: boolean;
  useWebSearch?: boolean;
}

export interface PromptTaskClassificationResult extends ChatReplyTaskClassifierResult {
  rawSignals: string[];
  fallbackSignals: string[];
}

const normalizeQuery = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const includesAny = (value: string, phrases: string[]): boolean => {
  const normalized = ` ${normalizeQuery(value)} `;
  return phrases.some((phrase) => {
    const normalizedPhrase = normalizeQuery(phrase);
    return normalizedPhrase.length > 0 && normalized.includes(` ${normalizedPhrase} `);
  });
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
  "based on the repo",
  "current repo docs and settings copy"
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
  "sentences",
  "numbered line",
  "numbered lines",
  "under each"
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

const TIME_SENSITIVE_PATTERNS = [
  "latest",
  "today",
  "right now",
  "time sensitive",
  "news",
  "recent web search",
  "recent",
  "as of"
];

const GOVERNED_ACTION_PATTERNS = [
  "open",
  "launch",
  "install",
  "uninstall",
  "delete",
  "remove",
  "move",
  "rename",
  "restart",
  "kill",
  "terminate",
  "enable",
  "disable",
  "turn on",
  "turn off",
  "run",
  "execute"
];

const GENERIC_WRITING_PATTERNS = [
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

const FIRST_TIME_TASK_PATTERNS = [
  "first time",
  "for the first time",
  "getting started",
  "new to",
  "never used",
  "walk me through",
  "step by step",
  "start from scratch",
  "how do i begin",
  "where do i start",
  "beginner",
  "onboard",
  "i m new",
  "i am new"
];

const OPEN_ENDED_PATTERNS = [
  "what should we do",
  "how should we",
  "brainstorm",
  "ideas",
  "options",
  "best approach",
  "recommend",
  "tradeoff",
  "trade off",
  "how would you approach"
];

const DEFAULT_CLASSIFIER = (): ChatReplyTaskClassifierResult["categories"] => ({
  repo_grounded: false,
  exact_format: false,
  awareness_local_state: false,
  time_sensitive: false,
  governed_action: false,
  generic_writing: false,
  first_time_task: false,
  open_ended: false
});

const addSignal = (signals: string[], signal: string, active: boolean): void => {
  if (active && !signals.includes(signal)) {
    signals.push(signal);
  }
};

const addFallbackSignal = (signals: string[], signal: string, active: boolean): void => {
  if (active && !signals.includes(signal)) {
    signals.push(signal);
  }
};

const hasExactFormatSignals = (query: string): boolean => {
  const normalized = normalizeQuery(query);
  return (
    includesAny(query, EXACT_STRUCTURE_PATTERNS) ||
    /\b(?:\d+|one|two|three|four|five|six)\s+(?:short\s+)?(?:bullets?|sentences?|sections?|numbered lines?)\b/i.test(
      normalized
    ) ||
    /`[^`]+:`/.test(query)
  );
};

const resolveRepoGroundingSubtype = (query: string): ChatReplyRepoGroundingSubtype => {
  if (includesAny(query, README_ONLY_PATTERNS)) {
    return "readme-only";
  }
  if (includesAny(query, DOCS_ONLY_PATTERNS)) {
    return "docs-only";
  }
  if (includesAny(query, REPO_WIDE_PATTERNS) || includesAny(query, ["repo", "readme", "docs"])) {
    return "repo-wide";
  }
  return "workspace-only";
};

const hasAwarenessRouteSignal = (route: PromptTaskClassifierRouteLike | null | undefined): boolean =>
  route != null &&
  WINDOWS_AWARENESS_ROUTE_FAMILIES.has(route.family) &&
  (route.confidence >= 0.35 || route.signals.length > 0);

export const classifyPromptTask = (
  query: string,
  options: PromptTaskClassifierOptions = {}
): PromptTaskClassificationResult => {
  const rawSignals: string[] = [];
  const fallbackSignals: string[] = [];
  const categories = DEFAULT_CLASSIFIER();
  const repoGroundingSubtype = resolveRepoGroundingSubtype(query);
  const normalized = normalizeQuery(query);
  const hasReadmeOnly = repoGroundingSubtype === "readme-only";
  const hasDocsOnly = repoGroundingSubtype === "docs-only";
  const hasRepoWide = repoGroundingSubtype === "repo-wide";
  const hasWindowsKeyword = WINDOWS_AWARENESS_KEYWORDS.some((keyword) => normalized.includes(keyword));
  const hasRouteSignal = hasAwarenessRouteSignal(options.route);
  const hasExplicitWindowsSignal = Boolean(options.explicitWindowsAwarenessPrompt);

  categories.repo_grounded = repoGroundingSubtype !== "workspace-only";
  categories.exact_format = hasExactFormatSignals(query);
  categories.awareness_local_state = hasWindowsKeyword || hasRouteSignal || hasExplicitWindowsSignal;
  categories.time_sensitive = includesAny(query, TIME_SENSITIVE_PATTERNS) || Boolean(options.useWebSearch);
  categories.governed_action = includesAny(query, GOVERNED_ACTION_PATTERNS);
  categories.generic_writing = includesAny(query, GENERIC_WRITING_PATTERNS);
  categories.first_time_task = includesAny(query, FIRST_TIME_TASK_PATTERNS);
  categories.open_ended = includesAny(query, OPEN_ENDED_PATTERNS);

  addSignal(rawSignals, `scope:${repoGroundingSubtype}`, categories.repo_grounded);
  addSignal(rawSignals, "format:exact-structure", categories.exact_format);
  addSignal(rawSignals, "awareness:windows-keyword", hasWindowsKeyword);
  addSignal(rawSignals, `awareness:route:${options.route?.family ?? "none"}`, hasRouteSignal);
  addSignal(rawSignals, "awareness:explicit-route", hasExplicitWindowsSignal);
  addSignal(rawSignals, "time:live-request", categories.time_sensitive);
  addSignal(rawSignals, "governance:action-language", categories.governed_action);
  addSignal(rawSignals, "writing:generic-rewrite", categories.generic_writing);
  addSignal(rawSignals, "task:first-time", categories.first_time_task);
  addSignal(rawSignals, "task:open-ended", categories.open_ended);

  addFallbackSignal(fallbackSignals, "fallback:readme-only-pattern", hasReadmeOnly);
  addFallbackSignal(fallbackSignals, "fallback:docs-only-pattern", hasDocsOnly);
  addFallbackSignal(fallbackSignals, "fallback:repo-wide-pattern", hasRepoWide);
  addFallbackSignal(fallbackSignals, "fallback:exact-structure-pattern", categories.exact_format);
  addFallbackSignal(fallbackSignals, "fallback:time-sensitive-pattern", includesAny(query, TIME_SENSITIVE_PATTERNS));
  addFallbackSignal(fallbackSignals, "fallback:generic-writing-pattern", categories.generic_writing);

  return {
    categories,
    repoGroundingSubtype,
    rawSignals,
    fallbackSignals
  };
};

export const buildPolicyDiagnostics = (
  classification: PromptTaskClassificationResult,
  chosenPolicy: ChatReplyPolicyDiagnostics["chosenPolicy"],
  suppressionReasons: string[]
): ChatReplyPolicyDiagnostics => ({
  rawSignals: [...classification.rawSignals],
  fallbackSignals: [...classification.fallbackSignals],
  classifier: {
    categories: { ...classification.categories },
    repoGroundingSubtype: classification.repoGroundingSubtype
  },
  chosenPolicy,
  suppressionReasons: [...suppressionReasons]
});

export const formatClassifierCategories = (
  classification: ChatReplyTaskClassifierResult | null | undefined
): string =>
  !classification
    ? "none"
    : Object.entries(classification.categories)
        .filter(([, active]) => active)
        .map(([label]) => label)
        .join(", ") || "none";
