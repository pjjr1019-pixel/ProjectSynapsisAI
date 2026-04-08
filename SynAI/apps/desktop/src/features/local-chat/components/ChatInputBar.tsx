import { useEffect, useState } from "react";
import { Button } from "../../../shared/components/Button";
import { Textarea } from "../../../shared/components/Textarea";

interface ChatInputBarProps {
  onSend: (text: string, options?: { useWebSearch?: boolean }) => Promise<void>;
  disabled?: boolean;
  defaultUseWebSearch?: boolean;
}

export function ChatInputBar({ onSend, disabled, defaultUseWebSearch = false }: ChatInputBarProps) {
  const [text, setText] = useState("");
  const [useWebSearch, setUseWebSearch] = useState(defaultUseWebSearch);

  useEffect(() => {
    setUseWebSearch(defaultUseWebSearch);
  }, [defaultUseWebSearch]);

  const submit = async (): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    setText("");
    await onSend(trimmed, { useWebSearch });
    setUseWebSearch(defaultUseWebSearch);
  };

  return (
    <div className="border-t border-slate-800 bg-slate-950/80 p-2">
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
        <Button disabled={disabled || !text.trim()} onClick={() => void submit()}>
          Send
        </Button>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-[10px] text-slate-400">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-400"
            checked={useWebSearch}
            disabled={disabled}
            onChange={(event) => setUseWebSearch(event.target.checked)}
          />
          Use recent web search
        </label>
        <p className="text-[10px] text-slate-500">Press Enter to send. Shift+Enter for newline.</p>
      </div>
    </div>
  );
}
