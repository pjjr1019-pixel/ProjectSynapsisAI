import type { ContextPreview } from "@contracts";

export const summarizePromptContext = (preview: ContextPreview | null): string => {
  if (!preview) {
    return "No context preview yet.";
  }
  const webSummary =
    preview.webSearch.status === "used"
      ? ` | web ${preview.webSearch.results.length}`
      : preview.webSearch.status === "error"
        ? " | web error"
        : preview.webSearch.status === "no_results"
          ? " | web 0"
          : "";

  return `stable ${preview.stableMemories.length} | retrieved ${preview.retrievedMemories.length}${webSummary} | recent ${preview.recentMessagesCount} | chars ${preview.estimatedChars}`;
};
