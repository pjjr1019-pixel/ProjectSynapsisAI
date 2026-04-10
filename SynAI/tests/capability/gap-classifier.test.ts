import { describe, expect, it } from "vitest";
import { classifyCapabilityGap } from "../../packages/Awareness-Reasoning/src/capability-eval/classifiers/gap-classifier";
import type {
  CapabilityTestCard,
  CapabilityVerifierResult,
  LocalAiEvalExecutionResult
} from "../../packages/Awareness-Reasoning/src/capability-eval/types";

const baseCard: CapabilityTestCard = {
  schema_version: "capability-test-card.v1",
  id: "test.card",
  name: "Test",
  category: "test",
  description: "test",
  prompt: "prompt",
  success_definition: "success",
  allowed_tools: [],
  forbidden_tools: [],
  required_context: [],
  optional_context: [],
  verifier_type: "substring-regex",
  verifier_config: {},
  remediation_options: [],
  risk_level: "low",
  approval_required: false,
  retry_policy: { maxAttempts: 1, retryDelayMs: 0 },
  tags: [],
  enabled: true,
  priority: 1
};

const baseExecution: LocalAiEvalExecutionResult = {
  request: {
    prompt: "prompt",
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
    cardId: "test.card",
    approvalTokenProvided: false,
    approvedBy: null
  },
  rawResponseText: "{}",
  output: {
    interpreted_task: "task",
    plan: [],
    selected_tools_or_workflows: [],
    answer_or_action: {
      mode: "answer",
      text: "answer"
    },
    confidence: 0.2,
    reasoning_summary: "summary",
    missing_information: ["Need more context"],
    safety_flags: [],
    artifacts: {}
  },
  awarenessAnswer: null
};

const failVerifier: CapabilityVerifierResult = {
  passed: false,
  score: 0,
  reasons: ["Missing required phrase: cpu"],
  evidence: [],
  observed_output: null,
  expected_output_summary: "contains cpu"
};

describe("capability gap classifier", () => {
  it("classifies ambiguous prompt when model reports missing information and no required context", () => {
    const classification = classifyCapabilityGap({
      card: baseCard,
      execution: baseExecution,
      verifier: failVerifier
    });
    expect(classification.primary_gap).toBe("ambiguous-prompt-insufficient-context");
  });

  it("classifies safety-governance block for refusal with approval requirements", () => {
    const classification = classifyCapabilityGap({
      card: {
        ...baseCard,
        approval_required: true
      },
      execution: {
        ...baseExecution,
        output: {
          ...baseExecution.output,
          answer_or_action: {
            mode: "refusal",
            text: "Need approval before action."
          },
          safety_flags: ["approval-required"]
        }
      },
      verifier: {
        ...failVerifier,
        reasons: ["Expected refusal mode but model returned non-refusal output."]
      }
    });
    expect(classification.primary_gap).toBe("safety-governance-block");
  });
});
