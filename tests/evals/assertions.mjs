function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function hasValue(value) {
  return value !== undefined && value !== null;
}

function includesText(haystack, needle) {
  return String(haystack || "").toLowerCase().includes(String(needle || "").toLowerCase());
}

function normalizePathSegments(pathExpression) {
  return String(pathExpression || "")
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getValueAtPath(input, pathExpression) {
  const segments = normalizePathSegments(pathExpression);
  let current = input;
  for (const segment of segments) {
    if (!hasValue(current)) return undefined;
    current = current[segment];
  }
  return current;
}

function pushCheck(checks, detail) {
  checks.push(detail);
  return detail.passed;
}

function pushFailure(failureLabels, label) {
  if (label && !failureLabels.includes(label)) {
    failureLabels.push(label);
  }
}

function isFallbackSource(source) {
  return new Set([
    "scenario",
    "fuzzy",
    "retrieval",
    "learned",
    "calculator",
    "fallback",
    "clarification",
    "idk",
    "recent",
    "refined",
  ]).has(String(source || ""));
}

export function buildStructuredSignature(execution, options = {}) {
  const payload = execution?.payload || {};
  const initialPayload = execution?.initialPayload || payload;
  return JSON.stringify({
    source: options.ignoreSource ? null : payload.source || null,
    status: payload.status || null,
    workflowStatus: options.ignoreWorkflowStatus ? null : payload.workflowStatus || null,
    approvalRequired: initialPayload?.status === "approval_required",
    verified: payload.verified === true,
    verificationStrength: payload.verificationStrength || "none",
  });
}

export function evaluateExecutionAssertions(execution, testCase) {
  const expect = testCase?.expect || {};
  const payload = execution?.payload || null;
  const initialPayload = execution?.initialPayload || payload;
  const checks = [];
  const failureLabels = [];

  if (execution?.error) {
    pushFailure(failureLabels, "runtime_error");
    return {
      passed: false,
      checks,
      failureLabels,
      observed: {
        source: payload?.source || null,
        status: payload?.status || null,
        reply: payload?.reply || null,
      },
    };
  }

  if (execution?.mode === "route" && execution?.route?.handled === false) {
    pushFailure(failureLabels, "route_not_handled");
  }

  if (!payload || typeof payload !== "object") {
    pushFailure(failureLabels, "runtime_error");
    return {
      passed: false,
      checks,
      failureLabels,
      observed: { source: null, status: null, reply: null },
    };
  }

  const observed = {
    source: payload.source || null,
    status: payload.status || null,
    reply: payload.reply || "",
    verified: payload.verified === true,
    verificationStrength: payload.verificationStrength || "none",
    workflowId: payload.workflowId || null,
    workflowStatus: payload.workflowStatus || null,
    approvalId: initialPayload?.approval?.id || payload.approval?.id || null,
  };

  if (hasValue(expect.source_equals)) {
    const passed = pushCheck(checks, {
      name: "source_equals",
      passed: observed.source === expect.source_equals,
      expected: expect.source_equals,
      observed: observed.source,
    });
    if (!passed) pushFailure(failureLabels, "wrong_source");
  }

  if (toArray(expect.source_in).length) {
    const allowed = toArray(expect.source_in);
    const passed = pushCheck(checks, {
      name: "source_in",
      passed: allowed.includes(observed.source),
      expected: allowed,
      observed: observed.source,
    });
    if (!passed) pushFailure(failureLabels, "wrong_source");
  }

  if (toArray(expect.forbid_source).length) {
    const blocked = toArray(expect.forbid_source);
    const passed = pushCheck(checks, {
      name: "forbid_source",
      passed: !blocked.includes(observed.source),
      expected: blocked,
      observed: observed.source,
    });
    if (!passed) pushFailure(failureLabels, "wrong_source");
  }

  if (hasValue(expect.status_equals)) {
    const passed = pushCheck(checks, {
      name: "status_equals",
      passed: observed.status === expect.status_equals,
      expected: expect.status_equals,
      observed: observed.status,
    });
    if (!passed) pushFailure(failureLabels, "wrong_status");
  }

  if (toArray(expect.status_in).length) {
    const allowed = toArray(expect.status_in);
    const passed = pushCheck(checks, {
      name: "status_in",
      passed: allowed.includes(observed.status),
      expected: allowed,
      observed: observed.status,
    });
    if (!passed) pushFailure(failureLabels, "wrong_status");
  }

  if (hasValue(expect.verified)) {
    const expected = expect.verified === true;
    const passed = pushCheck(checks, {
      name: "verified",
      passed: observed.verified === expected,
      expected,
      observed: observed.verified,
    });
    if (!passed && expected) pushFailure(failureLabels, "missing_verification");
    if (!passed && !expected) pushFailure(failureLabels, "wrong_verification_strength");
  }

  if (hasValue(expect.verification_strength)) {
    const passed = pushCheck(checks, {
      name: "verification_strength",
      passed: observed.verificationStrength === expect.verification_strength,
      expected: expect.verification_strength,
      observed: observed.verificationStrength,
    });
    if (!passed) pushFailure(failureLabels, "wrong_verification_strength");
  }

  if (hasValue(expect.approval_required)) {
    const approvalRequired =
      initialPayload?.status === "approval_required" || Boolean(initialPayload?.approval?.id);
    const expected = expect.approval_required === true;
    const passed = pushCheck(checks, {
      name: "approval_required",
      passed: approvalRequired === expected,
      expected,
      observed: approvalRequired,
    });
    if (!passed && expected) pushFailure(failureLabels, "missing_approval");
    if (!passed && !expected) pushFailure(failureLabels, "unexpected_approval");
  }

  if (hasValue(expect.workflow_required)) {
    const expected = expect.workflow_required === true;
    const workflowPresent = hasValue(observed.workflowId);
    const passed = pushCheck(checks, {
      name: "workflow_required",
      passed: workflowPresent === expected,
      expected,
      observed: workflowPresent,
    });
    if (!passed && expected) pushFailure(failureLabels, "missing_workflow_id");
  }

  for (const pathExpression of toArray(expect.payload_paths_present)) {
    const value = getValueAtPath(payload, pathExpression);
    const passed = pushCheck(checks, {
      name: `payload_paths_present:${pathExpression}`,
      passed: hasValue(value),
      expected: "present",
      observed: value,
    });
    if (!passed) {
      pushFailure(failureLabels, pathExpression === "workflowId" ? "missing_workflow_id" : "malformed_payload");
    }
  }

  for (const pathExpression of toArray(expect.payload_paths_absent)) {
    const value = getValueAtPath(payload, pathExpression);
    const passed = pushCheck(checks, {
      name: `payload_paths_absent:${pathExpression}`,
      passed: !hasValue(value),
      expected: "absent",
      observed: value,
    });
    if (!passed) pushFailure(failureLabels, "malformed_payload");
  }

  const replyText = String(observed.reply || "");

  if (toArray(expect.reply_contains_any).length) {
    const required = toArray(expect.reply_contains_any);
    const passed = pushCheck(checks, {
      name: "reply_contains_any",
      passed: required.some((entry) => includesText(replyText, entry)),
      expected: required,
      observed: replyText,
    });
    if (!passed) pushFailure(failureLabels, "reply_mismatch");
  }

  if (toArray(expect.reply_contains_all).length) {
    const required = toArray(expect.reply_contains_all);
    const passed = pushCheck(checks, {
      name: "reply_contains_all",
      passed: required.every((entry) => includesText(replyText, entry)),
      expected: required,
      observed: replyText,
    });
    if (!passed) pushFailure(failureLabels, "reply_mismatch");
  }

  if (toArray(expect.reply_not_contains).length) {
    const blocked = toArray(expect.reply_not_contains);
    const passed = pushCheck(checks, {
      name: "reply_not_contains",
      passed: blocked.every((entry) => !includesText(replyText, entry)),
      expected: blocked,
      observed: replyText,
    });
    if (!passed) pushFailure(failureLabels, "forbidden_reply_text");
  }

  if (
    (hasValue(expect.source_equals) || toArray(expect.source_in).length || expect.workflow_required === true) &&
    !(
      (hasValue(expect.source_equals) && isFallbackSource(expect.source_equals)) ||
      toArray(expect.source_in).some((entry) => isFallbackSource(entry))
    ) &&
    isFallbackSource(observed.source)
  ) {
    pushFailure(failureLabels, "fallback_misroute");
  }

  return {
    passed: failureLabels.length === 0,
    checks,
    failureLabels,
    observed,
  };
}

export function analyzeBatchBehavior(testCase, executions, batchContext = {}) {
  const expect = testCase?.expect || {};
  const failureLabels = [];
  const checks = [];
  const signatureOptions =
    expect.workflow_reuse === true || expect.workflow_reuse === "eventual"
      ? { ignoreSource: true, ignoreWorkflowStatus: true }
      : {};
  const structuredSignatures = [
    ...new Set(executions.map((entry) => buildStructuredSignature(entry, signatureOptions))),
  ];
  const uniqueWorkflowIds = [...new Set(executions.map((entry) => entry?.payload?.workflowId).filter(Boolean))];
  const reusedWorkflow = executions.some((entry) => entry?.payload?.source === "workflow");
  const promotedTrusted = executions.some((entry) => entry?.payload?.workflowStatus === "trusted");

  const flaky = executions.length > 1 && structuredSignatures.length > 1;
  if (flaky) {
    pushFailure(failureLabels, "flaky_behavior");
    pushCheck(checks, {
      name: "structured_consistency",
      passed: false,
      expected: "stable structured output",
      observed: structuredSignatures,
    });
  }

  const duplicateWorkflowDetected =
    executions.length > 1 &&
    (
      Number(batchContext?.workflowCountAfterCase || 0) > 1 ||
      (Number(batchContext?.workflowCountAfterCase || 0) > 0 && uniqueWorkflowIds.length > 1)
    );

  if (duplicateWorkflowDetected) {
    pushFailure(failureLabels, "duplicate_workflow_behavior");
    pushCheck(checks, {
      name: "duplicate_workflow_behavior",
      passed: false,
      expected: "single reusable workflow",
      observed: {
        uniqueWorkflowIds,
        workflowCountAfterCase: Number(batchContext?.workflowCountAfterCase || 0),
      },
    });
  }

  if (hasValue(expect.workflow_reuse)) {
    const expected = expect.workflow_reuse === true || expect.workflow_reuse === "eventual";
    const passed = expected ? reusedWorkflow : !reusedWorkflow;
    pushCheck(checks, {
      name: "workflow_reuse",
      passed,
      expected,
      observed: reusedWorkflow,
    });
    if (!passed && expected) pushFailure(failureLabels, "workflow_not_reused");
  }

  if (expect.workflow_reuse === "eventual" && !promotedTrusted) {
    pushFailure(failureLabels, "workflow_not_promoted");
    pushCheck(checks, {
      name: "workflow_promoted",
      passed: false,
      expected: "trusted",
      observed: executions.map((entry) => entry?.payload?.workflowStatus || null),
    });
  }

  return {
    passed: failureLabels.length === 0 && !flaky,
    checks,
    failureLabels,
    flaky,
    structuredSignatures,
    uniqueWorkflowIds,
    reusedWorkflow,
    promotedTrusted,
  };
}
