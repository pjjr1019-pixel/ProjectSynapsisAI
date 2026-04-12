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
      <Card className={cn("p-2 text-[10px] text-slate-400", className)}>
        Context preview will appear after sending a message.
      </Card>
    );
  }

  return (
    <Card className={cn("space-y-1.5 p-2", className)}>
      {hideTitle ? null : <h3 className="text-xs font-semibold text-slate-100">Context Preview</h3>}
      <p className="text-[10px] text-slate-300">Recent messages: {preview.recentMessagesCount}</p>
      <p className="text-[10px] text-slate-300">Estimated chars: {preview.estimatedChars}</p>
      <p className="text-[10px] text-slate-300">
        Estimated tokens: {preview.estimatedTokens ?? Math.ceil(preview.estimatedChars / 4)} | Budget{" "}
        {preview.budgetUsed ?? preview.estimatedChars}/{preview.budgetLimit ?? "n/a"}
      </p>
      <p className="text-[10px] text-slate-300">Stable memories: {preview.stableMemories.length}</p>
      <p className="text-[10px] text-slate-300">Retrieved memories: {preview.retrievedMemories.length}</p>
      <p className="text-[10px] text-slate-300">Workspace hits: {preview.workspaceHits?.length ?? 0}</p>
      {preview.routeDecision ? (
        <div className="rounded border border-lime-900/60 bg-lime-950/20 p-1.5">
          <p className="text-[10px] font-medium text-lime-200">Hybrid Route</p>
          <p className="mt-0.5 text-[10px] text-lime-100/90">
            {preview.routeDecision.mode} | {preview.routeDecision.reason}
          </p>
          <p className="mt-0.5 text-[10px] text-lime-200/70">
            Coding {preview.routeDecision.codingMode ? "on" : "off"} | HQ{" "}
            {preview.routeDecision.highQualityMode ? "on" : "off"} | Fresh evidence{" "}
            {preview.routeDecision.freshEvidenceRequired ? "yes" : "no"}
          </p>
          {preview.routeDecision.selectedTaskSkillIds.length > 0 ? (
            <p className="mt-0.5 text-[10px] text-lime-200/70">
              Skills: {preview.routeDecision.selectedTaskSkillIds.join(" | ")}
            </p>
          ) : null}
        </div>
      ) : null}
      {preview.cachePacks && preview.cachePacks.length > 0 ? (
        <div className="rounded border border-emerald-900/60 bg-emerald-950/20 p-1.5">
          <p className="text-[10px] font-medium text-emerald-200">Cache Packs</p>
          {preview.cachePacks.map((pack) => (
            <p key={pack.id} className="mt-0.5 text-[10px] text-emerald-100/90">
              {pack.type} / {pack.scope} | {pack.cacheHit ? "hit" : pack.stale ? "stale" : "built"} | tokens{" "}
              {pack.tokenEstimate}
              {pack.invalidationReason ? ` | ${pack.invalidationReason}` : ""}
            </p>
          ))}
        </div>
      ) : null}
      {preview.awarenessAnswerMode ? (
        <p className="text-[10px] text-slate-300">Awareness mode: {preview.awarenessAnswerMode}</p>
      ) : null}
      {preview.promptIntent ? (
        <div className="rounded border border-indigo-900/60 bg-indigo-950/20 p-1.5">
          <p className="text-[10px] font-medium text-indigo-200">Prompt Intent</p>
          <p className="mt-0.5 text-[10px] text-indigo-100/90">
            {preview.promptIntent.intentFamily} | {preview.promptIntent.sourceScope} |{" "}
            {preview.promptIntent.outputContract.shape}
          </p>
          <p className="mt-0.5 text-[10px] text-indigo-200/70">{preview.promptIntent.userGoal}</p>
          {preview.promptIntent.requiredChecks.length > 0 ? (
            <p className="mt-0.5 text-[10px] text-indigo-200/70">
              Checks: {preview.promptIntent.requiredChecks.slice(0, compact ? 2 : 4).join(" | ")}
            </p>
          ) : null}
        </div>
      ) : null}
      {preview.rag ? (
        <div className="rounded border border-orange-900/60 bg-orange-950/20 p-1.5">
          <p className="text-[10px] font-medium text-orange-200">Advanced RAG</p>
          <p className="mt-0.5 text-[10px] text-orange-100/90">
            {preview.rag.mode} | {preview.rag.triggerReason} | {preview.rag.routeMode ?? "route n/a"} |{" "}
            {preview.rag.retrieval.total} retrieved sources
          </p>
          <p className="mt-0.5 text-[10px] text-orange-200/70">
            Memory {preview.rag.retrieval.memoryKeyword + preview.rag.retrieval.memorySemantic} | Workspace{" "}
            {preview.rag.retrieval.workspace} | Awareness {preview.rag.retrieval.awareness} | Web{" "}
            {preview.rag.retrieval.web}
          </p>
          {preview.rag.retrievalScopes && preview.rag.retrievalScopes.length > 0 ? (
            <p className="mt-0.5 text-[10px] text-orange-200/70">
              Retrieval scopes: {preview.rag.retrievalScopes.join(" | ")}
            </p>
          ) : null}
          {preview.rag.workspaceIndex ? (
            <p className="mt-0.5 text-[10px] text-orange-200/70">
              Index: {preview.rag.workspaceIndex.mode} | {preview.rag.workspaceIndex.fileCount} files |{" "}
              {preview.rag.workspaceIndex.chunkCount} chunks
            </p>
          ) : null}
        </div>
      ) : null}
      {preview.runtimeSelection ? (
        <div className="rounded border border-fuchsia-900/60 bg-fuchsia-950/20 p-1.5">
          <p className="text-[10px] font-medium text-fuchsia-200">Runtime Selection</p>
          <p className="mt-0.5 text-[10px] text-fuchsia-100/90">
            {preview.runtimeSelection.taskClass} | {preview.runtimeSelection.model}
          </p>
          <p className="mt-0.5 text-[10px] text-fuchsia-200/70">
            {preview.runtimeSelection.reason} | keep-alive {preview.runtimeSelection.keepAliveMs}ms | queue{" "}
            {preview.runtimeSelection.queueDepth}
          </p>
        </div>
      ) : null}
      {preview.grounding ? (
        <div className="rounded border border-cyan-900/60 bg-cyan-950/20 p-1.5">
          <p className="text-[10px] font-medium text-cyan-200">Grounded Answer</p>
          <p className="mt-0.5 text-[10px] text-cyan-100/90">
            {preview.grounding.overallConfidence} confidence | {preview.grounding.claimCount} claims |{" "}
            {Math.round(preview.grounding.citationCoverage * 100)}% cited
          </p>
          <p className="mt-0.5 text-[10px] text-cyan-200/70">
            Grounded {preview.grounding.groundedClaimCount} | Inference {preview.grounding.inferenceClaimCount} | Unsupported{" "}
            {preview.grounding.unsupportedClaimCount} | Conflicts {preview.grounding.conflictedClaimCount}
          </p>
        </div>
      ) : null}
      {preview.retrievalEval ? (
        <div className="rounded border border-teal-900/60 bg-teal-950/20 p-1.5">
          <p className="text-[10px] font-medium text-teal-200">Evidence & Retrieval Eval</p>
          <p className="mt-0.5 text-[10px] text-teal-100/90">
            Route {preview.retrievalEval.routeReason} | retrieved {preview.retrievalEval.retrievedSourceCount} | used{" "}
            {preview.retrievalEval.usedSourceCount} | unused {preview.retrievalEval.unusedSourceCount}
          </p>
          <p className="mt-0.5 text-[10px] text-teal-200/70">
            Memory {preview.retrievalEval.sourceKindCounts.memory} | Workspace {preview.retrievalEval.sourceKindCounts.workspace} |
            Awareness {preview.retrievalEval.sourceKindCounts.awareness} | Official {preview.retrievalEval.sourceKindCounts.official} |
            Web {preview.retrievalEval.sourceKindCounts.web}
          </p>
          <p className="mt-0.5 text-[10px] text-teal-200/70">
            Citation coverage {Math.round(preview.retrievalEval.citationCoverage * 100)}% | unsupported{" "}
            {preview.retrievalEval.unsupportedClaimCount} | conflicts {preview.retrievalEval.conflictedClaimCount}
          </p>
          {preview.retrievalEval.warnings.length > 0 ? (
            <div className="mt-1 space-y-0.5">
              {preview.retrievalEval.warnings.slice(0, compact ? 2 : preview.retrievalEval.warnings.length).map((warning) => (
                <p key={warning} className="text-[10px] text-amber-200/90">
                  {warning}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {preview.awarenessGrounding ? (
        <p className="text-[10px] text-slate-300">
          Grounding: {preview.awarenessGrounding.status} ({preview.awarenessGrounding.confidenceLevel}) | traces{" "}
          {preview.awarenessGrounding.traceCount} | age {formatStopwatch(preview.awarenessGrounding.ageMs)}
        </p>
      ) : null}
      {preview.awareness ? (
        <div className="rounded border border-cyan-900/60 bg-cyan-950/20 p-1.5">
          <p className="text-[10px] font-medium text-cyan-200">Awareness</p>
          <p className="mt-0.5 text-[10px] text-cyan-100/90">{preview.awareness.summary}</p>
          <p className="mt-0.5 text-[10px] text-cyan-200/70">
            Freshness: {preview.awareness.freshness.isFresh ? "fresh" : "stale"} | age{" "}
            {formatStopwatch(preview.awareness.freshness.ageMs)}
          </p>
        </div>
      ) : null}
      {preview.machineAwareness ? (
        <div className="rounded border border-emerald-900/60 bg-emerald-950/20 p-1.5">
          <p className="text-[10px] font-medium text-emerald-200">Machine Awareness</p>
          <p className="mt-0.5 text-[10px] text-emerald-100/90">{preview.machineAwareness.summary}</p>
          <p className="mt-0.5 text-[10px] text-emerald-200/70">
            {preview.machineAwareness.counts.processes} processes | {preview.machineAwareness.counts.services} services |{" "}
            {preview.machineAwareness.counts.startupEntries} startup items | {preview.machineAwareness.counts.installedApps} apps |{" "}
            {preview.machineAwareness.counts.eventLogErrors} event-log errors
          </p>
          <p className="mt-0.5 text-[10px] text-emerald-200/70">
            Freshness: {preview.machineAwareness.freshness.isFresh ? "fresh" : "stale"} | age{" "}
            {formatStopwatch(preview.machineAwareness.freshness.ageMs)}
          </p>
        </div>
      ) : null}
      {preview.fileAwareness ? (
        <div className="rounded border border-amber-900/60 bg-amber-950/20 p-1.5">
          <p className="text-[10px] font-medium text-amber-200">File Awareness</p>
          <p className="mt-0.5 text-[10px] text-amber-100/90">{preview.fileAwareness.summary}</p>
          <p className="mt-0.5 text-[10px] text-amber-200/70">
            {preview.fileAwareness.counts.volumes} volumes | {preview.fileAwareness.counts.roots} roots | {preview.fileAwareness.counts.files} files |{" "}
            {preview.fileAwareness.counts.media} media | {preview.fileAwareness.counts.recentChanges} changes
          </p>
          <p className="mt-0.5 text-[10px] text-amber-200/70">
            Freshness: {preview.fileAwareness.freshness.isFresh ? "fresh" : "stale"} | age{" "}
            {formatStopwatch(preview.fileAwareness.freshness.ageMs)}
          </p>
        </div>
      ) : null}
      {preview.screenAwareness ? (
        <div className="rounded border border-violet-900/60 bg-violet-950/20 p-1.5">
          <p className="text-[10px] font-medium text-violet-200">Assist Mode</p>
          <p className="mt-0.5 text-[10px] text-violet-100/90">{preview.screenAwareness.summary}</p>
        </div>
      ) : null}
      {preview.runtimePreview ? (
        <div className="rounded border border-rose-900/60 bg-rose-950/20 p-1.5">
          <p className="text-[10px] font-medium text-rose-200">Agent Runtime</p>
          <p className="mt-0.5 text-[10px] text-rose-100/90">
            {preview.runtimePreview.taskTitle} | {preview.runtimePreview.jobStatus}
            {preview.runtimePreview.resultStatus ? ` | ${preview.runtimePreview.resultStatus}` : ""}
          </p>
          <p className="mt-0.5 text-[10px] text-rose-200/70">
            Steps {preview.runtimePreview.plannedStepCount} | Policy {preview.runtimePreview.policyDecisionType ?? "n/a"} |
            Verify {preview.runtimePreview.verificationStatus ?? "n/a"}
          </p>
          <p className="mt-0.5 text-[10px] text-rose-200/70">
            Audit {preview.runtimePreview.auditEventCount} | Updated {formatDateTime(preview.runtimePreview.updatedAt)}
          </p>
          {preview.runtimePreview.checkpointSummary ? (
            <p className="mt-0.5 text-[10px] text-rose-100/90">{preview.runtimePreview.checkpointSummary}</p>
          ) : null}
        </div>
      ) : null}
      {preview.awarenessQuery ? (
        <div className="rounded border border-sky-900/60 bg-sky-950/20 p-1.5">
          <p className="text-[10px] font-medium text-sky-200">Awareness Query</p>
          <p className="mt-0.5 text-[10px] text-sky-100/90">{preview.awarenessQuery.summary}</p>
          <p className="mt-0.5 text-[10px] text-sky-200/70">
            {preview.awarenessQuery.intent.label} | scope {preview.awarenessQuery.scope} |{" "}
            confidence {preview.awarenessQuery.bundle.confidenceLevel}
          </p>
          <p className="mt-0.5 text-[10px] text-sky-200/70">
            Freshness: {preview.awarenessQuery.bundle.freshness.isFresh ? "fresh" : "stale"} | age{" "}
            {formatStopwatch(preview.awarenessQuery.bundle.freshness.ageMs)}
          </p>
        </div>
      ) : null}
      {preview.officialKnowledge?.used ? (
        <div className="rounded border border-blue-900/60 bg-blue-950/20 p-1.5">
          <p className="text-[10px] font-medium text-blue-200">Official Windows Knowledge</p>
          <p className="mt-0.5 text-[10px] text-blue-100/90">
            {preview.officialKnowledge.hitCount} Microsoft source{preview.officialKnowledge.hitCount === 1 ? "" : "s"} |{" "}
            {preview.officialKnowledge.source}
          </p>
          <p className="mt-0.5 text-[10px] text-blue-200/70">
            Mirror: {preview.officialKnowledge.mirrorFresh ? "fresh" : "stale"} | last refreshed{" "}
            {preview.officialKnowledge.lastRefreshedAt
              ? formatDateTime(preview.officialKnowledge.lastRefreshedAt)
              : "n/a"}
          </p>
          <p className="mt-0.5 text-[10px] text-blue-100/90">
            {preview.officialKnowledge.hits
              .slice(0, compact ? 1 : 2)
              .map((hit) => hit.title)
              .join(" | ")}
          </p>
        </div>
      ) : null}
      <p className="text-[10px] text-slate-300">
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
        className="whitespace-pre-wrap text-[10px] text-slate-500"
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
