import type { Conversation } from "@contracts";
import { Badge } from "../../../shared/components/Badge";

interface ChatHeaderProps {
  conversation: Conversation | null;
  messageCount: number;
}

export function ChatHeader({ conversation, messageCount }: ChatHeaderProps) {
  return (
    <header className="border-b border-slate-800 px-3 py-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="truncate text-base font-semibold text-slate-100">
            {conversation?.title ?? "No conversation selected"}
          </h2>
          <p className="text-[11px] text-slate-400">Local chat with memory and web context.</p>
        </div>
        <Badge>{messageCount} msgs</Badge>
      </div>
    </header>
  );
}
