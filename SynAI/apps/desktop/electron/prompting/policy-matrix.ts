import type { ChatReplyPolicy, ReasoningProfile } from "@contracts";
import type { PromptTaskClassificationResult } from "./task-classifier";
import { getReasoningProfileBehavior, normalizeReasoningProfile } from "./reasoning-profile";

export interface DeriveReplyPolicyOptions {
  overrides?: Partial<ChatReplyPolicy>;
  reasoningProfile?: ReasoningProfile;
}

export const deriveReplyPolicy = (
  classification: PromptTaskClassificationResult,
  options: DeriveReplyPolicyOptions = {}
): ChatReplyPolicy => {
  const override = options.overrides ?? {};
  const profileBehavior = getReasoningProfileBehavior(
    normalizeReasoningProfile(options.reasoningProfile)
  );

  const derivedSourceScope =
    override.sourceScope ??
    (classification.categories.repo_grounded
      ? classification.repoGroundingSubtype
      : classification.categories.awareness_local_state
        ? "awareness-only"
        : classification.categories.time_sensitive
          ? "time-sensitive-live"
          : "workspace-only");

  const derivedFormatPolicy =
    override.formatPolicy ??
    (classification.categories.exact_format ? "preserve-exact-structure" : "default");

  const derivedGroundingPolicy =
    override.groundingPolicy ??
    (derivedSourceScope === "awareness-only"
      ? "awareness-direct"
      : profileBehavior.profile === "research" ||
          derivedSourceScope === "repo-wide" ||
          derivedSourceScope === "readme-only" ||
          derivedSourceScope === "docs-only" ||
          derivedSourceScope === "workspace-only" ||
          (profileBehavior.profile === "action" && classification.categories.governed_action)
        ? "source-boundary"
        : "default");

  const derivedRoutingPolicy =
    override.routingPolicy ??
    (derivedSourceScope === "awareness-only"
      ? "windows-explicit-only"
      : derivedSourceScope === "repo-wide" ||
          derivedSourceScope === "readme-only" ||
          derivedSourceScope === "docs-only"
        ? "chat-first-source-scoped"
        : "default");

  return {
    sourceScope: derivedSourceScope,
    formatPolicy: derivedFormatPolicy,
    groundingPolicy: derivedGroundingPolicy,
    routingPolicy: derivedRoutingPolicy
  };
};

export const deriveRoutingSuppressionReasons = (
  classification: PromptTaskClassificationResult,
  policy: ChatReplyPolicy
): string[] => {
  const reasons: string[] = [];

  if (classification.categories.generic_writing) {
    reasons.push("generic-writing prompt suppresses awareness routing");
  }

  if (policy.routingPolicy === "chat-first-source-scoped") {
    if (policy.sourceScope === "readme-only") {
      reasons.push("readme-only scope suppresses awareness routing");
    } else if (policy.sourceScope === "docs-only") {
      reasons.push("docs-only scope suppresses awareness routing");
    } else if (policy.sourceScope === "repo-wide") {
      reasons.push("repo-grounded scope suppresses awareness routing");
    }
  }

  if (
    classification.categories.time_sensitive &&
    policy.sourceScope !== "time-sensitive-live" &&
    classification.categories.repo_grounded
  ) {
    reasons.push("explicit repo scope suppresses live time-sensitive routing");
  }

  return reasons;
};
