import { mkdir, rename, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type {
  CapabilityCaseRecord,
  CapabilityRunExportResult,
  CapabilityRunSnapshot,
  CapabilityRunnerDomain
} from "../contracts/capability-runner";

const DOMAIN_LABELS: Record<CapabilityRunnerDomain, string> = {
  "windows-capability-tests": "Windows Capability Tests",
  "app-feature-tests": "App Feature Tests",
  "agent-task-tests": "Agent Task Tests",
  "safety-refusal-tests": "Safety / Refusal Tests"
};

const DOMAIN_FILE_NAMES: Record<CapabilityRunnerDomain, string> = {
  "windows-capability-tests": "windows-capability-results.md",
  "app-feature-tests": "app-feature-results.md",
  "agent-task-tests": "agent-task-results.md",
  "safety-refusal-tests": "safety-refusal-results.md"
};

const toFence = (value: string | null | undefined): string => {
  const content = value && value.trim().length > 0 ? value.trim() : "(empty)";
  const fence = content.includes("```") ? "````" : "```";
  return `${fence}\n${content}\n${fence}`;
};

const formatCoverageLine = (
  label: string,
  counts: { total: number; passed: number; failed: number; skipped: number }
): string =>
  `${label}: ${counts.passed} passed, ${counts.failed} failed, ${counts.skipped} skipped, ${counts.total} total`;

const summarizeDomainCoverage = (cases: CapabilityCaseRecord[], domain: CapabilityRunnerDomain) => {
  const scoped = cases.filter((entry) => entry.domain === domain);
  return {
    total: scoped.length,
    passed: scoped.filter((entry) => entry.status === "passed").length,
    failed: scoped.filter((entry) => entry.status === "failed").length,
    skipped: scoped.filter((entry) => entry.status === "skipped").length
  };
};

const summarizeCategoryCoverage = (cases: CapabilityCaseRecord[]): string[] =>
  [...new Set(cases.map((entry) => `${entry.domain}::${entry.category}`))]
    .sort()
    .map((key) => {
      const [domain, category] = key.split("::");
      const scoped = cases.filter((entry) => entry.domain === domain && entry.category === category);
      return formatCoverageLine(category, {
        total: scoped.length,
        passed: scoped.filter((entry) => entry.status === "passed").length,
        failed: scoped.filter((entry) => entry.status === "failed").length,
        skipped: scoped.filter((entry) => entry.status === "skipped").length
      });
    });

const formatCaseSection = (record: CapabilityCaseRecord): string[] => [
  `#### Case ${String(record.case_index + 1).padStart(4, "0")} - ${record.title}`,
  `- Capability ID: ${record.capability_id}`,
  `- Prompt Variant: ${record.prompt_variant}`,
  `- Status: ${record.status}`,
  `- Started: ${record.started_at ?? "n/a"}`,
  `- Ended: ${record.ended_at ?? "n/a"}`,
  `- Duration ms: ${record.duration_ms ?? 0}`,
  `- Provider: ${record.provider_name ?? "unknown"}`,
  `- Model: ${record.model_name ?? "unknown"}`,
  "",
  "##### Question",
  toFence(record.prompt_text),
  "",
  "##### Reply",
  toFence(record.response_text),
  "",
  "##### Validation",
  `- expected_contains: ${record.expected_contains_json.length > 0 ? record.expected_contains_json.join(" | ") : "(none)"}`,
  `- expected_not_contains: ${record.expected_not_contains_json.length > 0 ? record.expected_not_contains_json.join(" | ") : "(none)"}`,
  `- result: ${record.validation_result ?? "not_scored"}`,
  `- notes: ${record.validation_notes.length > 0 ? record.validation_notes.join(" | ") : "(none)"}`
];

export const formatCapabilityRunMarkdown = (snapshot: CapabilityRunSnapshot): string => {
  const { run, cases } = snapshot;
  const lines = [
    "# Capability Runner Results",
    "",
    "## Run Summary",
    `- Run ID: ${run.id}`,
    `- Started: ${run.started_at ?? "n/a"}`,
    `- Ended: ${run.ended_at ?? "n/a"}`,
    `- Provider: ${run.provider_name ?? "unknown"}`,
    `- Model: ${run.model_name ?? "unknown"}`,
    `- Total cases: ${run.total_cases}`,
    `- Passed: ${run.passed_cases}`,
    `- Failed: ${run.failed_cases}`,
    `- Skipped: ${run.skipped_cases}`,
    "- Coverage by domain:",
    ...Object.keys(DOMAIN_LABELS).map((domain) =>
      `  - ${formatCoverageLine(DOMAIN_LABELS[domain as CapabilityRunnerDomain], summarizeDomainCoverage(cases, domain as CapabilityRunnerDomain))}`
    ),
    "- Coverage by category:",
    ...summarizeCategoryCoverage(cases).map((line) => `  - ${line}`)
  ];

  for (const domain of Object.keys(DOMAIN_LABELS) as CapabilityRunnerDomain[]) {
    const domainCases = cases.filter((entry) => entry.domain === domain);
    if (domainCases.length === 0) {
      continue;
    }

    lines.push("", `## Domain: ${DOMAIN_LABELS[domain]}`);
    const categories = [...new Set(domainCases.map((entry) => entry.category))].sort();
    for (const category of categories) {
      lines.push("", `### Category: ${category}`, "");
      for (const record of domainCases.filter((entry) => entry.category === category)) {
        lines.push(...formatCaseSection(record), "");
      }
    }
  }

  return `${lines.join("\n")}\n`;
};

export const writeAtomicTextFile = async (targetPath: string, content: string): Promise<void> => {
  await mkdir(path.dirname(targetPath), { recursive: true });
  const tempPath = `${targetPath}.tmp`;
  await writeFile(tempPath, content, "utf8");
  await rename(tempPath, targetPath);
};

export const writeCapabilityRunReports = async (
  snapshot: CapabilityRunSnapshot,
  outputPath: string
): Promise<CapabilityRunExportResult> => {
  const markdown = formatCapabilityRunMarkdown(snapshot);
  await writeAtomicTextFile(outputPath, markdown);

  const domainGroups = Object.keys(DOMAIN_LABELS) as CapabilityRunnerDomain[];
  for (const domain of domainGroups) {
    const domainCases = snapshot.cases.filter((entry) => entry.domain === domain);
    if (domainCases.length === 0) {
      continue;
    }

    const domainSnapshot: CapabilityRunSnapshot = {
      ...snapshot,
      cases: domainCases
    };
    const domainPath = path.join(path.dirname(outputPath), DOMAIN_FILE_NAMES[domain]);
    await writeAtomicTextFile(domainPath, formatCapabilityRunMarkdown(domainSnapshot));
  }

  return {
    run_id: snapshot.run.id,
    output_path: outputPath,
    written_at: new Date().toISOString()
  };
};
