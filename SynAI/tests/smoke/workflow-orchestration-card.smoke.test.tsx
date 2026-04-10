// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type {
  ApprovalToken,
  SynAIBridge,
  WorkflowExecutionResult,
  WorkflowPlan,
  WorkflowProgressEvent
} from "@contracts";
import { WorkflowOrchestrationCard } from "../../apps/desktop/src/features/local-chat/components/WorkflowOrchestrationCard";

const samplePlan: WorkflowPlan = {
  requestId: "workflow-1",
  prompt: "research the current state of AI and write a report and save it in my documents",
  normalizedPrompt: "research the current state of ai and write a report and save it in my documents",
  family: "research-report",
  summary: "Research the topic and save a report to Documents.",
  steps: [
    {
      id: "collect-web",
      kind: "collect-web",
      title: "Collect web evidence",
      summary: "Collect the latest web results.",
      approvalRequired: false,
      riskClass: "low",
      query: "current state of AI"
    },
    {
      id: "write-report",
      kind: "write-markdown",
      title: "Write markdown report",
      summary: "Save a concise markdown report.",
      approvalRequired: false,
      riskClass: "low",
      saveTo: "documents",
      fileName: "ai-report.md"
    }
  ],
  evidence: [],
  artifacts: [
    {
      id: "report",
      kind: "markdown",
      label: "Research report",
      saveTo: "documents",
      fileName: "ai-report.md",
      description: "Saved research report"
    }
  ],
  clarificationNeeded: [],
  approvalRequired: true,
  approvalReason: "Workflow approval required.",
  workflowHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  targetPaths: ["C:/Users/Alex/Documents/ai-report.md"],
  createdAt: "2026-04-10T00:00:00.000Z"
};

const issuedToken: ApprovalToken = {
  tokenId: "token-1",
  commandHash: "hash-1",
  approver: "qa-operator",
  issuedAt: "2026-04-10T00:00:00.000Z",
  expiresAt: "2026-04-10T00:10:00.000Z",
  signature: "abc123"
};

describe("workflow-orchestration-card smoke", () => {
  let workflowProgressListener: ((event: WorkflowProgressEvent) => void) | null = null;

  const suggestWorkflow = vi.fn(async () => samplePlan);
  const issueWorkflowApproval = vi.fn(async () => issuedToken);
  const executeWorkflow = vi.fn(async (): Promise<WorkflowExecutionResult> => {
    workflowProgressListener?.({
      workflowId: samplePlan.requestId,
      workflowHash: samplePlan.workflowHash,
      plan: samplePlan,
      status: "executed",
      currentStepId: "write-report",
      currentStepIndex: 1,
      stepCount: samplePlan.steps.length,
      completedStepIds: ["collect-web", "write-report"],
      stepResults: [
        {
          id: "collect-web",
          kind: "collect-web",
          status: "executed",
          summary: "Collected web results.",
          startedAt: "2026-04-10T00:00:00.000Z",
          completedAt: "2026-04-10T00:00:00.100Z"
        }
      ],
      artifactPaths: ["C:/Users/Alex/Documents/ai-report.md"],
      summary: "Workflow executed."
    });

    return {
      workflowId: samplePlan.requestId,
      workflowHash: samplePlan.workflowHash,
      plan: samplePlan,
      status: "simulated",
      summary: "Workflow simulated.",
      reportMarkdown: "# Research Report\n\n## Summary\nDetailed research findings.\n\n## Evidence\n- Collected web results.",
      reportSummary: "A concise research report.",
      approvalRequired: true,
      approvedBy: "qa-operator",
      commandId: "cmd-1",
      commandHash: "hash-1",
      startedAt: "2026-04-10T00:00:00.000Z",
      completedAt: "2026-04-10T00:00:00.100Z",
      currentStepId: "write-report",
      completedStepIds: ["collect-web", "write-report"],
      stepResults: [],
      artifactPaths: ["C:/Users/Alex/Documents/ai-report.md"]
    };
  });

  const subscribeWorkflowProgress = vi.fn((listener: (event: WorkflowProgressEvent) => void) => {
    workflowProgressListener = listener;
    return () => {
      workflowProgressListener = null;
    };
  });

  beforeEach(() => {
    suggestWorkflow.mockClear();
    issueWorkflowApproval.mockClear();
    executeWorkflow.mockClear();
    subscribeWorkflowProgress.mockClear();
    workflowProgressListener = null;
    const bridge = {
      suggestWorkflow,
      issueWorkflowApproval,
      executeWorkflow,
      subscribeWorkflowProgress
    } as unknown as SynAIBridge;
    Object.assign(window, {
      synai: bridge
    });
  });

  it("renders the workflow planning flow, validates approval JSON inline, and shows progress", async () => {
    render(<WorkflowOrchestrationCard />);

    expect(screen.getByText("Workflow Orchestration")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Goal or prompt"), {
      target: { value: "research the current state of AI and write a report and save it in my documents" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Suggest Plan" }));

    await waitFor(() => expect(suggestWorkflow).toHaveBeenCalledTimes(1));
    expect(screen.getByText("research-report")).toBeInTheDocument();
    expect(screen.getByText(/Research the topic and save a report to Documents\./i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Token JSON"), { target: { value: "{bad json" } });
    expect(await screen.findByText("Approval token JSON is invalid.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Issue Approval" }));
    await waitFor(() => expect(issueWorkflowApproval).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Approval token JSON is invalid.")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue(/token-1/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Execute Plan" }));
    await waitFor(() => expect(executeWorkflow).toHaveBeenCalledTimes(1));
    expect(screen.getAllByText("Workflow simulated.").length).toBeGreaterThan(0);
    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("Artifacts")).toBeInTheDocument();
    expect(screen.getAllByText(/ai-report\.md/).length).toBeGreaterThan(0);
    expect(screen.getByText("Last Result")).toBeInTheDocument();
    expect(screen.getByText("Report summary")).toBeInTheDocument();
    expect(screen.getByText("A concise research report.")).toBeInTheDocument();
    expect(screen.getByText("Report preview")).toBeInTheDocument();
  });
});
