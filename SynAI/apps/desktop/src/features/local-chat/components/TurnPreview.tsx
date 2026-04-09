import type { CSSProperties } from "react";
import type { ConversationTurn } from "../types/localChat.types";
import { formatDateTime, formatStopwatch, formatTime } from "../../../shared/utils/time";

interface TurnPreviewProps {
  turn: ConversationTurn | null;
  label: string;
  compact?: boolean;
}

const clampStyle = (lines: number): CSSProperties => ({
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: lines,
  overflow: "hidden"
});

const SourcePreview = ({
  title,
  source,
  publishedAt
}: {
  title: string;
  source: string;
  publishedAt?: string | null;
}) => (
  <div className="rounded border border-slate-700/70 bg-slate-950/60 p-1">
    <p className="text-[9px] font-medium text-cyan-300">{title}</p>
    <p className="mt-0.5 text-[8px] text-slate-500">
      {source}
      {publishedAt ? ` | ${formatDateTime(publishedAt)}` : ""}
    </p>
  </div>
);

export function TurnPreview({ turn, label, compact = true }: TurnPreviewProps) {
  if (!turn || (!turn.user && !turn.assistant)) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-1 text-[9px] text-slate-400">
        No messages yet. Send a prompt to start the conversation.
      </div>
    );
  }

  const replyLatencyMs =
    turn.user && turn.assistant
      ? Math.max(0, new Date(turn.assistant.createdAt).getTime() - new Date(turn.user.createdAt).getTime())
      : null;
  const userLines = compact ? 2 : 4;
  const assistantLines = compact ? 3 : 5;
  const sources = turn.assistant?.sources ?? [];

  return (
    <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1">
      <div className="flex items-center justify-between gap-2 text-[8px] text-slate-400">
        <span>{label}</span>
        {turn.assistant ? (
          <span>
            {replyLatencyMs !== null ? `Reply time ${formatStopwatch(replyLatencyMs)}` : formatTime(turn.assistant.createdAt)}
          </span>
        ) : null}
      </div>

      {turn.user ? (
        <div className="rounded-md border border-cyan-500/30 bg-cyan-500/10 p-1">
          <p className="text-[8px] text-slate-400">You sent {formatTime(turn.user.createdAt)}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-cyan-100" style={clampStyle(userLines)}>
            {turn.user.content}
          </p>
        </div>
      ) : null}

      {turn.assistant ? (
        <div className="rounded-md border border-slate-700 bg-slate-950/70 p-1">
          <p className="text-[8px] text-slate-400">Assistant received {formatTime(turn.assistant.createdAt)}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-100" style={clampStyle(assistantLines)}>
            {turn.assistant.content}
          </p>
          {sources.length > 0 ? (
            <div className="mt-1 space-y-1">
              <p className="text-[8px] uppercase tracking-wide text-slate-500">Sources</p>
              <div className="grid gap-1">
                {sources.slice(0, compact ? 2 : 4).map((source) => (
                  <a
                    key={`${source.url}-${source.publishedAt ?? "na"}`}
                    className="block rounded border border-slate-700/70 bg-slate-950/60 p-1 hover:border-cyan-400/40"
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <SourcePreview title={source.title} source={source.source} publishedAt={source.publishedAt} />
                  </a>
                ))}
              </div>
              {compact && sources.length > 2 ? (
                <p className="text-[8px] text-slate-500">+{sources.length - 2} more sources</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-md border border-slate-700 bg-slate-950/70 p-1 text-[9px] text-slate-400">
          Waiting for the assistant reply.
        </div>
      )}
    </div>
  );
}
