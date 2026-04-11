import { describe, expect, it } from "vitest";
import type { WorkspaceChunkHit } from "@contracts";
import {
  filterWorkspaceHitsForReplyPolicy,
  getReplyPolicyDiagnostics,
  getRoutingSuppressionReason,
  resolveReplyPolicy,
  shouldBypassCleanup
} from "./reply-policy";

const hit = (relativePath: string, score = 0.9): WorkspaceChunkHit => ({
  chunkId: `${relativePath}:1:4`,
  path: `C:/workspace/${relativePath}`,
  relativePath,
  startLine: 1,
  endLine: 4,
  score,
  reason: "keyword",
  excerpt: "example excerpt"
});

describe("reply policy", () => {
  it("infers repo-grounded source scopes and exact-structure formatting", () => {
    const policy = resolveReplyPolicy(
      "Based on the current README only, answer with exactly 2 short bullets titled Built now and Not built yet.",
      {
        explicitWindowsAwarenessPrompt: false,
        useWebSearch: false
      }
    );

    expect(policy.sourceScope).toBe("readme-only");
    expect(policy.formatPolicy).toBe("preserve-exact-structure");
    expect(policy.groundingPolicy).toBe("source-boundary");
    expect(getRoutingSuppressionReason("Based on the current README only, summarize Phase 1.", policy)).toBe(
      "readme-only scope suppresses awareness routing"
    );
    expect(shouldBypassCleanup("evaluation", policy)).toBe(true);
  });

  it("filters workspace hits down to README chunks for readme-only answers", () => {
    const filtered = filterWorkspaceHitsForReplyPolicy(
      [hit("SynAI/README.md", 0.95), hit("SynAI/docs/architecture/chat-memory-strategy.md", 0.99), hit("SynAI/CHANGELOG.md", 0.9)],
      "readme-only"
    );

    expect(filtered.map((entry) => entry.relativePath)).toEqual(["SynAI/README.md"]);
  });

  it("keeps repo-grounded routing when a docs prompt mentions Windows state", () => {
    const policy = resolveReplyPolicy(
      "Using the current repo docs only, explain the Windows CPU routing today in exactly 2 bullets.",
      {
        explicitWindowsAwarenessPrompt: false,
        useWebSearch: false
      }
    );

    expect(policy.sourceScope).toBe("docs-only");
    expect(policy.routingPolicy).toBe("chat-first-source-scoped");
    expect(getRoutingSuppressionReason(
      "Using the current repo docs only, explain the Windows CPU routing today in exactly 2 bullets.",
      policy
    )).toBe("docs-only scope suppresses awareness routing");
  });

  it("captures classifier-backed diagnostics and generic-writing suppression", () => {
    const policy = resolveReplyPolicy(
      "Rewrite this reply to sound calmer without changing its meaning. Use exactly 2 bullets labeled Tone and Fix.",
      {
        explicitWindowsAwarenessPrompt: false,
        useWebSearch: false
      }
    );

    const diagnostics = getReplyPolicyDiagnostics(
      "Rewrite this reply to sound calmer without changing its meaning. Use exactly 2 bullets labeled Tone and Fix.",
      policy
    );

    expect(diagnostics.classifier.categories.generic_writing).toBe(true);
    expect(diagnostics.classifier.categories.exact_format).toBe(true);
    expect(diagnostics.suppressionReasons).toContain("generic-writing prompt suppresses awareness routing");
  });
});
