import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type { ApprovalToken, RiskClass } from "../contracts";
import { createGovernanceCommandBus } from "../commands/bus";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const mergeRecords = (
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> => {
  const output: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (isRecord(value) && isRecord(output[key])) {
      output[key] = mergeRecords(output[key] as Record<string, unknown>, value);
      continue;
    }
    output[key] = value;
  }
  return output;
};

const summarizeJsonDiff = (beforeRaw: string, afterRaw: string): string => {
  if (beforeRaw === afterRaw) {
    return "No textual diff.";
  }
  const beforeLines = beforeRaw.split(/\r?\n/);
  const afterLines = afterRaw.split(/\r?\n/);
  let changed = 0;
  const max = Math.max(beforeLines.length, afterLines.length);
  for (let index = 0; index < max; index += 1) {
    if ((beforeLines[index] ?? "") !== (afterLines[index] ?? "")) {
      changed += 1;
    }
  }
  return `Changed approximately ${changed} line(s).`;
};

const maxRisk = (left: RiskClass, right: RiskClass): RiskClass => {
  const weights: Record<RiskClass, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
  };
  return weights[left] >= weights[right] ? left : right;
};

export type GovernancePatchMode = "proposal-only" | "sandbox-apply" | "governed-promotion";

export type GovernancePatchInstruction =
  | {
      kind: "card-json-merge";
      target: string;
      merge: Record<string, unknown>;
    }
  | {
      kind: "retrieval-hint-merge";
      target: string;
      merge: Record<string, unknown>;
    };

export interface GovernedRemediationPlanInput {
  riskLevel: RiskClass;
  autoPatch?: GovernancePatchInstruction | null;
}

export interface GovernedRemediationSandboxResult<TVerifier> {
  sandboxRoot: string;
  applied: boolean;
  appliedFiles: string[];
  diffSummary: string;
  rerunResult: TVerifier | null;
  promoted: boolean;
  promotionSummary: string | null;
  governanceCommandIds: string[];
  governanceAuditPath: string | null;
}

export interface ApplyGovernedRemediationSandboxInput<TVerifier> {
  mode: GovernancePatchMode;
  autoRemediate: boolean;
  runId: string;
  cardId: string;
  cardFilePath: string;
  workspaceRoot: string;
  artifactsRoot: string;
  remediation: GovernedRemediationPlanInput;
  approvedBy?: string;
  approvalToken?: ApprovalToken | null;
  rerunWithCardFile: (cardPath: string) => Promise<TVerifier>;
  didRerunPass: (verifier: TVerifier | null) => boolean;
}

const emptyResult = <TVerifier>(
  sandboxRoot: string,
  diffSummary: string,
  governanceAuditPath: string | null
): GovernedRemediationSandboxResult<TVerifier> => ({
  sandboxRoot,
  applied: false,
  appliedFiles: [],
  diffSummary,
  rerunResult: null,
  promoted: false,
  promotionSummary: null,
  governanceCommandIds: [],
  governanceAuditPath
});

const toAbsolutePath = (workspaceRoot: string, target: string): string =>
  path.isAbsolute(target) ? target : path.join(workspaceRoot, target);

const toCommandPath = (targetPath: string): string => targetPath.replace(/\\/g, "/");

const supportsAutoPatch = (
  mode: GovernancePatchMode,
  autoRemediate: boolean,
  remediation: GovernedRemediationPlanInput
): boolean =>
  mode !== "proposal-only" &&
  autoRemediate &&
  Boolean(remediation.autoPatch) &&
  (remediation.autoPatch?.kind === "card-json-merge" ||
    remediation.autoPatch?.kind === "retrieval-hint-merge");

const writeApprovalAuditRecord = async (input: {
  artifactsRoot: string;
  runId: string;
  cardId: string;
  mode: GovernancePatchMode;
  promotionResult: { status: string; summary: string; commandHash?: string; commandId?: string } | null;
  approvedBy?: string;
  approvalToken?: ApprovalToken | null;
}): Promise<void> => {
  const approvalsDir = path.join(input.artifactsRoot, "approvals");
  await mkdir(approvalsDir, { recursive: true });
  const outputPath = path.join(approvalsDir, `${input.runId}-${input.cardId}.json`);
  const record = {
    mode: input.mode,
    approvedBy: input.approvedBy ?? null,
    approvalTokenId: input.approvalToken?.tokenId ?? null,
    promotionStatus: input.promotionResult?.status ?? "not-attempted",
    promotionSummary: input.promotionResult?.summary ?? null,
    commandHash: input.promotionResult?.commandHash ?? null,
    commandId: input.promotionResult?.commandId ?? null,
    writtenAt: new Date().toISOString()
  };
  await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
};

export const createGovernedPromotionHashInput = (cardId: string, targetRelativePath: string) => ({
  commandName: `capability.promote.${cardId}`,
  command: `promote ${toCommandPath(targetRelativePath)}`,
  riskClass: "high" as RiskClass,
  destructive: true
});

export const applyGovernedRemediationSandbox = async <TVerifier>(
  input: ApplyGovernedRemediationSandboxInput<TVerifier>
): Promise<GovernedRemediationSandboxResult<TVerifier>> => {
  const sandboxRoot = path.join(input.artifactsRoot, "sandboxes", `${input.runId}-${input.cardId}`);
  const governanceAuditPath = path.join(
    input.artifactsRoot,
    "governance",
    `${input.runId}-${input.cardId}.commands.jsonl`
  );
  await mkdir(sandboxRoot, { recursive: true });

  if (!supportsAutoPatch(input.mode, input.autoRemediate, input.remediation)) {
    return emptyResult(
      sandboxRoot,
      "Auto remediation disabled or unsupported patch kind for this mode.",
      governanceAuditPath
    );
  }

  const patch = input.remediation.autoPatch!;
  const targetAbsolute = toAbsolutePath(input.workspaceRoot, patch.target);
  const relativeTarget = path.relative(input.workspaceRoot, targetAbsolute);
  const relativeTargetForCommand = toCommandPath(relativeTarget);
  const sandboxTargetPath = path.join(sandboxRoot, relativeTarget);
  await mkdir(path.dirname(sandboxTargetPath), { recursive: true });

  const commandBus = createGovernanceCommandBus({
    auditLogPath: governanceAuditPath
  });

  const applyCommand = commandBus.enqueueGovernanceCommand({
    commandName: `capability.sandbox.apply.${input.cardId}`,
    command: `apply ${patch.kind} ${relativeTargetForCommand}`,
    riskClass: patch.kind === "retrieval-hint-merge" ? maxRisk("medium", input.remediation.riskLevel) : "low",
    destructive: false,
    approvedBy: input.approvedBy ?? null,
    handler: async () => {
      const beforeRaw = await readFile(targetAbsolute, "utf8").catch(() => "{}\n");
      const beforeJson = JSON.parse(beforeRaw) as Record<string, unknown>;
      const merged = mergeRecords(beforeJson, patch.merge);
      const afterRaw = `${JSON.stringify(merged, null, 2)}\n`;
      await writeFile(sandboxTargetPath, afterRaw, "utf8");
      return {
        simulated: false,
        output: {
          before: beforeRaw,
          after: afterRaw
        },
        summary: summarizeJsonDiff(beforeRaw, afterRaw)
      };
    }
  });
  const applyResult = await commandBus.processNextGovernanceCommand();

  if (!applyResult || (applyResult.status !== "executed" && applyResult.status !== "simulated")) {
    return emptyResult(
      sandboxRoot,
      applyResult?.summary ?? "Failed to apply sandbox patch through command bus.",
      governanceAuditPath
    );
  }

  const applyOutput = isRecord(applyResult.output) ? applyResult.output : {};
  const beforeRaw = typeof applyOutput.before === "string" ? applyOutput.before : "";
  const afterRaw = typeof applyOutput.after === "string" ? applyOutput.after : "";
  const diffSummary = summarizeJsonDiff(beforeRaw, afterRaw);

  const rerunCardPath =
    patch.kind === "card-json-merge" &&
    path.resolve(targetAbsolute).toLowerCase() === path.resolve(input.cardFilePath).toLowerCase()
      ? sandboxTargetPath
      : input.cardFilePath;
  const rerunResult = await input.rerunWithCardFile(rerunCardPath).catch(() => null);
  const rerunPassed = input.didRerunPass(rerunResult);

  let promoted = false;
  let promotionSummary: string | null = null;
  const governanceCommandIds = [applyCommand.commandId];

  if (input.mode === "governed-promotion") {
    if (!rerunPassed) {
      promotionSummary = "Promotion blocked: sandbox rerun did not pass required checks.";
      await writeApprovalAuditRecord({
        artifactsRoot: input.artifactsRoot,
        runId: input.runId,
        cardId: input.cardId,
        mode: input.mode,
        promotionResult: {
          status: "blocked",
          summary: promotionSummary
        },
        approvedBy: input.approvedBy,
        approvalToken: input.approvalToken
      });
    } else {
      const promoteCommand = commandBus.enqueueGovernanceCommand({
        commandName: `capability.promote.${input.cardId}`,
        command: `promote ${relativeTargetForCommand}`,
        riskClass: maxRisk(input.remediation.riskLevel, "high"),
        destructive: true,
        approvedBy: input.approvedBy ?? null,
        approvalToken: input.approvalToken ?? null,
        handler: async () => {
          await copyFile(sandboxTargetPath, targetAbsolute);
          return {
            simulated: false,
            summary: `Promoted sandbox patch to ${targetAbsolute}`,
            output: {
              target: targetAbsolute
            }
          };
        }
      });
      governanceCommandIds.push(promoteCommand.commandId);
      const promoteResult = await commandBus.processNextGovernanceCommand();
      promoted = promoteResult?.status === "executed";
      promotionSummary = promoteResult?.summary ?? "Promotion command did not run.";
      await writeApprovalAuditRecord({
        artifactsRoot: input.artifactsRoot,
        runId: input.runId,
        cardId: input.cardId,
        mode: input.mode,
        promotionResult: promoteResult
          ? {
              status: promoteResult.status,
              summary: promoteResult.summary,
              commandHash: promoteResult.commandHash,
              commandId: promoteResult.commandId
            }
          : null,
        approvedBy: input.approvedBy,
        approvalToken: input.approvalToken
      });
    }
  }

  return {
    sandboxRoot,
    applied: true,
    appliedFiles: [sandboxTargetPath],
    diffSummary,
    rerunResult,
    promoted,
    promotionSummary,
    governanceCommandIds,
    governanceAuditPath
  };
};
