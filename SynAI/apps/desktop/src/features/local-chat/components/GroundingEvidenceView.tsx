import type { GroundingMetadata, GroundingSource } from "@contracts";
import { Badge } from "../../../shared/components/Badge";
import { formatDateTime } from "../../../shared/utils/time";

interface GroundingEvidenceViewProps {
  grounding: GroundingMetadata;
}

const statusTone = (status: GroundingMetadata["claims"][number]["status"]): "warn" | "bad" | "neutral" => {
  switch (status) {
    case "inference":
      return "warn";
    case "conflicted":
    case "unsupported":
      return "bad";
    default:
      return "neutral";
  }
};

const kindLabel = (kind: GroundingSource["kind"]): string => {
  switch (kind) {
    case "memory":
      return "Memory";
    case "workspace":
      return "Workspace";
    case "awareness":
      return "Awareness";
    case "official":
      return "Official";
    case "web":
      return "Web";
    default:
      return kind;
  }
};

const sourceLocator = (source: GroundingSource): string | null => {
  if (source.path && source.lineStart != null && source.lineEnd != null) {
    return `${source.path}:${source.lineStart}-${source.lineEnd}`;
  }
  if (source.path) {
    return source.path;
  }
  if (source.url) {
    return source.url;
  }
  return null;
};

export function GroundingEvidenceView({ grounding }: GroundingEvidenceViewProps) {
  const sourceNumberMap = new Map(grounding.sources.map((source, index) => [source.id, index + 1]));

  return (
    <div className="space-y-1.5">
      <div className="rounded border border-cyan-500/20 bg-cyan-500/5 p-2 text-[10px] text-cyan-100/80">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-cyan-100">
            Grounded answer | {grounding.summary.overallConfidence} confidence
          </span>
          <Badge tone="neutral">{grounding.summary.claimCount} claims</Badge>
          <Badge tone={grounding.summary.citationCoverage === 1 ? "good" : "warn"}>
            {Math.round(grounding.summary.citationCoverage * 100)}% cited
          </Badge>
          {grounding.summary.unsupportedClaimCount > 0 ? (
            <Badge tone="bad">{grounding.summary.unsupportedClaimCount} unsupported</Badge>
          ) : null}
          {grounding.summary.conflictedClaimCount > 0 ? (
            <Badge tone="bad">{grounding.summary.conflictedClaimCount} conflicts</Badge>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        {grounding.claims.map((claim) => (
          <div key={claim.id} className="rounded border border-slate-700/80 bg-slate-950/60 p-2">
            <p className="leading-relaxed text-slate-100">{claim.text}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {claim.sourceIds.map((sourceId) => {
                const sourceNumber = sourceNumberMap.get(sourceId);
                if (!sourceNumber) {
                  return null;
                }
                return (
                  <Badge key={sourceId} tone="neutral">
                    S{sourceNumber}
                  </Badge>
                );
              })}
              {claim.status !== "grounded" ? (
                <Badge tone={statusTone(claim.status)}>
                  {claim.status === "inference"
                    ? "Inference"
                    : claim.status === "conflicted"
                      ? "Conflict"
                      : "Unsupported"}
                </Badge>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <details className="rounded border border-slate-700/80 bg-slate-950/50 p-2">
        <summary className="cursor-pointer list-none text-[10px] font-medium uppercase tracking-wide text-slate-300">
          Evidence
        </summary>
        <div className="mt-2 space-y-2">
          {grounding.conflicts.length > 0 ? (
            <div className="rounded border border-rose-500/20 bg-rose-500/5 p-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-rose-200">Conflict Summary</p>
              <div className="mt-1 space-y-1">
                {grounding.conflicts.map((conflict) => (
                  <p key={conflict.id} className="text-[10px] text-rose-100/90">
                    {conflict.description}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            {grounding.sources.map((source, index) => (
              <div key={source.id} className="rounded border border-slate-700/70 bg-black/20 p-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="neutral">S{index + 1}</Badge>
                  <Badge tone="neutral">{kindLabel(source.kind)}</Badge>
                  {source.freshness ? (
                    <Badge tone={source.freshness.isFresh ? "good" : "warn"}>
                      {source.freshness.isFresh ? "Fresh" : "Stale"}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] font-medium text-slate-100">{source.title}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{source.label}</p>
                <p className="mt-1 text-[11px] text-slate-300">{source.excerpt}</p>
                {sourceLocator(source) ? (
                  <p className="mt-1 text-[10px] text-slate-500">{sourceLocator(source)}</p>
                ) : null}
                {source.url ? (
                  <a
                    className="mt-1 inline-block text-[10px] text-cyan-300 hover:text-cyan-200"
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open source
                  </a>
                ) : null}
                {source.freshness ? (
                  <p className="mt-1 text-[10px] text-slate-500">
                    Captured {formatDateTime(source.freshness.capturedAt)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
