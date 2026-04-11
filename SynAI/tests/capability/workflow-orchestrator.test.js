import { describe, expect, it, vi, beforeEach } from "vitest";
import { hashGovernanceCommand } from "../../packages/Governance-Execution/src/commands/hash";
import { listWindowsActionDefinitions } from "../../packages/Governance-Execution/src/execution/windows-action-catalog";
vi.mock("electron", () => ({
    app: {
        getPath: vi.fn((name) => {
            if (name === "desktop") {
                return "C:/Users/Alex/Desktop";
            }
            if (name === "documents") {
                return "C:/Users/Alex/Documents";
            }
            return "C:/workspace/.runtime";
        })
    },
    BrowserWindow: class BrowserWindow {
    }
}));
vi.mock("@web-search", () => ({
    resolveRecentWebContext: vi.fn(async () => ({
        status: "used",
        query: "current state of ai",
        results: [
            {
                title: "AI snapshot",
                url: "https://example.com/ai-snapshot",
                source: "Example News",
                snippet: "A recent AI update.",
                publishedAt: "2026-04-10T00:00:00.000Z"
            }
        ]
    }))
}));
const { createWorkflowOrchestrator } = await import("../../apps/desktop/electron/workflow-orchestrator");
describe("workflow orchestrator", () => {
    let progressEvents;
    const chromeApp = {
        name: "Google Chrome",
        publisher: "Google LLC",
        installLocation: "C:/Program Files/Google/Chrome/Application",
        uninstallCommand: 'chrome_installer.exe --uninstall',
        quietUninstallCommand: 'chrome_installer.exe --uninstall --force-uninstall',
        displayIcon: "chrome.exe",
        associatedProcessNames: ["chrome.exe"],
        associatedProcessIds: [1234],
        startupReferences: []
    };
    const machineAwareness = {
        summary: {
            machineName: "DESKTOP-TEST"
        },
        processSnapshot: {
            totalCount: 1,
            processes: [
                {
                    name: "chrome.exe",
                    pid: 1234,
                    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
                    commandLine: "chrome.exe --profile-directory=Default",
                    windowTitle: "Google Chrome"
                }
            ]
        },
        serviceSnapshot: {
            totalCount: 0,
            services: []
        },
        installedAppsSnapshot: {
            totalCount: 1,
            apps: [chromeApp]
        }
    };
    const desktopActions = {
        listDesktopActions: () => listWindowsActionDefinitions(),
        issueDesktopActionApproval: vi.fn((request, approvedBy) => {
            const approval = {
                tokenId: `token-${request.kind}`,
                commandHash: `hash-${request.kind}`,
                approver: approvedBy,
                issuedAt: "2026-04-10T00:00:00.000Z",
                expiresAt: "2026-04-10T00:10:00.000Z",
                signature: "signature"
            };
            return approval;
        }),
        executeDesktopAction: vi.fn(async (request) => ({
            proposalId: request.proposalId,
            kind: request.kind,
            scope: request.scope,
            targetKind: request.targetKind,
            target: request.target,
            status: "executed",
            commandId: `command-${request.kind}`,
            commandHash: `hash-${request.kind}`,
            preview: `${request.kind}:${request.target}`,
            summary: `${request.kind} executed.`,
            riskClass: request.riskClass,
            approvalRequired: request.destructive,
            approvedBy: request.approvedBy ?? null,
            startedAt: "2026-04-10T00:00:00.000Z",
            completedAt: "2026-04-10T00:00:00.100Z",
            output: { target: request.target }
        })),
        rollbackDesktopAction: vi.fn(async () => ({
            proposalId: "rollback",
            kind: "launch-program",
            scope: "system",
            targetKind: "command",
            target: "rollback",
            status: "blocked",
            commandId: null,
            commandHash: null,
            preview: "Rollback",
            summary: "Rollback not exercised in this test.",
            riskClass: "medium",
            approvalRequired: false,
            approvedBy: null,
            startedAt: null,
            completedAt: null
        }))
    };
    beforeEach(() => {
        progressEvents = [];
        desktopActions.issueDesktopActionApproval.mockClear();
        desktopActions.executeDesktopAction.mockClear();
    });
    it("issues approvals bound to the exact workflow hash and executes an uninstall workflow", async () => {
        const orchestrator = createWorkflowOrchestrator({
            workspaceRoot: "C:/workspace",
            runtimeRoot: "C:/workspace/.runtime",
            desktopActions,
            getMachineAwareness: () => machineAwareness,
            getFileAwareness: () => null,
            getScreenAwareness: () => null,
            emitProgress: (event) => {
                progressEvents.push(event);
            },
            browserHost: {
                search: async () => [],
                open: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                playYoutube: async () => ({
                    url: "https://www.youtube.com",
                    title: "YouTube",
                    text: "",
                    links: []
                }),
                click: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                type: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                hotkey: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                close: async () => { }
            }
        });
        try {
            const plan = (await orchestrator.suggestWorkflow("remove chrome completely from my system"));
            expect(plan.family).toBe("app-uninstall");
            expect(plan.approvalRequired).toBe(true);
            const approval = await orchestrator.issueWorkflowApproval(plan, "qa-operator");
            const expectedHash = hashGovernanceCommand({
                commandName: `workflow.${plan.family}`,
                command: plan.summary,
                args: [plan.workflowHash],
                metadata: {
                    workflowHash: plan.workflowHash,
                    plan: JSON.stringify(plan)
                },
                riskClass: "high",
                destructive: true,
                approvalToken: null,
                approvedBy: "qa-operator",
                dryRun: false
            });
            expect(approval.commandHash).toBe(expectedHash);
            const request = {
                prompt: plan.prompt,
                plan,
                dryRun: false,
                approvedBy: "qa-operator",
                approvalToken: approval
            };
            const result = await orchestrator.executeWorkflow(request);
            expect(result.status).toBe("executed");
            expect(result.approvedBy).toBe("qa-operator");
            expect(desktopActions.issueDesktopActionApproval).toHaveBeenCalledTimes(1);
            expect(desktopActions.executeDesktopAction).toHaveBeenCalledTimes(1);
            expect(progressEvents.length).toBeGreaterThan(0);
            expect(progressEvents.at(-1)?.status).toBe("executed");
        }
        finally {
            await orchestrator.close();
        }
    });
    it("blocks approval replay when the workflow plan is tampered after approval issuance", async () => {
        const orchestrator = createWorkflowOrchestrator({
            workspaceRoot: "C:/workspace",
            runtimeRoot: "C:/workspace/.runtime",
            desktopActions,
            getMachineAwareness: () => machineAwareness,
            getFileAwareness: () => null,
            getScreenAwareness: () => null,
            emitProgress: (event) => {
                progressEvents.push(event);
            },
            browserHost: {
                search: async () => [],
                open: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                playYoutube: async () => ({
                    url: "https://www.youtube.com",
                    title: "YouTube",
                    text: "",
                    links: []
                }),
                click: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                type: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                hotkey: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                close: async () => { }
            }
        });
        try {
            const plan = (await orchestrator.suggestWorkflow("remove chrome completely from my system"));
            const approval = await orchestrator.issueWorkflowApproval(plan, "qa-operator");
            const tamperedPlan = {
                ...plan,
                summary: `${plan.summary} (tampered after approval)`
            };
            const result = await orchestrator.executeWorkflow({
                prompt: tamperedPlan.prompt,
                plan: tamperedPlan,
                dryRun: false,
                approvedBy: "qa-operator",
                approvalToken: approval
            });
            expect(result.status).toBe("blocked");
            expect(result.summary).toContain("Approval token");
            expect(desktopActions.executeDesktopAction).not.toHaveBeenCalled();
            expect(progressEvents).toHaveLength(0);
        }
        finally {
            await orchestrator.close();
        }
    });
    it("opens browser navigation visibly for site prompts", async () => {
        const openCalls = [];
        const orchestrator = createWorkflowOrchestrator({
            workspaceRoot: "C:/workspace",
            runtimeRoot: "C:/workspace/.runtime",
            desktopActions,
            getMachineAwareness: () => machineAwareness,
            getFileAwareness: () => null,
            getScreenAwareness: () => null,
            emitProgress: (event) => {
                progressEvents.push(event);
            },
            browserHost: {
                search: async () => [],
                open: async (url, visible) => {
                    openCalls.push([url, visible]);
                    return {
                        url,
                        title: "Google",
                        text: "",
                        links: []
                    };
                },
                playYoutube: async () => ({
                    url: "https://www.youtube.com",
                    title: "YouTube",
                    text: "",
                    links: []
                }),
                click: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                type: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                hotkey: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                close: async () => { }
            }
        });
        try {
            const plan = (await orchestrator.suggestWorkflow("open google"));
            expect(plan.family).toBe("browser-playback");
            expect(plan.steps[0]?.kind).toBe("browser-open");
            const result = await orchestrator.executeWorkflow({
                prompt: plan.prompt,
                plan,
                dryRun: false,
                approvedBy: "qa-operator",
                approvalToken: null
            });
            expect(result.status).toBe("executed");
            expect(openCalls[0]?.[0]).toBe("https://www.google.com");
            expect(openCalls[0]?.[1]).toBe(true);
        }
        finally {
            await orchestrator.close();
        }
    });
    it("preserves denied workflow step results and workflow status", async () => {
        desktopActions.executeDesktopAction.mockImplementationOnce(async (request) => ({
            proposalId: request.proposalId,
            kind: request.kind,
            scope: request.scope,
            targetKind: request.targetKind,
            target: request.target,
            status: "denied",
            commandId: `command-${request.kind}`,
            commandHash: `hash-${request.kind}`,
            preview: `${request.kind}:${request.target}`,
            summary: "The governed adapter denied the live action.",
            riskClass: request.riskClass,
            approvalRequired: request.destructive,
            approvedBy: request.approvedBy ?? null,
            startedAt: "2026-04-10T00:00:00.000Z",
            completedAt: "2026-04-10T00:00:00.100Z",
            output: { target: request.target }
        }));
        const orchestrator = createWorkflowOrchestrator({
            workspaceRoot: "C:/workspace",
            runtimeRoot: "C:/workspace/.runtime",
            desktopActions,
            getMachineAwareness: () => machineAwareness,
            getFileAwareness: () => null,
            getScreenAwareness: () => null,
            emitProgress: (event) => {
                progressEvents.push(event);
            },
            browserHost: {
                search: async () => [],
                open: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                playYoutube: async () => ({
                    url: "https://www.youtube.com",
                    title: "YouTube",
                    text: "",
                    links: []
                }),
                click: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                type: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                hotkey: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                close: async () => { }
            }
        });
        try {
            const plan = (await orchestrator.suggestWorkflow("remove chrome completely from my system"));
            const approval = await orchestrator.issueWorkflowApproval(plan, "qa-operator");
            const result = await orchestrator.executeWorkflow({
                prompt: plan.prompt,
                plan,
                dryRun: false,
                approvedBy: "qa-operator",
                approvalToken: approval
            });
            expect(result.status).toBe("denied");
            expect(result.stepResults.find((step) => step.kind === "desktop-action")?.status).toBe("denied");
            expect(result.verification?.passed).toBe(false);
            expect(progressEvents.at(-1)?.status).toBe("denied");
            expect(desktopActions.rollbackDesktopAction).not.toHaveBeenCalled();
        }
        finally {
            await orchestrator.close();
        }
    });
    it("records denied and blocked workflow queue outcomes distinctly", async () => {
        const queueRecords = [];
        const approvalQueue = {
            record: vi.fn(async (record) => {
                queueRecords.push(record);
            }),
            list: vi.fn(async () => ({
                capturedAt: new Date().toISOString(),
                totals: {
                    total: queueRecords.length,
                    pending: 0,
                    approved: 0,
                    consumed: queueRecords.filter((record) => record.status === "consumed").length,
                    denied: queueRecords.filter((record) => record.status === "denied").length,
                    blocked: queueRecords.filter((record) => record.status === "blocked").length,
                    revoked: 0,
                    expired: 0
                },
                records: queueRecords
            }))
        };
        desktopActions.executeDesktopAction.mockImplementationOnce(async (request) => ({
            proposalId: request.proposalId,
            kind: request.kind,
            scope: request.scope,
            targetKind: request.targetKind,
            target: request.target,
            status: "denied",
            commandId: `command-${request.kind}`,
            commandHash: `hash-${request.kind}`,
            preview: `${request.kind}:${request.target}`,
            summary: "The governed adapter denied the live action.",
            riskClass: request.riskClass,
            approvalRequired: request.destructive,
            approvedBy: request.approvedBy ?? null,
            startedAt: "2026-04-10T00:00:00.000Z",
            completedAt: "2026-04-10T00:00:00.100Z",
            output: { target: request.target }
        }));
        const orchestrator = createWorkflowOrchestrator({
            workspaceRoot: "C:/workspace",
            runtimeRoot: "C:/workspace/.runtime",
            desktopActions,
            approvalQueue: approvalQueue,
            getMachineAwareness: () => machineAwareness,
            getFileAwareness: () => null,
            getScreenAwareness: () => null,
            emitProgress: (event) => {
                progressEvents.push(event);
            },
            browserHost: {
                search: async () => [],
                open: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                playYoutube: async () => ({
                    url: "https://www.youtube.com",
                    title: "YouTube",
                    text: "",
                    links: []
                }),
                click: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                type: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                hotkey: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                close: async () => { }
            }
        });
        try {
            const deniedPlan = (await orchestrator.suggestWorkflow("remove chrome completely from my system"));
            const deniedApproval = await orchestrator.issueWorkflowApproval(deniedPlan, "qa-operator");
            const deniedResult = await orchestrator.executeWorkflow({
                prompt: deniedPlan.prompt,
                plan: deniedPlan,
                dryRun: false,
                approvedBy: "qa-operator",
                approvalToken: deniedApproval
            });
            expect(deniedResult.status).toBe("denied");
            expect(queueRecords.at(-1)?.status).toBe("denied");
            const blockedPlan = (await orchestrator.suggestWorkflow("remove chrome completely from my system"));
            const blockedApproval = await orchestrator.issueWorkflowApproval(blockedPlan, "qa-operator");
            const tamperedBlockedPlan = {
                ...blockedPlan,
                summary: `${blockedPlan.summary} (tampered after approval)`
            };
            const blockedResult = await orchestrator.executeWorkflow({
                prompt: tamperedBlockedPlan.prompt,
                plan: tamperedBlockedPlan,
                dryRun: false,
                approvedBy: "qa-operator",
                approvalToken: blockedApproval
            });
            expect(blockedResult.status).toBe("blocked");
            expect(queueRecords.at(-1)?.status).toBe("blocked");
        }
        finally {
            await orchestrator.close();
        }
    });
    it("returns a markdown report body and summary for research workflows", async () => {
        const orchestrator = createWorkflowOrchestrator({
            workspaceRoot: "C:/workspace",
            runtimeRoot: "C:/workspace/.runtime",
            desktopActions,
            getMachineAwareness: () => machineAwareness,
            getFileAwareness: () => null,
            getScreenAwareness: () => null,
            emitProgress: (event) => {
                progressEvents.push(event);
            },
            browserHost: {
                search: async () => [],
                open: async (url, visible) => ({
                    url,
                    title: visible ? "Visible browser result" : "Hidden browser result",
                    text: "",
                    links: []
                }),
                playYoutube: async () => ({
                    url: "https://www.youtube.com",
                    title: "YouTube",
                    text: "",
                    links: []
                }),
                click: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                type: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                hotkey: async () => ({
                    url: "about:blank",
                    title: "about:blank",
                    text: "",
                    links: []
                }),
                close: async () => { }
            }
        });
        try {
            const plan = (await orchestrator.suggestWorkflow("do deep research on the stock market and give me a full summary"));
            expect(plan.family).toBe("research-report");
            const result = await orchestrator.executeWorkflow({
                prompt: plan.prompt,
                plan,
                dryRun: true,
                approvedBy: "qa-operator",
                approvalToken: null
            });
            expect(result.status).toBe("simulated");
            expect(result.reportMarkdown).toContain("## Summary");
            expect(result.reportSummary).toContain("AI snapshot");
            expect(result.stepResults.some((step) => step.kind === "write-markdown" && step.status === "simulated")).toBe(true);
        }
        finally {
            await orchestrator.close();
        }
    });
});
