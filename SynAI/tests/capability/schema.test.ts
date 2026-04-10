import { describe, expect, it } from "vitest";
import {
  normalizeCapabilityCard,
  parseCapabilityCard,
  validateCapabilityCard
} from "../../packages/Awareness-Reasoning/src/capability-eval/schema";

const validCard = {
  schema_version: "capability-test-card.v1",
  id: "windows.example",
  name: "Example",
  category: "windows",
  description: "Example card",
  prompt: "Do a thing",
  success_definition: "Contains thing",
  allowed_tools: ["tool.a"],
  forbidden_tools: ["tool.b"],
  required_context: [],
  optional_context: [],
  verifier_type: "substring-regex",
  verifier_config: {
    includes: ["thing"]
  },
  remediation_options: ["test-card-clarification"],
  risk_level: "low",
  approval_required: false,
  retry_policy: {
    maxAttempts: 1,
    retryDelayMs: 0
  },
  tags: ["example"],
  enabled: true,
  priority: 1
} as const;

describe("capability card schema", () => {
  it("normalizes and validates a valid card", () => {
    const normalized = normalizeCapabilityCard(validCard);
    const errors = validateCapabilityCard(normalized);
    expect(errors).toEqual([]);
    expect(parseCapabilityCard(validCard).id).toBe("windows.example");
  });

  it("rejects invalid cards with useful errors", () => {
    const invalid = {
      ...validCard,
      id: "",
      verifier_type: "unknown-verifier",
      retry_policy: {
        maxAttempts: 0,
        retryDelayMs: -5
      }
    };
    const errors = validateCapabilityCard(normalizeCapabilityCard(invalid));
    expect(errors.some((entry) => entry.includes("id must be a non-empty string"))).toBe(true);
    expect(errors.some((entry) => entry.includes("verifier_type must be one of"))).toBe(true);
  });
});
