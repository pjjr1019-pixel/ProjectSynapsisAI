import fs from "node:fs";
import path from "node:path";

function normalizePath(value) {
  return path.normalize(String(value || ""));
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeReadText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function pathExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function isDirectory(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function computeSummaryOutputPath(args = {}) {
  if (args.output_path) return normalizePath(args.output_path);
  const sourcePath = normalizePath(args.source_path);
  const parsed = path.parse(sourcePath);
  return path.join(parsed.dir, `${parsed.name}.summary.md`);
}

function buildCheck(id, type, data = {}) {
  return { id, type, ...data };
}

export function buildVerificationTemplateForStep(stepInput = {}, index = 0) {
  const step = stepInput && typeof stepInput === "object" ? stepInput : {};
  const stepId = String(step.id || `step-${index + 1}`).trim();
  const args = step.args && typeof step.args === "object" ? step.args : {};
  const outputPath = step.action === "summarize_document" ? computeSummaryOutputPath(args) : null;

  /** @type {Array<Record<string, unknown>>} */
  let checks = [];
  let allowWeak = false;

  switch (step.action) {
    case "create_folder":
      checks = [buildCheck(`${stepId}:exists`, "path_exists", { path: args.path, expect: "directory" })];
      break;
    case "write_text_file":
      checks = [
        buildCheck(`${stepId}:exists`, "path_exists", { path: args.path, expect: "file" }),
        buildCheck(`${stepId}:nonempty`, "file_non_empty", { path: args.path }),
      ];
      if (String(args.content || "").trim()) {
        checks.push(
          buildCheck(`${stepId}:content`, "file_contains", {
            path: args.path,
            text: String(args.content).slice(0, 160),
          })
        );
      }
      break;
    case "append_text_file":
      checks = [
        buildCheck(`${stepId}:exists`, "path_exists", { path: args.path, expect: "file" }),
        buildCheck(`${stepId}:nonempty`, "file_non_empty", { path: args.path }),
      ];
      if (String(args.content || "").trim()) {
        checks.push(
          buildCheck(`${stepId}:appended`, "file_contains", {
            path: args.path,
            text: String(args.content).slice(0, 160),
          })
        );
      }
      break;
    case "move_file":
      checks = [
        buildCheck(`${stepId}:destination`, "path_exists", { path: args.destination }),
        buildCheck(`${stepId}:source_missing`, "path_missing", { path: args.source }),
      ];
      break;
    case "copy_file":
      checks = [
        buildCheck(`${stepId}:destination`, "path_exists", { path: args.destination }),
        buildCheck(`${stepId}:source_exists`, "path_exists", { path: args.source }),
      ];
      break;
    case "rename_file":
      checks = [
        buildCheck(`${stepId}:destination`, "path_exists", {
          path: args.path ? path.join(path.dirname(normalizePath(args.path)), String(args.new_name || "").trim()) : "",
        }),
        buildCheck(`${stepId}:source_missing`, "path_missing", { path: args.path }),
      ];
      break;
    case "delete_file":
      checks = [buildCheck(`${stepId}:deleted`, "path_missing", { path: args.path })];
      break;
    case "summarize_document":
      checks = [
        buildCheck(`${stepId}:exists`, "path_exists", { path: outputPath, expect: "file" }),
        buildCheck(`${stepId}:nonempty`, "file_non_empty", { path: outputPath }),
        buildCheck(`${stepId}:header`, "file_contains", { path: outputPath, text: "# Document Summary" }),
      ];
      break;
    case "batch_summarize_folder":
      checks = [
        buildCheck(`${stepId}:folder`, "path_exists", { path: args.output_folder, expect: "directory" }),
        buildCheck(`${stepId}:count`, "directory_file_count_at_least", { path: args.output_folder, minCount: 1 }),
      ];
      break;
    case "export_summary_report":
      checks = [
        buildCheck(`${stepId}:exists`, "path_exists", { path: args.output_path, expect: "file" }),
        buildCheck(`${stepId}:nonempty`, "file_non_empty", { path: args.output_path }),
        buildCheck(`${stepId}:header`, "file_contains", { path: args.output_path, text: "# Summary Export Report" }),
      ];
      break;
    case "open_system_utility":
      checks = [buildCheck(`${stepId}:launch`, "utility_launch", { utility: args.utility })];
      allowWeak = true;
      break;
    case "list_directory":
    case "read_text_file":
    case "search_files":
      checks = [buildCheck(`${stepId}:result`, "execution_result_present", {})];
      break;
    default:
      checks = [buildCheck(`${stepId}:success`, "execution_result_present", {})];
      allowWeak = true;
      break;
  }

  return {
    id: `verify-${stepId}`,
    stepId,
    mode: "explicit",
    allowWeak,
    checks,
  };
}

export function buildVerificationTemplatesForPlan(steps = []) {
  return toArray(steps).map((step, index) => buildVerificationTemplateForStep(step, index));
}

function runCheck(check, stepResult, step) {
  const type = String(check?.type || "");
  const targetPath = check?.path ? normalizePath(check.path) : "";

  switch (type) {
    case "path_exists": {
      const exists = pathExists(targetPath);
      const expect = String(check?.expect || "");
      const matchesType =
        !exists
          ? false
          : expect === "directory"
            ? isDirectory(targetPath)
            : expect === "file"
              ? isFile(targetPath)
              : true;
      return {
        ok: exists && matchesType,
        strength: "strong",
        note: exists
          ? matchesType
            ? `Verified ${targetPath} exists.`
            : `Path exists but type did not match for ${targetPath}.`
          : `Expected path does not exist: ${targetPath}`,
      };
    }
    case "path_missing": {
      const exists = pathExists(targetPath);
      return {
        ok: !exists,
        strength: "strong",
        note: exists ? `Path still exists: ${targetPath}` : `Verified ${targetPath} is absent.`,
      };
    }
    case "file_non_empty": {
      const text = safeReadText(targetPath);
      return {
        ok: text.trim().length > 0,
        strength: "strong",
        note: text.trim().length > 0 ? `Verified ${targetPath} is non-empty.` : `File is empty: ${targetPath}`,
      };
    }
    case "file_contains": {
      const text = safeReadText(targetPath);
      const expected = String(check?.text || "");
      return {
        ok: Boolean(expected) && text.includes(expected),
        strength: "strong",
        note: text.includes(expected)
          ? `Verified ${targetPath} contains expected content.`
          : `Expected content was not found in ${targetPath}.`,
      };
    }
    case "directory_file_count_at_least": {
      const minCount = Math.max(0, Number(check?.minCount) || 0);
      let count = 0;
      try {
        if (isDirectory(targetPath)) {
          count = fs.readdirSync(targetPath, { withFileTypes: true }).filter((entry) => entry.isFile()).length;
        }
      } catch {
        count = 0;
      }
      return {
        ok: count >= minCount,
        strength: "strong",
        note:
          count >= minCount
            ? `Verified ${targetPath} contains ${count} file(s).`
            : `Expected at least ${minCount} file(s) in ${targetPath}, found ${count}.`,
      };
    }
    case "utility_launch": {
      const launched = stepResult?.result?.launched === true;
      return {
        ok: launched,
        strength: "weak",
        note: launched
          ? `Best-effort verification only for utility launch: ${check?.utility || step?.args?.utility || "utility"}.`
          : `Utility launch could not be confirmed.`,
      };
    }
    case "execution_result_present":
    default: {
      const ok = stepResult?.success === true && stepResult?.result != null;
      return {
        ok,
        strength: "weak",
        note: ok ? "Execution returned a structured result." : "Execution result was missing.",
      };
    }
  }
}

function summarizeStepVerification(step, stepResult, verificationConfig) {
  if (!stepResult) {
    return {
      stepId: String(step?.id || ""),
      action: String(step?.action || ""),
      executed: false,
      verified: false,
      verificationStrength: "none",
      doneScore: 0,
      verificationNotes: ["Step did not execute."],
      failedChecks: [],
      checks: [],
    };
  }

  if (stepResult.success !== true) {
    return {
      stepId: String(step?.id || ""),
      action: String(step?.action || ""),
      executed: false,
      verified: false,
      verificationStrength: "none",
      doneScore: 0,
      verificationNotes: [String(stepResult.error || "Step failed before verification.")],
      failedChecks: [
        {
          id: `${step?.id || step?.action || "step"}:execution`,
          type: "execution_failure",
          note: String(stepResult.error || "Step failed."),
        },
      ],
      checks: [],
    };
  }

  const checks = toArray(verificationConfig?.checks);
  const evaluatedChecks = checks.map((check) => {
    const evaluated = runCheck(check, stepResult, step);
    return {
      id: check.id,
      type: check.type,
      ok: evaluated.ok,
      strength: evaluated.strength,
      note: evaluated.note,
    };
  });
  const failedChecks = evaluatedChecks.filter((entry) => !entry.ok);
  const notes = evaluatedChecks.map((entry) => entry.note);
  const allStrong = evaluatedChecks.length > 0 && evaluatedChecks.every((entry) => entry.ok && entry.strength === "strong");
  const allVerified = evaluatedChecks.every((entry) => entry.ok);
  const anyWeak = evaluatedChecks.some((entry) => entry.ok && entry.strength === "weak");
  const doneScore = evaluatedChecks.length
    ? evaluatedChecks.filter((entry) => entry.ok).length / evaluatedChecks.length
    : stepResult.success === true
      ? 1
      : 0;

  let verificationStrength = "none";
  if (allVerified && allStrong) verificationStrength = "strong";
  else if (allVerified && (anyWeak || verificationConfig?.allowWeak)) verificationStrength = "weak";

  return {
    stepId: String(step?.id || ""),
    action: String(step?.action || ""),
    executed: true,
    verified: allVerified,
    verificationStrength,
    doneScore,
    verificationNotes: notes,
    failedChecks,
    checks: evaluatedChecks,
  };
}

export function verifyGovernedRun({ plan, run, workflowSpec, verification = null } = {}) {
  if (!run) {
    return {
      executed: false,
      verified: false,
      verificationStrength: "none",
      doneScore: 0,
      notes: ["No run result was available to verify."],
      failedChecks: [],
      remediationHint: "Re-run the workflow and capture run metadata.",
      stepResults: [],
    };
  }

  if (run.dryRun === true) {
    return {
      executed: false,
      verified: false,
      verificationStrength: "none",
      doneScore: 0,
      notes: ["Dry-run plans are not verified because no side effects were executed."],
      failedChecks: [],
      remediationHint: "Execute without dry-run to produce verifiable outputs.",
      stepResults: [],
    };
  }

  const steps = toArray(plan?.steps);
  const verificationEntries =
    (Array.isArray(verification) && verification.length
      ? verification
      : Array.isArray(workflowSpec?.verification) && workflowSpec.verification.length
        ? workflowSpec.verification
        : buildVerificationTemplatesForPlan(steps));

  const entryByStepId = new Map(
    verificationEntries
      .filter((entry) => entry?.stepId)
      .map((entry) => [String(entry.stepId), entry])
  );

  const stepResults = steps.map((step, index) => {
    const stepId = String(step?.id || `step-${index + 1}`);
    const verificationConfig = entryByStepId.get(stepId) || buildVerificationTemplateForStep(step, index);
    return summarizeStepVerification(step, run.results?.[index], verificationConfig);
  });

  const executed = stepResults.some((entry) => entry.executed);
  const verified = stepResults.length > 0 && stepResults.every((entry) => entry.verified);
  const failedChecks = stepResults.flatMap((entry) =>
    toArray(entry.failedChecks).map((failed) => ({
      stepId: entry.stepId,
      action: entry.action,
      ...failed,
    }))
  );
  const notes = stepResults.flatMap((entry) => toArray(entry.verificationNotes));
  const doneScore = stepResults.length
    ? Number((stepResults.reduce((total, entry) => total + (Number(entry.doneScore) || 0), 0) / stepResults.length).toFixed(3))
    : 0;
  let verificationStrength = "none";
  if (verified && stepResults.every((entry) => entry.verificationStrength === "strong")) {
    verificationStrength = "strong";
  } else if (verified && stepResults.some((entry) => entry.verificationStrength === "weak")) {
    verificationStrength = "weak";
  }

  const remediationHint =
    verified
      ? null
      : failedChecks[0]?.note
        ? `Fix first failed check: ${failedChecks[0].note}`
        : "Review step outputs and rerun.";

  return {
    executed,
    verified,
    verificationStrength,
    doneScore,
    notes,
    failedChecks,
    remediationHint,
    stepResults,
  };
}

export function decorateRunWithVerification(run, verificationResult) {
  const stepResults = toArray(verificationResult?.stepResults);
  return {
    ...run,
    executed: verificationResult?.executed === true,
    verified: verificationResult?.verified === true,
    verificationStrength: verificationResult?.verificationStrength || "none",
    doneScore: typeof verificationResult?.doneScore === "number" ? verificationResult.doneScore : 0,
    verificationNotes: toArray(verificationResult?.notes),
    failedVerificationChecks: toArray(verificationResult?.failedChecks),
    remediationHint: verificationResult?.remediationHint || null,
    results: toArray(run?.results).map((result, index) => {
      const stepVerification = stepResults[index];
      return {
        ...result,
        executed: result.success === true,
        verified: stepVerification?.verified === true,
        verificationStrength: stepVerification?.verificationStrength || "none",
        doneScore: typeof stepVerification?.doneScore === "number" ? stepVerification.doneScore : 0,
        verificationNotes: stepVerification?.verificationNotes || [],
      };
    }),
  };
}
