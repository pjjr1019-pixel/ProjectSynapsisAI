import { useState } from "react";
import type {
  ContextPreview,
  MemoryEntry,
  ModelHealth,
  ScreenAwarenessStatus,
  StartAssistModeOptions
} from "@contracts";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import type { HealthCheckState, WorkspaceToolTab } from "../types/localChat.types";
import { LocalModelStatus } from "./LocalModelStatus";
import { ChatControls } from "./ChatControls";
import { MemoryInspector } from "./MemoryInspector";
import { ContextPreview as ContextPreviewCard } from "./ContextPreview";
import { MemoryPanel } from "../../memory/components/MemoryPanel";
import { featureRegistry } from "../../feature-registry";
import { cn } from "../../../shared/utils/cn";
import { PromptEvaluationCard } from "./PromptEvaluationCard";
import type { ChatSettingsState } from "../types/localChat.types";

interface ToolsPanelProps {
  settings: ChatSettingsState;
  modelHealth: ModelHealth | null;
  screenStatus: ScreenAwarenessStatus | null;
  loading: boolean;
  healthCheckState: HealthCheckState;
  healthCheckMessage: string | null;
  promptEvaluationRunning: boolean;
  promptEvaluationResult: import("@contracts").PromptEvaluationResponse | null;
  promptEvaluationError: string | null;
  onRunHealthCheck: () => Promise<void>;
  onNewConversation: () => Promise<void>;
  onClearChat: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onRefreshMemory: () => Promise<void>;
  onCopyResponse: () => Promise<void>;
  onRunPromptEvaluation: (request: import("@contracts").PromptEvaluationRequest) => Promise<void>;
  onStartAssistMode: (options: StartAssistModeOptions) => Promise<void>;
  onStopAssistMode: (reason?: string) => Promise<void>;
  preview: ContextPreview | null;
  memories: MemoryEntry[];
}

const toolTabs: Array<{ id: WorkspaceToolTab; label: string }> = [
  { id: "model", label: "Model" },
  { id: "actions", label: "Actions" },
  { id: "memory", label: "Memory" },
  { id: "context", label: "Context" },
  { id: "search", label: "Search" }
];

export function ToolsPanel(props: ToolsPanelProps) {
  const [activeToolTab, setActiveToolTab] = useState<WorkspaceToolTab>("model");
  const [assistScope, setAssistScope] = useState<StartAssistModeOptions["scope"]>("current-window");
  const [assistTargetLabel, setAssistTargetLabel] = useState("");
  const [assistCaptureMode, setAssistCaptureMode] = useState<StartAssistModeOptions["captureMode"]>("session");
  const [assistSampleIntervalMs, setAssistSampleIntervalMs] = useState("2000");

  const startAssist = async (): Promise<void> => {
    await props.onStartAssistMode({
      scope: assistScope,
      targetLabel: assistTargetLabel.trim() || undefined,
      captureMode: assistCaptureMode,
      sampleIntervalMs: assistCaptureMode === "session" ? Number.parseInt(assistSampleIntervalMs, 10) || 2000 : null
    });
  };

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60">
      <header className="border-b border-slate-800 px-2.5 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Tools</h2>
            <p className="text-[9px] text-slate-400">One panel at a time keeps the workspace compact.</p>
          </div>
          <Badge tone="neutral">Compact</Badge>
        </div>
        <div role="tablist" aria-label="Tool tabs" className="mt-1.5 grid grid-cols-5 gap-1">
          {toolTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeToolTab === tab.id}
              className={cn(
                "rounded-md px-2 py-1 text-[9px] font-medium transition",
                activeToolTab === tab.id
                  ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40"
                  : "bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
              onClick={() => setActiveToolTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden p-1.5">
        {activeToolTab === "model" ? (
          <div className="flex h-full min-h-0 flex-col gap-1.5 overflow-y-auto pr-1">
            <LocalModelStatus modelHealth={props.modelHealth} />
            <Card className="space-y-2 p-1.5">
              <h3 className="text-[10px] font-semibold text-slate-100">Feature Stages</h3>
              <div className="flex flex-wrap gap-1">
                {featureRegistry.map((feature) => (
                  <Badge key={feature.id} tone={feature.status === "active" ? "good" : "neutral"}>
                    {feature.label}
                  </Badge>
                ))}
              </div>
            </Card>
          </div>
        ) : null}

        {activeToolTab === "actions" ? (
          <div className="flex h-full min-h-0 flex-col gap-1.5 overflow-y-auto pr-1">
            <PromptEvaluationCard
              settings={props.settings}
              running={props.promptEvaluationRunning}
              result={props.promptEvaluationResult}
              error={props.promptEvaluationError}
              onRun={props.onRunPromptEvaluation}
            />

            <Card className="space-y-2 p-1.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold text-slate-100">Assist Mode</h3>
                  <p className="text-[9px] text-slate-400">Explicit, visible screen awareness for approved sessions.</p>
                </div>
                <Badge tone={props.screenStatus?.assistMode.enabled ? "good" : "neutral"}>
                  {props.screenStatus?.assistMode.enabled ? "On" : "Off"}
                </Badge>
              </div>

              <div className="grid gap-2 text-[9px] text-slate-300">
                <label className="grid gap-1">
                  <span className="text-slate-400">Scope</span>
                  <select
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-100"
                    value={assistScope}
                    onChange={(event) => setAssistScope(event.target.value as StartAssistModeOptions["scope"])}
                  >
                    <option value="current-window">Current window</option>
                    <option value="selected-app">Selected app</option>
                    <option value="chosen-display">Chosen display</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-slate-400">Target label</span>
                  <input
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-100"
                    value={assistTargetLabel}
                    placeholder="Optional app or display label"
                    onChange={(event) => setAssistTargetLabel(event.target.value)}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-slate-400">Capture mode</span>
                  <select
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-100"
                    value={assistCaptureMode}
                    onChange={(event) => setAssistCaptureMode(event.target.value as StartAssistModeOptions["captureMode"])}
                  >
                    <option value="on-demand">On demand</option>
                    <option value="session">Session sampling</option>
                  </select>
                </label>

                {assistCaptureMode === "session" ? (
                  <label className="grid gap-1">
                    <span className="text-slate-400">Sample interval (ms)</span>
                    <input
                      type="number"
                      min={250}
                      step={250}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-100"
                      value={assistSampleIntervalMs}
                      onChange={(event) => setAssistSampleIntervalMs(event.target.value)}
                    />
                  </label>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button className="py-1 text-[10px]" variant="ghost" disabled={props.loading} onClick={() => void startAssist()}>
                  Start Assist
                </Button>
                <Button
                  className="py-1 text-[10px]"
                  variant="ghost"
                  disabled={props.loading || !props.screenStatus?.assistMode.enabled}
                  onClick={() => void props.onStopAssistMode("user-disabled")}
                >
                  Stop Assist
                </Button>
              </div>

              <p className="text-[9px] text-slate-400">
                {props.screenStatus?.summary ?? "Assist mode is off until you start an explicit session."}
              </p>
              {props.screenStatus?.assistMode.enabled ? (
                <p className="text-[9px] text-emerald-300">
                  Active window: {props.screenStatus.foregroundWindowTitle ?? "unknown"} | Scope:{" "}
                  {props.screenStatus.scope ?? "current-window"}
                </p>
              ) : null}
            </Card>

            <ChatControls
              loading={props.loading}
              healthCheckState={props.healthCheckState}
              healthCheckMessage={props.healthCheckMessage}
              onRunHealthCheck={props.onRunHealthCheck}
              onNewConversation={props.onNewConversation}
              onClearChat={props.onClearChat}
              onRegenerate={props.onRegenerate}
              onRefreshMemory={props.onRefreshMemory}
              onCopyResponse={props.onCopyResponse}
            />
          </div>
        ) : null}

        {activeToolTab === "memory" ? (
          <MemoryInspector preview={props.preview} memories={props.memories} compact hideTitle />
        ) : null}

        {activeToolTab === "context" ? (
          <ContextPreviewCard preview={props.preview} compact hideTitle />
        ) : null}

        {activeToolTab === "search" ? <MemoryPanel compact hideTitle /> : null}
      </div>
    </section>
  );
}
