import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { runCapabilityEval } from "../../packages/Awareness-Reasoning/src/capability-eval/runners/eval-runner";
import type {
  CapabilityRunnerOptions,
  CapabilityTestCard
} from "../../packages/Awareness-Reasoning/src/capability-eval/types";
import type { CapabilityEvalAdapter } from "../../packages/Awareness-Reasoning/src/capability-eval/adapter";

const e2eCard: CapabilityTestCard = {
  schema_version: "capability-test-card.v1",
  id: "e2e.remediation-loop",
  name: "E2E Remediation Loop",
  category: "e2e",
  description: "forces fail -> classify -> remediation -> rerun pass",
  prompt: "Return clarification-token",
  success_definition: "answer contains clarification-token",
  allowed_tools: [],
  forbidden_tools: [],
  required_context: [],
  optional_context: [],
  verifier_type: "substring-regex",
  verifier_config: {
    includes: ["clarification-token"]
  },
  remediation_options: ["test-card-clarification"],
  risk_level: "low",
  approval_required: false,
  retry_policy: {
    maxAttempts: 1,
    retryDelayMs: 0
  },
  tags: ["e2e"],
  enabled: true,
  priority: 1
};

describe("capability remediation loop e2e smoke", () => {
  it("handles failing capability with remediation proposal and sandbox rerun", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "capability-e2e-"));
    const cardsRoot = path.join(workspaceRoot, "capability", "cards");
    const artifactsRoot = path.join(workspaceRoot, ".runtime", "capability-eval");
    await mkdir(cardsRoot, { recursive: true });
    await writeFile(path.join(cardsRoot, "e2e-card.json"), `${JSON.stringify(e2eCard, null, 2)}\n`, "utf8");

    const adapter: CapabilityEvalAdapter = {
      getWorkspaceRoot: () => workspaceRoot,
      execute: async (card) => {
        const hasClarification = card.required_context.some(
          (entry) =>
            entry.source === "inline" &&
            typeof entry.value === "string" &&
            entry.value.includes("Deterministic clarification")
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
              text: hasClarification ? "clarification-token" : "missing token"
            },
            confidence: hasClarification ? 1 : 0.2,
            reasoning_summary: hasClarification ? "had context" : "missing context",
            missing_information: hasClarification ? [] : ["Need deterministic clarification context"],
            safety_flags: [],
            artifacts: {}
          },
          awarenessAnswer: null
        };
      },
      close: async () => {}
    };

    const options: CapabilityRunnerOptions = {
      cardsRoot,
      artifactsRoot,
      workspaceRoot,
      mode: "sandbox-apply",
      dryRun: false,
      proposalOnly: false,
      autoRemediate: true,
      rerunAfterRemediation: true
    };

    try {
      const summary = await runCapabilityEval({
        adapter,
        options,
        runAllEnabled: true
      });
      expect(summary.totals.total).toBe(1);
      expect(summary.cardResults[0].gap?.primary_gap).toBe("ambiguous-prompt-insufficient-context");
      expect(summary.cardResults[0].remediation?.remediation_type).toBe("test-card-clarification");
      expect(summary.cardResults[0].sandbox?.applied).toBe(true);
      expect(summary.cardResults[0].sandbox?.rerunResult?.passed).toBe(true);
      expect(summary.cardResults[0].status).toBe("passed");
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });
});
