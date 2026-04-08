import type { ChatSettingsState } from "../types/localChat.types";
import { Card } from "../../../shared/components/Card";
import { cn } from "../../../shared/utils/cn";

interface ChatSettingsProps {
  settings: ChatSettingsState;
  availableModels: string[];
  onUpdateSettings: (patch: Partial<ChatSettingsState>) => Promise<void>;
  className?: string;
  hideTitle?: boolean;
}

const responseModeHelp: Record<ChatSettingsState["responseMode"], string> = {
  fast: "Shorter, quicker answers.",
  balanced: "A good speed and quality mix.",
  smart: "More thorough and careful replies."
};

export function ChatSettings({
  settings,
  availableModels,
  onUpdateSettings,
  className,
  hideTitle = false
}: ChatSettingsProps) {
  const modelOptions =
    availableModels.length > 0
      ? availableModels
      : settings.selectedModel
        ? [settings.selectedModel]
        : [];

  return (
    <Card className={cn("space-y-2 p-2", className)}>
      {hideTitle ? null : (
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Chat Settings</h3>
          <p className="mt-0.5 text-[10px] text-slate-500">Saved automatically on this device.</p>
        </div>
      )}

      <label className="block space-y-1">
        <span className="text-[10px] text-slate-300">Default model</span>
        <select
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-100"
          value={settings.selectedModel}
          onChange={(event) => void onUpdateSettings({ selectedModel: event.target.value })}
        >
          {modelOptions.length === 0 ? <option value="">No models detected</option> : null}
          {modelOptions.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-400"
          checked={settings.defaultWebSearch}
          onChange={(event) => void onUpdateSettings({ defaultWebSearch: event.target.checked })}
        />
        Use recent web search by default
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] text-slate-300">Reply style</span>
        <select
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-100"
          value={settings.responseMode}
          onChange={(event) =>
            void onUpdateSettings({
              responseMode: event.target.value as ChatSettingsState["responseMode"]
            })
          }
        >
          <option value="fast">Fast</option>
          <option value="balanced">Balanced</option>
          <option value="smart">Smart</option>
        </select>
        <p className="text-[10px] text-slate-500">{responseModeHelp[settings.responseMode]}</p>
      </label>
    </Card>
  );
}
