import fs from "node:fs";
import path from "node:path";
import { ensureDir } from "./brain-build-utils.mjs";
import { getWorkflowFeatureFlags } from "./workflow-config.mjs";
import { captureWorkflowExecution } from "./workflow-registry.mjs";
import { ensureWorkflowRuntimePaths } from "./workflow-runtime-paths.mjs";

function nowIso() {
  return new Date().toISOString();
}

function appendJsonLine(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function buildEpisodeFileName(episode) {
  const stamp = String(episode?.startedAt || episode?.capturedAt || nowIso()).replace(/[:.]/g, "-");
  const runId = String(episode?.runId || episode?.approvalId || "pending").replace(/[^a-zA-Z0-9_-]+/g, "_");
  return `${stamp}_${runId}.json`;
}

function compactReflection(context = {}) {
  const attempted = context.plan?.steps?.length || context.workflowSpec?.steps?.length || 0;
  const verified = context.verification?.verified === true;
  const reusable = verified && context.execution?.status === "executed";

  return {
    summary:
      context.execution?.status === "approval_required"
        ? `Planned ${attempted} step(s) and queued for approval.`
        : context.execution?.status === "executed" && verified
          ? `Executed ${attempted} step(s) and verified the outcome.`
          : context.execution?.status === "executed"
            ? `Executed ${attempted} step(s) but verification was incomplete.`
            : `Attempted ${attempted} step(s) but execution failed.`,
    attemptedSteps: attempted,
    succeeded: context.execution?.status === "executed",
    verified,
    reusable,
    failed: context.execution?.status === "failed",
    ambiguity:
      context.validation?.errors?.length
        ? context.validation.errors.map((entry) => `${entry.action}: ${entry.message}`)
        : [],
    improvements:
      context.verification?.verified === true
        ? []
        : context.verification?.failedChecks?.map((entry) => `${entry.action || entry.stepId}: ${entry.note || entry.type}`) || [],
  };
}

export function persistWorkflowEpisode(episodeInput = {}) {
  const paths = ensureWorkflowRuntimePaths();
  const episode = {
    capturedAt: nowIso(),
    ...episodeInput,
  };
  const filePath = path.join(paths.runsRoot, buildEpisodeFileName(episode));
  ensureDir(paths.runsRoot);
  fs.writeFileSync(filePath, `${JSON.stringify(episode, null, 2)}\n`, "utf8");
  appendJsonLine(paths.runsLogFile, {
    capturedAt: episode.capturedAt,
    runId: episode.runId || null,
    workflowId: episode.workflowId || null,
    source: episode.source || null,
    status: episode.execution?.status || episode.status || null,
    verified: episode.verification?.verified === true,
    verificationStrength: episode.verification?.verificationStrength || "none",
  });
  return { filePath, episode };
}

export function captureWorkflowOutcome(context = {}) {
  const flags = getWorkflowFeatureFlags(context.configOverrides);
  const reflection = compactReflection(context);
  const episode = {
    runId: context.run?.runId || context.runId || null,
    workflowId: context.workflowSpec?.id || context.workflowId || null,
    originalRequest: context.originalRequest || "",
    normalizedRequest: context.normalizedRequest || "",
    source: context.source || null,
    plan: context.plan || null,
    workflowSpec: context.workflowSpec || null,
    approvalStatus: context.approval?.status || context.run?.approvalStatus || null,
    execution: {
      status: context.execution?.status || null,
      run: context.run || null,
      approval: context.approval || null,
      errors: context.errors || [],
    },
    verification: context.verification || null,
    rollback: {
      runId: context.run?.runId || null,
      snapshots: context.run?.snapshots || [],
    },
    timings: context.timings || {},
    reflection,
    matchedWorkflow: context.matchedWorkflow || null,
    validation: context.validation || null,
    startedAt: context.startedAt || null,
  };

  const persistedEpisode = persistWorkflowEpisode(episode);
  let capture = null;

  if (
    flags.enableWorkflowCapture &&
    context.execution?.status === "executed" &&
    context.run?.dryRun !== true &&
    context.verification?.verified === true &&
    context.workflowSpec
  ) {
    capture = captureWorkflowExecution(
      {
        workflow: context.workflowSpec,
        success: true,
        verified: true,
        verificationStrength: context.verification.verificationStrength,
        at: nowIso(),
        note: reflection.summary,
        reflection,
      },
      { configOverrides: context.configOverrides }
    );
  } else if (context.captureFailure === true && context.workflowSpec?.id && context.execution?.status === "failed") {
    capture = captureWorkflowExecution(
      {
        workflow: context.workflowSpec,
        success: false,
        verified: false,
        verificationStrength: context.verification?.verificationStrength || "none",
        at: nowIso(),
        note: reflection.summary,
        reflection,
      },
      { configOverrides: context.configOverrides }
    );
  }

  return {
    episode: persistedEpisode.episode,
    episodeFilePath: persistedEpisode.filePath,
    capture,
    reflection,
  };
}
