import fs from "node:fs";
import path from "node:path";
import {
  ensureDir,
  normalizeSlashes,
  stableStringify,
  writeJsonStable,
} from "../../portable_lib/brain-build-utils.mjs";
import { EVAL_HISTORY_ROOT, EVAL_RESULTS_ROOT } from "./eval-paths.mjs";

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return "0ms";
  if (ms < 1_000) return `${Math.round(ms)}ms`;
  return `${(ms / 1_000).toFixed(2)}s`;
}

function formatObserved(caseResult) {
  const latest = caseResult.executions[caseResult.executions.length - 1];
  return `${latest?.payload?.source || "none"} / ${latest?.payload?.status || "none"}`;
}

function flattenFailures(runResult) {
  const failures = [];
  for (const caseResult of runResult.cases) {
    for (const execution of caseResult.executions) {
      for (const label of execution.assertion.failureLabels) {
        failures.push({
          kind: "execution",
          category: label,
          caseId: caseResult.id,
          prompt: execution.prompt,
          variantKind: execution.variantKind || "base",
          source: execution.payload?.source || null,
          status: execution.payload?.status || null,
          reply: execution.payload?.reply || "",
          expectedSource: caseResult.expect.source_equals || caseResult.expect.source_in || null,
          expectedStatus: caseResult.expect.status_equals || caseResult.expect.status_in || null,
          tags: caseResult.tags,
        });
      }
    }
    for (const label of caseResult.batch.failureLabels) {
      failures.push({
        kind: "batch",
        category: label,
        caseId: caseResult.id,
        prompt: caseResult.prompt,
        variantKind: "batch",
        source: caseResult.executions[caseResult.executions.length - 1]?.payload?.source || null,
        status: caseResult.executions[caseResult.executions.length - 1]?.payload?.status || null,
        reply: caseResult.executions[caseResult.executions.length - 1]?.payload?.reply || "",
        expectedSource: caseResult.expect.source_equals || caseResult.expect.source_in || null,
        expectedStatus: caseResult.expect.status_equals || caseResult.expect.status_in || null,
        tags: caseResult.tags,
      });
    }
  }
  return failures;
}

function groupCounts(items, selector) {
  const counts = new Map();
  for (const item of items) {
    const key = selector(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort(
    (left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0]))
  );
}

function likelySubsystemFromFailure(failure) {
  const tags = new Set(failure.tags || []);
  if (tags.has("runtime")) return "runtime shortcut";
  if (tags.has("approval")) return "approvals";
  if (tags.has("reuse")) return "workflow reuse";
  if (tags.has("verification")) return "verification";
  if (tags.has("fallback")) return "fallback chat";
  if (failure.category === "reply_mismatch" || failure.category === "forbidden_reply_text") {
    return "reply quality";
  }
  if (
    failure.category === "wrong_source" ||
    failure.category === "fallback_misroute" ||
    failure.category === "route_not_handled"
  ) {
    return "workflow routing";
  }
  if (
    failure.category === "duplicate_workflow_behavior" ||
    failure.category === "workflow_not_reused" ||
    failure.category === "workflow_not_promoted"
  ) {
    return "workflow reuse";
  }
  if (failure.category === "missing_approval" || failure.category === "unexpected_approval") {
    return "approvals";
  }
  if (failure.category === "missing_verification" || failure.category === "wrong_verification_strength") {
    return "verification";
  }
  return "workflow routing";
}

function buildSubsystemBreakdown(runResult) {
  const subsystemNames = [
    "runtime shortcut",
    "workflow routing",
    "workflow reuse",
    "approvals",
    "verification",
    "fallback chat",
    "reply quality",
  ];

  return subsystemNames.map((name) => {
    const matchingCases = runResult.cases.filter((caseResult) => {
      const tags = new Set(caseResult.tags);
      if (name === "runtime shortcut") return tags.has("runtime");
      if (name === "workflow routing") return tags.has("workflow") || tags.has("approval") || tags.has("reuse");
      if (name === "workflow reuse") return tags.has("reuse");
      if (name === "approvals") return tags.has("approval");
      if (name === "verification") return tags.has("verification");
      if (name === "fallback chat") return tags.has("fallback");
      if (name === "reply quality") return true;
      return false;
    });

    return {
      subsystem: name,
      caseCount: matchingCases.length,
      failedCases: matchingCases.filter((entry) => !entry.pass).length,
      flakyCases: matchingCases.filter((entry) => entry.flaky).length,
    };
  });
}

function buildWorkflowFindings(runResult) {
  const findings = [];
  for (const caseResult of runResult.cases) {
    if (caseResult.batch.failureLabels.includes("duplicate_workflow_behavior")) {
      findings.push(
        `Duplicate workflow creation observed in ${caseResult.id}: ${caseResult.batch.uniqueWorkflowIds.join(", ")}`
      );
    }
    if (caseResult.batch.failureLabels.includes("workflow_not_reused")) {
      findings.push(`Trusted workflow reuse did not happen for ${caseResult.id} after repeated runs.`);
    }
    if (caseResult.batch.failureLabels.includes("workflow_not_promoted")) {
      findings.push(`Candidate workflow did not promote to trusted for ${caseResult.id}.`);
    }
    if (caseResult.tags.includes("approval") && caseResult.mode !== "governed_direct") {
      const missingMeta = caseResult.executions.some(
        (execution) =>
          execution.initialPayload?.status === "approval_required" &&
          execution.approvalFlow?.autoApprove === true &&
          (!execution.payload?.capture || !execution.payload?.episode || !execution.payload?.reflection)
      );
      if (missingMeta) {
        findings.push(`Approval finalization metadata is incomplete for ${caseResult.id}.`);
      }
    }
    if (caseResult.tags.includes("verification")) {
      const weakOnly = caseResult.executions.every(
        (execution) =>
          execution.payload?.verificationStrength && execution.payload.verificationStrength !== "strong"
      );
      if (weakOnly && caseResult.expect?.verification_strength !== "weak") {
        findings.push(`Verification stayed weak for ${caseResult.id}.`);
      }
    }
  }
  return findings;
}

function buildRepairRecommendations(runResult, failures) {
  const recommendations = [];
  const categories = new Map(groupCounts(failures, (failure) => failure.category));

  if ((categories.get("wrong_source") || 0) + (categories.get("fallback_misroute") || 0) > 0) {
    const cases = failures
      .filter((failure) => failure.category === "wrong_source" || failure.category === "fallback_misroute")
      .slice(0, 4)
      .map((failure) => failure.caseId);
    recommendations.push(
      `Actionable prompts are falling onto the wrong live branch before the expected workflow/runtime handler in ${[...new Set(cases)].join(", ")}.`
    );
  }

  if ((categories.get("duplicate_workflow_behavior") || 0) > 0) {
    const cases = failures
      .filter((failure) => failure.category === "duplicate_workflow_behavior")
      .map((failure) => failure.caseId);
    recommendations.push(
      `Repeated prompts are creating multiple workflow specs instead of updating one reusable workflow in ${[...new Set(cases)].join(", ")}.`
    );
  }

  if ((categories.get("workflow_not_reused") || 0) + (categories.get("workflow_not_promoted") || 0) > 0) {
    const cases = failures
      .filter((failure) => failure.category === "workflow_not_reused" || failure.category === "workflow_not_promoted")
      .map((failure) => failure.caseId);
    recommendations.push(
      `Workflow reuse/promotion thresholds look too strict or capture is not accumulating cleanly for ${[...new Set(cases)].join(", ")}.`
    );
  }

  if ((categories.get("missing_approval") || 0) + (categories.get("unexpected_approval") || 0) > 0) {
    const cases = failures
      .filter((failure) => failure.category === "missing_approval" || failure.category === "unexpected_approval")
      .map((failure) => failure.caseId);
    recommendations.push(
      `Approval gating is inconsistent for risky mutations in ${[...new Set(cases)].join(", ")}.`
    );
  }

  if ((categories.get("missing_verification") || 0) + (categories.get("wrong_verification_strength") || 0) > 0) {
    const cases = failures
      .filter((failure) => failure.category === "missing_verification" || failure.category === "wrong_verification_strength")
      .map((failure) => failure.caseId);
    recommendations.push(
      `Execution succeeds but verification is missing or too weak for ${[...new Set(cases)].join(", ")}.`
    );
  }

  if ((categories.get("malformed_payload") || 0) > 0) {
    const cases = failures
      .filter((failure) => failure.category === "malformed_payload")
      .map((failure) => failure.caseId);
    recommendations.push(
      `Structured payload fields are missing from live responses for ${[...new Set(cases)].join(", ")}.`
    );
  }

  if ((categories.get("reply_mismatch") || 0) + (categories.get("forbidden_reply_text") || 0) > 0) {
    const cases = failures
      .filter((failure) => failure.category === "reply_mismatch" || failure.category === "forbidden_reply_text")
      .map((failure) => failure.caseId);
    recommendations.push(
      `Routing is landing correctly more often than the wording, so reply text guidance needs tightening for ${[...new Set(cases)].join(", ")}.`
    );
  }

  if (!recommendations.length && runResult.summary.failCount === 0 && runResult.summary.flakyCount === 0) {
    recommendations.push(
      "No repair recommendations right now. The evaluated routing and workflow behaviors were stable in this run."
    );
  }

  return recommendations;
}

function buildMarkdownReport(runResult, failures, breakdown, workflowFindings, recommendations) {
  const failureCounts = groupCounts(failures, (failure) => failure.category);
  const topRecurringPrompts = groupCounts(
    failures.map((failure) => `${failure.caseId}|||${failure.prompt}`),
    (entry) => entry
  ).slice(0, 8);

  const lines = [
    "# Prompt Eval Report",
    "",
    `Generated: ${runResult.generatedAt}`,
    "",
    "## Overall Summary",
    "",
    `- Total cases: ${runResult.summary.totalCases}`,
    `- Total executions: ${runResult.summary.totalExecutions}`,
    `- Pass count: ${runResult.summary.passCount}`,
    `- Fail count: ${runResult.summary.failCount}`,
    `- Flaky count: ${runResult.summary.flakyCount}`,
    `- Duration: ${formatDuration(runResult.durationMs)}`,
    "",
    "## Breakdown By Subsystem",
    "",
  ];

  for (const entry of breakdown) {
    lines.push(
      `- ${entry.subsystem}: ${entry.caseCount} case(s), ${entry.failedCases} failed, ${entry.flakyCases} flaky`
    );
  }

  lines.push("", "## Failures By Category", "");
  if (!failureCounts.length) {
    lines.push("- none");
  } else {
    for (const [category, count] of failureCounts) {
      lines.push(`- ${category}: ${count}`);
    }
  }

  lines.push("", "## Top Recurring Failing Prompts", "");
  if (!topRecurringPrompts.length) {
    lines.push("- none");
  } else {
    for (const [entry, count] of topRecurringPrompts) {
      const [caseId, prompt] = entry.split("|||");
      const caseResult = runResult.cases.find((item) => item.id === caseId);
      const latest = caseResult?.executions[caseResult.executions.length - 1];
      lines.push(
        `- ${caseId} (${count}): prompt="${prompt}" | observed=${formatObserved(caseResult)} | expected source=${stableStringify(caseResult?.expect?.source_equals || caseResult?.expect?.source_in || null)} | expected status=${stableStringify(caseResult?.expect?.status_equals || caseResult?.expect?.status_in || null)} | subsystem=${likelySubsystemFromFailure({
          category: caseResult?.batch?.failureLabels?.[0] || latest?.assertion?.failureLabels?.[0] || "",
          tags: caseResult?.tags || [],
        })}`
      );
      if (latest?.payload?.reply) {
        lines.push(
          `  Latest reply: ${String(latest.payload.reply).replace(/\s+/g, " ").slice(0, 220)}`
        );
      }
    }
  }

  lines.push("", "## Workflow Findings", "");
  if (!workflowFindings.length) {
    lines.push("- none");
  } else {
    for (const finding of workflowFindings) {
      lines.push(`- ${finding}`);
    }
  }

  lines.push("", "## Repair Recommendations", "");
  for (const recommendation of recommendations) {
    lines.push(`- ${recommendation}`);
  }

  return `${lines.join("\n")}\n`;
}

export function buildPromptEvalArtifacts(runResult) {
  const failures = flattenFailures(runResult).map((failure) => ({
    ...failure,
    likelySubsystem: likelySubsystemFromFailure(failure),
  }));
  const breakdown = buildSubsystemBreakdown(runResult);
  const workflowFindings = buildWorkflowFindings(runResult);
  const recommendations = buildRepairRecommendations(runResult, failures);

  return {
    failures,
    breakdown,
    workflowFindings,
    recommendations,
    markdown: buildMarkdownReport(runResult, failures, breakdown, workflowFindings, recommendations),
  };
}

export function writePromptEvalArtifacts(
  runResult,
  { resultsRoot = EVAL_RESULTS_ROOT, historyRoot = EVAL_HISTORY_ROOT } = {}
) {
  ensureDir(resultsRoot);
  ensureDir(historyRoot);

  const artifacts = buildPromptEvalArtifacts(runResult);
  const latestResultsPath = path.join(resultsRoot, "latest-results.json");
  const latestReportPath = path.join(resultsRoot, "latest-report.md");
  const failuresPath = path.join(resultsRoot, "failures.jsonl");
  const historyPath = path.join(historyRoot, `${runResult.runStamp}.json`);

  const finalPayload = {
    ...runResult,
    failures: artifacts.failures,
    breakdown: artifacts.breakdown,
    workflowFindings: artifacts.workflowFindings,
    recommendations: artifacts.recommendations,
  };

  writeJsonStable(latestResultsPath, finalPayload);
  writeJsonStable(historyPath, finalPayload);
  fs.writeFileSync(latestReportPath, artifacts.markdown, "utf8");
  fs.writeFileSync(
    failuresPath,
    artifacts.failures.map((entry) => `${JSON.stringify(entry)}\n`).join(""),
    "utf8"
  );

  return {
    latestResultsPath: normalizeSlashes(latestResultsPath),
    latestReportPath: normalizeSlashes(latestReportPath),
    failuresPath: normalizeSlashes(failuresPath),
    historyPath: normalizeSlashes(historyPath),
    artifacts,
    finalPayload,
  };
}
