import { describe, expect, it } from "vitest";
import { planCapabilityRemediation } from "../../packages/Awareness-Reasoning/src/capability-eval/remediation/planner";
import type {
  CapabilityGapClassification,
  CapabilityTestCard,
  CapabilityVerifierResult,
  LocalAiEvalExecutionResult
} from "../../packages/Awareness-Reasoning/src/capability-eval/types";

const card: CapabilityTestCard = {
  schema_version: "capability-test-card.v1",
  id: "windows.test",
  name: "Windows Test",
  category: "windows",
  description: "desc",
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

const verifier: CapabilityVerifierResult = {
  passed: false,
  score: 0,
  reasons: ["Missing required phrase: cpu"],
  evidence: [],
  observed_output: null,
  expected_output_summary: "contains cpu"
};

const execution: LocalAiEvalExecutionResult = {
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
    cardId: "windows.test",
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
      text: "text"
    },
    confidence: 0.1,
    reasoning_summary: "summary",
    missing_information: ["Need process snapshot"],
    safety_flags: [],
    artifacts: {}
  },
  awarenessAnswer: null
};

describe("remediation planner", () => {
  it("routes ambiguous prompt gap to low-risk test-card clarification", () => {
    const gap: CapabilityGapClassification = {
      primary_gap: "ambiguous-prompt-insufficient-context",
      secondary_gaps: [],
      why_this_gap_was_chosen: "missing context",
      confidence: 0.9,
      recommended_next_actions: []
    };
    const plan = planCapabilityRemediation({
      card,
      cardFilePath: "packages/Capability-Catalog/cards/windows/test.json",
      gap,
      verifier,
      execution
    });
    expect(plan.remediation_type).toBe("test-card-clarification");
    expect(plan.risk_level).toBe("low");
    expect(plan.auto_patch?.kind).toBe("card-json-merge");
  });

  it("routes missing tool gap to high-risk tool exposure plan", () => {
    const gap: CapabilityGapClassification = {
      primary_gap: "missing-tool",
      secondary_gaps: [],
      why_this_gap_was_chosen: "missing tool",
      confidence: 0.8,
      recommended_next_actions: []
    };
    const plan = planCapabilityRemediation({
      card,
      cardFilePath: "packages/Capability-Catalog/cards/windows/test.json",
      gap,
      verifier,
      execution
    });
    expect(plan.remediation_type).toBe("tool-exposure");
    expect(plan.risk_level).toBe("high");
    expect(plan.auto_patch).toBeNull();
  });

  it("routes missing retrieval gap to retrieval hint auto patch", () => {
    const gap: CapabilityGapClassification = {
      primary_gap: "missing-retrieval",
      secondary_gaps: [],
      why_this_gap_was_chosen: "retrieval missing",
      confidence: 0.85,
      recommended_next_actions: []
    };
    const plan = planCapabilityRemediation({
      card,
      cardFilePath: "packages/Capability-Catalog/cards/windows/test.json",
      gap,
      verifier,
      execution
    });
    expect(plan.remediation_type).toBe("retrieval-adjustment");
    expect(plan.auto_patch?.kind).toBe("retrieval-hint-merge");
    expect(plan.auto_patch?.target).toBe("packages/Capability-Catalog/retrieval/index-hints.json");
  });
});
