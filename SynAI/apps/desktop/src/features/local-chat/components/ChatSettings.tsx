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

const awarenessModeHelp: Record<ChatSettingsState["awarenessAnswerMode"], string> = {
  "evidence-first": "Grounded, machine-specific answers using local evidence on every turn.",
  "llm-primary": "Normal conversational mode with awareness context as support."
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
    <Card className={cn("space-y-2 p-1.5", className)}>
      {hideTitle ? null : (
        <div>
          <h3 className="text-xs font-semibold text-slate-100">Chat Settings</h3>
          <p className="mt-0.5 text-[9px] text-slate-500">Saved automatically on this device.</p>
        </div>
      )}

      <label className="block space-y-1">
        <span className="text-[9px] text-slate-300">Default model</span>
        <select
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-100"
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

      <label className="flex items-center gap-2 text-[10px] text-slate-300">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-400"
          checked={settings.defaultWebSearch}
          onChange={(event) => void onUpdateSettings({ defaultWebSearch: event.target.checked })}
        />
        Use recent web search by default
      </label>

      <label className="flex items-center gap-2 text-[10px] text-slate-300">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-400"
          checked={settings.codingModeEnabled}
          onChange={(event) => void onUpdateSettings({ codingModeEnabled: event.target.checked })}
        />
        Enable Coding Mode by default
      </label>

      <label className="flex items-center gap-2 text-[10px] text-slate-300">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-400"
          checked={settings.highQualityModeEnabled}
          onChange={(event) => void onUpdateSettings({ highQualityModeEnabled: event.target.checked })}
        />
        Enable High Quality Mode by default
      </label>

      <label className="flex items-center gap-2 text-[10px] text-slate-300">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-400"
          checked={settings.workspaceIndexingEnabled}
          onChange={(event) => void onUpdateSettings({ workspaceIndexingEnabled: event.target.checked })}
        />
        Enable workspace indexing
      </label>

      <label className="flex items-center gap-2 text-[10px] text-slate-300">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-400"
          checked={settings.webInRagEnabled}
          onChange={(event) => void onUpdateSettings({ webInRagEnabled: event.target.checked })}
        />
        Allow web retrieval in RAG
      </label>

      <label className="flex items-center gap-2 text-[10px] text-slate-300">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-400"
          checked={settings.liveTraceVisible}
          onChange={(event) => void onUpdateSettings({ liveTraceVisible: event.target.checked })}
        />
        Show live reasoning trace by default
      </label>

      <label className="block space-y-1">
        <span className="text-[9px] text-slate-300">Reply style</span>
        <select
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-100"
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

      <label className="block space-y-1">
        <span className="text-[9px] text-slate-300">Awareness answer mode</span>
        <select
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-100"
          value={settings.awarenessAnswerMode}
          onChange={(event) =>
            void onUpdateSettings({
              awarenessAnswerMode: event.target.value as ChatSettingsState["awarenessAnswerMode"]
            })
          }
        >
          <option value="evidence-first">Evidence-first</option>
          <option value="llm-primary">LLM-primary</option>
        </select>
        <p className="text-[9px] text-slate-500">{awarenessModeHelp[settings.awarenessAnswerMode]}</p>
      </label>
    </Card>
  );
}
