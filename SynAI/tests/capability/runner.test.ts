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

const cardFixture: CapabilityTestCard = {
  schema_version: "capability-test-card.v1",
  id: "windows.runner-pass",
  name: "Runner Pass",
  category: "test",
  description: "runner",
  prompt: "Say pass-token",
  success_definition: "contains pass-token",
  allowed_tools: [],
  forbidden_tools: [],
  required_context: [],
  optional_context: [],
  verifier_type: "substring-regex",
  verifier_config: {
    includes: ["pass-token"]
  },
  remediation_options: [],
  risk_level: "low",
  approval_required: false,
  retry_policy: {
    maxAttempts: 1,
    retryDelayMs: 0
  },
  tags: [],
  enabled: true,
  priority: 1
};

describe("capability eval runner", () => {
  it("runs selected cards and produces summary counts", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "capability-runner-"));
    const cardsRoot = path.join(workspaceRoot, "packages", "Capability-Catalog", "cards");
    const artifactsRoot = path.join(workspaceRoot, ".runtime", "capability-eval");
    await mkdir(cardsRoot, { recursive: true });
    await writeFile(path.join(cardsRoot, "runner-pass.json"), `${JSON.stringify(cardFixture, null, 2)}\n`, "utf8");

    const adapter: CapabilityEvalAdapter = {
      getWorkspaceRoot: () => workspaceRoot,
      execute: async () => ({
        request: {
          prompt: "Say pass-token",
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
          cardId: "windows.runner-pass",
          approvalTokenProvided: false,
          approvedBy: null
        },
        rawResponseText: "{\"ok\":true}",
        output: {
          interpreted_task: "Say pass-token",
          plan: ["reply"],
          selected_tools_or_workflows: [],
          answer_or_action: {
            mode: "answer",
            text: "pass-token"
          },
          confidence: 1,
          reasoning_summary: "done",
          missing_information: [],
          safety_flags: [],
          artifacts: {}
        },
        awarenessAnswer: null
      }),
      close: async () => {}
    };

    const options: CapabilityRunnerOptions = {
      cardsRoot,
      artifactsRoot,
      workspaceRoot,
      mode: "proposal-only",
      dryRun: false,
      proposalOnly: true,
      autoRemediate: false,
      rerunAfterRemediation: true
    };

    try {
      const summary = await runCapabilityEval({
        adapter,
        options,
        runAllEnabled: true
      });
      expect(summary.totals.total).toBe(1);
      expect(summary.totals.passed).toBe(1);
      expect(summary.totals.failed).toBe(0);
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });
});
