import type { Conversation } from "@contracts";
import { Badge } from "../../../shared/components/Badge";

interface ChatHeaderProps {
  conversation: Conversation | null;
  messageCount: number;
}

export function ChatHeader({ conversation, messageCount }: ChatHeaderProps) {
  return (
    <header className="border-b border-slate-800 px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            {conversation?.title ?? "No conversation selected"}
          </h2>
          <p className="text-xs text-slate-400">Local conversation with persistence and memory.</p>
        </div>
        <Badge>{messageCount} messages</Badge>
      </div>
    </header>
  );
}
