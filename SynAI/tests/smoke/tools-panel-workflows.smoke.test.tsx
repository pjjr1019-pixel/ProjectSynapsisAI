// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
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

describe("tools-panel workflows smoke", () => {
  it("shows the Workflows tab and renders the orchestration card", () => {
    Object.assign(window, {
      synai: {
        suggestWorkflow: async () => null,
        issueWorkflowApproval: async () => null,
        executeWorkflow: async () => null,
        subscribeWorkflowProgress: () => () => {}
      }
    });

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

    expect(screen.getByRole("tab", { name: "Workflows" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Workflows" }));
    expect(screen.getByText("Workflow Orchestration")).toBeInTheDocument();
  });
});
