import { describe, expect, it, vi, beforeEach } from "vitest";
import { hashGovernanceCommand } from "../../packages/Governance and exicution/src/commands/hash";
import { listWindowsActionDefinitions } from "../../packages/Governance and exicution/src/execution/windows-action-catalog";
import type { ApprovalToken, WorkflowExecutionRequest, WorkflowPlan, WorkflowProgressEvent } from "@contracts";

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === "desktop") {
        return "C:/Users/Alex/Desktop";
      }
      if (name === "documents") {
        return "C:/Users/Alex/Documents";
      }
      return "C:/workspace/.runtime";
    })
  },
  BrowserWindow: class BrowserWindow {}
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
  let progressEvents: WorkflowProgressEvent[];
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
  } as any;

  const desktopActions = {
    listDesktopActions: () => listWindowsActionDefinitions(),
    issueDesktopActionApproval: vi.fn((request: any, approvedBy: string) => {
      const approval: ApprovalToken = {
        tokenId: `token-${request.kind}`,
        commandHash: `hash-${request.kind}`,
        approver: approvedBy,
        issuedAt: "2026-04-10T00:00:00.000Z",
        expiresAt: "2026-04-10T00:10:00.000Z",
        signature: "signature"
      };
      return approval;
    }),
    executeDesktopAction: vi.fn(async (request: any) => ({
      proposalId: request.proposalId,
      kind: request.kind,
      scope: request.scope,
      targetKind: request.targetKind,
      target: request.target,
      status: "executed" as const,
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
      status: "blocked" as const,
      commandId: null,
      commandHash: null,
      preview: "Rollback",
      summary: "Rollback not exercised in this test.",
      riskClass: "medium" as const,
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
          close: async () => {}
        }
      });

    try {
      const plan = (await orchestrator.suggestWorkflow("remove chrome completely from my system")) as WorkflowPlan;
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

      const request: WorkflowExecutionRequest = {
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
    } finally {
      await orchestrator.close();
    }
  });

  it("opens browser navigation visibly for site prompts", async () => {
    const openCalls: Array<[string, boolean | undefined]> = [];
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
        open: async (url: string, visible?: boolean) => {
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
        close: async () => {}
      }
    });

    try {
      const plan = (await orchestrator.suggestWorkflow("open google")) as WorkflowPlan;
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
    } finally {
      await orchestrator.close();
    }
  });
});
