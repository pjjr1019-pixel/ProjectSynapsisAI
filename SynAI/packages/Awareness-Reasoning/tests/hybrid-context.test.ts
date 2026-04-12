import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveContextCachePacks,
  resolveHybridContextPlan,
  type ResolveContextCachePacksInput
} from "../src/memory/context/hybrid-context";

const classifier = (overrides: Partial<ReturnType<typeof baseClassifier>["categories"]> = {}) => ({
  categories: {
    ...baseClassifier().categories,
    ...overrides
  },
  repoGroundingSubtype: "repo-wide" as const
});

const baseClassifier = () => ({
  categories: {
    repo_grounded: true,
    exact_format: false,
    awareness_local_state: false,
    time_sensitive: false,
    governed_action: false,
    generic_writing: false,
    first_time_task: false,
    open_ended: false
  },
  repoGroundingSubtype: "repo-wide" as const
});

const buildCachePackInput = (workspaceRoot: string, runtimeRoot: string): ResolveContextCachePacksInput => ({
  workspaceRoot,
  runtimeRoot,
  routeDecision: {
    mode: "cache_plus_retrieval",
    reason: "test route",
    reasons: ["test route"],
    codingMode: true,
    highQualityMode: true,
    freshEvidenceRequired: false,
    selectedTaskSkillIds: ["implement_toggle"],
    selectedPackTypes: ["repo_core", "task_skill", "work_context", "memory_context"],
    retrievalHint: null
  },
  selectedTaskSkills: [
    {
      id: "implement_toggle",
      title: "Implement Toggle",
      summary: "Test task skill",
      routeBias: "cache_plus_retrieval",
      preferredRetrievalScopes: ["renderer settings"],
      preferredPathGlobs: ["apps/desktop/src/"],
      preferredExtensions: [".ts", ".tsx"],
      preferredDomains: [],
      requiredEvidenceKinds: ["settings-state"],
      outputContractHints: ["persist defaults"],
      instructions: ["Wire persisted settings."]
    }
  ],
  conversationId: "conversation-1",
  latestUserMessage: "Implement a toggle in the desktop app.",
  summaryText: "Conversation summary",
  stableMemories: [],
  retrievedMemories: [],
  promptBehaviorMemories: [],
  recentTouchedPaths: ["apps/desktop/src/features/local-chat/components/ChatSettings.tsx"],
  awarenessDigest: {
    repo: {
      branch: "main",
      headSha: "aaaaaaaa",
      dirtyState: "clean"
    },
    freshness: {
      generatedAt: "2026-01-01T00:00:00.000Z"
    }
  } as unknown as ResolveContextCachePacksInput["awarenessDigest"]
});

describe("hybrid context routing", () => {
  it("routes repo-understanding prompts to cache_only", () => {
    const plan = resolveHybridContextPlan({
      query: "Explain the repo architecture and package boundaries.",
      taskClassification: classifier(),
      replyPolicySourceScope: "repo-wide",
      codingMode: false,
      highQualityMode: false,
      conversationMessageCount: 2
    });

    expect(plan.routeDecision.mode).toBe("cache_only");
    expect(plan.routeDecision.selectedPackTypes).toContain("repo_core");
  });

  it("routes exact workspace questions to retrieval_only", () => {
    const plan = resolveHybridContextPlan({
      query: "In apps/desktop/electron/main.ts, what does handleSendChatAdvanced do right now?",
      taskClassification: classifier(),
      replyPolicySourceScope: "workspace-only",
      codingMode: false,
      highQualityMode: false
    });

    expect(plan.routeDecision.mode).toBe("retrieval_only");
  });

  it("routes coding work to cache_plus_retrieval and picks task skills", () => {
    const plan = resolveHybridContextPlan({
      query: "Implement a new toggle and verify the integration with tests.",
      taskClassification: classifier(),
      replyPolicySourceScope: "repo-wide",
      codingMode: true,
      highQualityMode: true
    });

    expect(plan.routeDecision.mode).toBe("cache_plus_retrieval");
    expect(plan.routeDecision.selectedTaskSkillIds).toContain("implement_toggle");
  });
});

describe("context cache packs", () => {
  it("reuses unchanged packs and marks repo_core stale when repo state changes without refreshed docs", async () => {
    const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "synai-hybrid-cache-"));
    const runtimeRoot = path.join(workspaceRoot, ".runtime", "awareness");

    try {
      await mkdir(path.join(workspaceRoot, "context"), { recursive: true });
      await writeFile(path.join(workspaceRoot, "context", "AGENT_GUIDE.md"), "# Guide\n- stable");
      await writeFile(path.join(workspaceRoot, "context", "REPO_MAP.md"), "# Repo Map\n- package map");
      await writeFile(path.join(workspaceRoot, "context", "BLAST_RADIUS.md"), "# Blast Radius\n- be careful");
      await writeFile(path.join(workspaceRoot, "context", "ARCHITECTURE_SUMMARY.md"), "# Summary\n- overview");

      const first = await resolveContextCachePacks(buildCachePackInput(workspaceRoot, runtimeRoot));
      const second = await resolveContextCachePacks(buildCachePackInput(workspaceRoot, runtimeRoot));

      expect(first.summaries.some((pack) => pack.type === "repo_core" && pack.cacheHit === false)).toBe(true);
      expect(second.summaries.some((pack) => pack.type === "repo_core" && pack.cacheHit)).toBe(true);

      const changedRepoState = buildCachePackInput(workspaceRoot, runtimeRoot);
      changedRepoState.awarenessDigest = {
        repo: {
          branch: "main",
          headSha: "bbbbbbbb",
          dirtyState: "dirty"
        },
        freshness: {
          generatedAt: "2026-01-01T00:00:00.000Z"
        }
      } as unknown as ResolveContextCachePacksInput["awarenessDigest"];

      const stale = await resolveContextCachePacks(changedRepoState);
      expect(
        stale.summaries.some(
          (pack) => pack.type === "repo_core" && pack.stale && pack.invalidationReason === "repo-changed-after-cache-build"
        )
      ).toBe(true);
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });
});
