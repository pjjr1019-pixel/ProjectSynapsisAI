import type { AwarenessQueryAnswer, ChatMessageMetadata } from "@contracts";
import {
  parseResourceUsageTargets,
  pickResourceUsageFindings
} from "../../../../../../packages/Awareness-Reasoning/src/reasoning/resource-usage";

export const LIVE_USAGE_REFRESH_MS = 2_000;

const normalizeLine = (value: string): string => value.replace(/\s+/g, " ").trim();

const lineForLabel = (lines: string[], label: string): string | null =>
  lines.find((line) => line.toLowerCase().startsWith(label.toLowerCase())) ?? null;

export const isLiveUsageAnswer = (answer: AwarenessQueryAnswer | null | undefined): boolean =>
  answer?.intent.family === "live-usage";

export const buildLiveUsageMessageMetadata = (
  answer: AwarenessQueryAnswer,
  query: string,
  refreshedAt = answer.generatedAt
): ChatMessageMetadata => ({
  awareness: {
    intentFamily: answer.intent.family,
    answerMode: answer.answerMode ?? null,
    query,
    refreshEveryMs: LIVE_USAGE_REFRESH_MS,
    lastRefreshedAt: refreshedAt,
    confidenceLevel: answer.bundle.confidenceLevel,
    card: answer.card ?? null
  }
});

export const formatLiveUsageReply = (
  answer: AwarenessQueryAnswer,
  _refreshedAt = answer.generatedAt
): string => {
  const verifiedLines = answer.bundle.verifiedFindings.map(normalizeLine).filter(Boolean).slice(0, 6);
  const selection = parseResourceUsageTargets(answer.query);
  const cpuLine = lineForLabel(verifiedLines, "Current CPU load") ?? lineForLabel(verifiedLines, "CPU load");
  const ramLine = lineForLabel(verifiedLines, "Current RAM") ?? lineForLabel(verifiedLines, "RAM");
  const gpuLine = lineForLabel(verifiedLines, "GPU");
  const diskLine = verifiedLines.find((line) => /(free on|Current disk|^Disk:)/i.test(line)) ?? null;
  const uptimeLine = lineForLabel(verifiedLines, "Uptime");

  const targetedLines = pickResourceUsageFindings(
    [cpuLine, ramLine, gpuLine, diskLine, uptimeLine].filter((line): line is string => Boolean(line)),
    selection
  );

  if (selection.mode === "focused" && targetedLines.length > 0) {
    return targetedLines.join("\n");
  }

  const lines = verifiedLines.length > 0 ? verifiedLines.slice(0, 4) : ["No live usage data available."];
  return [lines[0] ?? "No live usage data available.", ...lines.slice(1).map((line) => `- ${line}`)].join("\n");
};
