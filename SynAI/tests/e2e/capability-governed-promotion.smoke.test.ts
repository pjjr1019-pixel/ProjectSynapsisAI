import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
  createGovernedPromotionHashInput,
  hashGovernanceCommand,
  issueApprovalToken
} from "@governance-execution";
import { runCapabilityEval } from "../../packages/Awareness-Reasoning/src/capability-eval/runners/eval-runner";
import type {
  CapabilityRunnerOptions,
  CapabilityTestCard
} from "../../packages/Awareness-Reasoning/src/capability-eval/types";
import type { CapabilityEvalAdapter } from "../../packages/Awareness-Reasoning/src/capability-eval/adapter";

const governedCard: CapabilityTestCard = {
  schema_version: "capability-test-card.v1",
  id: "e2e.governed-promotion",
  name: "Governed Promotion",
  category: "e2e",
  description: "fails, patches in sandbox, and promotes only with token",
  prompt: "Return promoted-token",
  success_definition: "answer contains promoted-token",
  allowed_tools: [],
  forbidden_tools: [],
  required_context: [],
  optional_context: [],
  verifier_type: "substring-regex",
  verifier_config: {
    includes: ["promoted-token"]
  },
  remediation_options: ["test-card-clarification"],
  risk_level: "low",
  approval_required: false,
  retry_policy: { maxAttempts: 1, retryDelayMs: 0 },
  tags: ["e2e"],
  enabled: true,
  priority: 1
};

const buildAdapter = (workspaceRoot: string): CapabilityEvalAdapter => ({
  getWorkspaceRoot: () => workspaceRoot,
  execute: async (card) => {
    const hasClarification = card.required_context.some(
      (entry) => entry.source === "inline" && typeof entry.value === "string" && entry.value.includes("Deterministic clarification")
    );
    return {
      request: {
        prompt: card.prompt,
        systemPrompt: "system",
        context: {
          required: [],
          optional: [],
          missingRequired: [],
          retrievalStats: {
            requiredResolved: 0,
            requiredMissing: 0,
            optionalResolved: 0
          }
        },
        allowedTools: [],
        forbiddenTools: [],
        cardId: card.id,
        approvalTokenProvided: false,
        approvedBy: null
      },
      rawResponseText: hasClarification ? "{\"ok\":true}" : "{\"ok\":false}",
      output: {
        interpreted_task: card.prompt,
        plan: ["respond"],
        selected_tools_or_workflows: [],
        answer_or_action: {
          mode: "answer",
          text: hasClarification ? "promoted-token" : "missing"
        },
        confidence: hasClarification ? 1 : 0.2,
        reasoning_summary: hasClarification ? "clarified" : "missing context",
        missing_information: hasClarification ? [] : ["Need deterministic clarification context"],
        safety_flags: [],
        artifacts: {}
      },
      awarenessAnswer: null
    };
  },
  close: async () => {}
});

describe("governed promotion e2e smoke", () => {
  it("blocks promotion without token and promotes with a valid token", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "capability-governed-"));
    const cardsRoot = path.join(workspaceRoot, "packages", "Capability-Catalog", "cards");
    const artifactsRoot = path.join(workspaceRoot, ".runtime", "capability-eval");
    await mkdir(cardsRoot, { recursive: true });
    const cardPath = path.join(cardsRoot, "governed-card.json");
    await writeFile(cardPath, `${JSON.stringify(governedCard, null, 2)}\n`, "utf8");

    const adapter = buildAdapter(workspaceRoot);
    const baseOptions: CapabilityRunnerOptions = {
      cardsRoot,
      artifactsRoot,
      workspaceRoot,
      mode: "governed-promotion",
      dryRun: false,
      proposalOnly: false,
      autoRemediate: true,
      approvedBy: "qa-operator",
      rerunAfterRemediation: true
    };

    try {
      const blocked = await runCapabilityEval({
        adapter,
        options: {
          ...baseOptions,
          approvalToken: null
        },
        runAllEnabled: true
      });
      expect(blocked.cardResults[0].sandbox?.promoted).toBe(false);

      const commandHash = hashGovernanceCommand(
        createGovernedPromotionHashInput("e2e.governed-promotion", "packages/Capability-Catalog/cards/governed-card.json")
      );
      const token = issueApprovalToken(commandHash, "qa-operator", 10 * 60 * 1000);
      const promoted = await runCapabilityEval({
        adapter,
        options: {
          ...baseOptions,
          approvalToken: token
        },
        runAllEnabled: true
      });
      expect(promoted.cardResults[0].sandbox?.promoted).toBe(true);

      const promotedCardRaw = await readFile(cardPath, "utf8");
      expect(promotedCardRaw).toContain("clarification-e2e.governed-promotion");
    } finally {
      await adapter.close();
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });
});
