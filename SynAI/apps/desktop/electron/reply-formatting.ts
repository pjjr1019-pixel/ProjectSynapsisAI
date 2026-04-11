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

const bulletPattern = /^\s*[-*]\s+/;
const orderedListPattern = /^\s*\d+\.\s+/;
const markdownHeadingPattern = /^\s*#{1,6}\s+/;
const tableRowPattern = /^\s*\|.+\|\s*$/;
const plainHeadingPattern = /^[A-Z][A-Za-z0-9 /&()'_-]{1,36}:?$/;

const shouldPreserveStructuredReply = (lines: string[]): boolean => {
  if (lines.length <= 3) {
    return true;
  }

  if (lines.every((line) => bulletPattern.test(line))) {
    return true;
  }

  if (lines.some((line) => markdownHeadingPattern.test(line) || orderedListPattern.test(line) || tableRowPattern.test(line))) {
    return true;
  }

  const headingLineCount = lines.filter((line) => !bulletPattern.test(line) && plainHeadingPattern.test(line)).length;
  return headingLineCount >= 2;
};

const clampDirectLineAndBullets = (value: string): string => {
  const lines = value
    .split(/\r?\n/)
    .map((line) => normalizeLine(line))
    .filter(Boolean);
  if (shouldPreserveStructuredReply(lines)) {
    return lines.join("\n");
  }

  const firstLineIndex = lines.findIndex((line) => !bulletPattern.test(line));
  const directLineIndex = firstLineIndex >= 0 ? firstLineIndex : 0;
  const directLine = lines[directLineIndex]?.replace(bulletPattern, "").trim();
  if (!directLine) {
    return value.trim();
  }

  const bullets: string[] = [];
  for (const line of lines.slice(directLineIndex + 1)) {
    const candidate = line.replace(bulletPattern, "").trim();
    if (!candidate || candidate === directLine) {
      continue;
    }
    bullets.push(candidate);
    if (bullets.length >= 2) {
      break;
    }
  }

  return [directLine, ...bullets.map((line) => `- ${line}`)].join("\n");
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
    .replace(/(^|\n)\s*Here(?:'s| is) (?:a )?(?:concise|short|quick) answer:\s*/gim, "$1")
    .replace(/(^|\n)\s*(?:Answer|Summary|Final answer)\s*:\s*/gim, "$1")
    .replace(/\n{2,}Let me know if you(?:'d| would) like (?:me )?to (?:go deeper|expand|add more detail).*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n-\s+\n/g, "\n")
    .trim();

  return clampDirectLineAndBullets(cleaned || trimmed);
};

const formatClarificationReply = (answer: AwarenessQueryAnswer): string => {
  const clarification = answer.clarification;
  if (!clarification) {
    return "I can answer that more clearly with a little more direction.";
  }

  return [
    `I can do that once I have one detail: ${clarification.question}`,
    ...clarification.options.slice(0, 2).map((option) => `- ${option}`)
  ].join("\n");
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
    ...bullets.slice(0, 2)
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
    if (bullets.length >= 2) {
      break;
    }
    bullets.push(line);
  }

  if (bullets.length < 2 && verified.length === 0 && official[1]) {
    bullets.push(`Microsoft says: ${official[1]}`);
  }

  if (bullets.length < 2 && inferred[0]) {
    bullets.push(`Why it matters: ${inferred[0]}`);
  }

  if (bullets.length < 2 && uncertainty[0]) {
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

