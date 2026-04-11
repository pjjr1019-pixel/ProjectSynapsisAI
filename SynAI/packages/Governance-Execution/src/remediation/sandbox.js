import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { createGovernanceCommandBus } from "../commands/bus";
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const mergeRecords = (base, patch) => {
    const output = { ...base };
    for (const [key, value] of Object.entries(patch)) {
        if (isRecord(value) && isRecord(output[key])) {
            output[key] = mergeRecords(output[key], value);
            continue;
        }
        output[key] = value;
    }
    return output;
};
const summarizeJsonDiff = (beforeRaw, afterRaw) => {
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
const maxRisk = (left, right) => {
    const weights = {
        low: 1,
        medium: 2,
        high: 3,
        critical: 4
    };
    return weights[left] >= weights[right] ? left : right;
};
const emptyResult = (sandboxRoot, diffSummary, governanceAuditPath) => ({
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
const toAbsolutePath = (workspaceRoot, target) => path.isAbsolute(target) ? target : path.join(workspaceRoot, target);
const toCommandPath = (targetPath) => targetPath.replace(/\\/g, "/");
const supportsAutoPatch = (mode, autoRemediate, remediation) => mode !== "proposal-only" &&
    autoRemediate &&
    Boolean(remediation.autoPatch) &&
    (remediation.autoPatch?.kind === "card-json-merge" ||
        remediation.autoPatch?.kind === "retrieval-hint-merge");
const writeApprovalAuditRecord = async (input) => {
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
export const createGovernedPromotionHashInput = (cardId, targetRelativePath) => ({
    commandName: `capability.promote.${cardId}`,
    command: `promote ${toCommandPath(targetRelativePath)}`,
    riskClass: "high",
    destructive: true
});
export const applyGovernedRemediationSandbox = async (input) => {
    const sandboxRoot = path.join(input.artifactsRoot, "sandboxes", `${input.runId}-${input.cardId}`);
    const governanceAuditPath = path.join(input.artifactsRoot, "governance", `${input.runId}-${input.cardId}.commands.jsonl`);
    await mkdir(sandboxRoot, { recursive: true });
    if (!supportsAutoPatch(input.mode, input.autoRemediate, input.remediation)) {
        return emptyResult(sandboxRoot, "Auto remediation disabled or unsupported patch kind for this mode.", governanceAuditPath);
    }
    const patch = input.remediation.autoPatch;
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
            const beforeJson = JSON.parse(beforeRaw);
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
        return emptyResult(sandboxRoot, applyResult?.summary ?? "Failed to apply sandbox patch through command bus.", governanceAuditPath);
    }
    const applyOutput = isRecord(applyResult.output) ? applyResult.output : {};
    const beforeRaw = typeof applyOutput.before === "string" ? applyOutput.before : "";
    const afterRaw = typeof applyOutput.after === "string" ? applyOutput.after : "";
    const diffSummary = summarizeJsonDiff(beforeRaw, afterRaw);
    const rerunCardPath = patch.kind === "card-json-merge" &&
        path.resolve(targetAbsolute).toLowerCase() === path.resolve(input.cardFilePath).toLowerCase()
        ? sandboxTargetPath
        : input.cardFilePath;
    const rerunResult = await input.rerunWithCardFile(rerunCardPath).catch(() => null);
    const rerunPassed = input.didRerunPass(rerunResult);
    let promoted = false;
    let promotionSummary = null;
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
        }
        else {
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
