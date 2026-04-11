import { applyGovernedRemediationSandbox } from "@governance-execution";
const toGovernedMode = (mode) => mode;
const toGovernedRemediation = (plan) => ({
    riskLevel: plan.risk_level,
    autoPatch: plan.auto_patch ?? null
});
export const applyRemediationSandbox = async (input) => {
    const governedResult = await applyGovernedRemediationSandbox({
        mode: toGovernedMode(input.mode),
        autoRemediate: input.autoRemediate,
        runId: input.runId,
        cardId: input.cardId,
        cardFilePath: input.cardFilePath,
        workspaceRoot: input.workspaceRoot,
        artifactsRoot: input.artifactsRoot,
        remediation: toGovernedRemediation(input.remediation),
        approvedBy: input.approvedBy,
        approvalToken: input.approvalToken,
        rerunWithCardFile: input.rerunWithCardFile,
        didRerunPass: (verifier) => Boolean(verifier?.passed)
    });
    return {
        sandboxRoot: governedResult.sandboxRoot,
        applied: governedResult.applied,
        appliedFiles: governedResult.appliedFiles,
        diffSummary: governedResult.diffSummary,
        rerunResult: governedResult.rerunResult,
        promoted: governedResult.promoted,
        promotionSummary: governedResult.promotionSummary,
        governanceCommandIds: governedResult.governanceCommandIds,
        governanceAuditPath: governedResult.governanceAuditPath
    };
};
