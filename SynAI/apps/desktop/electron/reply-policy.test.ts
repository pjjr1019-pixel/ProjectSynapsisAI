import { describe, expect, it } from "vitest";
import type { WorkspaceChunkHit } from "@contracts";
import {
  filterWorkspaceHitsForReplyPolicy,
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
});
