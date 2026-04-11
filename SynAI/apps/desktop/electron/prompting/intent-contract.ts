import type {
  AwarenessQueryAnswer,
  ChatReplyPolicy,
  PromptIntentAmbiguityFlag,
  PromptIntentContract,
  PromptIntentFamily,
  PromptIntentMissingEvidence,
  PromptIntentOutputContract,
  PromptIntentRequiredCheck,
  RagContextPreview,
  ResponseMode
} from "@contracts";
import { classifyPromptTask, type PromptTaskClassificationResult } from "./task-classifier";

const normalizeQuery = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

type RouteLike = NonNullable<AwarenessQueryAnswer["intent"]>;

const dedupe = <T extends string>(values: T[]): T[] => [...new Set(values)];

const normalizeLine = (value: string): string => value.replace(/\s+/g, " ").trim();

const inferOutputShape = (query: string, policy: ChatReplyPolicy): PromptIntentOutputContract["shape"] => {
  const normalized = normalizeQuery(query);
  if (policy.formatPolicy === "preserve-exact-structure") {
    return "exact-user-structure";
  }
  if (normalized.includes("section") || normalized.includes("sections") || normalized.includes("titled")) {
    return "labeled-sections";
  }
  if (normalized.includes("bullet") || normalized.includes("bullets")) {
    return "bullets";
  }
  return "direct-answer";
};

const inferOutputLength = (
  query: string,
  responseMode: ResponseMode | undefined
): PromptIntentOutputContract["length"] => {
  const normalized = normalizeQuery(query);
  if (normalized.includes("one sentence") || normalized.includes("extremely brief")) {
    return "very-short";
  }
  if (responseMode === "smart") {
    return "medium";
  }
  return "short";
};

const inferPromptIntentFamily = (
  route: RouteLike | null,
  replyPolicy: ChatReplyPolicy,
  taskClassification: PromptTaskClassificationResult
): PromptIntentFamily => {
  if (taskClassification.categories.generic_writing) {
    return "generic-writing";
  }
  if (replyPolicy.sourceScope === "time-sensitive-live") {
    return "time-sensitive-live";
  }
  if (replyPolicy.sourceScope === "awareness-only") {
    return "windows-awareness";
  }
  if (replyPolicy.sourceScope === "repo-wide" || replyPolicy.sourceScope === "readme-only" || replyPolicy.sourceScope === "docs-only") {
    return route?.family === "repo-change" ? route.family : "repo-grounded";
  }
  return route?.family ?? "general-chat";
};

export const isGenericWritingPrompt = (query: string): boolean => {
  return classifyPromptTask(query).categories.generic_writing;
};

export const isExplicitWindowsAwarenessPrompt = (query: string, route: RouteLike | null): boolean => {
  return classifyPromptTask(query, { route }).categories.awareness_local_state;
};

export const shouldPreferOfficialWindowsKnowledge = (query: string, route: RouteLike | null): boolean => {
  const normalized = normalizeQuery(query);
  if (!route) {
    return false;
  }

  return (
    route.family === "settings-control-panel" ||
    route.family === "registry" ||
    normalized.includes("windows update") ||
    normalized.includes("release health") ||
    normalized.includes("known issue") ||
    normalized.includes("ms settings") ||
    normalized.includes("control panel")
  );
};

export interface BuildSeedPromptIntentInput {
  query: string;
  route: RouteLike | null;
  replyPolicy: ChatReplyPolicy;
  responseMode?: ResponseMode;
  reasoningMode: RagContextPreview["mode"];
  taskClassification: PromptTaskClassificationResult;
  hasWorkspaceHits: boolean;
  hasAwarenessEvidence: boolean;
  hasLiveWebResults: boolean;
  useWebSearch: boolean;
  preferOfficialWindowsKnowledge: boolean;
}

export const normalizePromptIntentContract = (
  candidate: Partial<PromptIntentContract> | null | undefined,
  fallback: PromptIntentContract
): PromptIntentContract => {
  const outputContract: PromptIntentOutputContract = {
    shape: candidate?.outputContract?.shape ?? fallback.outputContract.shape,
    length: candidate?.outputContract?.length ?? fallback.outputContract.length,
    preserveExactStructure:
      candidate?.outputContract?.preserveExactStructure ?? fallback.outputContract.preserveExactStructure
  };

  return {
    intentFamily: candidate?.intentFamily ?? fallback.intentFamily,
    userGoal: normalizeLine(candidate?.userGoal ?? "") || fallback.userGoal,
    constraints: dedupe((candidate?.constraints ?? fallback.constraints).map(normalizeLine).filter(Boolean)),
    sourceScope: candidate?.sourceScope ?? fallback.sourceScope,
    outputContract,
    ambiguityFlags: dedupe(
      (candidate?.ambiguityFlags ?? fallback.ambiguityFlags).filter(Boolean) as PromptIntentAmbiguityFlag[]
    ),
    missingEvidence: dedupe(
      (candidate?.missingEvidence ?? fallback.missingEvidence).filter(Boolean) as PromptIntentMissingEvidence[]
    ),
    requiredChecks: dedupe(
      (candidate?.requiredChecks ?? fallback.requiredChecks).filter(Boolean) as PromptIntentRequiredCheck[]
    )
  };
};

export const buildSeedPromptIntent = ({
  query,
  route,
  replyPolicy,
  responseMode,
  reasoningMode,
  taskClassification,
  hasWorkspaceHits,
  hasAwarenessEvidence,
  hasLiveWebResults,
  useWebSearch,
  preferOfficialWindowsKnowledge
}: BuildSeedPromptIntentInput): PromptIntentContract => {
  const constraints: string[] = [];
  const ambiguityFlags: PromptIntentAmbiguityFlag[] = [];
  const missingEvidence: PromptIntentMissingEvidence[] = [];
  const requiredChecks: PromptIntentRequiredCheck[] = ["respect-source-scope"];

  if (replyPolicy.formatPolicy === "preserve-exact-structure") {
    constraints.push("Preserve the user's exact requested structure.");
    requiredChecks.push("preserve-user-structure");
    ambiguityFlags.push("format-sensitive");
  }

  if (replyPolicy.groundingPolicy === "source-boundary") {
    constraints.push("Stay within the allowed source boundary and omit unsupported claims.");
  }

  if (replyPolicy.routingPolicy === "chat-first-source-scoped") {
    requiredChecks.push("avoid-awareness-routing");
  }

  if (replyPolicy.sourceScope === "time-sensitive-live") {
    constraints.push("Prefer recent live evidence for time-sensitive facts.");
    ambiguityFlags.push("time-sensitive");
    requiredChecks.push("cite-live-sources-when-helpful");
    if (!hasLiveWebResults && useWebSearch) {
      missingEvidence.push("live-web-evidence");
    }
  }

  if (taskClassification.categories.awareness_local_state || replyPolicy.sourceScope === "awareness-only") {
    requiredChecks.push("verify-local-machine-state");
    if (!hasAwarenessEvidence) {
      missingEvidence.push("awareness-evidence");
    }
  }

  if (preferOfficialWindowsKnowledge) {
    constraints.push("Prefer official Windows evidence when it is relevant.");
    if (!hasAwarenessEvidence) {
      missingEvidence.push("official-windows-evidence");
    }
  }

  if (
    (replyPolicy.sourceScope === "repo-wide" ||
      replyPolicy.sourceScope === "readme-only" ||
      replyPolicy.sourceScope === "docs-only" ||
      replyPolicy.sourceScope === "workspace-only") &&
    !hasWorkspaceHits
  ) {
    missingEvidence.push(replyPolicy.sourceScope === "workspace-only" ? "workspace-evidence" : "repo-evidence");
  }

  if (missingEvidence.length > 0) {
    ambiguityFlags.push("missing-evidence");
    requiredChecks.push("state-uncertainty-when-evidence-is-missing");
  }

  if (route && route.confidence < 0.45 && route.signals.length === 0) {
    ambiguityFlags.push("low-route-confidence");
  }

  if (
    replyPolicy.sourceScope === "time-sensitive-live" &&
    (replyPolicy.routingPolicy === "chat-first-source-scoped" ||
      taskClassification.categories.awareness_local_state)
  ) {
    ambiguityFlags.push("mixed-scope");
  }

  if (taskClassification.categories.first_time_task) {
    constraints.push("Break first-time tasks into clear steps before the final answer.");
    requiredChecks.push("decompose-first-time-task");
  }

  if (taskClassification.categories.open_ended) {
    constraints.push("Structure open-ended requests with a short recommendation and concrete options.");
    requiredChecks.push("structure-open-ended-request");
  }

  if (reasoningMode === "advanced") {
    constraints.push("Use retrieved evidence to form a grounded internal plan before answering.");
  }

  return normalizePromptIntentContract(
    {
      intentFamily: inferPromptIntentFamily(route, replyPolicy, taskClassification),
      userGoal: normalizeLine(query),
      constraints,
      sourceScope: replyPolicy.sourceScope,
      outputContract: {
        shape: inferOutputShape(query, replyPolicy),
        length: inferOutputLength(query, responseMode),
        preserveExactStructure: replyPolicy.formatPolicy === "preserve-exact-structure"
      },
      ambiguityFlags,
      missingEvidence,
      requiredChecks
    },
    {
      intentFamily: "general-chat",
      userGoal: normalizeLine(query) || "Answer the user's request.",
      constraints: [],
      sourceScope: replyPolicy.sourceScope,
      outputContract: {
        shape: "direct-answer",
        length: responseMode === "smart" ? "medium" : "short",
        preserveExactStructure: false
      },
      ambiguityFlags: [],
      missingEvidence: [],
      requiredChecks: ["respect-source-scope"]
    }
  );
};
