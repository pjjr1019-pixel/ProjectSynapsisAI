import type { ChatMessage, ReasoningTraceState } from "@contracts";
import { cn } from "../../../shared/utils/cn";
import { formatDateTime, formatStopwatch, formatTime } from "../../../shared/utils/time";
import { AwarenessCard } from "./AwarenessCard";
import { GroundingEvidenceView } from "./GroundingEvidenceView";
import { ReasoningTraceView } from "./ReasoningTraceView";

interface MessageItemProps {
  message: ChatMessage;
  previousUserAt?: string | null;
  liveTrace?: ReasoningTraceState | null;
}

export function MessageItem({ message, previousUserAt = null, liveTrace = null }: MessageItemProps) {
  const isUser = message.role === "user";
  const isLiveUsage = message.role === "assistant" && message.metadata?.awareness?.intentFamily === "live-usage";
  const liveUpdatedAt = message.metadata?.awareness?.lastRefreshedAt ?? null;
  const awarenessCard = message.metadata?.awareness?.card ?? null;
  const ragTraceSummary = message.metadata?.rag?.traceSummary ?? null;
  const grounding = message.metadata?.grounding ?? null;
  const sources = message.sources ?? [];
  const replyLatencyMs =
    !isUser && previousUserAt ? new Date(message.createdAt).getTime() - new Date(previousUserAt).getTime() : null;

  return (
    <article
      className={cn(
        "max-w-[84%] rounded-md border px-2 py-1.5 text-[12px]",
        isUser
          ? "ml-auto border-cyan-500/40 bg-cyan-500/10 text-cyan-100"
          : isLiveUsage
            ? "mr-auto border-cyan-500/40 bg-cyan-500/8 text-cyan-50"
            : "mr-auto border-slate-700 bg-slate-900 text-slate-100"
      )}
    >
      <header className="mb-1 flex items-center justify-between gap-2 text-[9px] text-slate-400">
        <span>
          {isUser ? "You" : message.role === "assistant" ? "Assistant" : "System"}{" "}
          {isUser ? "Sent" : "Received"} {formatTime(message.createdAt)}
        </span>
        {!isUser && replyLatencyMs !== null ? <span>Reply time {formatStopwatch(replyLatencyMs)}</span> : null}
        {isLiveUsage ? (
          <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wide text-cyan-200">
            Live
          </span>
        ) : null}
      </header>
      {isLiveUsage && liveUpdatedAt ? (
        <p className="mb-1 text-[8px] text-cyan-200/70">Updated {formatTime(liveUpdatedAt)}</p>
      ) : null}
      {!isUser && awarenessCard ? (
        <div className="mb-1">
          <AwarenessCard card={awarenessCard} compact />
        </div>
      ) : null}
      {!isUser && liveTrace ? (
        <div className="mb-1.5">
          <ReasoningTraceView trace={liveTrace} live />
        </div>
      ) : null}
      {!isUser && !liveTrace && ragTraceSummary ? (
        <div className="mb-1.5">
          <ReasoningTraceView trace={ragTraceSummary} />
        </div>
      ) : null}
      {!isUser && grounding && grounding.claims.length > 0 ? (
        <div className="mb-1.5">
          <GroundingEvidenceView grounding={grounding} />
        </div>
      ) : null}
      {isUser || (!grounding && !awarenessCard && message.content.trim().length > 0) ? (
        <p
          className={cn("whitespace-pre-wrap", isLiveUsage ? "font-mono text-[11px] leading-snug" : "leading-relaxed")}
        >
          {message.content}
        </p>
      ) : null}
      {!isUser && !grounding && sources.length > 0 ? (
        <div className="mt-1.5 space-y-1.5 border-t border-slate-700/70 pt-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Sources</p>
          {sources.map((source) => (
            <div key={`${source.url}-${source.publishedAt ?? "na"}`} className="rounded border border-slate-700/70 bg-slate-950/60 p-1">
              <a
                className="text-[10px] font-medium text-cyan-300 hover:text-cyan-200"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.title}
              </a>
              <p className="mt-0.5 text-[9px] text-slate-500">
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
