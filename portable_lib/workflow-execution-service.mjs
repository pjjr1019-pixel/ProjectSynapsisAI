import { getWorkflowRuntimeConfig } from "./workflow-config.mjs";
import { instantiateReusableWorkflow, findWorkflowMatches } from "./workflow-registry.mjs";
import { instantiateGovernedPlanFromWorkflow, planWorkflowFromRequest } from "./workflow-planner.mjs";
import { captureWorkflowOutcome } from "./workflow-capture.mjs";
import {
  buildGovernedRunReply,
  executeGovernedPlanDirect,
  rollbackGovernedRun,
  tryHandleGovernedChatRequest,
} from "./governed-actions.mjs";
import { decorateRunWithVerification, verifyGovernedRun } from "./workflow-verifier.mjs";

function nowIso() {
  return new Date().toISOString();
}

function buildVerificationSuffix(verification) {
  if (!verification) return "";
  if (verification.verified === true && verification.verificationStrength === "strong") {
    return " Verification passed.";
  }
  if (verification.verified === true && verification.verificationStrength === "weak") {
    return " Verification passed with best-effort checks.";
  }
  if (verification.verified !== true && verification.notes?.length) {
    return ` Verification: ${verification.notes[0]}`;
  }
  return "";
}

function buildWorkflowRuntimeMetadata({
  workflowSpec,
  source,
  originalRequest,
  normalizedRequest,
  plannerSource,
  matchedWorkflow,
  validation,
}) {
  return {
    workflowId: workflowSpec?.id || null,
    workflowStatus: workflowSpec?.status || null,
    sourcePath: source,
    originalRequest,
    normalizedRequest,
    plannerSource: plannerSource || null,
    matchedWorkflow: matchedWorkflow
      ? {
          workflowId: matchedWorkflow.workflowId,
          status: matchedWorkflow.status,
          score: matchedWorkflow.score,
          title: matchedWorkflow.title,
        }
      : null,
    validation,
    workflowSpec,
  };
}

function buildApprovalReply(result, source) {
  const approval = result?.approval;
  return {
    reply:
      approval?.preview?.risk_summary
        ? `I planned this ${source === "workflow" ? "workflow" : "workflow action"}, but approval is required before execution. Approval id: ${approval.id}. Risk summary: ${approval.preview.risk_summary}`
        : `Approval is required before this ${source === "workflow" ? "workflow" : "workflow action"} can run. Approval id: ${approval?.id || "unknown"}.`,
    source,
  };
}

function buildResultPayload(base = {}) {
  return {
    handled: true,
    reply: base.reply,
    source: base.source,
    status: base.status,
    workflowId: base.workflowId || null,
    workflowStatus: base.workflowStatus || null,
    plan: base.plan || null,
    run: base.run || null,
    approval: base.approval || null,
    verified: base.verified === true,
    verificationStrength: base.verificationStrength || "none",
    capturedAt: base.capturedAt || nowIso(),
    capture: base.capture || null,
    episode: base.episode || null,
    reflection: base.reflection || null,
  };
}

function canUseTrustedWorkflow(matches, config) {
  if (!config.flags.enableWorkflowReuse) return null;
  return matches?.reusableTrusted || null;
}

export async function maybeHandleWorkflowChatRequest(message, options = {}) {
  const config = getWorkflowRuntimeConfig(options.configOverrides);
  const startedAt = Date.now();
  const originalRequest = String(message || "").trim();

  if (!config.flags.enableModelFirstWorkflows) {
    if (config.flags.enableLegacyGovernedChatPlanner) {
      const legacy = await tryHandleGovernedChatRequest(message, options);
      if (!legacy?.handled) return null;
      return buildResultPayload({
        reply: legacy.reply,
        source: "legacy-governed-planner",
        status: legacy.status,
        workflowId: legacy.plan?.workflow_id || null,
        workflowStatus: null,
        plan: legacy.plan || null,
        run: legacy.run || null,
        approval: legacy.approval || null,
        verified: false,
        verificationStrength: "none",
      });
    }
    return null;
  }

  const matches = findWorkflowMatches({ message: originalRequest });
  const reusedWorkflow = canUseTrustedWorkflow(matches, config);
  const matchedWorkflow = reusedWorkflow || matches?.candidateHint || matches?.matches?.[0] || null;

  let source = reusedWorkflow ? "workflow" : "workflow-planner";
  let plannerSource = reusedWorkflow ? "registry-reuse" : null;
  let workflowSpec = null;
  let governedPlan = null;
  let validation = { ok: true, errors: [] };
  let normalizedRequest = matches?.request?.normalizedRequest || originalRequest.toLowerCase();

  if (reusedWorkflow?.spec) {
    const instantiated = instantiateReusableWorkflow(reusedWorkflow);
    workflowSpec = {
      ...instantiated.spec,
      steps: instantiated.steps,
      verification: instantiated.verification,
    };
    const instantiatedPlan = instantiateGovernedPlanFromWorkflow(workflowSpec, {
      message: originalRequest,
      dryRun: options.dryRun === true,
    });
    governedPlan = instantiatedPlan.governedPlan;
    validation = instantiatedPlan.validation;
  } else {
    const planned = planWorkflowFromRequest(message, options);
    if (!planned?.handled) {
      if (config.flags.enableLegacyGovernedChatPlanner) {
        const legacy = await tryHandleGovernedChatRequest(message, options);
        if (!legacy?.handled) return null;
        return buildResultPayload({
          reply: legacy.reply,
          source: "legacy-governed-planner",
          status: legacy.status,
          workflowId: legacy.plan?.workflow_id || null,
          plan: legacy.plan || null,
          run: legacy.run || null,
          approval: legacy.approval || null,
        });
      }
      return null;
    }

    plannerSource = planned.plannerSource;
    normalizedRequest = planned.normalizedRequest || normalizedRequest;
    if (planned.kind === "rollback" && planned.undoRunId) {
      const rollback = rollbackGovernedRun(planned.undoRunId);
      const verification = {
        executed: rollback.ok === true,
        verified: rollback.ok === true,
        verificationStrength: rollback.ok === true ? "strong" : "none",
        notes: rollback.ok === true ? ["Rollback completed."] : [rollback.error || "Rollback failed."],
        failedChecks: rollback.ok === true ? [] : [{ type: "rollback_failure", note: rollback.error || "Rollback failed." }],
        stepResults: [],
      };
      const captured = captureWorkflowOutcome({
        runId: planned.undoRunId,
        workflowId: null,
        originalRequest,
        normalizedRequest: planned.normalizedRequest,
        source,
        plan: planned.governedPlan,
        workflowSpec: null,
        execution: { status: rollback.ok === true ? "executed" : "failed" },
        verification,
        run: null,
        validation: planned.validation,
        errors: rollback.ok === true ? [] : [rollback.error],
        startedAt: new Date(startedAt).toISOString(),
        timings: { elapsedMs: Date.now() - startedAt },
      });
      return buildResultPayload({
        reply: rollback.ok
          ? `Done - I rolled back run ${planned.undoRunId}. ${rollback.restored?.length || 0} file(s) restored.`
          : `I tried to roll back run ${planned.undoRunId}, but it failed: ${rollback.error}`,
        source,
        status: rollback.ok === true ? "executed" : "failed",
        workflowId: null,
        workflowStatus: null,
        plan: planned.governedPlan || null,
        run: rollback.ok ? { rollback } : null,
        approval: null,
        verified: verification.verified,
        verificationStrength: verification.verificationStrength,
        capture: captured.capture,
        episode: captured.episode,
        reflection: captured.reflection,
      });
    }

    workflowSpec = planned.workflowSpec;
    governedPlan = planned.governedPlan;
    validation = planned.validation;
  }

  if (!workflowSpec || !governedPlan) return null;

  const workflowRuntime = buildWorkflowRuntimeMetadata({
    workflowSpec,
    source,
    originalRequest,
    normalizedRequest,
    plannerSource,
    matchedWorkflow,
    validation,
  });

  governedPlan.workflowRuntime = workflowRuntime;
  governedPlan.metadata = {
    ...(governedPlan.metadata || {}),
    workflowRuntime,
  };

  if (!validation.ok) {
    const captured = captureWorkflowOutcome({
      workflowId: workflowSpec.id,
      originalRequest,
      normalizedRequest: workflowRuntime.normalizedRequest,
      source,
      plan: governedPlan,
      workflowSpec,
      execution: { status: "failed" },
      verification: {
        executed: false,
        verified: false,
        verificationStrength: "none",
        notes: validation.errors.map((entry) => entry.message),
        failedChecks: validation.errors,
        stepResults: [],
      },
      validation,
      matchedWorkflow,
      errors: validation.errors.map((entry) => entry.message),
      startedAt: new Date(startedAt).toISOString(),
      timings: { elapsedMs: Date.now() - startedAt },
      captureFailure: Boolean(matchedWorkflow?.spec),
    });
    return buildResultPayload({
      reply: `I could not validate the planned workflow: ${validation.errors[0]?.message || "unknown validation error"}`,
      source,
      status: "failed",
      workflowId: workflowSpec.id,
      workflowStatus: workflowSpec.status,
      plan: governedPlan,
      run: null,
      approval: null,
      verified: false,
      verificationStrength: "none",
      capture: captured.capture,
      episode: captured.episode,
      reflection: captured.reflection,
    });
  }

  const executionResult = executeGovernedPlanDirect(governedPlan, {
    autoApprove: false,
  });

  if (executionResult.status === "approval_required") {
    const approvalPayload = buildApprovalReply(executionResult, source);
    const captured = captureWorkflowOutcome({
      workflowId: workflowSpec.id,
      originalRequest,
      normalizedRequest: workflowRuntime.normalizedRequest,
      source,
      plan: executionResult.plan,
      workflowSpec,
      execution: { status: "approval_required" },
      approval: executionResult.approval,
      verification: {
        executed: false,
        verified: false,
        verificationStrength: "none",
        notes: ["Execution is waiting for approval."],
        failedChecks: [],
        stepResults: [],
      },
      validation,
      matchedWorkflow,
      startedAt: new Date(startedAt).toISOString(),
      timings: { elapsedMs: Date.now() - startedAt },
    });
    return buildResultPayload({
      reply: approvalPayload.reply,
      source,
      status: "approval_required",
      workflowId: workflowSpec.id,
      workflowStatus: workflowSpec.status,
      plan: executionResult.plan,
      run: null,
      approval: executionResult.approval,
      verified: false,
      verificationStrength: "none",
      capture: captured.capture,
      episode: captured.episode,
      reflection: captured.reflection,
    });
  }

  const verification = verifyGovernedRun({
    plan: executionResult.plan,
    run: executionResult.run,
    workflowSpec,
    verification: workflowSpec.verification,
  });
  const decoratedRun = decorateRunWithVerification(executionResult.run, verification);
  const captured = captureWorkflowOutcome({
    workflowId: workflowSpec.id,
    originalRequest,
    normalizedRequest: workflowRuntime.normalizedRequest,
    source,
    plan: executionResult.plan,
    workflowSpec,
    execution: { status: executionResult.status },
    run: decoratedRun,
    verification,
    validation,
    matchedWorkflow,
    startedAt: new Date(startedAt).toISOString(),
    timings: { elapsedMs: Date.now() - startedAt },
    captureFailure: Boolean(matchedWorkflow?.spec),
  });

  const captureSpec = captured.capture?.spec || null;
  const reply = `${buildGovernedRunReply(executionResult.run)}${buildVerificationSuffix(verification)}`;

  return buildResultPayload({
    reply,
    source,
    status: executionResult.status,
    workflowId: captureSpec?.id || workflowSpec.id,
    workflowStatus: captureSpec?.status || workflowSpec.status,
    plan: executionResult.plan,
    run: decoratedRun,
    approval: null,
    verified: verification.verified,
    verificationStrength: verification.verificationStrength,
    capture: captured.capture,
    episode: captured.episode,
    reflection: captured.reflection,
  });
}

export function finalizeApprovedWorkflowExecution(approvalResult, options = {}) {
  const workflowRuntime = approvalResult?.approval?.workflow?.workflowRuntime || approvalResult?.approval?.workflow?.metadata?.workflowRuntime;
  if (!workflowRuntime || !approvalResult?.run || !approvalResult?.approval?.workflow) {
    return null;
  }

  const startedAt = Date.now();
  const workflowSpec = workflowRuntime.workflowSpec || null;
  const verification = verifyGovernedRun({
    plan: approvalResult.approval.workflow,
    run: approvalResult.run,
    workflowSpec,
    verification: workflowSpec?.verification,
  });
  const decoratedRun = decorateRunWithVerification(approvalResult.run, verification);
  const captured = captureWorkflowOutcome({
    workflowId: workflowRuntime.workflowId,
    originalRequest: workflowRuntime.originalRequest || "",
    normalizedRequest: workflowRuntime.normalizedRequest || "",
    source: workflowRuntime.sourcePath || "workflow-planner",
    plan: approvalResult.approval.workflow,
    workflowSpec,
    execution: { status: decoratedRun.success ? "executed" : "failed" },
    run: decoratedRun,
    approval: approvalResult.approval,
    verification,
    validation: workflowRuntime.validation || null,
    matchedWorkflow: workflowRuntime.matchedWorkflow || null,
    startedAt: new Date(startedAt).toISOString(),
    timings: { elapsedMs: Date.now() - startedAt },
    captureFailure: Boolean(workflowRuntime.matchedWorkflow),
    configOverrides: options.configOverrides,
  });

  const captureSpec = captured.capture?.spec || workflowSpec;
  return buildResultPayload({
    reply: `${buildGovernedRunReply(approvalResult.run)}${buildVerificationSuffix(verification)}`,
    source: workflowRuntime.sourcePath || "workflow-planner",
    status: decoratedRun.success ? "executed" : "failed",
    workflowId: captureSpec?.id || workflowRuntime.workflowId || null,
    workflowStatus: captureSpec?.status || workflowRuntime.workflowStatus || null,
    plan: approvalResult.approval.workflow,
    run: decoratedRun,
    approval: approvalResult.approval,
    verified: verification.verified,
    verificationStrength: verification.verificationStrength,
    capture: captured.capture,
    episode: captured.episode,
    reflection: captured.reflection,
  });
}
