import type { ChatMessage } from "@contracts";
import { cn } from "../../../shared/utils/cn";
import { formatStopwatch, formatTime } from "../../../shared/utils/time";

interface MessageItemProps {
  message: ChatMessage;
  previousUserAt?: string | null;
}

export function MessageItem({ message, previousUserAt = null }: MessageItemProps) {
  const isUser = message.role === "user";
  const replyLatencyMs =
    !isUser && previousUserAt ? new Date(message.createdAt).getTime() - new Date(previousUserAt).getTime() : null;

  return (
    <article
      className={cn(
        "max-w-[86%] rounded-lg border px-3 py-2 text-sm",
        isUser
          ? "ml-auto border-cyan-500/40 bg-cyan-500/10 text-cyan-100"
          : "mr-auto border-slate-700 bg-slate-900 text-slate-100"
      )}
    >
      <header className="mb-1 flex items-center justify-between gap-4 text-xs text-slate-400">
        <span>
          {isUser ? "You" : message.role === "assistant" ? "Assistant" : "System"}{" "}
          {isUser ? "Sent" : "Received"} {formatTime(message.createdAt)}
        </span>
        {!isUser && replyLatencyMs !== null ? <span>Reply time {formatStopwatch(replyLatencyMs)}</span> : null}
      </header>
      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
    </article>
  );
}
