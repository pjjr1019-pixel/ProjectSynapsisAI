import path from "node:path";
import { readJsonIfExists } from "../../portable_lib/brain-build-utils.mjs";
import { loadPromptEvalCases } from "./case-loader.mjs";
import { EVAL_RESULTS_ROOT } from "./eval-paths.mjs";
import { writePromptEvalArtifacts } from "./report-builder.mjs";
import { runPromptEvalSuite } from "./test-runtime-harness.mjs";

function parseArgs(argv) {
  const parsed = {
    caseIds: [],
    tags: [],
    loop: null,
    variants: false,
    reportOnly: false,
    dryRunDefault: false,
    updateBaseline: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--case") {
      parsed.caseIds.push(String(argv[index + 1] || "").trim());
      index += 1;
      continue;
    }
    if (token === "--tag") {
      parsed.tags.push(String(argv[index + 1] || "").trim());
      index += 1;
      continue;
    }
    if (token === "--loop") {
      parsed.loop = Math.max(1, Number(argv[index + 1]) || 1);
      index += 1;
      continue;
    }
    if (token === "--variants") {
      parsed.variants = true;
      continue;
    }
    if (token === "--report-only") {
      parsed.reportOnly = true;
      continue;
    }
    if (token === "--dry-run-default") {
      parsed.dryRunDefault = true;
      continue;
    }
    if (token === "--update-baseline") {
      parsed.updateBaseline = true;
      continue;
    }
  }

  return parsed;
}

function printSummary(summary, outputPaths) {
  console.log(
    [
      `Prompt evals: ${summary.passCount}/${summary.totalCases} case(s) passed`,
      `executions=${summary.totalExecutions}`,
      `failed=${summary.failCount}`,
      `flaky=${summary.flakyCount}`,
      `report=${outputPaths.latestReportPath}`,
    ].join(" | ")
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.reportOnly) {
    const latestResultsPath = path.join(EVAL_RESULTS_ROOT, "latest-results.json");
    const existing = readJsonIfExists(latestResultsPath);
    if (!existing) {
      throw new Error(`No previous eval results found at ${latestResultsPath}.`);
    }
    const outputPaths = writePromptEvalArtifacts(existing);
    printSummary(existing.summary, outputPaths);
    return;
  }

  const cases = loadPromptEvalCases({
    caseIds: options.caseIds,
    tags: options.tags,
  });

  const runResult = await runPromptEvalSuite(cases, options);
  const outputPaths = writePromptEvalArtifacts(runResult);
  printSummary(runResult.summary, outputPaths);

  if (runResult.summary.failCount > 0 || runResult.summary.flakyCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[prompt-evals] ${error?.message || error}`);
  process.exitCode = 1;
});
