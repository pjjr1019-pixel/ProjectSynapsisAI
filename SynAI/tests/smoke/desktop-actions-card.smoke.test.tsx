// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { SynAIBridge } from "@contracts";
import { DesktopActionsCard } from "../../apps/desktop/src/features/local-chat/components/DesktopActionsCard";

const issuedToken = {
  tokenId: "token-1",
  commandHash: "hash-1",
  approver: "qa-operator",
  issuedAt: "2026-04-10T00:00:00.000Z",
  expiresAt: "2026-04-10T00:10:00.000Z",
  signature: "abc123"
};

describe("desktop-actions-card smoke", () => {
  const issueDesktopActionApproval = vi.fn(async () => issuedToken);
  const executeDesktopAction = vi.fn(async () => ({
    proposalId: "launch-program",
    kind: "launch-program" as const,
    scope: "application" as const,
    targetKind: "program" as const,
    target: "notepad.exe",
    status: "simulated" as const,
    commandId: "cmd-1",
    commandHash: "hash-1",
    preview: "spawn notepad.exe",
    summary: "Action simulated.",
    riskClass: "low" as const,
    approvalRequired: false,
    approvedBy: "qa-operator",
    startedAt: "2026-04-10T00:00:00.000Z",
    completedAt: "2026-04-10T00:00:00.100Z",
    output: null
  }));

  beforeEach(() => {
    issueDesktopActionApproval.mockClear();
    executeDesktopAction.mockClear();
    const bridge = {
      issueDesktopActionApproval,
      executeDesktopAction
    } as unknown as SynAIBridge;
    Object.assign(window, {
      synai: bridge
    });
  });

  it("renders the action proposal flow and handles invalid approval token JSON inline", async () => {
    render(<DesktopActionsCard />);

    expect(screen.getByText("Desktop Actions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suggest Action" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Goal or prompt"), { target: { value: "launch program" } });
    fireEvent.click(screen.getByRole("button", { name: "Suggest Action" }));

    await waitFor(() => expect(screen.getByLabelText("Action")).toHaveValue("launch-program"));
    expect(await screen.findByText(/spawn/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Target"), { target: { value: "notepad.exe" } });
    fireEvent.change(screen.getByLabelText("Approval token"), { target: { value: "{bad json" } });
    expect(await screen.findByText("Approval token JSON is invalid.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Issue Approval" }));
    await waitFor(() => expect(issueDesktopActionApproval).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Approval token JSON is invalid.")).not.toBeInTheDocument();
    expect(screen.getByText(/token-1/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Run Preview" }));
    await waitFor(() => expect(executeDesktopAction).toHaveBeenCalledTimes(1));
    expect(screen.getAllByText("Action simulated.").length).toBeGreaterThan(0);
    expect(screen.getByText(/Last result/)).toBeInTheDocument();
  });
});
