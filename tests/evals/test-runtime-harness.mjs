import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  applyRuntimeTestEnv,
  invokeRoute,
  seedMinimalTaskmanagerState,
} from "../helpers/runtime-test-utils.mjs";
import {
  analyzeBatchBehavior,
  evaluateExecutionAssertions,
} from "./assertions.mjs";
import {
  applyTemplateValue,
  buildTemplateContext,
  ensureEvalDirectories,
  getEvalSandboxPaths,
  isWithinDirectory,
  REPO_ROOT,
  resolveSandboxRelativePath,
} from "./eval-paths.mjs";
import { generatePromptVariants } from "./variant-generator.mjs";

const MB = 1024 * 1024;
const GB = 1024 * MB;

let loadedModulesPromise = null;

function nowIso() {
  return new Date().toISOString();
}

function buildRunStamp() {
  return nowIso().replace(/[:.]/g, "-");
}

function ensureSandboxTaskmanagerLayout(paths) {
  const root = paths.taskmanagerRoot;
  fs.mkdirSync(path.join(root, "brain", "runtime", "settings"), { recursive: true });
  fs.mkdirSync(path.join(root, "brain", "runtime", "workflows", "candidates"), { recursive: true });
  fs.mkdirSync(path.join(root, "brain", "runtime", "workflows", "trusted"), { recursive: true });
  fs.mkdirSync(path.join(root, "brain", "runtime", "workflows", "archive"), { recursive: true });
  fs.mkdirSync(path.join(root, "brain", "runtime", "workflow-runs"), { recursive: true });
  fs.mkdirSync(path.join(root, "brain", "runtime", "workflow-index"), { recursive: true });
  fs.mkdirSync(path.join(root, "brain", "generated", "runtime"), { recursive: true });
  fs.mkdirSync(path.join(root, "brain", "retrieval", "indexes"), { recursive: true });
  fs.mkdirSync(path.join(root, ".runtime"), { recursive: true });
  fs.mkdirSync(paths.desktopRoot, { recursive: true });
  fs.mkdirSync(paths.documentsRoot, { recursive: true });
}

export function resetEvalSandbox(paths = getEvalSandboxPaths()) {
  fs.rmSync(paths.sandboxRoot, { recursive: true, force: true });
  fs.mkdirSync(paths.sandboxRoot, { recursive: true });
  ensureSandboxTaskmanagerLayout(paths);
  seedMinimalTaskmanagerState(paths.taskmanagerRoot);
  return paths;
}

export function configureEvalEnvironment(paths = getEvalSandboxPaths()) {
  ensureEvalDirectories();
  resetEvalSandbox(paths);
  applyRuntimeTestEnv(paths.taskmanagerRoot);
  process.env.HORIZONS_DESKTOP_PATH = paths.desktopRoot;
  process.env.HORIZONS_DOCUMENTS_PATH = paths.documentsRoot;
  process.env.LOCAL_LLM_ENABLED = "0";
  process.env.HORIZONS_LEARNED_QA = "0";
  process.env.STORY_LLM_BASE_URL = "http://127.0.0.1:9/v1";
  process.env.STORY_LLM_TIMEOUT_MS = "1000";
  return buildTemplateContext(paths);
}

export async function loadHarnessModules({ fresh = false } = {}) {
  if (fresh || !loadedModulesPromise) {
    const moduleUrl = (relativePath) => pathToFileURL(path.join(REPO_ROOT, relativePath)).href;
    loadedModulesPromise = Promise.all([
      import(moduleUrl("server/http-routes.mjs")),
      import(moduleUrl("portable_lib/workflow-execution-service.mjs")),
      import(moduleUrl("portable_lib/governed-actions.mjs")),
      import(moduleUrl("portable_lib/optimizer-telemetry.mjs")),
      import(moduleUrl("portable_lib/workflow-registry.mjs")),
    ]).then(
      ([
        httpRoutes,
        workflowExecutionService,
        governedActions,
        optimizerTelemetry,
        workflowRegistry,
      ]) => ({
        httpRoutes,
        workflowExecutionService,
        governedActions,
        optimizerTelemetry,
        workflowRegistry,
      })
    );
  }
  return loadedModulesPromise;
}

function buildBusyWorkstationSnapshot(paths) {
  const capturedAt = nowIso();
  return {
    capturedAt,
    logicalCpuCount: 16,
    totalMemoryBytes: 32 * GB,
    freeMemoryBytes: 6 * GB,
    totalCpuPercentHint: 74,
    totalGpuPercentHint: 21,
    appProcessPids: [1100, 2200, 3300],
    processes: [
      {
        processName: "chrome.exe",
        pid: 1100,
        cpuPercentHint: 31,
        gpuPercent: 4,
        gpuDedicatedBytes: 256 * MB,
        gpuSharedBytes: 64 * MB,
        workingSetBytes: Math.round(2.8 * GB),
        privateBytes: Math.round(2.3 * GB),
        sessionId: 1,
        path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        mainWindowTitle: "Research Tab",
        responding: true,
        startTime: capturedAt,
        cpuSeconds: 5300,
      },
      {
        processName: "Code.exe",
        pid: 2200,
        cpuPercentHint: 18,
        gpuPercent: 2,
        gpuDedicatedBytes: 128 * MB,
        gpuSharedBytes: 32 * MB,
        workingSetBytes: 980 * MB,
        privateBytes: 910 * MB,
        sessionId: 1,
        path: path.join(paths.taskmanagerRoot, "bin", "Code.exe"),
        mainWindowTitle: "ProjectSynapsisAI",
        responding: true,
        startTime: capturedAt,
        cpuSeconds: 2200,
      },
      {
        processName: "node.exe",
        pid: 3300,
        cpuPercentHint: 8,
        gpuPercent: 1,
        gpuDedicatedBytes: 32 * MB,
        gpuSharedBytes: 16 * MB,
        workingSetBytes: 420 * MB,
        privateBytes: 390 * MB,
        sessionId: 1,
        path: path.join(paths.taskmanagerRoot, "node.exe"),
        mainWindowTitle: "",
        responding: true,
        startTime: capturedAt,
        cpuSeconds: 1400,
      },
      {
        processName: "UpdaterService.exe",
        pid: 4400,
        cpuPercentHint: 14,
        gpuPercent: 0,
        gpuDedicatedBytes: 0,
        gpuSharedBytes: 0,
        workingSetBytes: 760 * MB,
        privateBytes: 720 * MB,
        sessionId: 1,
        path: path.join(paths.taskmanagerRoot, "UpdaterService.exe"),
        mainWindowTitle: "",
        responding: true,
        startTime: capturedAt,
        cpuSeconds: 980,
      },
    ],
  };
}

function buildSnapshotFixture(name, paths) {
  if (name === "busy-workstation") {
    return buildBusyWorkstationSnapshot(paths);
  }
  throw new Error(`Unknown eval osSnapshotFixture "${name}".`);
}

function resolveManagedPath(rawPath, templateContext, sandboxPaths) {
  const resolved = applyTemplateValue(rawPath, templateContext);
  return resolveSandboxRelativePath(resolved, sandboxPaths);
}

function writeManagedFile(file, templateContext, sandboxPaths) {
  const targetPath = resolveManagedPath(file.path, templateContext, sandboxPaths);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  if (Object.prototype.hasOwnProperty.call(file, "json")) {
    fs.writeFileSync(targetPath, `${JSON.stringify(file.json, null, 2)}\n`, "utf8");
    return targetPath;
  }
  fs.writeFileSync(targetPath, String(file.content ?? ""), "utf8");
  return targetPath;
}

function removeManagedPath(targetPath, sandboxPaths) {
  if (!targetPath) return;
  const normalized = path.resolve(targetPath);
  if (!isWithinDirectory(normalized, sandboxPaths.sandboxRoot)) {
    throw new Error(`Refusing to remove path outside eval sandbox: ${targetPath}`);
  }
  fs.rmSync(normalized, { recursive: true, force: true });
}

function resetInMemoryState(modules) {
  modules.governedActions.__resetGovernedActionsForTests?.();
  modules.optimizerTelemetry.acceptOsSnapshot(null);
  modules.optimizerTelemetry.clearTelemetryHistory?.();
}

function summarizeWorkflowRegistry(modules) {
  const registry = modules.workflowRegistry.loadWorkflowRegistry();
  return {
    workflowCount: registry.entries.length,
    workflowIds: registry.entries.map((entry) => entry.spec.id).sort(),
    statuses: registry.entries.map((entry) => `${entry.spec.id}:${entry.spec.status}`).sort(),
  };
}

function applySetup(setup, templateContext, sandboxPaths, modules) {
  const resolvedSetup = applyTemplateValue(setup || {}, templateContext);

  modules.optimizerTelemetry.acceptOsSnapshot(null);

  for (const folder of Array.isArray(resolvedSetup.folders) ? resolvedSetup.folders : []) {
    fs.mkdirSync(resolveManagedPath(folder, templateContext, sandboxPaths), { recursive: true });
  }

  for (const file of Array.isArray(resolvedSetup.files) ? resolvedSetup.files : []) {
    writeManagedFile(file, templateContext, sandboxPaths);
  }

  if (resolvedSetup.osSnapshotFixture) {
    modules.optimizerTelemetry.acceptOsSnapshot(
      buildSnapshotFixture(resolvedSetup.osSnapshotFixture, sandboxPaths)
    );
  } else if (resolvedSetup.osSnapshot) {
    modules.optimizerTelemetry.acceptOsSnapshot(resolvedSetup.osSnapshot);
  }

  return resolvedSetup;
}

function applyCleanupList(pathsToRemove, templateContext, sandboxPaths) {
  for (const entry of Array.isArray(pathsToRemove) ? pathsToRemove : []) {
    removeManagedPath(resolveManagedPath(entry, templateContext, sandboxPaths), sandboxPaths);
  }
}

function resolveDryRun(testCase, options) {
  if (testCase.dryRun === true) return true;
  if (testCase.dryRun === false) return false;
  return options.dryRunDefault === true;
}

function buildRouteBody(testCase, prompt, sessionId, dryRun, templateContext) {
  const body = {
    ...(applyTemplateValue(testCase.body || {}, templateContext) || {}),
    message: prompt,
    sessionId,
    localLlm: false,
    internet: false,
  };
  if (dryRun) {
    body.dryRun = true;
  }
  return body;
}

function buildApprovalPendingReply(approval, source, prefix) {
  return {
    reply: `${prefix} Approval id: ${approval?.id || "unknown"}.`,
    source,
    status: "approval_required",
    workflowId: approval?.workflow?.workflow_id || null,
    workflowStatus: null,
    plan: approval?.workflow || null,
    run: null,
    approval: approval || null,
    verified: false,
    verificationStrength: "none",
    capturedAt: nowIso(),
    capture: null,
    episode: null,
    reflection: null,
  };
}

function wrapGovernedDirectResult(result, modules) {
  if (!result) return null;
  if (result.status === "approval_required") {
    return buildApprovalPendingReply(
      result.approval,
      "governed-direct",
      "Approval is required before the direct governed plan can run."
    );
  }

  return {
    reply: result.run ? modules.governedActions.buildGovernedRunReply(result.run) : "Governed direct execution completed.",
    source: "governed-direct",
    status: result.status,
    workflowId: result.plan?.workflow_id || null,
    workflowStatus: null,
    plan: result.plan || null,
    run: result.run || null,
    approval: null,
    verified: false,
    verificationStrength: "none",
    capturedAt: nowIso(),
    capture: null,
    episode: null,
    reflection: null,
  };
}

function wrapGovernedApprovedResult(result, modules) {
  if (!result) return null;
  return {
    reply: result.run ? modules.governedActions.buildGovernedRunReply(result.run) : "Governed direct execution completed.",
    source: "governed-direct",
    status: result.run?.success ? "executed" : "failed",
    workflowId: result.approval?.workflow?.workflow_id || null,
    workflowStatus: null,
    plan: result.approval?.workflow || null,
    run: result.run || null,
    approval: result.approval || null,
    verified: false,
    verificationStrength: "none",
    capturedAt: nowIso(),
    capture: null,
    episode: null,
    reflection: null,
  };
}

async function executeRouteMode(testCase, prompt, sessionId, dryRun, templateContext, modules) {
  const body = buildRouteBody(testCase, prompt, sessionId, dryRun, templateContext);
  const routePath = testCase.routePath || "/api/chat";
  const initial = await invokeRoute(
    modules.httpRoutes,
    "POST",
    `http://127.0.0.1${routePath}`,
    body
  );
  let finalPayload = initial.json;
  let approvalFlow = { autoApprove: testCase.approval?.autoApprove === true };

  if (finalPayload?.status === "approval_required" && approvalFlow.autoApprove && finalPayload?.approval?.id) {
    const approved = await invokeRoute(
      modules.httpRoutes,
      "POST",
      "http://127.0.0.1/api/task-manager/actions/approve",
      { id: finalPayload.approval.id }
    );
    finalPayload = approved.json;
    approvalFlow = {
      ...approvalFlow,
      approvalRouteStatusCode: approved.statusCode,
    };
  }

  return {
    route: {
      handled: initial.handled,
      statusCode: initial.statusCode,
      path: routePath,
    },
    initialPayload: initial.json,
    payload: finalPayload,
    approvalFlow,
  };
}

async function executeWorkflowMode(testCase, prompt, sessionId, dryRun, modules) {
  const initialPayload = await modules.workflowExecutionService.maybeHandleWorkflowChatRequest(prompt, {
    dryRun,
    sessionId,
  });

  let payload = initialPayload;
  let approvalFlow = { autoApprove: testCase.approval?.autoApprove === true };
  if (payload?.status === "approval_required" && approvalFlow.autoApprove && payload?.approval?.id) {
    const approved = modules.governedActions.approveGovernedApproval(payload.approval.id);
    payload =
      modules.workflowExecutionService.finalizeApprovedWorkflowExecution(approved) ||
      wrapGovernedApprovedResult(approved, modules);
  }

  return {
    route: null,
    initialPayload,
    payload,
    approvalFlow,
  };
}

async function executeGovernedDirectMode(testCase, prompt, sessionId, dryRun, templateContext, modules) {
  const planInput = applyTemplateValue(testCase.plan || {}, templateContext);
  const initial = modules.governedActions.executeGovernedPlanDirect(
    {
      workflow_id: planInput.workflow_id || `eval.${testCase.id}`,
      message: planInput.message || prompt,
      dry_run: dryRun,
      steps: Array.isArray(planInput.steps) ? planInput.steps : [],
      source: planInput.source || "eval-harness",
      metadata: planInput.metadata || null,
    },
    { autoApprove: false, sessionId }
  );

  let payload = wrapGovernedDirectResult(initial, modules);
  let approvalFlow = { autoApprove: testCase.approval?.autoApprove === true };
  if (initial.status === "approval_required" && approvalFlow.autoApprove && initial?.approval?.id) {
    const approved = modules.governedActions.approveGovernedApproval(initial.approval.id);
    payload = wrapGovernedApprovedResult(approved, modules);
  }

  return {
    route: null,
    initialPayload: wrapGovernedDirectResult(initial, modules),
    payload,
    approvalFlow,
  };
}

async function executeSinglePrompt({
  testCase,
  prompt,
  sessionId,
  variantKind,
  attemptIndex,
  dryRun,
  templateContext,
  sandboxPaths,
  modules,
}) {
  const startedAt = Date.now();
  const execution = {
    executionId: `${testCase.id}:${variantKind || "base"}:${attemptIndex}`,
    caseId: testCase.id,
    prompt,
    mode: testCase.mode,
    variantKind: variantKind || "base",
    attemptIndex,
    startedAt: nowIso(),
    route: null,
    initialPayload: null,
    payload: null,
    approvalFlow: { autoApprove: false },
    error: null,
  };

  try {
    let result;
    if (testCase.mode === "route") {
      result = await executeRouteMode(testCase, prompt, sessionId, dryRun, templateContext, modules);
    } else if (testCase.mode === "workflow") {
      result = await executeWorkflowMode(testCase, prompt, sessionId, dryRun, modules);
    } else {
      result = await executeGovernedDirectMode(
        testCase,
        prompt,
        sessionId,
        dryRun,
        templateContext,
        modules
      );
    }

    execution.route = result.route;
    execution.initialPayload = result.initialPayload;
    execution.payload = result.payload;
    execution.approvalFlow = result.approvalFlow;
  } catch (error) {
    execution.error = String(error?.message || error);
  }

  execution.durationMs = Date.now() - startedAt;
  execution.workflowRegistry = summarizeWorkflowRegistry(modules);
  execution.assertion = evaluateExecutionAssertions(execution, testCase);
  execution.paths = {
    documentsRoot: sandboxPaths.documentsRoot,
    desktopRoot: sandboxPaths.desktopRoot,
  };

  return execution;
}

function buildExecutionPlan(testCase, options) {
  const hasLoopOverride = options.loop != null;
  const loopCount = hasLoopOverride
    ? Math.max(1, Number(options.loop) || 1)
    : Math.max(1, Number(testCase.repeat || 1));
  const plan = [];
  for (let index = 0; index < loopCount; index += 1) {
    plan.push({
      prompt: testCase.prompt,
      variantKind: "base",
      attemptIndex: index + 1,
    });
  }
  if (options.variants === true) {
    for (const variant of generatePromptVariants(testCase)) {
      plan.push({
        prompt: variant.prompt,
        variantKind: variant.kind,
        attemptIndex: 1,
      });
    }
  }
  return plan;
}

export async function runPromptEvalCase(testCase, options = {}) {
  const sandboxPaths = getEvalSandboxPaths();
  const templateContext = configureEvalEnvironment(sandboxPaths);
  const modules = await loadHarnessModules();
  resetInMemoryState(modules);
  applySetup(testCase.setup, templateContext, sandboxPaths, modules);

  const dryRun = resolveDryRun(testCase, options);
  const executions = [];

  for (const planEntry of buildExecutionPlan(testCase, options)) {
    const prompt = applyTemplateValue(planEntry.prompt, templateContext);
    const sessionId = `prompt-eval-${testCase.id}-${planEntry.variantKind}-${planEntry.attemptIndex}`;
    const execution = await executeSinglePrompt({
      testCase,
      prompt,
      sessionId,
      variantKind: planEntry.variantKind,
      attemptIndex: planEntry.attemptIndex,
      dryRun,
      templateContext,
      sandboxPaths,
      modules,
    });
    executions.push(execution);
    applyCleanupList(testCase.cleanup?.afterEachPaths, templateContext, sandboxPaths);
  }

  applyCleanupList(testCase.cleanup?.afterCasePaths, templateContext, sandboxPaths);

  const registrySummary = summarizeWorkflowRegistry(modules);
  const batch = analyzeBatchBehavior(testCase, executions, {
    workflowCountAfterCase: registrySummary.workflowCount,
  });

  return {
    ...testCase,
    prompt: applyTemplateValue(testCase.prompt, templateContext),
    dryRun,
    executions,
    batch: {
      ...batch,
      workflowCountAfterCase: registrySummary.workflowCount,
    },
    pass: executions.every((entry) => entry.assertion.passed) && batch.passed,
    flaky: batch.flaky,
  };
}

export async function runPromptEvalSuite(cases, options = {}) {
  const startedAt = Date.now();
  const selectedCases = Array.isArray(cases) ? cases : [];
  if (!selectedCases.length) {
    throw new Error("No prompt eval cases matched the selected filters.");
  }

  const results = [];
  for (const testCase of selectedCases) {
    results.push(await runPromptEvalCase(testCase, options));
  }

  return {
    schemaVersion: "1.0",
    runStamp: buildRunStamp(),
    generatedAt: nowIso(),
    durationMs: Date.now() - startedAt,
    filters: {
      caseIds: options.caseIds || [],
      tags: options.tags || [],
      loop: options.loop == null ? null : Math.max(1, Number(options.loop || 1)),
      variants: options.variants === true,
      dryRunDefault: options.dryRunDefault === true,
    },
    summary: {
      totalCases: results.length,
      totalExecutions: results.reduce((sum, entry) => sum + entry.executions.length, 0),
      passCount: results.filter((entry) => entry.pass).length,
      failCount: results.filter((entry) => !entry.pass).length,
      flakyCount: results.filter((entry) => entry.flaky).length,
    },
    cases: results,
  };
}
