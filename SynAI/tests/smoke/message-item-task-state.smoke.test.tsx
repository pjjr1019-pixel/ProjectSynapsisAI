// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageItem } from "../../apps/desktop/src/features/local-chat/components/MessageItem";
import type { ChatMessage } from "../../packages/Awareness-Reasoning/src/contracts/chat";

const baseTask = {
  requestId: "req-1",
  interpretedIntent: "Run a governed workflow.",
  actionType: "workflow",
  riskTier: "tier-1",
  decision: "require_approval",
  requiresExecution: true,
  approvalRequired: true,
  approvalReason: "Fresh approval required.",
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
    reason: "Fresh approval required.",
    approver: null,
    tokenId: null,
    expiresAt: null
  },
  executionSummary: "Workflow queued.",
  verificationSummary: "Verification pending.",
  gapClass: null,
  remediationSummary: null,
  artifacts: []
};

describe("message item task state smoke", () => {
  it("renders governed task badges in assistant messages", () => {
    const message: ChatMessage = {
      id: "message-1",
      conversationId: "conversation-1",
      role: "assistant",
      content: "I can do that once it is approved.",
      createdAt: "2026-04-10T12:00:00.000Z",
      metadata: {
        task: baseTask
      }
    };

    render(<MessageItem message={message} />);

    expect(screen.getByText(/Approval pending/i)).toBeInTheDocument();
    expect(screen.getByText(/workflow-orchestrator/i)).toBeInTheDocument();
    expect(screen.getByText(/Verification pending/i)).toBeInTheDocument();
  });
});
