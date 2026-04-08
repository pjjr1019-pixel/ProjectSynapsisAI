import type { ChatMessage } from "@contracts";
import { cn } from "../../../shared/utils/cn";
import { formatDateTime, formatStopwatch, formatTime } from "../../../shared/utils/time";

interface MessageItemProps {
  message: ChatMessage;
  previousUserAt?: string | null;
}

export function MessageItem({ message, previousUserAt = null }: MessageItemProps) {
  const isUser = message.role === "user";
  const sources = message.sources ?? [];
  const replyLatencyMs =
    !isUser && previousUserAt ? new Date(message.createdAt).getTime() - new Date(previousUserAt).getTime() : null;

  return (
    <article
      className={cn(
        "max-w-[86%] rounded-lg border px-2 py-1.5 text-[13px]",
        isUser
          ? "ml-auto border-cyan-500/40 bg-cyan-500/10 text-cyan-100"
          : "mr-auto border-slate-700 bg-slate-900 text-slate-100"
      )}
    >
      <header className="mb-1 flex items-center justify-between gap-3 text-[10px] text-slate-400">
        <span>
          {isUser ? "You" : message.role === "assistant" ? "Assistant" : "System"}{" "}
          {isUser ? "Sent" : "Received"} {formatTime(message.createdAt)}
        </span>
        {!isUser && replyLatencyMs !== null ? <span>Reply time {formatStopwatch(replyLatencyMs)}</span> : null}
      </header>
      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
      {!isUser && sources.length > 0 ? (
        <div className="mt-2 space-y-2 border-t border-slate-700/70 pt-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Sources</p>
          {sources.map((source) => (
            <div key={`${source.url}-${source.publishedAt ?? "na"}`} className="rounded border border-slate-700/70 bg-slate-950/60 p-1.5">
              <a
                className="text-[11px] font-medium text-cyan-300 hover:text-cyan-200"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.title}
              </a>
              <p className="mt-1 text-[10px] text-slate-500">
                {source.source}
                {source.publishedAt ? ` | ${formatDateTime(source.publishedAt)}` : ""}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
