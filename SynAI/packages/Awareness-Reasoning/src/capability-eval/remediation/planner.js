import { CAPABILITY_CARDS_ROOT, CAPABILITY_RETRIEVAL_HINTS_PATH } from "@capability-catalog";
const summarizeVerifierReasons = (verifier) => verifier.reasons.length > 0 ? verifier.reasons.slice(0, 3).join(" | ") : "No explicit verifier reasons.";
const toRetrievalHintTerms = (input) => {
    const rawTerms = [
        input.card.category,
        ...input.card.tags,
        ...input.execution.output.missing_information,
        ...input.verifier.reasons
    ];
    return [...new Set(rawTerms
            .flatMap((entry) => entry.split(/[^a-zA-Z0-9]+/))
            .map((entry) => entry.trim().toLowerCase())
            .filter((entry) => entry.length >= 3)
            .slice(0, 16))];
};
export const planCapabilityRemediation = (input) => {
    const { card, cardFilePath, gap, verifier, execution } = input;
    const reasonSummary = summarizeVerifierReasons(verifier);
    switch (gap.primary_gap) {
        case "missing-knowledge":
            return {
                remediation_type: "knowledge-pack-update",
                rationale: `Expected knowledge was absent in output. Verifier evidence: ${reasonSummary}`,
                concrete_file_targets: [
                    "docs/architecture/",
                    `${CAPABILITY_CARDS_ROOT}/`,
                    "packages/Awareness-Reasoning/src/capability-eval/contract.ts"
                ],
                proposed_patch_summary: "Add canonical examples/snippets for this capability domain and strengthen prompt contract with explicit grounding hints.",
                risk_level: "medium",
                approval_requirement: "operator-approval",
                follow_up_tests_to_rerun: [card.id],
                auto_patch: null
            };
        case "missing-retrieval":
            {
                const retrievalTerms = toRetrievalHintTerms({
                    card,
                    execution,
                    verifier
                });
                return {
                    remediation_type: "retrieval-adjustment",
                    rationale: `Required evidence retrieval underperformed. Verifier evidence: ${reasonSummary}`,
                    concrete_file_targets: [
                        CAPABILITY_RETRIEVAL_HINTS_PATH,
                        "packages/Awareness-Reasoning/src/retrieval/workspace-index.ts",
                        cardFilePath
                    ],
                    proposed_patch_summary: "Adjust retrieval metadata/index hints and enrich card context requirements to force deterministic evidence availability.",
                    risk_level: "medium",
                    approval_requirement: "operator-approval",
                    follow_up_tests_to_rerun: [card.id],
                    auto_patch: {
                        kind: "retrieval-hint-merge",
                        target: CAPABILITY_RETRIEVAL_HINTS_PATH,
                        merge: {
                            cards: {
                                [card.id]: {
                                    queryAugments: retrievalTerms,
                                    preferredTags: card.tags,
                                    expectedSources: card.required_context.map((entry) => entry.source)
                                }
                            }
                        }
                    }
                };
            }
        case "missing-tool":
            return {
                remediation_type: "tool-exposure",
                rationale: `Required tool/workflow was not selectable. Verifier evidence: ${reasonSummary}`,
                concrete_file_targets: [
                    cardFilePath,
                    "packages/Awareness-Reasoning/src/capability-eval/adapter.ts"
                ],
                proposed_patch_summary: "Expose missing safe tool bindings and update card allowed_tools/tool-selection verifier expectations.",
                risk_level: "high",
                approval_requirement: "operator-approval",
                follow_up_tests_to_rerun: [card.id],
                auto_patch: null
            };
        case "missing-workflow-skill":
            return {
                remediation_type: "workflow-wrapper",
                rationale: `Task expected deterministic action flow but no robust workflow was produced. Verifier evidence: ${reasonSummary}`,
                concrete_file_targets: [
                    "packages/Awareness-Reasoning/src/capability-eval/adapter.ts",
                    "packages/Awareness-Reasoning/src/capability-eval/verifiers/index.ts"
                ],
                proposed_patch_summary: "Add workflow wrapper for action planning and bind explicit workflow/tool expectations in card verifier config.",
                risk_level: "medium",
                approval_requirement: "operator-approval",
                follow_up_tests_to_rerun: [card.id],
                auto_patch: null
            };
        case "bad-reasoning-planning":
            return {
                remediation_type: "prompt-or-planner-adjustment",
                rationale: `Planner decomposition/contract quality appears weak. Verifier evidence: ${reasonSummary}`,
                concrete_file_targets: [
                    "packages/Awareness-Reasoning/src/capability-eval/contract.ts",
                    cardFilePath
                ],
                proposed_patch_summary: "Tighten structured-output planner contract and optionally provide richer deterministic context in card definitions.",
                risk_level: "medium",
                approval_requirement: "operator-approval",
                follow_up_tests_to_rerun: [card.id],
                auto_patch: null
            };
        case "safety-governance-block": {
            const shouldRequireApproval = !card.approval_required;
            return {
                remediation_type: "safety-expectation-update",
                rationale: `Output was safety-blocked. For high-risk tasks this is expected unless approval is granted.`,
                concrete_file_targets: [cardFilePath],
                proposed_patch_summary: shouldRequireApproval
                    ? "Mark card as approval_required and keep refusal expectation in place when approval is absent."
                    : "Adjust verifier to treat refusal as expected behavior in non-approved runs.",
                risk_level: "low",
                approval_requirement: "none",
                follow_up_tests_to_rerun: [card.id],
                auto_patch: {
                    kind: "card-json-merge",
                    target: cardFilePath,
                    merge: shouldRequireApproval
                        ? {
                            approval_required: true,
                            verifier_type: "policy-refusal",
                            verifier_config: {
                                required_flags: ["approval-required"],
                                refusal_phrases: ["need approval", "cannot", "not safe"]
                            }
                        }
                        : {
                            verifier_type: "policy-refusal",
                            verifier_config: {
                                required_flags: execution.output.safety_flags,
                                refusal_phrases: ["need approval", "cannot", "not safe"]
                            }
                        }
                }
            };
        }
        case "ambiguous-prompt-insufficient-context": {
            const missingHints = execution.output.missing_information.length > 0
                ? execution.output.missing_information.slice(0, 2).join(" | ")
                : "Add explicit context constraints.";
            const clarificationId = `clarification-${card.id}`;
            const requiredContext = card.required_context.filter((entry) => entry.id !== clarificationId);
            return {
                remediation_type: "test-card-clarification",
                rationale: `Card prompt/context is under-specified for deterministic execution. ${missingHints}`,
                concrete_file_targets: [cardFilePath],
                proposed_patch_summary: "Add inline required_context clarification entry so the model has explicit constraints and missing information is reduced.",
                risk_level: "low",
                approval_requirement: "none",
                follow_up_tests_to_rerun: [card.id],
                auto_patch: {
                    kind: "card-json-merge",
                    target: cardFilePath,
                    merge: {
                        required_context: [
                            ...requiredContext,
                            {
                                id: clarificationId,
                                source: "inline",
                                value: `Deterministic clarification for ${card.id}: ${missingHints}`
                            }
                        ]
                    }
                }
            };
        }
        case "verifier-limitation":
            return {
                remediation_type: "verifier-improvement",
                rationale: `Verifier appears unreliable or misconfigured. Verifier evidence: ${reasonSummary}`,
                concrete_file_targets: [
                    cardFilePath,
                    "packages/Awareness-Reasoning/src/capability-eval/verifiers/index.ts"
                ],
                proposed_patch_summary: "Improve verifier constraints/hook reliability and rerun before changing model behavior.",
                risk_level: "low",
                approval_requirement: "none",
                follow_up_tests_to_rerun: [card.id],
                auto_patch: null
            };
        default:
            return {
                remediation_type: "prompt-or-planner-adjustment",
                rationale: "Fallback remediation route.",
                concrete_file_targets: [cardFilePath],
                proposed_patch_summary: "Inspect artifacts and tighten prompt/verifier contracts.",
                risk_level: "medium",
                approval_requirement: "operator-approval",
                follow_up_tests_to_rerun: [card.id],
                auto_patch: null
            };
    }
};
