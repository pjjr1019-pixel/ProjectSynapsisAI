import { useState } from "react";
import type { RagToggleMode } from "@contracts";
import { Button } from "../../../shared/components/Button";
import { Textarea } from "../../../shared/components/Textarea";
import type { ChatSettingsState } from "../types/localChat.types";
import type { SendMessageOptions } from "../hooks/useLocalChat";

interface ChatInputBarProps {
  onSend: (text: string, options?: SendMessageOptions) => Promise<void>;
  disabled?: boolean;
  settings?: Pick<
    ChatSettingsState,
    "advancedRagEnabled" | "defaultWebSearch" | "webInRagEnabled" | "liveTraceVisible"
  >;
}

const DEFAULT_INPUT_SETTINGS: NonNullable<ChatInputBarProps["settings"]> = {
  advancedRagEnabled: true,
  defaultWebSearch: false,
  webInRagEnabled: true,
  liveTraceVisible: false
};

const nextToggleMode = (mode: RagToggleMode): RagToggleMode =>
  mode === "inherit" ? "on" : mode === "on" ? "off" : "inherit";

const formatToggle = (label: string, mode: RagToggleMode, inheritedEnabled: boolean): string => {
  if (mode === "inherit") {
    return `${label}: ${inheritedEnabled ? "Default On" : "Default Off"}`;
  }

  return `${label}: ${mode === "on" ? "On" : "Off"}`;
};

export function ChatInputBar({ onSend, disabled, settings = DEFAULT_INPUT_SETTINGS }: ChatInputBarProps) {
  const [text, setText] = useState("");
  const [ragMode, setRagMode] = useState<RagToggleMode>("inherit");
  const [webMode, setWebMode] = useState<RagToggleMode>("inherit");
  const [traceMode, setTraceMode] = useState<RagToggleMode>("inherit");

  const submit = async (): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    setText("");
    await onSend(trimmed, {
      ragMode,
      webMode,
      traceMode
    });
    setRagMode("inherit");
    setWebMode("inherit");
    setTraceMode("inherit");
  };

  return (
    <div className="border-t border-slate-800 bg-slate-950/85 p-1.5">
      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          rows={2}
          disabled={disabled}
          placeholder="Message local model..."
          onChange={(event) => setText(event.target.value)}
          onKeyDown={async (event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              await submit();
            }
          }}
        />
        <Button className="px-3 py-2 text-xs" disabled={disabled || !text.trim()} onClick={() => void submit()}>
          Send
        </Button>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            className="px-2 py-1 text-[10px]"
            variant="ghost"
            disabled={disabled}
            onClick={() => setRagMode((current) => nextToggleMode(current))}
          >
            {formatToggle("RAG", ragMode, settings.advancedRagEnabled)}
          </Button>
          <Button
            className="px-2 py-1 text-[10px]"
            variant="ghost"
            disabled={disabled}
            onClick={() => setWebMode((current) => nextToggleMode(current))}
          >
            {formatToggle("Web", webMode, settings.defaultWebSearch && settings.webInRagEnabled)}
          </Button>
          <Button
            className="px-2 py-1 text-[10px]"
            variant="ghost"
            disabled={disabled}
            onClick={() => setTraceMode((current) => nextToggleMode(current))}
          >
            {formatToggle("Trace", traceMode, settings.liveTraceVisible)}
          </Button>
        </div>
        <p className="text-[10px] text-slate-500">Press Enter to send. Shift+Enter for newline.</p>
      </div>
    </div>
  );
}
