import type { ReasoningTraceState, ReasoningTraceSummary } from "@contracts";
import { Badge } from "../../../shared/components/Badge";
import { formatStopwatch } from "../../../shared/utils/time";

interface ReasoningTraceViewProps {
  trace: ReasoningTraceState | ReasoningTraceSummary;
  live?: boolean;
}

const stageTone = (status: ReasoningTraceState["stages"][number]["status"]): "good" | "warn" | "bad" | "neutral" => {
  switch (status) {
    case "completed":
      return "good";
    case "running":
      return "warn";
    case "error":
      return "bad";
    default:
      return "neutral";
  }
};

export function ReasoningTraceView({ trace, live = false }: ReasoningTraceViewProps) {
  const header = (
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200">
          {live ? "Live Reasoning" : "Reasoning Summary"}
        </p>
        <p className="text-[10px] text-amber-100/80">
          {trace.mode} | {trace.triggerReason} | {trace.confidence} confidence | {trace.groundedSourceCount} sources
        </p>
      </div>
      <Badge tone={live ? "warn" : "neutral"}>{live ? "Live" : "Saved"}</Badge>
    </div>
  );

  const body = (
    <div className="mt-2 space-y-1.5">
      <p className="text-[10px] text-amber-100/70">
        Retrieval: memory {trace.retrieval.memoryKeyword + trace.retrieval.memorySemantic} | workspace {trace.retrieval.workspace} |
        awareness {trace.retrieval.awareness} | web {trace.retrieval.web}
        {" | "}total {trace.retrieval.total}
      </p>
      {trace.grounding ? (
        <p className="text-[10px] text-amber-100/70">
          Claims {trace.grounding.claimCount} | cited {Math.round(trace.grounding.citationCoverage * 100)}% | unsupported{" "}
          {trace.grounding.unsupportedClaimCount} | conflicts {trace.grounding.conflictedClaimCount}
        </p>
      ) : null}
      <div className="space-y-1">
        {trace.stages.map((stage) => (
          <div
            key={stage.id}
            className="rounded border border-amber-500/20 bg-black/20 px-2 py-1 text-[10px] text-amber-50/90"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{stage.label}</span>
              <Badge tone={stageTone(stage.status)}>{stage.status}</Badge>
            </div>
            {stage.summary ? <p className="mt-1">{stage.summary}</p> : null}
            <p className="mt-1 text-[9px] text-amber-100/60">
              {stage.sourceCount != null ? `${stage.sourceCount} sources` : "No sources"}{" "}
              {stage.durationMs != null ? `| ${formatStopwatch(stage.durationMs)}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  return live ? (
    <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2">
      {header}
      {body}
    </div>
  ) : (
    <details className="rounded border border-amber-500/20 bg-amber-500/8 p-2">
      <summary className="cursor-pointer list-none">{header}</summary>
      {body}
    </details>
  );
}
