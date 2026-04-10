import * as path from "node:path";
import type { PromptEvaluationResponse } from "@contracts";

const formatDuration = (durationMs: number): string => {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  const seconds = durationMs / 1000;
  return `${seconds.toFixed(seconds < 10 ? 2 : 1)} s`;
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

const toFence = (value: string, language = ""): string => {
  const content = value.trim() || "(empty)";
  const fence = content.includes("```") ? "````" : "```";
  return `${fence}${language}\n${content}\n${fence}`;
};

const escapeTableCell = (value: string): string => value.replace(/\|/g, "\\|").trim();
const formatFailureGroups = (report: PromptEvaluationResponse): string[] => {
  const counts = report.cases
    .flatMap((entry) => entry.checkResults.filter((check) => !check.passed))
    .reduce<Record<string, number>>((totals, check) => {
      const category = check.category ?? "content";
      totals[category] = (totals[category] ?? 0) + 1;
      return totals;
    }, {});

  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .map(([category, count]) => `- ${category}: ${count}`);
};

const formatRoute = (
  routeFamily: PromptEvaluationResponse["cases"][number]["routing"]["routeFamily"],
  routeConfidence: number | null
): string =>
  routeFamily === "none"
    ? "none"
    : `${routeFamily}${routeConfidence != null ? ` @ ${routeConfidence.toFixed(2)}` : ""}`;

const CHAT_HISTORY_HEADER = [
  "# Chat History",
  "",
  "Prompt evaluation prompts and replies saved for gap analysis.",
  "Use this file to review where the assistant is strong, where it misses, and what product knowledge or retrieval features to improve."
].join("\n");

const formatFailedChecks = (
  entry: PromptEvaluationResponse["cases"][number]
): string[] => {
  const failed = entry.checkResults.filter((check) => !check.passed);
  return failed.length > 0
    ? failed.map((check) => `- ${check.description} | ${check.detail}`)
    : ["- None."];
};

const formatPromptEvaluationChatHistoryEntry = (report: PromptEvaluationResponse): string => {
  const lines = [
    `## ${report.generatedAt} | ${report.suiteName}`,
    "",
    `- Report file: ${report.reportFileName}`,
    `- Suite mode: ${report.settings.suiteMode}`,
    `- Model: ${report.settings.model ?? "default model"}`,
    `- Quality passed: ${report.summary.qualityPassCount}/${report.summary.total}`,
    `- Needs review: ${report.summary.qualityNeedsReviewCount}`,
    ""
  ];

  for (const entry of report.cases) {
    lines.push(
      `### ${entry.label} (${entry.difficulty})`,
      "",
      `- Status: ${entry.status}`,
      `- Quality: ${entry.qualityStatus}`,
      `- Route: ${formatRoute(entry.routing.routeFamily, entry.routing.routeConfidence)}`,
      `- Source scope: ${entry.routing.sourceScope ?? "none"}`,
      "",
      "#### Prompt",
      "",
      toFence(entry.prompt),
      "",
      "#### Reply",
      "",
      toFence(entry.reply),
      "",
      "#### Failed Checks",
      "",
      ...formatFailedChecks(entry),
      ""
    );
  }

  return lines.join("\n").trim();
};

export const buildPromptEvaluationReportFileName = (
  suiteName: string,
  generatedAt: string
): string => {
  const timestamp = generatedAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "-");
  const slug = slugify(suiteName) || "prompt-eval";
  return `${timestamp}-${slug}.md`;
};

export const formatPromptEvaluationMarkdown = (report: PromptEvaluationResponse): string => {
  const lines = [
    `# ${report.suiteName}`,
    "",
    "## Run Settings",
    "",
    `- Generated: ${report.generatedAt}`,
    `- Workspace: ${report.workspaceRoot}`,
    `- Report file: ${report.reportFileName}`,
    `- Suite mode: ${report.settings.suiteMode}`,
    `- Model: ${report.settings.model ?? "default model"}`,
    `- Response mode: ${report.settings.responseMode}`,
    `- Awareness mode: ${report.settings.awarenessAnswerMode}`,
    `- RAG enabled: ${report.settings.ragEnabled ? "yes" : "no"}`,
    `- Web search: ${report.settings.useWebSearch ? "on" : "off"}`,
    `- Live trace: ${report.settings.showTrace ? "on" : "off"}`,
    `- Workspace indexing: ${report.settings.workspaceIndexingEnabled ? "on" : "off"}`,
    "",
    "## Summary",
    "",
    `- Total prompts: ${report.summary.total}`,
    `- Successes: ${report.summary.successCount}`,
    `- Errors: ${report.summary.errorCount}`,
    `- Quality passed: ${report.summary.qualityPassCount}`,
    `- Needs review: ${report.summary.qualityNeedsReviewCount}`,
    ...(report.summary.qualityNeedsReviewCount > 0
      ? ["", "### Failure Groups", "", ...formatFailureGroups(report)]
      : []),
    "",
    "| Difficulty | Label | Status | Quality | Duration | Confidence | Route | Scope | Aware | Det | Checks |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...report.cases.map((entry) => {
      const confidence = entry.traceSummary?.confidence ?? "n/a";
      const passedChecks = entry.checkResults.filter((check) => check.passed).length;
      return `| ${entry.difficulty} | ${escapeTableCell(entry.label)} | ${entry.status} | ${entry.qualityStatus} | ${formatDuration(entry.durationMs)} | ${confidence} | ${formatRoute(entry.routing.routeFamily, entry.routing.routeConfidence)} | ${entry.routing.sourceScope ?? "none"} | ${entry.routing.awarenessUsed ? "yes" : "no"} | ${entry.routing.deterministicAwareness ? "yes" : "no"} | ${passedChecks}/${entry.checkResults.length} |`;
    })
  ];

  for (const entry of report.cases) {
    const passedChecks = entry.checkResults.filter((check) => check.passed).length;
    lines.push(
      "",
      `## ${entry.label} (${entry.difficulty})`,
      "",
      `- Status: ${entry.status}`,
      `- Quality: ${entry.qualityStatus}`,
      `- Started: ${entry.startedAt}`,
      `- Completed: ${entry.completedAt}`,
      `- Duration: ${formatDuration(entry.durationMs)}`,
      `- Model status: ${entry.modelStatus.status}`,
      `- Model detail: ${entry.modelStatus.detail ?? "none"}`,
      `- Route: ${formatRoute(entry.routing.routeFamily, entry.routing.routeConfidence)}`,
      `- Raw route: ${formatRoute(entry.routing.rawRouteFamily, entry.routing.rawRouteConfidence)}`,
      `- Source scope: ${entry.routing.sourceScope ?? "none"}`,
      `- Awareness used: ${entry.routing.awarenessUsed ? "yes" : "no"}`,
      `- Deterministic awareness: ${entry.routing.deterministicAwareness ? "yes" : "no"}`,
      `- Generic writing suppression: ${entry.routing.genericWritingPromptSuppressed ? "yes" : "no"}`,
      `- Cleanup bypassed: ${entry.routing.cleanupBypassed ? "yes" : "no"}`,
      `- Routing suppression: ${entry.routing.routingSuppressionReason ?? "none"}`,
      `- Reasoning mode: ${entry.routing.reasoningMode ?? "not captured"}`,
      `- Retrieved source summary: ${
        entry.routing.retrievedSourceSummary
          ? `${entry.routing.retrievedSourceSummary.memoryCount} memory | ${entry.routing.retrievedSourceSummary.workspaceHitCount} workspace | ${entry.routing.retrievedSourceSummary.awarenessSourceCount} awareness | ${entry.routing.retrievedSourceSummary.webResultCount} web`
          : "not captured"
      }`,
      ...(entry.routing.retrievedSourceSummary?.workspacePaths?.length
        ? [`- Workspace paths: ${entry.routing.retrievedSourceSummary.workspacePaths.join(", ")}`]
        : []),
      `- Checks passed: ${passedChecks}/${entry.checkResults.length}`,
      entry.traceSummary
        ? `- Trace confidence: ${entry.traceSummary.confidence} | grounded sources: ${entry.traceSummary.groundedSourceCount}`
        : "- Trace confidence: not captured",
      "",
      "### Prompt",
      "",
      toFence(entry.prompt),
      "",
      "### Reply",
      "",
      toFence(entry.reply),
      "",
      "### Checks",
      "",
      ...(entry.checkResults.length > 0
        ? entry.checkResults.map(
            (check) =>
              `- ${check.passed ? "PASS" : "FAIL"} | ${check.description} | ${check.detail}`
          )
        : ["- No checks configured."])
    );
  }

  return `${lines.join("\n")}\n`;
};

export const buildPromptEvaluationReportPath = (
  workspaceRoot: string,
  suiteName: string,
  generatedAt: string
): string => path.join(workspaceRoot, ".runtime", "prompt-evals", buildPromptEvaluationReportFileName(suiteName, generatedAt));

export const buildPromptEvaluationChatHistoryPath = (workspaceRoot: string): string =>
  path.join(workspaceRoot, ".runtime", "prompt-evals", "chathistory.md");

export const upsertPromptEvaluationChatHistory = (
  existingMarkdown: string | null | undefined,
  report: PromptEvaluationResponse
): string => {
  const existing = existingMarkdown?.trim() ?? "";
  const entry = formatPromptEvaluationChatHistoryEntry(report);
  if (!existing) {
    return `${CHAT_HISTORY_HEADER}\n\n${entry}\n`;
  }

  if (existing.includes(`- Report file: ${report.reportFileName}`)) {
    return `${existing}\n`;
  }

  return `${existing}\n\n${entry}\n`;
};
