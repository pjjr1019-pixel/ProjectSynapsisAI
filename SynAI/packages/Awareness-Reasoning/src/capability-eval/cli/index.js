import * as path from "node:path";
import { createGovernedPromotionHashInput, hashGovernanceCommand, issueApprovalToken, parseApprovalTokenInput } from "@governance-execution";
import { mineGovernedHistory } from "@awareness/governance-history/miner";
import { createCapabilityEvalAdapter, resolveDefaultCapabilityRoots } from "../adapter";
import { readLatestFailedCardIds } from "../artifacts/store";
import { runCapabilityEval } from "../runners/eval-runner";
const usage = () => [
    "Capability Eval CLI",
    "",
    "Commands:",
    "  run [--card-id <id>] [--all] [--mode proposal-only|sandbox-apply|governed-promotion] [--dry-run] [--auto-remediate]",
    "  rerun-failed [--mode ...] [--auto-remediate]",
    "  issue-token --command-hash <sha256> --approved-by <name> [--ttl-ms <ms>]",
    "  promotion-hash --card-id <id> --target-path <relative-path>",
    "  mine-history [--max-findings <n>] [--json]",
    "",
    "Flags:",
    "  --card-id <id>           Run a specific card (repeatable)",
    "  --all                    Run all enabled cards",
    "  --mode <mode>            proposal-only (default), sandbox-apply, governed-promotion",
    "  --dry-run                Execute + verify only; skip remediation apply",
    "  --auto-remediate         Allow auto remediation in eligible modes",
    "  --approved-by <name>     Approver identity for governed promotion",
    "  --approval-token <json>  Signed approval token payload (raw JSON or base64:<payload>)",
    "  --command-hash <sha256>  Command hash for issue-token",
    "  --target-path <path>     Card target path for promotion-hash",
    "  --ttl-ms <number>        Token TTL for issue-token (default 600000)",
    "  --max-findings <number>  Max history findings to mine (default 25)",
    "  --json                   Print machine-readable JSON summary",
    "  --cards-root <path>      Override capability cards path",
    "  --artifacts-root <path>  Override artifacts output path",
    "  --workspace-root <path>  Override workspace root",
    "  --help                   Show this help"
].join("\n");
const nextArg = (args, index, flag) => {
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
        throw new Error(`${flag} requires a value.`);
    }
    return value;
};
const parseMode = (value) => {
    if (value === "proposal-only" || value === "sandbox-apply" || value === "governed-promotion") {
        return value;
    }
    throw new Error(`Unsupported mode "${value}". Use proposal-only, sandbox-apply, or governed-promotion.`);
};
export const parseCapabilityCliArgs = (argv, cwd = process.cwd()) => {
    const args = [...argv];
    if (args.includes("--help") || args.includes("-h")) {
        throw new Error(usage());
    }
    const commandToken = args[0];
    const command = commandToken === "rerun-failed"
        ? "rerun-failed"
        : commandToken === "issue-token"
            ? "issue-token"
            : commandToken === "promotion-hash"
                ? "promotion-hash"
                : commandToken === "mine-history"
                    ? "mine-history"
                    : "run";
    const cardIds = [];
    let runAllEnabled = false;
    let mode = "proposal-only";
    let dryRun = false;
    let autoRemediate = false;
    let approvedBy;
    let approvalToken;
    let commandHash;
    let targetPath;
    let ttlMs;
    let maxFindings;
    let json = false;
    let cardsRoot;
    let artifactsRoot;
    let workspaceRoot = cwd;
    for (let index = 1; index < args.length; index += 1) {
        const token = args[index];
        switch (token) {
            case "--card-id":
                cardIds.push(nextArg(args, index, token));
                index += 1;
                break;
            case "--all":
                runAllEnabled = true;
                break;
            case "--mode":
                mode = parseMode(nextArg(args, index, token));
                index += 1;
                break;
            case "--dry-run":
                dryRun = true;
                break;
            case "--auto-remediate":
                autoRemediate = true;
                break;
            case "--approved-by":
                approvedBy = nextArg(args, index, token);
                index += 1;
                break;
            case "--approval-token":
                approvalToken = nextArg(args, index, token);
                index += 1;
                break;
            case "--command-hash":
                commandHash = nextArg(args, index, token);
                index += 1;
                break;
            case "--target-path":
                targetPath = nextArg(args, index, token);
                index += 1;
                break;
            case "--ttl-ms": {
                const value = Number.parseInt(nextArg(args, index, token), 10);
                if (!Number.isFinite(value) || value <= 0) {
                    throw new Error("--ttl-ms must be a positive integer.");
                }
                ttlMs = value;
                index += 1;
                break;
            }
            case "--max-findings": {
                const value = Number.parseInt(nextArg(args, index, token), 10);
                if (!Number.isFinite(value) || value <= 0) {
                    throw new Error("--max-findings must be a positive integer.");
                }
                maxFindings = value;
                index += 1;
                break;
            }
            case "--json":
                json = true;
                break;
            case "--cards-root":
                cardsRoot = path.resolve(workspaceRoot, nextArg(args, index, token));
                index += 1;
                break;
            case "--artifacts-root":
                artifactsRoot = path.resolve(workspaceRoot, nextArg(args, index, token));
                index += 1;
                break;
            case "--workspace-root":
                workspaceRoot = path.resolve(nextArg(args, index, token));
                index += 1;
                break;
            default:
                if (!token.startsWith("--") && commandToken !== token) {
                    cardIds.push(token);
                }
                else if (token.startsWith("--")) {
                    throw new Error(`Unknown flag: ${token}`);
                }
                break;
        }
    }
    return {
        command,
        cardIds,
        runAllEnabled,
        mode,
        dryRun,
        autoRemediate,
        approvedBy,
        approvalToken,
        commandHash,
        targetPath,
        ttlMs,
        maxFindings,
        json,
        cardsRoot,
        artifactsRoot,
        workspaceRoot
    };
};
const toRunnerOptions = (args) => {
    const roots = resolveDefaultCapabilityRoots(args.workspaceRoot);
    return {
        cardsRoot: args.cardsRoot ?? roots.cardsRoot,
        artifactsRoot: args.artifactsRoot ?? roots.artifactsRoot,
        workspaceRoot: args.workspaceRoot,
        mode: args.mode,
        dryRun: args.dryRun,
        proposalOnly: args.mode === "proposal-only",
        autoRemediate: args.autoRemediate,
        approvedBy: args.approvedBy,
        approvalToken: args.approvalToken ? parseApprovalTokenInput(args.approvalToken) : null,
        rerunAfterRemediation: true
    };
};
const printSummary = (summary) => {
    const lines = [
        `Run ID: ${summary.runId}`,
        `Mode: ${summary.mode}${summary.dryRun ? " (dry-run)" : ""}`,
        `Totals: ${summary.totals.passed} passed / ${summary.totals.failed} failed / ${summary.totals.total} total`,
        ...summary.cardResults.map((card) => `- ${card.status.toUpperCase()} ${card.cardId} | artifact: ${card.artifactDir}${card.sandbox?.rerunResult ? ` | rerun: ${card.sandbox.rerunResult.passed ? "pass" : "fail"}` : ""}`)
    ];
    // eslint-disable-next-line no-console
    console.log(lines.join("\n"));
};
export const runCapabilityCli = async (argv) => {
    let useJson = false;
    try {
        const parsed = parseCapabilityCliArgs(argv);
        useJson = parsed.json;
        if (parsed.command === "mine-history") {
            const workspaceRoot = parsed.workspaceRoot;
            const artifactsRoot = parsed.artifactsRoot ?? path.join(workspaceRoot, ".runtime");
            const result = await mineGovernedHistory({
                artifactsRoot,
                maxFindings: parsed.maxFindings ?? 25
            });
            if (parsed.json) {
                // eslint-disable-next-line no-console
                console.log(JSON.stringify({
                    status: "ok",
                    workspaceRoot,
                    artifactsRoot: path.join(artifactsRoot, "governance-history"),
                    findings: result.findings,
                    cardDrafts: result.groupedCardDrafts,
                    sourceConversationIds: result.sourceConversationIds
                }, null, 2));
            }
            else {
                // eslint-disable-next-line no-console
                console.log([
                    `Mined ${result.findings.length} governed history findings.`,
                    `Artifacts: ${path.join(artifactsRoot, "governance-history")}`,
                    ...result.findings.map((finding) => `- ${finding.recovered_intent} | repeated ${finding.repeated_request_count} | ${finding.suggested_gap}`)
                ].join("\n"));
            }
            return 0;
        }
        if (parsed.command === "promotion-hash") {
            if (parsed.cardIds.length === 0) {
                throw new Error("promotion-hash requires --card-id.");
            }
            if (!parsed.targetPath) {
                throw new Error("promotion-hash requires --target-path.");
            }
            const hash = hashGovernanceCommand(createGovernedPromotionHashInput(parsed.cardIds[0], parsed.targetPath));
            if (parsed.json) {
                // eslint-disable-next-line no-console
                console.log(JSON.stringify({
                    cardId: parsed.cardIds[0],
                    targetPath: parsed.targetPath,
                    commandHash: hash
                }, null, 2));
            }
            else {
                // eslint-disable-next-line no-console
                console.log(hash);
            }
            return 0;
        }
        if (parsed.command === "issue-token") {
            if (!parsed.commandHash) {
                throw new Error("issue-token requires --command-hash.");
            }
            if (!parsed.approvedBy) {
                throw new Error("issue-token requires --approved-by.");
            }
            const token = issueApprovalToken(parsed.commandHash, parsed.approvedBy, parsed.ttlMs);
            if (parsed.json) {
                // eslint-disable-next-line no-console
                console.log(JSON.stringify(token, null, 2));
            }
            else {
                // eslint-disable-next-line no-console
                console.log(`Token issued for ${parsed.commandHash}:\n${JSON.stringify(token, null, 2)}`);
            }
            return 0;
        }
        const options = toRunnerOptions(parsed);
        const adapter = createCapabilityEvalAdapter({
            workspaceRoot: parsed.workspaceRoot,
            approvedBy: parsed.approvedBy,
            approvalToken: options.approvalToken ?? null
        });
        try {
            let cardIds = parsed.cardIds;
            let runAllEnabled = parsed.runAllEnabled;
            if (parsed.command === "rerun-failed") {
                const failed = await readLatestFailedCardIds(options.artifactsRoot);
                cardIds = failed?.cardIds ?? [];
                runAllEnabled = false;
                if (cardIds.length === 0) {
                    if (parsed.json) {
                        // eslint-disable-next-line no-console
                        console.log(JSON.stringify({
                            status: "ok",
                            message: "No failed cards found in latest summary.",
                            cardIds: []
                        }));
                    }
                    else {
                        // eslint-disable-next-line no-console
                        console.log("No failed cards found in latest summary.");
                    }
                    return 0;
                }
            }
            const summary = await runCapabilityEval({
                adapter,
                options,
                cardIds,
                runAllEnabled
            });
            if (parsed.json) {
                // eslint-disable-next-line no-console
                console.log(JSON.stringify(summary, null, 2));
            }
            else {
                printSummary(summary);
            }
            return summary.totals.failed > 0 ? 1 : 0;
        }
        finally {
            await adapter.close();
        }
    }
    catch (error) {
        if (useJson) {
            // eslint-disable-next-line no-console
            console.error(JSON.stringify({
                status: "error",
                error: error instanceof Error ? error.message : String(error)
            }));
        }
        else {
            // eslint-disable-next-line no-console
            console.error(error instanceof Error ? error.message : String(error));
        }
        return 1;
    }
};
export { usage as capabilityCliUsage };
