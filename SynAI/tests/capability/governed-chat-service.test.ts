import { join } from "node:path";
import { tmpdir } from "node:os";
import { rm } from "node:fs/promises";
import { vi, describe, expect, it } from "vitest";
import type {
  ApprovalToken,
  ChatGovernedTaskMetadata,
  WorkflowExecutionRequest,
  WorkflowExecutionResult,
  WorkflowPlan,
  WorkflowStepPlan,
  WorkflowStepResult
} from "@contracts";
import { appendChatMessage, configureMemoryDatabase, createConversationRecord, loadConversationRecord } from "../../packages/Awareness-Reasoning/src/memory";
import { createDesktopActionService, type DesktopActionHost } from "../../apps/desktop/electron/desktop-actions";
import { createGovernedChatService } from "../../apps/desktop/electron/governed-chat";

const buildWorkflowPlan = (): WorkflowPlan => {
  const step: WorkflowStepPlan = {
    id: "step-1",
    kind: "write-markdown",
    title: "Write report",
    summary: "Write the report body.",
    approvalRequired: true,
    riskClass: "medium",
    saveTo: "documents",
    fileName: "ai-report.md"
  };

  return {
    requestId: "wf-1",
    prompt: "Research the current state of AI and write a report and save it in my Documents.",
    normalizedPrompt: "research the current state of ai and write a report and save it in my documents",
    family: "research-report",
    summary: "Research AI and save a markdown report in Documents.",
    steps: [step],
    evidence: [],
    artifacts: [
      {
        id: "artifact-1",
        kind: "markdown",
        label: "AI report",
        saveTo: "documents",
        fileName: "ai-report.md"
      }
    ],
    clarificationNeeded: [],
    approvalRequired: true,
    approvalReason: "Workflow touches a user Documents save path.",
    workflowHash: "workflow-hash-1",
    targetPaths: ["C:/Users/Pgiov/Documents/ai-report.md"],
    createdAt: "2026-04-10T12:00:00.000Z"
  };
};

const sampleReportMarkdown = `# AI Research Report

## Summary
A concise research report.

## Evidence
- Collected web results.
`;

const sampleReportSummary = "A concise research report.";

const buildWorkflowExecutionResult = (plan: WorkflowPlan): WorkflowExecutionResult => {
  const stepResult: WorkflowStepResult = {
    id: "step-1",
    kind: "write-markdown",
    status: "executed",
    summary: "Saved the markdown report.",
    startedAt: "2026-04-10T12:00:01.000Z",
    completedAt: "2026-04-10T12:00:02.000Z"
  };

  return {
    workflowId: plan.requestId,
    workflowHash: plan.workflowHash,
    plan,
    status: "executed",
    summary: "Workflow executed successfully.",
    reportMarkdown: sampleReportMarkdown,
    reportSummary: sampleReportSummary,
    approvalRequired: true,
    approvedBy: "qa-operator",
    commandId: "cmd-1",
    commandHash: "hash-1",
    startedAt: "2026-04-10T12:00:00.000Z",
    completedAt: "2026-04-10T12:00:03.000Z",
    currentStepId: null,
    completedStepIds: ["step-1"],
    stepResults: [stepResult],
    artifactPaths: []
  };
};

const buildPendingTask = (): ChatGovernedTaskMetadata => {
  const plan = buildWorkflowPlan();
  const workflowRequest: WorkflowExecutionRequest = {
    prompt: plan.prompt,
    plan,
    dryRun: false,
    approvedBy: null,
    approvalToken: null
  };

  return {
    requestId: "pending-1",
    interpretedIntent: plan.summary,
    actionType: "workflow",
    riskTier: "tier-1",
    decision: "require_approval",
    requiresExecution: true,
    approvalRequired: true,
    approvalReason: plan.approvalReason,
    denialReason: null,
    clarificationNeeded: [],
    executionAllowed: true,
    verificationRequired: true,
    recommendedExecutor: "workflow-orchestrator",
    policyRulesTriggered: ["workflow-intent"],
    reasoningSummary: "Workflow approval is required.",
    approvalState: {
      required: true,
      pending: true,
      reason: plan.approvalReason,
      approver: null,
      tokenId: null,
      expiresAt: null
    },
    executionSummary: null,
    verificationSummary: null,
    gapClass: null,
    remediationSummary: null,
    artifacts: [
      {
        kind: "audit",
        summary: "Governed workflow pending approval.",
        metadata: {
          route: "workflow",
          workflowPlan: plan,
          workflowRequest
        }
      }
    ]
  };
};

const buildDesktopActionHost = (): DesktopActionHost => ({
  launchProgram: vi.fn(async (target: string) => ({ target })),
  openTarget: vi.fn(async (target: string) => ({ target })),
  createFile: vi.fn(async (target: string, content: string) => ({
    target,
    bytesWritten: Buffer.byteLength(content, "utf8")
  })),
  createFolder: vi.fn(async (target: string) => ({ target })),
  deletePath: vi.fn(async (target: string, recursive: boolean) => ({ target, recursive })),
  renamePath: vi.fn(async (target: string, destination: string) => ({ source: target, destination })),
  movePath: vi.fn(async (target: string, destination: string) => ({ source: target, destination })),
  inspectProcess: vi.fn(async (target: string, targetKind: string) => ({ target, targetKind })),
  terminateProcess: vi.fn(async (target: string, targetKind: string, force: boolean) => ({
    target,
    targetKind,
    force
  })),
  controlService: vi.fn(async () => ({ service: "service" })),
  setRegistryValue: vi.fn(async () => ({ registry: "set" })),
  deleteRegistryValue: vi.fn(async () => ({ registry: "deleted" })),
  invokeUiAction: vi.fn(async () => ({ ui: "action" })),
  openTaskManager: vi.fn(async () => ({ opened: true })),
  closeWindowGracefully: vi.fn(async (target: string) => ({ target })),
  focusWindow: vi.fn(async (target: string) => ({ target }))
});

describe("governed chat service", () => {
  it("clarifies ambiguous destructive prompts instead of executing them", async () => {
    const root = join(tmpdir(), `synai-test-${Date.now()}-governed-chat`);
    const dbPath = join(root, "memory.json");
    const runtimeRoot = join(root, "runtime");
    configureMemoryDatabase(dbPath);

    const desktopActions = {
      suggestDesktopAction: () => null,
      issueDesktopActionApproval: () => {
        throw new Error("desktop approval should not be requested");
      },
      executeDesktopAction: async () => {
        throw new Error("desktop execution should not be requested");
      }
    };

    const workflowOrchestrator = {
      suggestWorkflow: async () => null,
      issueWorkflowApproval: async () => {
        throw new Error("workflow approval should not be requested");
      },
      executeWorkflow: async () => {
        throw new Error("workflow execution should not be requested");
      }
    };

    const service = createGovernedChatService({
      workspaceRoot: root,
      runtimeRoot,
      desktopActions,
      workflowOrchestrator,
      getMachineAwareness: () => null,
      getFileAwareness: () => null,
      getScreenAwareness: () => null
    });

    const conversation = await createConversationRecord();
    const loaded = await loadConversationRecord(conversation.id);
    const result = await service.handleTurn({
      requestId: "req-clarify",
      conversationId: conversation.id,
      text: "Delete this folder.",
      messages: loaded?.messages ?? [],
      workspaceRoot: root,
      desktopPath: "C:/Users/Pgiov/Desktop",
      documentsPath: "C:/Users/Pgiov/Documents",
      runtimeRoot,
      getMachineAwareness: () => null,
      getFileAwareness: () => null,
      getScreenAwareness: () => null
    });

    expect(result.handled).toBe(true);
    expect(result.route?.decision).toBe("clarify");
    expect(result.taskState?.decision).toBe("clarify");
    expect(result.taskState?.executionStatus).toBe("clarification_needed");
    expect(result.taskState?.clarification?.question ?? "").toMatch(/exact|target/i);
    expect(result.assistantReply).toMatch(/exact|target/i);

    await rm(root, { recursive: true, force: true });
  });

  it("replays a pending workflow approval when the user confirms", async () => {
    const root = join(tmpdir(), `synai-test-${Date.now()}-governed-chat-confirm`);
    const dbPath = join(root, "memory.json");
    const runtimeRoot = join(root, "runtime");
    configureMemoryDatabase(dbPath);

    let approvalIssued = 0;
    let executionCalled = 0;

    const workflowPlan = buildWorkflowPlan();
    const workflowExecution = buildWorkflowExecutionResult(workflowPlan);
    const approvedToken: ApprovalToken = {
      tokenId: "token-1",
      commandHash: "command-hash-1",
      approver: "qa-operator",
      issuedAt: "2026-04-10T12:00:00.000Z",
      expiresAt: "2026-04-10T12:15:00.000Z",
      signature: "signature-1"
    };

    const desktopActions = {
      suggestDesktopAction: () => null,
      issueDesktopActionApproval: () => {
        throw new Error("desktop approval should not be requested");
      },
      executeDesktopAction: async () => {
        throw new Error("desktop execution should not be requested");
      }
    };

    const workflowOrchestrator = {
      suggestWorkflow: async () => workflowPlan,
      issueWorkflowApproval: async () => {
        approvalIssued += 1;
        return approvedToken;
      },
      executeWorkflow: async () => {
        executionCalled += 1;
        return workflowExecution;
      }
    };

    const conversation = await createConversationRecord();
    await appendChatMessage(conversation.id, "user", "Please research AI and save a report in Documents.");
    await appendChatMessage(conversation.id, "assistant", "I can do that once you approve.", undefined, {
      task: buildPendingTask()
    });
    const loaded = await loadConversationRecord(conversation.id);

    const service = createGovernedChatService({
      workspaceRoot: root,
      runtimeRoot,
      desktopActions,
      workflowOrchestrator,
      getMachineAwareness: () => null,
      getFileAwareness: () => null,
      getScreenAwareness: () => null
    });

    const result = await service.handleTurn({
      requestId: "req-approve",
      conversationId: conversation.id,
      text: "approve",
      messages: loaded?.messages ?? [],
      workspaceRoot: root,
      desktopPath: "C:/Users/Pgiov/Desktop",
      documentsPath: "C:/Users/Pgiov/Documents",
      runtimeRoot,
      getMachineAwareness: () => null,
      getFileAwareness: () => null,
      getScreenAwareness: () => null
    });

    expect(result.handled).toBe(true);
    expect(result.executionResult?.status).toBe("executed");
    expect(result.taskState?.approvalState.pending).toBe(false);
    expect(result.taskState?.reportMarkdown).toContain("# AI Research Report");
    expect(result.taskState?.reportSummary).toBe(sampleReportSummary);
    expect(approvalIssued).toBe(1);
    expect(executionCalled).toBe(1);
    expect(result.assistantReply).toBe(sampleReportMarkdown);

    await rm(root, { recursive: true, force: true });
  });

  it("summarizes the latest report when the user asks for the results", async () => {
    const root = join(tmpdir(), `synai-test-${Date.now()}-governed-chat-summary`);
    const dbPath = join(root, "memory.json");
    const runtimeRoot = join(root, "runtime");
    configureMemoryDatabase(dbPath);

    const desktopActions = {
      suggestDesktopAction: () => null,
      issueDesktopActionApproval: () => {
        throw new Error("desktop approval should not be requested");
      },
      executeDesktopAction: async () => {
        throw new Error("desktop execution should not be requested");
      }
    };

    const workflowOrchestrator = {
      suggestWorkflow: async () => null,
      issueWorkflowApproval: async () => {
        throw new Error("workflow approval should not be requested");
      },
      executeWorkflow: async () => {
        throw new Error("workflow execution should not be requested");
      }
    };

    const conversation = await createConversationRecord();
    await appendChatMessage(conversation.id, "user", "Please research AI and save a report in Documents.");
    await appendChatMessage(conversation.id, "assistant", sampleReportMarkdown, undefined, {
      task: {
        ...buildPendingTask(),
        approvalState: {
          required: false,
          pending: false,
          reason: null,
          approver: "qa-operator",
          tokenId: null,
          expiresAt: null
        },
        executionSummary: sampleReportSummary,
        verificationSummary: "Verification passed.",
        rollbackSummary: null,
        gapClass: null,
        remediationSummary: null,
        reportMarkdown: sampleReportMarkdown,
        reportSummary: sampleReportSummary
      }
    });
    const loaded = await loadConversationRecord(conversation.id);

    const service = createGovernedChatService({
      workspaceRoot: root,
      runtimeRoot,
      desktopActions,
      workflowOrchestrator,
      getMachineAwareness: () => null,
      getFileAwareness: () => null,
      getScreenAwareness: () => null
    });

    const result = await service.handleTurn({
      requestId: "req-summary",
      conversationId: conversation.id,
      text: "what's the results of the research",
      messages: loaded?.messages ?? [],
      workspaceRoot: root,
      desktopPath: "C:/Users/Pgiov/Desktop",
      documentsPath: "C:/Users/Pgiov/Documents",
      runtimeRoot,
      getMachineAwareness: () => null,
      getFileAwareness: () => null,
      getScreenAwareness: () => null
    });

    expect(result.handled).toBe(true);
    expect(result.assistantReply).toBe(sampleReportSummary);
    expect(result.route).toBeNull();
    expect(result.taskState).toBeNull();

    await rm(root, { recursive: true, force: true });
  });

  it("preserves workflow clarification status and payload in task metadata", async () => {
    const root = join(tmpdir(), `synai-test-${Date.now()}-governed-chat-workflow-clarification`);
    const dbPath = join(root, "memory.json");
    const runtimeRoot = join(root, "runtime");
    configureMemoryDatabase(dbPath);

    let approvalIssued = 0;
    let executionCalled = 0;

    const workflowPlan = buildWorkflowPlan();
    const baseExecution = buildWorkflowExecutionResult(workflowPlan);
    const workflowExecution: WorkflowExecutionResult = {
      ...baseExecution,
      status: "clarification_needed",
      summary: "Need the exact Documents subfolder before saving.",
      reportMarkdown: null,
      reportSummary: null,
      error: "Need the exact Documents subfolder before saving.",
      clarification: {
        question: "Which exact Documents subfolder should I save the report to?",
        missingFields: ["saveTo"]
      },
      stepResults: baseExecution.stepResults.map((step) => ({
        ...step,
        status: "clarification_needed",
        summary: "Need the exact Documents subfolder before saving.",
        clarification: {
          question: "Which exact Documents subfolder should I save the report to?",
          missingFields: ["saveTo"]
        }
      }))
    };
    const approvedToken: ApprovalToken = {
      tokenId: "token-clarify",
      commandHash: "command-hash-clarify",
      approver: "qa-operator",
      issuedAt: "2026-04-10T12:00:00.000Z",
      expiresAt: "2026-04-10T12:15:00.000Z",
      signature: "signature-clarify"
    };

    const desktopActions = {
      suggestDesktopAction: () => null,
      issueDesktopActionApproval: () => {
        throw new Error("desktop approval should not be requested");
      },
      executeDesktopAction: async () => {
        throw new Error("desktop execution should not be requested");
      }
    };

    const workflowOrchestrator = {
      suggestWorkflow: async () => workflowPlan,
      issueWorkflowApproval: async () => {
        approvalIssued += 1;
        return approvedToken;
      },
      executeWorkflow: async () => {
        executionCalled += 1;
        return workflowExecution;
      }
    };

    const conversation = await createConversationRecord();
    await appendChatMessage(conversation.id, "user", "Please research AI and save a report in Documents.");
    await appendChatMessage(conversation.id, "assistant", "I can do that once you approve.", undefined, {
      task: buildPendingTask()
    });
    const loaded = await loadConversationRecord(conversation.id);

    const service = createGovernedChatService({
      workspaceRoot: root,
      runtimeRoot,
      desktopActions,
      workflowOrchestrator,
      getMachineAwareness: () => null,
      getFileAwareness: () => null,
      getScreenAwareness: () => null
    });

    const result = await service.handleTurn({
      requestId: "req-approve-clarification",
      conversationId: conversation.id,
      text: "approve",
      messages: loaded?.messages ?? [],
      workspaceRoot: root,
      desktopPath: "C:/Users/Pgiov/Desktop",
      documentsPath: "C:/Users/Pgiov/Documents",
      runtimeRoot,
      getMachineAwareness: () => null,
      getFileAwareness: () => null,
      getScreenAwareness: () => null
    });

    expect(result.handled).toBe(true);
    expect(result.executionResult?.status).toBe("clarification_needed");
    expect(result.taskState?.executionStatus).toBe("clarification_needed");
    expect(result.taskState?.clarification).toEqual({
      question: "Which exact Documents subfolder should I save the report to?",
      missingFields: ["saveTo"]
    });
    expect(result.assistantReply).toContain("I need one detail before I can continue");
    expect(approvalIssued).toBe(1);
    expect(executionCalled).toBe(1);

    await rm(root, { recursive: true, force: true });
  });

  it("executes the history-failed desktop navigation prompts from chat", async () => {
    const root = join(tmpdir(), `synai-test-${Date.now()}-governed-chat-desktop`);
    const dbPath = join(root, "memory.json");
    const runtimeRoot = join(root, "runtime", "governance");
    configureMemoryDatabase(dbPath);

    const host = buildDesktopActionHost();
    const desktopActions = createDesktopActionService({
      workspaceRoot: root,
      runtimeRoot,
      host
    });

    const workflowOrchestrator = {
      suggestWorkflow: async () => null,
      issueWorkflowApproval: async () => {
        throw new Error("workflow approval should not be requested");
      },
      executeWorkflow: async () => {
        throw new Error("workflow execution should not be requested");
      }
    };

    const service = createGovernedChatService({
      workspaceRoot: root,
      runtimeRoot,
      desktopActions,
      workflowOrchestrator,
      getMachineAwareness: () => null,
      getFileAwareness: () => null,
      getScreenAwareness: () => null
    });

    try {
      const settingsResult = await service.handleTurn({
        requestId: "req-settings",
        conversationId: "conv-settings",
        text: "open windows settings",
        messages: [],
        workspaceRoot: root,
        desktopPath: "C:/Users/Pgiov/Desktop",
        documentsPath: "C:/Users/Pgiov/Documents",
        runtimeRoot,
        getMachineAwareness: () => null,
        getFileAwareness: () => null,
        getScreenAwareness: () => null
      });

      expect(settingsResult.handled).toBe(true);
      expect(settingsResult.route?.actionType).toBe("desktop-system-navigation");
      expect(settingsResult.executionResult?.status).toBe("executed");
      expect(host.openTarget).toHaveBeenCalledWith("ms-settings:");

      const explorerResult = await service.handleTurn({
        requestId: "req-explorer",
        conversationId: "conv-explorer",
        text: "open explorer",
        messages: [],
        workspaceRoot: root,
        desktopPath: "C:/Users/Pgiov/Desktop",
        documentsPath: "C:/Users/Pgiov/Documents",
        runtimeRoot,
        getMachineAwareness: () => null,
        getFileAwareness: () => null,
        getScreenAwareness: () => null
      });

      expect(explorerResult.handled).toBe(true);
      expect(explorerResult.route?.actionType).toBe("desktop-system-navigation");
      expect(explorerResult.executionResult?.status).toBe("executed");
      expect(host.launchProgram).toHaveBeenCalledWith("explorer", [], null);

      const addRemoveResult = await service.handleTurn({
        requestId: "req-add-remove",
        conversationId: "conv-add-remove",
        text: "windows add remove program",
        messages: [],
        workspaceRoot: root,
        desktopPath: "C:/Users/Pgiov/Desktop",
        documentsPath: "C:/Users/Pgiov/Documents",
        runtimeRoot,
        getMachineAwareness: () => null,
        getFileAwareness: () => null,
        getScreenAwareness: () => null
      });

      expect(addRemoveResult.handled).toBe(true);
      expect(addRemoveResult.route?.actionType).toBe("desktop-system-navigation");
      expect(addRemoveResult.executionResult?.status).toBe("executed");
      expect(host.openTarget).toHaveBeenCalledWith("ms-settings:appsfeatures");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
