import { useState } from "react";
import type { ContextPreview, MemoryEntry, ModelHealth } from "@contracts";
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

interface ToolsPanelProps {
  modelHealth: ModelHealth | null;
  loading: boolean;
  healthCheckState: HealthCheckState;
  healthCheckMessage: string | null;
  onRunHealthCheck: () => Promise<void>;
  onNewConversation: () => Promise<void>;
  onClearChat: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onRefreshMemory: () => Promise<void>;
  onCopyResponse: () => Promise<void>;
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

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60">
      <header className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Tools</h2>
            <p className="text-[10px] text-slate-400">One panel at a time keeps the workspace compact.</p>
          </div>
          <Badge tone="neutral">Compact</Badge>
        </div>
        <div role="tablist" aria-label="Tool tabs" className="mt-2 grid grid-cols-5 gap-1">
          {toolTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeToolTab === tab.id}
              className={cn(
                "rounded-md px-2 py-1 text-[10px] font-medium transition",
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

      <div className="flex-1 overflow-hidden p-2">
        {activeToolTab === "model" ? (
          <div className="space-y-2">
            <LocalModelStatus modelHealth={props.modelHealth} />
            <Card className="space-y-2 p-2">
              <h3 className="text-xs font-semibold text-slate-100">Feature Stages</h3>
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
