import * as path from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createGovernanceApprovalQueueStore, queryGovernanceAuditEntries, } from "@governance-execution";
import { initializeOfficialKnowledge } from "@awareness";
import { loadRuntimeCapabilityRegistry, mineGovernedHistory, setRuntimeCapabilityPluginApproval, setRuntimeCapabilityPluginEnabled } from "@awareness";
import { listWindowsActionDefinitions } from "@governance-execution/execution/windows-action-catalog";
const parseArgs = (argv) => {
    let json = false;
    let workspaceRoot = process.cwd();
    let command = "dashboard";
    let commandSeen = false;
    const commandArgs = [];
    let approvedBy;
    for (let index = 0; index < argv.length; index += 1) {
        const entry = argv[index] ?? "";
        if (entry === "--json") {
            json = true;
            continue;
        }
        if (entry === "--workspace-root") {
            workspaceRoot = path.resolve(argv[index + 1] ?? workspaceRoot);
            index += 1;
            continue;
        }
        if (entry === "--approved-by") {
            const next = argv[index + 1];
            if (next && !next.startsWith("--")) {
                approvedBy = next;
                index += 1;
            }
            continue;
        }
        if (!commandSeen && !entry.startsWith("--")) {
            command = entry;
            commandSeen = true;
            continue;
        }
        commandArgs.push(entry);
    }
    return { json, workspaceRoot, command, args: commandArgs, approvedBy };
};
const governanceRuntimeRoot = (workspaceRoot) => path.join(workspaceRoot, ".runtime", "governance");
const officialKnowledgeRuntimeRoot = (workspaceRoot) => path.join(workspaceRoot, ".runtime", "awareness", "official-knowledge");
const governedHistoryBacklogPath = (workspaceRoot) => path.join(governanceRuntimeRoot(workspaceRoot), "governance-history", "latest-backlog.json");
const readJsonFile = async (filePath) => {
    const raw = await readFile(filePath, "utf8").catch(() => null);
    if (!raw) {
        return null;
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
};
const print = (json, value) => {
    if (json) {
        console.log(JSON.stringify(value, null, 2));
        return;
    }
    for (const [key, entry] of Object.entries(value)) {
        if (Array.isArray(entry)) {
            console.log(`${key}:`);
            for (const item of entry) {
                if (typeof item === "object" && item !== null) {
                    console.log(`  - ${JSON.stringify(item)}`);
                }
                else {
                    console.log(`  - ${String(item)}`);
                }
            }
            continue;
        }
        if (typeof entry === "object" && entry !== null) {
            console.log(`${key}: ${JSON.stringify(entry, null, 2)}`);
            continue;
        }
        console.log(`${key}: ${String(entry)}`);
    }
};
const loadOfficialKnowledge = async (workspaceRoot) => {
    return await initializeOfficialKnowledge({
        runtimeRoot: officialKnowledgeRuntimeRoot(workspaceRoot),
        allowLiveFetch: true,
        backgroundRefresh: false
    });
};
export const runOperatorCli = async (argv = process.argv.slice(2)) => {
    const { json, workspaceRoot, command, args, approvedBy } = parseArgs(argv);
    const runtimeRoot = governanceRuntimeRoot(workspaceRoot);
    const approvalQueue = createGovernanceApprovalQueueStore(runtimeRoot);
    switch (command) {
        case "dashboard": {
            const [approvalQueueSnapshot, auditEntries, knowledgeState, runtimeCapabilityRegistry] = await Promise.all([
                approvalQueue.list(),
                queryGovernanceAuditEntries(runtimeRoot, { limit: 25 }),
                loadOfficialKnowledge(workspaceRoot),
                loadRuntimeCapabilityRegistry(runtimeRoot, workspaceRoot)
            ]);
            print(json, {
                command,
                workspaceRoot,
                runtimeRoot,
                approvalQueue: approvalQueueSnapshot,
                auditEntries,
                officialKnowledge: knowledgeState.getStatus(),
                sources: knowledgeState.listSources(),
                runtimeCapabilityRegistry,
                actions: listWindowsActionDefinitions().map((action) => ({
                    id: action.id,
                    title: action.title,
                    kind: action.kind,
                    scope: action.scope,
                    riskClass: action.riskClass,
                    approvalRequired: action.approvalRequired
                }))
            });
            knowledgeState.close();
            return 0;
        }
        case "approvals": {
            print(json, {
                command,
                workspaceRoot,
                approvalQueue: await approvalQueue.list()
            });
            return 0;
        }
        case "audit": {
            const auditEntries = await queryGovernanceAuditEntries(runtimeRoot, {
                commandNameIncludes: args[0] ?? null,
                summaryIncludes: args[1] ?? null,
                limit: 50
            });
            print(json, {
                command,
                workspaceRoot,
                auditEntries
            });
            return 0;
        }
        case "actions": {
            print(json, {
                command,
                workspaceRoot,
                actions: listWindowsActionDefinitions().map((action) => ({
                    id: action.id,
                    title: action.title,
                    kind: action.kind,
                    scope: action.scope,
                    targetKind: action.targetKind,
                    riskClass: action.riskClass,
                    approvalRequired: action.approvalRequired,
                    commandPreview: action.commandPreview
                }))
            });
            return 0;
        }
        case "knowledge": {
            const subcommand = args[0] ?? "sources";
            const sourceId = args[1] ?? "";
            const knowledgeState = await loadOfficialKnowledge(workspaceRoot);
            try {
                if (subcommand === "sources") {
                    print(json, {
                        command,
                        workspaceRoot,
                        officialKnowledge: knowledgeState.getStatus(),
                        sources: knowledgeState.listSources()
                    });
                    return 0;
                }
                if (subcommand === "enable") {
                    const updated = await knowledgeState.setSourceEnabled(sourceId, true);
                    print(json, {
                        command,
                        workspaceRoot,
                        source: updated,
                        officialKnowledge: knowledgeState.getStatus()
                    });
                    return 0;
                }
                if (subcommand === "disable") {
                    const updated = await knowledgeState.setSourceEnabled(sourceId, false);
                    print(json, {
                        command,
                        workspaceRoot,
                        source: updated,
                        officialKnowledge: knowledgeState.getStatus()
                    });
                    return 0;
                }
                if (subcommand === "refresh") {
                    const documents = await knowledgeState.refreshSource(sourceId);
                    print(json, {
                        command,
                        workspaceRoot,
                        sourceId,
                        documents,
                        officialKnowledge: knowledgeState.getStatus()
                    });
                    return 0;
                }
                throw new Error(`Unknown knowledge subcommand: ${subcommand}`);
            }
            finally {
                knowledgeState.close();
            }
        }
        case "plugins": {
            const subcommand = args[0] ?? "list";
            const pluginId = args[1] ?? "";
            const registry = await loadRuntimeCapabilityRegistry(runtimeRoot, workspaceRoot);
            if (subcommand === "list") {
                print(json, {
                    command,
                    workspaceRoot,
                    runtimeRoot,
                    plugins: registry.plugins,
                    entries: registry.entries
                });
                return 0;
            }
            if (!pluginId) {
                throw new Error(`plugins ${subcommand} requires a plugin id.`);
            }
            const operator = approvedBy ?? "operator-cli";
            if (subcommand === "enable") {
                const manifest = await setRuntimeCapabilityPluginEnabled(runtimeRoot, pluginId, true, workspaceRoot);
                print(json, {
                    command,
                    workspaceRoot,
                    runtimeRoot,
                    updated: manifest
                });
                return 0;
            }
            if (subcommand === "disable") {
                const manifest = await setRuntimeCapabilityPluginEnabled(runtimeRoot, pluginId, false, workspaceRoot);
                print(json, {
                    command,
                    workspaceRoot,
                    runtimeRoot,
                    updated: manifest
                });
                return 0;
            }
            if (subcommand === "approve") {
                const manifest = await setRuntimeCapabilityPluginApproval(runtimeRoot, pluginId, true, operator, workspaceRoot);
                print(json, {
                    command,
                    workspaceRoot,
                    runtimeRoot,
                    updated: manifest
                });
                return 0;
            }
            if (subcommand === "revoke") {
                const manifest = await setRuntimeCapabilityPluginApproval(runtimeRoot, pluginId, false, null, workspaceRoot);
                print(json, {
                    command,
                    workspaceRoot,
                    runtimeRoot,
                    updated: manifest
                });
                return 0;
            }
            throw new Error(`Unknown plugins subcommand: ${subcommand}`);
        }
        case "improvements": {
            const subcommand = args[0] ?? "mine";
            if (subcommand === "mine") {
                const maxFindings = Number.parseInt(args[1] ?? "", 10);
                const result = await mineGovernedHistory({
                    artifactsRoot: runtimeRoot,
                    maxFindings: Number.isFinite(maxFindings) && maxFindings > 0 ? maxFindings : 25
                });
                print(json, {
                    command,
                    workspaceRoot,
                    runtimeRoot,
                    backlogPath: governedHistoryBacklogPath(workspaceRoot),
                    findings: result.findings,
                    candidateCardIds: result.groupedCardDrafts
                        .map((card) => String(card.id ?? "unknown"))
                        .filter(Boolean),
                    sourceConversationIds: result.sourceConversationIds
                });
                return 0;
            }
            if (subcommand === "backlog") {
                const backlog = await readJsonFile(governedHistoryBacklogPath(workspaceRoot));
                print(json, {
                    command,
                    workspaceRoot,
                    runtimeRoot,
                    backlogPath: governedHistoryBacklogPath(workspaceRoot),
                    backlog
                });
                return 0;
            }
            throw new Error(`Unknown improvements subcommand: ${subcommand}`);
        }
        default:
            print(json, {
                command: "help",
                workspaceRoot,
                usage: [
                    "dashboard",
                    "approvals",
                    "audit [commandNameIncludes] [summaryIncludes]",
                    "actions",
                    "knowledge sources",
                    "knowledge enable <sourceId>",
                    "knowledge disable <sourceId>",
                    "knowledge refresh <sourceId>",
                    "plugins list",
                    "plugins enable <pluginId>",
                    "plugins disable <pluginId>",
                    "plugins approve <pluginId> [--approved-by <name>]",
                    "plugins revoke <pluginId>",
                    "improvements mine [maxFindings]",
                    "improvements backlog"
                ]
            });
            return 0;
    }
};
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
    void (async () => {
        try {
            process.exitCode = await runOperatorCli(process.argv.slice(2));
        }
        catch (error) {
            console.error(error instanceof Error ? error.message : String(error));
            process.exitCode = 1;
        }
    })();
}
