import { Badge } from "../../../shared/components/Badge";
import { Card } from "../../../shared/components/Card";
import { featureRegistry } from "../../feature-registry";
import type { ChatSettingsState } from "../types/localChat.types";
import { ChatSettings } from "./ChatSettings";

interface SettingsPanelProps {
  settings: ChatSettingsState;
  availableModels: string[];
  onUpdateSettings: (patch: Partial<ChatSettingsState>) => Promise<void>;
}

export function SettingsPanel({ settings, availableModels, onUpdateSettings }: SettingsPanelProps) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60">
      <header className="border-b border-slate-800 px-2.5 py-1.5">
        <h2 className="text-sm font-semibold text-slate-100">Settings</h2>
        <p className="text-[9px] text-slate-400">Model, search, and reply style live here.</p>
      </header>
      <div className="grid gap-1.5 overflow-hidden p-2">
        <ChatSettings
          settings={settings}
          availableModels={availableModels}
          onUpdateSettings={onUpdateSettings}
          hideTitle
        />
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
    </section>
  );
}
