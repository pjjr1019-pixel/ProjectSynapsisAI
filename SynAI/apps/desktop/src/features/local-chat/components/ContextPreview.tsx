import type { ContextPreview as ContextPreviewModel } from "@contracts";
import { Card } from "../../../shared/components/Card";
import { formatDateTime, formatStopwatch } from "../../../shared/utils/time";
import { cn } from "../../../shared/utils/cn";

interface ContextPreviewProps {
  preview: ContextPreviewModel | null;
  className?: string;
  hideTitle?: boolean;
  compact?: boolean;
}

export function ContextPreview({ preview, className, hideTitle = false, compact = false }: ContextPreviewProps) {
  if (!preview) {
    return (
      <Card className={cn("p-3 text-xs text-slate-400", className)}>
        Context preview will appear after sending a message.
      </Card>
    );
  }

  return (
    <Card className={cn("space-y-2 p-3", className)}>
      {hideTitle ? null : <h3 className="text-sm font-semibold text-slate-100">Context Preview</h3>}
      <p className="text-xs text-slate-300">Recent messages: {preview.recentMessagesCount}</p>
      <p className="text-xs text-slate-300">Estimated chars: {preview.estimatedChars}</p>
      <p className="text-xs text-slate-300">Stable memories: {preview.stableMemories.length}</p>
      <p className="text-xs text-slate-300">Retrieved memories: {preview.retrievedMemories.length}</p>
      {preview.awareness ? (
        <div className="rounded border border-cyan-900/60 bg-cyan-950/20 p-2">
          <p className="text-xs font-medium text-cyan-200">Awareness</p>
          <p className="mt-1 text-[11px] text-cyan-100/90">{preview.awareness.summary}</p>
          <p className="mt-1 text-[11px] text-cyan-200/70">
            Freshness: {preview.awareness.freshness.isFresh ? "fresh" : "stale"} | age{" "}
            {formatStopwatch(preview.awareness.freshness.ageMs)}
          </p>
        </div>
      ) : null}
      {preview.machineAwareness ? (
        <div className="rounded border border-emerald-900/60 bg-emerald-950/20 p-2">
          <p className="text-xs font-medium text-emerald-200">Machine Awareness</p>
          <p className="mt-1 text-[11px] text-emerald-100/90">{preview.machineAwareness.summary}</p>
          <p className="mt-1 text-[11px] text-emerald-200/70">
            {preview.machineAwareness.counts.processes} processes | {preview.machineAwareness.counts.services} services |{" "}
            {preview.machineAwareness.counts.startupEntries} startup items | {preview.machineAwareness.counts.installedApps} apps
          </p>
          <p className="mt-1 text-[11px] text-emerald-200/70">
            Freshness: {preview.machineAwareness.freshness.isFresh ? "fresh" : "stale"} | age{" "}
            {formatStopwatch(preview.machineAwareness.freshness.ageMs)}
          </p>
        </div>
      ) : null}
      {preview.fileAwareness ? (
        <div className="rounded border border-amber-900/60 bg-amber-950/20 p-2">
          <p className="text-xs font-medium text-amber-200">File Awareness</p>
          <p className="mt-1 text-[11px] text-amber-100/90">{preview.fileAwareness.summary}</p>
          <p className="mt-1 text-[11px] text-amber-200/70">
            {preview.fileAwareness.counts.roots} roots | {preview.fileAwareness.counts.files} files |{" "}
            {preview.fileAwareness.counts.media} media | {preview.fileAwareness.counts.recentChanges} changes
          </p>
          <p className="mt-1 text-[11px] text-amber-200/70">
            Freshness: {preview.fileAwareness.freshness.isFresh ? "fresh" : "stale"} | age{" "}
            {formatStopwatch(preview.fileAwareness.freshness.ageMs)}
          </p>
        </div>
      ) : null}
      {preview.screenAwareness ? (
        <div className="rounded border border-violet-900/60 bg-violet-950/20 p-2">
          <p className="text-xs font-medium text-violet-200">Assist Mode</p>
          <p className="mt-1 text-[11px] text-violet-100/90">{preview.screenAwareness.summary}</p>
        </div>
      ) : null}
      {preview.awarenessQuery ? (
        <div className="rounded border border-sky-900/60 bg-sky-950/20 p-2">
          <p className="text-xs font-medium text-sky-200">Awareness Query</p>
          <p className="mt-1 text-[11px] text-sky-100/90">{preview.awarenessQuery.summary}</p>
          <p className="mt-1 text-[11px] text-sky-200/70">
            {preview.awarenessQuery.intent.label} | scope {preview.awarenessQuery.scope} |{" "}
            confidence {preview.awarenessQuery.bundle.confidenceLevel}
          </p>
          <p className="mt-1 text-[11px] text-sky-200/70">
            Freshness: {preview.awarenessQuery.bundle.freshness.isFresh ? "fresh" : "stale"} | age{" "}
            {formatStopwatch(preview.awarenessQuery.bundle.freshness.ageMs)}
          </p>
        </div>
      ) : null}
      <p className="text-xs text-slate-300">
        Recent web:{" "}
        {preview.webSearch.status === "used"
          ? `${preview.webSearch.results.length} sources`
          : preview.webSearch.status === "no_results"
            ? "no results found"
            : preview.webSearch.status === "error"
              ? "search unavailable"
              : "not used"}
      </p>
      <p
        className="text-xs whitespace-pre-wrap text-slate-500"
        style={
          compact
            ? {
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                overflow: "hidden"
              }
            : undefined
        }
      >
        {preview.summarySnippet || "No summary yet."}
      </p>
      {preview.webSearch.status === "error" ? (
        <p className="text-xs text-rose-300">{preview.webSearch.error ?? "Recent web search failed."}</p>
      ) : null}
      {preview.webSearch.results.length > 0 ? (
        <div className="space-y-2 border-t border-slate-800 pt-2">
          <p className="text-xs font-medium text-slate-200">Recent Web Sources</p>
          {preview.webSearch.results.slice(0, compact ? 2 : preview.webSearch.results.length).map((result) => (
            <div key={`${result.url}-${result.publishedAt ?? "na"}`} className="rounded border border-slate-700 bg-slate-900/60 p-2">
              <a
                className="text-xs font-medium text-cyan-300 hover:text-cyan-200"
                href={result.url}
                target="_blank"
                rel="noreferrer"
              >
                {result.title}
              </a>
              <p className="mt-1 text-[11px] text-slate-400">
                {result.source}
                {result.publishedAt ? ` | ${formatDateTime(result.publishedAt)}` : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">{result.snippet}</p>
            </div>
          ))}
          {compact && preview.webSearch.results.length > 2 ? (
            <p className="text-[10px] text-slate-500">+{preview.webSearch.results.length - 2} more sources</p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
