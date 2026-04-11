import { randomUUID } from "node:crypto";
import { CAPABILITY_CARDS_ROOT } from "@capability-catalog";
import { loadCapabilityCards, findCardById } from "../cards";
import { loadCapabilityCardFromFile } from "../schema";
import { verifyCapabilityCard } from "../verifiers";
import { classifyCapabilityGap } from "../classifiers/gap-classifier";
import { planCapabilityRemediation } from "../remediation/planner";
import { applyRemediationSandbox } from "../approval/gate";
import { createArtifactRunRoot, createCardArtifactRoot, writeCardArtifacts, writeRunSummaryArtifacts } from "../artifacts/store";
const toRunId = () => {
    const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "-");
    return `${timestamp}-${randomUUID().slice(0, 8)}`;
};
const failureVerifier = (reason) => ({
    passed: false,
    score: 0,
    reasons: [reason],
    evidence: [],
    observed_output: null,
    expected_output_summary: "Execution should produce verifiable structured output."
});
const executionFromError = (card, error) => ({
    request: {
        prompt: card.prompt,
        systemPrompt: "",
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
        allowedTools: card.allowed_tools,
        forbiddenTools: card.forbidden_tools,
        cardId: card.id,
        approvalTokenProvided: false,
        approvedBy: null
    },
    rawResponseText: "",
    output: {
        interpreted_task: card.prompt,
        plan: [],
        selected_tools_or_workflows: [],
        answer_or_action: {
            mode: "answer",
            text: `Execution failed: ${error instanceof Error ? error.message : String(error)}`
        },
        confidence: 0,
        reasoning_summary: "Execution error before model response.",
        missing_information: [],
        safety_flags: ["execution-error"],
        artifacts: {
            execution_error: error instanceof Error ? error.message : String(error)
        }
    },
    awarenessAnswer: null
});
const executeWithRetries = async (adapter, card) => {
    const attempts = Math.max(1, card.retry_policy.maxAttempts);
    const delayMs = Math.max(0, card.retry_policy.retryDelayMs);
    let lastError = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await adapter.execute(card);
        }
        catch (error) {
            lastError = error;
            if (attempt < attempts && delayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }
    }
    throw lastError instanceof Error ? lastError : new Error("Unknown execution failure");
};
const resolveCardSelection = (cards, options) => {
    if (options.cardIds && options.cardIds.length > 0) {
        return options.cardIds
            .map((id) => findCardById(cards, id))
            .filter((entry) => Boolean(entry));
    }
    if (options.runAllEnabled) {
        return cards.filter((entry) => entry.card.enabled);
    }
    return cards.filter((entry) => entry.card.enabled);
};
const runPrerequisiteCheck = (card, completedStatus) => {
    if (!card.prerequisite_tests || card.prerequisite_tests.length === 0) {
        return null;
    }
    for (const dependency of card.prerequisite_tests) {
        const status = completedStatus.get(dependency);
        if (status !== "passed") {
            return `Prerequisite test "${dependency}" has not passed in this run.`;
        }
    }
    return null;
};
export const runCapabilityEval = async (input) => {
    const startedAt = new Date().toISOString();
    const runId = toRunId();
    const loadedCards = await loadCapabilityCards(input.options.cardsRoot);
    const selectedCards = resolveCardSelection(loadedCards, {
        cardIds: input.cardIds,
        runAllEnabled: input.runAllEnabled
    });
    const runRoot = await createArtifactRunRoot(input.options.artifactsRoot, runId);
    const cardResults = [];
    const cardStatus = new Map();
    for (const selected of selectedCards) {
        const cardStart = new Date().toISOString();
        const artifactDir = await createCardArtifactRoot(runRoot, selected.card.id);
        let execution = null;
        let verifier = null;
        let gap = null;
        let remediation = null;
        let sandbox = null;
        let status = "failed";
        const prerequisiteFailure = runPrerequisiteCheck(selected.card, cardStatus);
        if (prerequisiteFailure) {
            verifier = failureVerifier(prerequisiteFailure);
            status = "failed";
            await writeCardArtifacts({
                artifactDir,
                cardSnapshot: selected.card,
                execution,
                verifier,
                gap,
                remediation,
                sandbox,
                status
            });
            cardStatus.set(selected.card.id, status);
            cardResults.push({
                cardId: selected.card.id,
                status,
                startedAt: cardStart,
                completedAt: new Date().toISOString(),
                execution,
                verifier,
                gap,
                remediation,
                sandbox,
                artifactDir
            });
            continue;
        }
        try {
            execution = await executeWithRetries(input.adapter, selected.card);
        }
        catch (error) {
            execution = executionFromError(selected.card, error);
        }
        verifier = await verifyCapabilityCard({
            card: selected.card,
            execution,
            workspaceRoot: input.options.workspaceRoot
        });
        if (verifier.passed) {
            status = "passed";
        }
        else {
            status = "failed";
            gap = classifyCapabilityGap({
                card: selected.card,
                execution,
                verifier
            });
            remediation = planCapabilityRemediation({
                card: selected.card,
                cardFilePath: selected.filePath,
                gap,
                verifier,
                execution
            });
            if (!input.options.proposalOnly && !input.options.dryRun && input.options.rerunAfterRemediation) {
                sandbox = await applyRemediationSandbox({
                    mode: input.options.mode,
                    autoRemediate: input.options.autoRemediate,
                    runId,
                    cardId: selected.card.id,
                    cardFilePath: selected.filePath,
                    workspaceRoot: input.options.workspaceRoot,
                    artifactsRoot: input.options.artifactsRoot,
                    remediation,
                    approvedBy: input.options.approvedBy,
                    approvalToken: input.options.approvalToken,
                    rerunWithCardFile: async (patchedCardPath) => {
                        const patchedCard = await loadCapabilityCardFromFile(patchedCardPath);
                        const patchedExecution = await executeWithRetries(input.adapter, patchedCard);
                        return verifyCapabilityCard({
                            card: patchedCard,
                            execution: patchedExecution,
                            workspaceRoot: input.options.workspaceRoot
                        });
                    }
                });
                if (sandbox.rerunResult?.passed) {
                    status = "passed";
                }
            }
        }
        const completedAt = new Date().toISOString();
        await writeCardArtifacts({
            artifactDir,
            cardSnapshot: selected.card,
            execution,
            verifier,
            gap,
            remediation,
            sandbox,
            rerunVerifier: sandbox?.rerunResult ?? null,
            status
        });
        cardStatus.set(selected.card.id, status);
        cardResults.push({
            cardId: selected.card.id,
            status,
            startedAt: cardStart,
            completedAt,
            execution,
            verifier,
            gap,
            remediation,
            sandbox,
            artifactDir
        });
    }
    const completedAt = new Date().toISOString();
    const runSummary = {
        runId,
        startedAt,
        completedAt,
        mode: input.options.mode,
        dryRun: input.options.dryRun,
        totals: {
            total: cardResults.length,
            passed: cardResults.filter((entry) => entry.status === "passed").length,
            failed: cardResults.filter((entry) => entry.status === "failed").length
        },
        cardResults
    };
    await writeRunSummaryArtifacts(input.options.artifactsRoot, runSummary);
    return runSummary;
};
export const defaultRunnerOptions = (workspaceRoot) => ({
    cardsRoot: `${workspaceRoot}/${CAPABILITY_CARDS_ROOT}`,
    artifactsRoot: `${workspaceRoot}/.runtime/capability-eval`,
    workspaceRoot,
    mode: "proposal-only",
    dryRun: false,
    proposalOnly: true,
    autoRemediate: false,
    rerunAfterRemediation: true
});
