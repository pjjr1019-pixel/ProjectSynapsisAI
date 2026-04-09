import type { Conversation } from "@contracts";
import { Badge } from "../../../shared/components/Badge";

interface ChatHeaderProps {
  conversation: Conversation | null;
  messageCount: number;
}

export function ChatHeader({ conversation, messageCount }: ChatHeaderProps) {
  return (
    <header className="border-b border-slate-800 px-2.5 py-1.5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="truncate text-sm font-semibold text-slate-100">
            {conversation?.title ?? "No conversation selected"}
          </h2>
          <p className="text-[10px] text-slate-400">Local chat with memory and web context.</p>
        </div>
        <Badge className="px-1.5 py-0.5 text-[10px]">{messageCount} msgs</Badge>
      </div>
    </header>
  );
}
