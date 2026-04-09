import type { AwarenessQueryAnswer } from "@contracts";
import { formatLiveUsageReply, isLiveUsageAnswer } from "../src/features/local-chat/utils/liveUsageReply";

const normalizeLine = (value: string): string => value.replace(/\s+/g, " ").trim();
const normalizePhrase = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const containsNormalizedPhrase = (text: string, phrase: string): boolean => {
  const normalizedText = ` ${normalizePhrase(text)} `;
  const normalizedPhrase = normalizePhrase(phrase);
  if (!normalizedPhrase) {
    return false;
  }

  return normalizedText.includes(` ${normalizedPhrase} `);
};

const boilerplateDocPattern =
  /(skip to main content|table of contents|download microsoft edge|ask learn|this browser is no longer supported)/i;

const isNoisyAwarenessLine = (value: string): boolean => {
  const normalized = normalizeLine(value);
  return normalized.length > 220 || boilerplateDocPattern.test(normalized);
};

const focusTokensForQuery = (query: string): string[] => {
  const stopWords = new Set([
    "what",
    "where",
    "when",
    "why",
    "how",
    "is",
    "are",
    "the",
    "a",
    "an",
    "in",
    "on",
    "for",
    "of",
    "to",
    "my",
    "right",
    "now",
    "current",
    "windows",
    "setting",
    "settings",
    "have",
    "much",
    "using"
  ]);

  return normalizePhrase(query)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopWords.has(token));
};

const selectRelevantFollowUpLines = (
  lines: string[],
  query: string,
  primaryLine: string,
  maxLines: number
): string[] => {
  const tokens = focusTokensForQuery(query);
  const normalizedPrimary = normalizeLine(primaryLine);

  return lines
    .map(normalizeLine)
    .filter(Boolean)
    .filter((line) => line !== normalizedPrimary && !isNoisyAwarenessLine(line))
    .filter((line) => tokens.length === 0 || tokens.some((token) => containsNormalizedPhrase(line, token)))
    .slice(0, maxLines);
};

const looksCodeHeavy = (value: string): boolean => {
  if (value.includes("```")) {
    return true;
  }

  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const codeLikeLines = lines.filter((line) =>
    /(^\s*(const|let|var|function|class|import|export)\b)|[{}();=<>]/.test(line)
  );
  return codeLikeLines.length >= 3;
};

export const cleanupPlainTextAnswer = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed || looksCodeHeavy(trimmed)) {
    return trimmed;
  }

  let cleaned = trimmed.replace(/\*\*([^*\n]+)\*\*/g, "$1");
  const reportLike = /(Direct answer|Verified evidence|Likely interpretation|Suggested next checks|Uncertainty|Confidence|Grounding):/i.test(cleaned);
  if (reportLike) {
    cleaned = cleaned
      .replace(/(^|\n)\s*Direct answer:\s*/gim, "$1")
      .replace(/(^|\n)\s*Verified evidence:\s*/gim, "$1")
      .replace(/(^|\n)\s*Likely interpretation:\s*/gim, "$1Why it matters: ")
      .replace(/(^|\n)\s*Suggested next checks:\s*/gim, "$1Next: ")
      .replace(/(^|\n)\s*Uncertainty(?:\s*\/\s*confidence)?\s*:\s*/gim, "$1Unclear: ")
      .replace(/^\s*Confidence:\s.*$/gim, "")
      .replace(/^\s*Grounding:\s.*$/gim, "");
  }

  cleaned = cleaned
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n-\s+\n/g, "\n")
    .trim();

  return cleaned || trimmed;
};

const formatClarificationReply = (answer: AwarenessQueryAnswer): string => {
  const clarification = answer.clarification;
  if (!clarification) {
    return "I can answer that more clearly with a little more direction.";
  }

  return [clarification.question, ...clarification.options.slice(0, 2).map((option) => `- ${option}`)].join("\n");
};

const formatHotspotReply = (answer: AwarenessQueryAnswer): string => {
  const hotspots = answer.bundle.resourceHotspots ?? [];
  if (hotspots.length === 0) {
    return answer.bundle.verifiedFindings[0] ?? "I don't have a clear hotspot yet.";
  }

  const top = hotspots[0];
  const resourceLabel = top.resource === "disk" ? "disk" : top.resource.toUpperCase();
  const shareLabel = top.resource === "ram" ? "total RAM" : "sampled load";
  const bullets = hotspots
    .slice(0, 3)
    .map(
      (entry) =>
        `- ${entry.rank}. ${entry.label}: ${entry.resourceAmount}${
          entry.resourceShare != null ? ` (${Math.round(entry.resourceShare * 100)}% of ${shareLabel})` : ""
        }`
    );

  if (answer.bundle.uncertainty[0]) {
    bullets.push(`- Unclear: ${normalizeLine(answer.bundle.uncertainty[0])}`);
  } else if (top.description) {
    bullets.push(`- About it: ${normalizeLine(top.description)}`);
  }

  return [
    `${top.label} is using the most ${resourceLabel}${top.resourceAmount ? ` at ${top.resourceAmount}` : ""}.`,
    ...bullets.slice(0, 3)
  ].join("\n");
};

const formatFocusedAwarenessReply = (answer: AwarenessQueryAnswer): string => {
  const verified = answer.bundle.verifiedFindings.map(normalizeLine).filter(Boolean).filter((line) => !isNoisyAwarenessLine(line));
  const official = (answer.bundle.officialVerified ?? [])
    .map(normalizeLine)
    .filter(Boolean)
    .filter((line) => !isNoisyAwarenessLine(line));
  const firstLine = verified[0] ?? official[0] ?? "I don't have enough verified evidence yet.";
  const followUps = selectRelevantFollowUpLines(verified.slice(1), answer.query, firstLine, 1);

  return [firstLine, ...followUps.map((line) => `- ${line}`)].join("\n");
};

const formatGeneralAwarenessReply = (answer: AwarenessQueryAnswer): string => {
  const verified = answer.bundle.verifiedFindings
    .map(normalizeLine)
    .filter(Boolean)
    .filter((line) => !isNoisyAwarenessLine(line));
  const official = (answer.bundle.officialVerified ?? [])
    .map(normalizeLine)
    .filter(Boolean)
    .filter((line) => !isNoisyAwarenessLine(line));
  const inferred = answer.bundle.likelyInterpretation.map(normalizeLine).filter(Boolean);
  const uncertainty = answer.bundle.uncertainty.map(normalizeLine).filter(Boolean);

  const firstLine = verified[0] ?? official[0] ?? "I don't have enough verified evidence yet.";
  const bullets: string[] = [];

  for (const line of verified.slice(1)) {
    if (bullets.length >= 3) {
      break;
    }
    bullets.push(line);
  }

  if (bullets.length < 3 && verified.length === 0 && official[1]) {
    bullets.push(`Microsoft says: ${official[1]}`);
  }

  if (bullets.length < 3 && inferred[0]) {
    bullets.push(`Why it matters: ${inferred[0]}`);
  }

  if (bullets.length < 3 && uncertainty[0]) {
    bullets.push(`Unclear: ${uncertainty[0]}`);
  }

  return [firstLine, ...bullets.map((line) => `- ${line}`)].join("\n");
};

export const formatAwarenessReply = (answer: AwarenessQueryAnswer): string => {
  if (answer.clarification) {
    return formatClarificationReply(answer);
  }

  if (isLiveUsageAnswer(answer)) {
    return formatLiveUsageReply(answer);
  }

  if ((answer.bundle.resourceHotspots?.length ?? 0) > 0) {
    return formatHotspotReply(answer);
  }

  if (
    answer.intent.family === "settings-control-panel" ||
    answer.intent.family === "registry" ||
    answer.intent.family === "process-service-startup"
  ) {
    return formatFocusedAwarenessReply(answer);
  }

  return formatGeneralAwarenessReply(answer);
};

