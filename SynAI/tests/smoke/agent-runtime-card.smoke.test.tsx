// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type {
  AgentRuntimeInspection,
  AgentRuntimeRunResult,
  RuntimeJob,
  RuntimeProgressEvent,
  SynAIBridge,
  WorkflowExecutionResult,
  WorkflowPlan,
  WorkflowProgressEvent
} from "@contracts";
import type { ChatSettingsState } from "../../apps/desktop/src/features/local-chat/types/localChat.types";
import { ToolsPanel } from "../../apps/desktop/src/features/local-chat/components/ToolsPanel";

const settings: ChatSettingsState = {
  selectedModel: "phi4-mini:latest",
  defaultWebSearch: false,
  advancedRagEnabled: true,
  workspaceIndexingEnabled: true,
  webInRagEnabled: true,
  liveTraceVisible: false,
  responseMode: "balanced",
  awarenessAnswerMode: "evidence-first"
};

const samplePlan: WorkflowPlan = {
  requestId: "workflow-1",
  prompt: "orchestrate runtime work",
  normalizedPrompt: "orchestrate runtime work",
  family: "runtime",
  summary: "Runtime orchestration plan.",
  steps: [],
  evidence: [],
  artifacts: [],
  clarificationNeeded: [],
  approvalRequired: false,
  approvalReason: "none",
  workflowHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  targetPaths: [],
  createdAt: "2026-04-10T00:00:00.000Z"
};

describe("agent-runtime-card smoke", () => {
  let runtimeProgressListener: ((event: RuntimeProgressEvent) => void) | null = null;
  let workflowProgressListener: ((event: WorkflowProgressEvent) => void) | null = null;

  const seedJob: RuntimeJob = {
    id: "runtime-job-1",
    createdAt: "2026-04-10T00:00:00.000Z",
    status: "running",
    taskId: "task-1",
    planId: "plan-1",
    activeStepId: "step-1",
    stepIds: ["step-1"],
    completedStepIds: [],
    attemptIds: [],
    checkpointIds: ["checkpoint-1"],
    auditEventIds: ["audit-1"],
    resumeCount: 0,
    recoverable: true,
    cancellable: true
  };

  const runtimeInspection = {
    job: seedJob,
    task: {
      id: "task-1",
      createdAt: "2026-04-10T00:00:00.000Z",
      updatedAt: "2026-04-10T00:00:00.000Z",
      status: "running",
      title: "Inspect current runtime state",
      description: "Review recent jobs and confirm the latest checkpoint.",
      steps: ["Review recent jobs", "Confirm checkpoint"],
      metadata: { source: "test" }
    },
    plannedSteps: [
      {
        id: "step-1",
        taskId: "task-1",
        createdAt: "2026-04-10T00:00:00.000Z",
        updatedAt: "2026-04-10T00:00:00.000Z",
        status: "in_progress",
        name: "Review recent jobs",
        skill: "echo",
        input: { text: "Inspect" }
      }
    ],
    executionAttempts: [],
    policyDecision: {
      id: "policy-1",
      decidedAt: "2026-04-10T00:00:00.000Z",
      contextId: "ctx-1",
      type: "allow",
      reason: "Safe runtime inspection.",
      approvalRequired: false,
      bindingHash: "binding-1"
    },
    verification: {
      id: "verification-1",
      createdAt: "2026-04-10T00:00:00.000Z",
      stepId: "step-1",
      status: "passed",
      summary: "Inspection verified.",
      issues: [],
      evidenceIds: []
    },
    result: {
      id: "result-1",
      status: "success",
      summary: "Job inspected.",
      policyDecision: {
        id: "policy-1",
        decidedAt: "2026-04-10T00:00:00.000Z",
        contextId: "ctx-1",
        type: "allow",
        reason: "Safe runtime inspection.",
        approvalRequired: false,
        bindingHash: "binding-1"
      },
      verification: {
        id: "verification-1",
        createdAt: "2026-04-10T00:00:00.000Z",
        stepId: "step-1",
        status: "passed",
        summary: "Inspection verified.",
        issues: [],
        evidenceIds: []
      }
    },
    latestCheckpoint: {
      id: "checkpoint-1",
      jobId: "runtime-job-1",
      createdAt: "2026-04-10T00:00:00.000Z",
      phase: "inspect",
      summary: "Checkpoint saved.",
      activeStepId: "step-1",
      completedStepIds: [],
      continuation: {
        mode: "reconstructed",
        resumable: false,
        sourceCheckpointId: "checkpoint-1",
        limitation: "Inspection is reconstructive only.",
      },
      state: { phase: "inspect" }
    },
    checkpoints: [],
    observations: [],
    auditTrail: [
      {
        id: "audit-1",
        occurredAt: "2026-04-10T00:00:00.000Z",
        actorId: "agent-runtime",
        taskId: "task-1",
        stage: "runtime",
        event: "inspect-started"
      },
      {
        id: "audit-2",
        occurredAt: "2026-04-10T00:00:00.100Z",
        actorId: "agent-runtime",
        taskId: "task-1",
        stage: "result",
        event: "inspect-complete"
      }
    ]
  } as unknown as AgentRuntimeInspection;

  const runtimeRunResult = {
    task: {
      id: "task-2",
      createdAt: "2026-04-10T00:00:00.000Z",
      updatedAt: "2026-04-10T00:00:00.000Z",
      status: "completed",
      title: "Inspect current runtime state",
      description: "Review recent jobs and confirm the latest checkpoint.",
      steps: ["Review recent jobs", "Confirm checkpoint"],
      metadata: { source: "smoke" }
    },
    executionContext: {
      id: "ctx-2",
      startedAt: "2026-04-10T00:00:00.000Z",
      agentId: "agent-runtime",
      taskId: "task-2",
      jobId: "runtime-job-2",
      environment: { mode: "test" }
    },
    job: {
      ...seedJob,
      id: "runtime-job-2",
      status: "completed",
      taskId: "task-2",
      activeStepId: "step-2"
    },
    plan: samplePlan,
    plannedStep: {
      id: "step-1",
      taskId: "task-2",
      createdAt: "2026-04-10T00:00:00.000Z",
      updatedAt: "2026-04-10T00:00:00.000Z",
      status: "completed",
      name: "Review recent jobs",
      skill: "echo",
      input: { text: "Inspect" }
    },
    plannedSteps: [
      {
        id: "step-1",
        taskId: "task-2",
        createdAt: "2026-04-10T00:00:00.000Z",
        updatedAt: "2026-04-10T00:00:00.000Z",
        status: "completed",
        name: "Review recent jobs",
        skill: "echo",
        input: { text: "Inspect" }
      },
      {
        id: "step-2",
        taskId: "task-2",
        createdAt: "2026-04-10T00:00:00.000Z",
        updatedAt: "2026-04-10T00:00:00.100Z",
        status: "completed",
        name: "Confirm checkpoint",
        skill: "echo",
        input: { text: "Confirm" }
      }
    ],
    executionAttempts: [],
    observation: {
      id: "obs-1",
      takenAt: "2026-04-10T00:00:00.100Z",
      contextId: "ctx-2",
      data: { status: "ok" },
      evidence: []
    },
    observations: [],
    policyDecision: {
      id: "policy-2",
      decidedAt: "2026-04-10T00:00:00.000Z",
      contextId: "ctx-2",
      type: "allow",
      reason: "Safe runtime execution.",
      approvalRequired: false,
      bindingHash: "binding-2"
    },
    verification: {
      id: "verification-2",
      createdAt: "2026-04-10T00:00:00.100Z",
      taskId: "task-2",
      jobId: "runtime-job-2",
      stepId: "step-2",
      status: "passed",
      summary: "Runtime verified.",
      issues: [],
      evidenceIds: []
    },
    result: {
      id: "result-2",
      status: "success",
      summary: "Runtime completed.",
      policyDecision: {
        id: "policy-2",
        decidedAt: "2026-04-10T00:00:00.000Z",
        contextId: "ctx-2",
        type: "allow",
        reason: "Safe runtime execution.",
        approvalRequired: false,
        bindingHash: "binding-2"
      },
      verification: {
        id: "verification-2",
        createdAt: "2026-04-10T00:00:00.100Z",
        taskId: "task-2",
        jobId: "runtime-job-2",
        stepId: "step-2",
        status: "passed",
        summary: "Runtime verified.",
        issues: [],
        evidenceIds: []
      }
    },
    auditTrail: [
      {
        id: "audit-3",
        occurredAt: "2026-04-10T00:00:00.000Z",
        actorId: "agent-runtime",
        taskId: "task-2",
        stage: "runtime",
        event: "run-started"
      },
      {
        id: "audit-4",
        occurredAt: "2026-04-10T00:00:00.100Z",
        actorId: "agent-runtime",
        taskId: "task-2",
        stage: "result",
        event: "run-complete"
      }
    ],
    checkpoint: {
      id: "checkpoint-2",
      jobId: "runtime-job-2",
      createdAt: "2026-04-10T00:00:00.100Z",
      phase: "complete",
      summary: "Checkpoint saved.",
      activeStepId: "step-2",
      completedStepIds: ["step-1", "step-2"],
      continuation: {
        mode: "reconstructed",
        resumable: false,
        sourceCheckpointId: "checkpoint-2",
        limitation: "Runtime checkpoint is reconstructive only.",
      },
      state: { phase: "complete" }
    }
  } as unknown as AgentRuntimeRunResult;

  const suggestWorkflow = vi.fn(async () => samplePlan);
  const issueWorkflowApproval = vi.fn(async () => null);
  const executeWorkflow = vi.fn(async (): Promise<WorkflowExecutionResult> => ({
    workflowId: samplePlan.requestId,
    workflowHash: samplePlan.workflowHash,
    plan: samplePlan,
    status: "simulated",
    summary: "Workflow simulated.",
    approvalRequired: false,
    approvedBy: "qa-operator",
    commandId: "cmd-1",
    commandHash: "hash-1",
    startedAt: "2026-04-10T00:00:00.000Z",
    completedAt: "2026-04-10T00:00:00.100Z",
    currentStepId: null,
    completedStepIds: [],
    stepResults: [],
    artifactPaths: []
  }));

  const subscribeWorkflowProgress = vi.fn((listener: (event: WorkflowProgressEvent) => void) => {
    workflowProgressListener = listener;
    return () => {
      workflowProgressListener = null;
    };
  });

  const listAgentRuntimeJobs = vi.fn(async () => [seedJob]);
  const inspectAgentRuntimeJob = vi.fn(async () => runtimeInspection);
  const runAgentRuntimeTask = vi.fn(async () => runtimeRunResult);
  const resumeAgentRuntimeJob = vi.fn(async () => runtimeRunResult);
  const cancelAgentRuntimeJob = vi.fn(async () => runtimeInspection);
  const recoverAgentRuntimeJob = vi.fn(async () => runtimeInspection);
  const subscribeAgentRuntimeProgress = vi.fn((listener: (event: RuntimeProgressEvent) => void) => {
    runtimeProgressListener = listener;
    return () => {
      runtimeProgressListener = null;
    };
  });

  beforeEach(() => {
    suggestWorkflow.mockClear();
    issueWorkflowApproval.mockClear();
    executeWorkflow.mockClear();
    subscribeWorkflowProgress.mockClear();
    listAgentRuntimeJobs.mockClear();
    inspectAgentRuntimeJob.mockClear();
    runAgentRuntimeTask.mockClear();
    resumeAgentRuntimeJob.mockClear();
    cancelAgentRuntimeJob.mockClear();
    recoverAgentRuntimeJob.mockClear();
    subscribeAgentRuntimeProgress.mockClear();
    runtimeProgressListener = null;
    workflowProgressListener = null;

    const bridge = {
      suggestWorkflow,
      issueWorkflowApproval,
      executeWorkflow,
      subscribeWorkflowProgress,
      listAgentRuntimeJobs,
      inspectAgentRuntimeJob,
      runAgentRuntimeTask,
      resumeAgentRuntimeJob,
      cancelAgentRuntimeJob,
      recoverAgentRuntimeJob,
      subscribeAgentRuntimeProgress
    } as unknown as SynAIBridge;

    Object.assign(window, {
      synai: bridge
    });
  });

  it("renders the runtime card, safely uses the mocked bridge, and shows runtime snapshots", async () => {
    render(
      <ToolsPanel
        settings={settings}
        modelHealth={null}
        screenStatus={null}
        loading={false}
        healthCheckState="idle"
        healthCheckMessage={null}
        promptEvaluationRunning={false}
        promptEvaluationResult={null}
        promptEvaluationError={null}
        onRunHealthCheck={async () => {}}
        onNewConversation={async () => {}}
        onClearChat={async () => {}}
        onRegenerate={async () => {}}
        onRefreshMemory={async () => {}}
        onCopyResponse={async () => {}}
        onRunPromptEvaluation={async () => {}}
        onStartAssistMode={async () => {}}
        onStopAssistMode={async () => {}}
        preview={null}
        memories={[]}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: "Workflows" }));
    expect(await screen.findByText("Agent Runtime")).toBeInTheDocument();

    await waitFor(() => expect(subscribeAgentRuntimeProgress).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(listAgentRuntimeJobs).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Inspect runtime state" } });
    fireEvent.change(screen.getByLabelText("Description / step outline"), {
      target: { value: "Review jobs\nConfirm checkpoint" }
    });
    fireEvent.change(screen.getByLabelText("Metadata JSON"), { target: { value: '{"source":"smoke"}' } });
    fireEvent.click(screen.getByRole("button", { name: "Run Runtime Task" }));

    await waitFor(() => expect(runAgentRuntimeTask).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Last Snapshot")).toBeInTheDocument();
    expect(screen.getByText("Policy Decision")).toBeInTheDocument();
    expect(screen.getByText("Verification")).toBeInTheDocument();
    expect(screen.getByText("Checkpoint Summary")).toBeInTheDocument();
    expect(screen.getByText("Continuation")).toBeInTheDocument();
    expect(screen.getByText("reconstruction only")).toBeInTheDocument();
    expect(screen.getByText("Audit Trail")).toBeInTheDocument();

    expect(runtimeProgressListener).not.toBeNull();
    await act(async () => {
      runtimeProgressListener?.({
        id: "progress-1",
        occurredAt: "2026-04-10T00:00:00.200Z",
        taskId: "task-2",
        jobId: "runtime-job-2",
        status: "running",
        currentStepId: "step-2",
        currentStepIndex: 1,
        stepCount: 2,
        completedStepIds: ["step-1"],
        checkpointId: "checkpoint-2",
        summary: "Working through the runtime task."
      });
    });
    expect(await screen.findByText(/Progress: Working through the runtime task\./)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /runtime-job-1/i }));
    await waitFor(() => expect(inspectAgentRuntimeJob).toHaveBeenCalledWith("runtime-job-1"));

    fireEvent.click(screen.getByRole("button", { name: "Resume Selected" }));
    await waitFor(() => expect(resumeAgentRuntimeJob).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Cancel Selected" }));
    await waitFor(() => expect(cancelAgentRuntimeJob).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Recover Selected" }));
    await waitFor(() => expect(recoverAgentRuntimeJob).toHaveBeenCalledTimes(1));
  });
});
