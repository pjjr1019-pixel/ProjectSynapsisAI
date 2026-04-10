import {
  applyGovernedRemediationSandbox,
  type ApprovalToken,
  type GovernancePatchMode,
  type GovernedRemediationPlanInput
} from "@governance-execution";
import type {
  CapabilityPatchMode,
  CapabilityRemediationPlan,
  CapabilitySandboxResult,
  CapabilityVerifierResult
} from "../types";

const toGovernedMode = (mode: CapabilityPatchMode): GovernancePatchMode => mode;

const toGovernedRemediation = (
  plan: CapabilityRemediationPlan
): GovernedRemediationPlanInput => ({
  riskLevel: plan.risk_level,
  autoPatch: plan.auto_patch ?? null
});

export interface ApplyRemediationSandboxInput {
  mode: CapabilityPatchMode;
  autoRemediate: boolean;
  runId: string;
  cardId: string;
  cardFilePath: string;
  workspaceRoot: string;
  artifactsRoot: string;
  remediation: CapabilityRemediationPlan;
  approvedBy?: string;
  approvalToken?: ApprovalToken | null;
  rerunWithCardFile: (patchedCardPath: string) => Promise<CapabilityVerifierResult>;
}

export const applyRemediationSandbox = async (
  input: ApplyRemediationSandboxInput
): Promise<CapabilitySandboxResult> => {
  const governedResult = await applyGovernedRemediationSandbox<CapabilityVerifierResult>({
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
