import { describe, expect, it, vi } from "vitest";
import { createDesktopActionRuntimeAdapter } from "../../apps/desktop/electron/agent-runtime-adapters";

describe("agent runtime desktop adapter", () => {
  it("preserves clarification-needed status and payload", async () => {
    const desktopActions = {
      listDesktopActions: vi.fn(() => []),
      executeDesktopAction: vi.fn(async () => ({
        proposalId: "proposal-1",
        kind: "open-file" as const,
        scope: "workspace" as const,
        targetKind: "path" as const,
        target: "",
        status: "clarification_needed" as const,
        commandId: null,
        commandHash: null,
        preview: "open-file target",
        summary: "Clarification needed before opening the file.",
        riskClass: "medium" as const,
        approvalRequired: false,
        approvedBy: "qa-operator",
        startedAt: null,
        completedAt: null,
        reason: "missing-required-target",
        message: "Which file should I open?",
        clarification: {
          question: "Which file should I open?",
          missingFields: ["target"]
        }
      }))
    };

    const adapter = createDesktopActionRuntimeAdapter(desktopActions as never);
    const result = await adapter.execute(
      {
        id: "proposal-1",
        createdAt: "2026-04-10T00:00:00.000Z",
        requestId: "request-1",
        taskId: "task-1",
        jobId: "job-1",
        stepId: "step-1",
        adapterId: "synai-desktop-actions",
        actionId: "open-file",
        title: "Open a file",
        summary: "Open the requested file.",
        preview: "open-file",
        normalizedInput: {
          proposalId: "proposal-1",
          kind: "open-file",
          scope: "workspace",
          targetKind: "path",
          target: ""
        },
        risk: "medium",
        sideEffect: "reads_state",
        approvalRequired: false,
        dryRun: false,
        capabilityStatus: "supported",
        bindingHash: "binding-1"
      },
      {
        id: "ctx-1",
        startedAt: "2026-04-10T00:00:00.000Z",
        agentId: "agent-1",
        userId: "qa-operator"
      }
    );

    expect(result.status).toBe("clarification_needed");
    expect(result.clarification).toEqual({
      question: "Which file should I open?",
      missingFields: ["target"],
      options: undefined
    });
  });
});
