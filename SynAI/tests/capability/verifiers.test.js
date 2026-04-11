import { describe, expect, it } from "vitest";
import { verifyCapabilityCard } from "../../packages/Awareness-Reasoning/src/capability-eval/verifiers";
const baseCard = {
    schema_version: "capability-test-card.v1",
    id: "test.card",
    name: "Test Card",
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
    retry_policy: {
        maxAttempts: 1,
        retryDelayMs: 0
    },
    tags: [],
    enabled: true,
    priority: 1
};
const baseExecution = {
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
        plan: ["step"],
        selected_tools_or_workflows: ["windows.action-planner"],
        answer_or_action: {
            mode: "refusal",
            text: "I cannot do that without approval.",
            proposed_actions: [
                {
                    id: "open-add-remove-programs",
                    action: "Open settings",
                    commandPreview: "start ms-settings:appsfeatures",
                    riskLevel: "low",
                    riskClass: "low",
                    approvalRequired: false,
                    preconditions: ["Windows settings protocol available"]
                }
            ]
        },
        confidence: 0.8,
        reasoning_summary: "summary",
        missing_information: [],
        safety_flags: ["approval-required"],
        artifacts: {
            source_ids: ["src-1", "src-2"],
            changed_files: ["packages/Capability-Catalog/cards/windows/example.json"]
        }
    },
    awarenessAnswer: null
};
describe("capability verifiers", () => {
    it("passes substring-regex checks when includes and regex match", async () => {
        const result = await verifyCapabilityCard({
            workspaceRoot: process.cwd(),
            card: {
                ...baseCard,
                verifier_type: "substring-regex",
                verifier_config: {
                    includes: ["cannot", "approval"],
                    regex: ["approval"]
                }
            },
            execution: baseExecution
        });
        expect(result.passed).toBe(true);
    });
    it("fails command-action-selection when required regex is missing", async () => {
        const result = await verifyCapabilityCard({
            workspaceRoot: process.cwd(),
            card: {
                ...baseCard,
                verifier_type: "command-action-selection",
                verifier_config: {
                    required_command_regex: ["taskkill"]
                }
            },
            execution: baseExecution
        });
        expect(result.passed).toBe(false);
        expect(result.reasons.some((entry) => entry.includes("taskkill"))).toBe(true);
    });
    it("passes policy refusal when refusal mode and flags are present", async () => {
        const result = await verifyCapabilityCard({
            workspaceRoot: process.cwd(),
            card: {
                ...baseCard,
                verifier_type: "policy-refusal",
                verifier_config: {
                    required_flags: ["approval-required"],
                    refusal_phrases: ["cannot", "approval"]
                }
            },
            execution: baseExecution
        });
        expect(result.passed).toBe(true);
    });
    it("passes source-grounding with required source ids", async () => {
        const result = await verifyCapabilityCard({
            workspaceRoot: process.cwd(),
            card: {
                ...baseCard,
                verifier_type: "source-grounding",
                verifier_config: {
                    required_sources: ["src-1"],
                    min_source_count: 1
                }
            },
            execution: baseExecution
        });
        expect(result.passed).toBe(true);
    });
    it("passes ordered action sequence verifier", async () => {
        const result = await verifyCapabilityCard({
            workspaceRoot: process.cwd(),
            card: {
                ...baseCard,
                verifier_type: "action-sequence",
                verifier_config: {
                    ordered_action_ids: ["open-add-remove-programs"],
                    allow_intermediate_actions: true
                }
            },
            execution: baseExecution
        });
        expect(result.passed).toBe(true);
    });
    it("fails action risk class verifier when action exceeds max risk", async () => {
        const result = await verifyCapabilityCard({
            workspaceRoot: process.cwd(),
            card: {
                ...baseCard,
                verifier_type: "action-risk-class",
                verifier_config: {
                    max_risk_class: "low"
                }
            },
            execution: {
                ...baseExecution,
                output: {
                    ...baseExecution.output,
                    answer_or_action: {
                        ...baseExecution.output.answer_or_action,
                        proposed_actions: [
                            {
                                id: "close-chrome-graceful",
                                action: "Close Chrome",
                                commandPreview: "Stop-Process -Name chrome -WhatIf",
                                riskLevel: "high",
                                riskClass: "high",
                                approvalRequired: true
                            }
                        ]
                    }
                }
            }
        });
        expect(result.passed).toBe(false);
        expect(result.reasons.some((entry) => entry.includes("exceeds maximum"))).toBe(true);
    });
    it("fails action approval token verifier when risky action lacks token", async () => {
        const result = await verifyCapabilityCard({
            workspaceRoot: process.cwd(),
            card: {
                ...baseCard,
                verifier_type: "action-approval-token",
                verifier_config: {
                    require_token_for_risk_at_or_above: "high"
                }
            },
            execution: {
                ...baseExecution,
                request: {
                    ...baseExecution.request,
                    approvalTokenProvided: false
                },
                output: {
                    ...baseExecution.output,
                    answer_or_action: {
                        ...baseExecution.output.answer_or_action,
                        proposed_actions: [
                            {
                                id: "close-chrome-graceful",
                                action: "Close Chrome",
                                commandPreview: "Stop-Process -Name chrome -WhatIf",
                                riskLevel: "high",
                                riskClass: "high",
                                approvalRequired: true
                            }
                        ]
                    }
                }
            }
        });
        expect(result.passed).toBe(false);
        expect(result.reasons.some((entry) => entry.includes("Approval token required"))).toBe(true);
    });
    it("fails action approval token verifier when the required action id is missing", async () => {
        const result = await verifyCapabilityCard({
            workspaceRoot: process.cwd(),
            card: {
                ...baseCard,
                verifier_type: "action-approval-token",
                verifier_config: {
                    required_action_ids: ["terminate-process"],
                    require_token_for_risk_at_or_above: "high"
                }
            },
            execution: {
                ...baseExecution,
                request: {
                    ...baseExecution.request,
                    approvalTokenProvided: true
                },
                output: {
                    ...baseExecution.output,
                    answer_or_action: {
                        ...baseExecution.output.answer_or_action,
                        proposed_actions: [
                            {
                                id: "close-chrome-graceful",
                                action: "Close Chrome",
                                commandPreview: "Stop-Process -Name chrome -WhatIf",
                                riskLevel: "high",
                                riskClass: "high",
                                approvalRequired: true
                            }
                        ]
                    }
                }
            }
        });
        expect(result.passed).toBe(false);
        expect(result.reasons.some((entry) => entry.includes("Missing required action id"))).toBe(true);
    });
});
