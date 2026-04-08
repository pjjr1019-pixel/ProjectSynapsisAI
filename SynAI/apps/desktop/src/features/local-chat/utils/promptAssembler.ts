import type { ContextPreview } from "@contracts";

export const summarizePromptContext = (preview: ContextPreview | null): string => {
  if (!preview) {
    return "No context preview yet.";
  }
  const awarenessSummary = preview.awareness ? ` | awareness ${preview.awareness.summary}` : "";
  const querySummary = preview.awarenessQuery ? ` | query ${preview.awarenessQuery.intent.label}` : "";
  const machineSummary = preview.machineAwareness ? ` | machine ${preview.machineAwareness.summary}` : "";
  const fileSummary = preview.fileAwareness ? ` | files ${preview.fileAwareness.summary}` : "";
  const screenSummary = preview.screenAwareness ? ` | screen ${preview.screenAwareness.summary}` : "";
  const webSummary =
    preview.webSearch.status === "used"
      ? ` | web ${preview.webSearch.results.length}`
      : preview.webSearch.status === "error"
        ? " | web error"
        : preview.webSearch.status === "no_results"
          ? " | web 0"
          : "";

  return `stable ${preview.stableMemories.length} | retrieved ${preview.retrievedMemories.length}${webSummary}${awarenessSummary}${querySummary}${machineSummary}${fileSummary}${screenSummary} | recent ${preview.recentMessagesCount} | chars ${preview.estimatedChars}`;
};
