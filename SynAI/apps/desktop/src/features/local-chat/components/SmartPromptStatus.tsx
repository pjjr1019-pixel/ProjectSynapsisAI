import type { ContextPreview } from "@contracts";
import { Badge } from "../../../shared/components/Badge";
import { summarizePromptContext } from "../utils/promptAssembler";

interface SmartPromptStatusProps {
  preview: ContextPreview | null;
}

export function SmartPromptStatus({ preview }: SmartPromptStatusProps) {
  const webTone =
    preview?.webSearch.status === "used"
      ? "good"
      : preview?.webSearch.status === "error"
        ? "bad"
        : preview?.webSearch.status === "no_results"
          ? "warn"
          : "neutral";

  return (
    <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2 text-xs text-slate-400">
      <Badge tone="neutral">Smart Prompt</Badge>
      <Badge tone={webTone}>Recent Web</Badge>
      <span>{summarizePromptContext(preview)}</span>
    </div>
  );
}
