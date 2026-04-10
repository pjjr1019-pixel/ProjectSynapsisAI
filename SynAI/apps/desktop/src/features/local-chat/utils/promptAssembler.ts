import type { ContextPreview } from "@contracts";

export const summarizePromptContext = (preview: ContextPreview | null): string => {
  if (!preview) {
    return "No context preview yet.";
  }
  const answerModeSummary = preview.awarenessAnswerMode ? ` | mode ${preview.awarenessAnswerMode}` : "";
  const groundingSummary = preview.awarenessGrounding
    ? ` | grounding ${preview.awarenessGrounding.status}/${preview.awarenessGrounding.confidenceLevel}`
    : "";
  const awarenessSummary = preview.awareness ? ` | awareness ${preview.awareness.summary}` : "";
  const querySummary = preview.awarenessQuery ? ` | query ${preview.awarenessQuery.intent.label}` : "";
  const machineSummary = preview.machineAwareness ? ` | machine ${preview.machineAwareness.summary}` : "";
  const fileSummary = preview.fileAwareness ? ` | files ${preview.fileAwareness.summary}` : "";
  const screenSummary = preview.screenAwareness ? ` | screen ${preview.screenAwareness.summary}` : "";
  const runtimeSummary = preview.runtimePreview
    ? ` | runtime ${preview.runtimePreview.jobStatus}/${preview.runtimePreview.resultStatus ?? "pending"} steps ${preview.runtimePreview.plannedStepCount}`
    : "";
  const ragSummary = preview.rag
    ? ` | rag ${preview.rag.mode}/${preview.rag.triggerReason} src ${preview.rag.retrieval.total}`
    : "";
  const webSummary =
    preview.webSearch.status === "used"
      ? ` | web ${preview.webSearch.results.length}`
      : preview.webSearch.status === "error"
        ? " | web error"
        : preview.webSearch.status === "no_results"
          ? " | web 0"
          : "";

  return `stable ${preview.stableMemories.length} | retrieved ${preview.retrievedMemories.length}${webSummary}${answerModeSummary}${groundingSummary}${awarenessSummary}${querySummary}${machineSummary}${fileSummary}${screenSummary}${runtimeSummary}${ragSummary} | recent ${preview.recentMessagesCount} | chars ${preview.estimatedChars}`;
};
