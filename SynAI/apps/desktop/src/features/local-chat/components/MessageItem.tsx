import type { ChatMessage, ReasoningTraceState } from "@contracts";
import { Badge } from "../../../shared/components/Badge";
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

const taskDecisionTone = (decision: string): "neutral" | "good" | "warn" | "bad" => {
  if (decision === "allow" || decision === "allow_with_verification") {
    return "good";
  }
  if (decision === "require_approval" || decision === "clarify" || decision === "plan_only") {
    return "warn";
  }
  if (decision === "deny") {
    return "bad";
  }
  return "neutral";
};

const taskExecutionTone = (status: string | null | undefined): "neutral" | "good" | "warn" | "bad" => {
  if (status === "completed" || status === "simulated") {
    return "good";
  }
  if (status === "pending" || status === "running" || status === "clarification_needed" || status === "blocked") {
    return "warn";
  }
  if (status === "failed" || status === "denied") {
    return "bad";
  }
  return "neutral";
};

const formatTaskExecutionStatus = (status: string): string => status.replace(/_/g, " ");

export function MessageItem({ message, previousUserAt = null, liveTrace = null }: MessageItemProps) {
  const isUser = message.role === "user";
  const isLiveUsage = message.role === "assistant" && message.metadata?.awareness?.intentFamily === "live-usage";
  const liveUpdatedAt = message.metadata?.awareness?.lastRefreshedAt ?? null;
  const awarenessCard = message.metadata?.awareness?.card ?? null;
  const ragTraceSummary = message.metadata?.rag?.traceSummary ?? null;
  const grounding = message.metadata?.grounding ?? null;
  const taskState = message.metadata?.task ?? null;
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
      {!isUser && taskState ? (
        <div className="mb-1.5 rounded border border-cyan-500/20 bg-cyan-500/5 p-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={taskDecisionTone(taskState.decision)}>{taskState.decision}</Badge>
            <Badge tone={taskState.approvalState.pending ? "warn" : taskState.approvalRequired ? "warn" : "good"}>
              {taskState.approvalState.pending ? "Approval pending" : taskState.approvalRequired ? "Approval gated" : "Approved"}
            </Badge>
            {taskState.executionStatus ? (
              <Badge tone={taskExecutionTone(taskState.executionStatus)}>
                {formatTaskExecutionStatus(taskState.executionStatus)}
              </Badge>
            ) : null}
            <Badge tone={taskState.verificationSummary ? "neutral" : "good"}>
              {taskState.recommendedExecutor}
            </Badge>
            <Badge tone={taskState.gapClass ? "warn" : "good"}>
              {taskState.gapClass ?? taskState.riskTier}
            </Badge>
          </div>
          <p className="mt-1 text-[9px] text-cyan-100/80">{taskState.interpretedIntent}</p>
          {taskState.executionSummary ? (
            <p className="mt-0.5 text-[9px] text-slate-300">Execution: {taskState.executionSummary}</p>
          ) : null}
          {taskState.clarification ? (
            <div className="mt-1 rounded border border-amber-400/30 bg-amber-500/10 p-1 text-[9px] text-amber-100">
              <p>Clarification: {taskState.clarification.question}</p>
              {taskState.clarification.missingFields?.length ? (
                <p className="mt-0.5 text-amber-200/80">Missing fields: {taskState.clarification.missingFields.join(", ")}</p>
              ) : null}
            </div>
          ) : null}
          {taskState.reportSummary ? (
            <p className="mt-0.5 text-[9px] text-cyan-200">Report: {taskState.reportSummary}</p>
          ) : null}
          {taskState.verificationSummary ? (
            <p className="mt-0.5 text-[9px] text-slate-300">Verification: {taskState.verificationSummary}</p>
          ) : null}
          {taskState.rollbackSummary ? (
            <p className="mt-0.5 text-[9px] text-slate-300">Rollback: {taskState.rollbackSummary}</p>
          ) : null}
          {taskState.remediationSummary ? (
            <p className="mt-0.5 text-[9px] text-amber-200">Remediation: {taskState.remediationSummary}</p>
          ) : null}
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
