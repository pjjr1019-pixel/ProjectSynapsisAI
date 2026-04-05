import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  applyRuntimeTestEnv,
  createTempTaskmanagerRoot,
  importFresh,
  invokeRoute,
  resetRuntimeTestRoot,
  seedMinimalTaskmanagerState,
} from "../helpers/runtime-test-utils.mjs";

const ROOT = createTempTaskmanagerRoot();
seedMinimalTaskmanagerState(ROOT);
applyRuntimeTestEnv(ROOT);

let loadedModulesPromise = null;

async function loadModules() {
  loadedModulesPromise ||= Promise.all([
    importFresh("portable_lib/workflow-config.mjs"),
    importFresh("portable_lib/workflow-execution-service.mjs"),
    importFresh("portable_lib/workflow-registry.mjs"),
    importFresh("portable_lib/workflow-spec.mjs"),
    importFresh("portable_lib/workflow-verifier.mjs"),
    importFresh("portable_lib/governed-actions.mjs"),
    importFresh("server/http-routes.mjs"),
  ]).then(([
    workflowConfig,
    workflowExecutionService,
    workflowRegistry,
    workflowSpec,
    workflowVerifier,
    governedActions,
    httpRoutes,
  ]) => ({
    workflowConfig,
    workflowExecutionService,
    workflowRegistry,
    workflowSpec,
    workflowVerifier,
    governedActions,
    httpRoutes,
  }));
  return loadedModulesPromise;
}

function readWorkflowFiles(status) {
  const directory = path.join(ROOT, "brain", "runtime", "workflows", status);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter((entry) => entry.endsWith(".json")).sort();
}

function readWorkflowSpec(status, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, "brain", "runtime", "workflows", status, fileName), "utf8")
  );
}

function removeTestFolder(name) {
  fs.rmSync(path.join(ROOT, "Documents", name), { recursive: true, force: true });
}

test.beforeEach(async () => {
  const { governedActions } = await loadModules();
  resetRuntimeTestRoot(ROOT);
  governedActions.__resetGovernedActionsForTests();
});

test("legacy governed planner is disabled by default in workflow config", async () => {
  const { workflowConfig } = await loadModules();
  const config = workflowConfig.getWorkflowRuntimeConfig();
  assert.equal(config.flags.enableModelFirstWorkflows, true);
  assert.equal(config.flags.enableLegacyGovernedChatPlanner, false);
});

test("workflow execution service handles a simple create-folder request through the workflow planner", async () => {
  const { workflowExecutionService } = await loadModules();
  const result = await workflowExecutionService.maybeHandleWorkflowChatRequest(
    "create a folder in documents called Reports",
    { sessionId: "workflow-simple-folder" }
  );

  assert.equal(result.handled, true);
  assert.equal(result.source, "workflow-planner");
  assert.equal(result.status, "executed");
  assert.equal(result.verified, true);
  assert.equal(result.verificationStrength, "strong");
  assert.equal(fs.existsSync(path.join(ROOT, "Documents", "Reports")), true);
});

test("successful verified run creates a candidate workflow file", async () => {
  const { workflowExecutionService } = await loadModules();
  const result = await workflowExecutionService.maybeHandleWorkflowChatRequest(
    "create a folder in documents called CandidateOne",
    { sessionId: "workflow-candidate-create" }
  );

  assert.equal(result.status, "executed");
  assert.equal(result.verified, true);
  const candidateFiles = readWorkflowFiles("candidates");
  assert.equal(candidateFiles.length, 1);
  const spec = readWorkflowSpec("candidates", candidateFiles[0]);
  assert.equal(spec.successCount, 1);
  assert.equal(spec.failureCount, 0);
  assert.equal(spec.status, "candidate");
});

test("repeated successful requests update the same candidate workflow instead of duplicating it", async () => {
  const { workflowExecutionService } = await loadModules();
  const message = "create a folder in documents called CandidateRepeat";

  const first = await workflowExecutionService.maybeHandleWorkflowChatRequest(message, {
    sessionId: "workflow-repeat-1",
  });
  assert.equal(first.verified, true);
  removeTestFolder("CandidateRepeat");

  const second = await workflowExecutionService.maybeHandleWorkflowChatRequest(message, {
    sessionId: "workflow-repeat-2",
  });
  assert.equal(second.verified, true);

  const candidateFiles = readWorkflowFiles("candidates");
  assert.equal(candidateFiles.length, 1);
  const spec = readWorkflowSpec("candidates", candidateFiles[0]);
  assert.equal(spec.successCount, 2);
  assert.equal(spec.examplePrompts.includes(message), true);
});

test("trusted workflow is reused on a later similar request", async () => {
  const { workflowExecutionService } = await loadModules();
  const baseMessage = "create a folder in documents called TrustedReports";

  for (let index = 0; index < 3; index += 1) {
    const result = await workflowExecutionService.maybeHandleWorkflowChatRequest(baseMessage, {
      sessionId: `workflow-trusted-${index}`,
    });
    assert.equal(result.verified, true);
    removeTestFolder("TrustedReports");
  }

  const trustedFiles = readWorkflowFiles("trusted");
  assert.equal(trustedFiles.length, 1);
  const trustedSpec = readWorkflowSpec("trusted", trustedFiles[0]);
  assert.equal(trustedSpec.status, "trusted");
  assert.equal(trustedSpec.successCount, 3);

  const reused = await workflowExecutionService.maybeHandleWorkflowChatRequest(
    "please create a folder in documents called TrustedReports",
    { sessionId: "workflow-trusted-reuse" }
  );

  assert.equal(reused.source, "workflow");
  assert.equal(reused.workflowStatus, "trusted");
  assert.equal(reused.verified, true);
});

test("failed verification update does not promote a workflow", async () => {
  const { workflowRegistry, workflowSpec, workflowVerifier } = await loadModules();
  const steps = [
    {
      id: "step-1",
      title: "Create folder",
      action: "create_folder",
      args: { path: path.join(ROOT, "Documents", "FailureCandidate") },
    },
  ];
  const spec = workflowSpec.normalizeWorkflowSpec({
    title: "Failure Candidate",
    status: "candidate",
    source: "model_planned",
    intentLabel: "filesystem.create_folder",
    examplePrompts: ["create a folder in documents called FailureCandidate"],
    steps,
    verification: workflowVerifier.buildVerificationTemplatesForPlan(steps),
    approvalProfile: { requiresApproval: false, destructiveActions: [], riskSummary: "", stepScopes: [] },
    successCount: 2,
    failureCount: 0,
    confidence: 0.7,
    tags: ["workflow-runtime"],
    notes: [],
  });

  workflowRegistry.saveWorkflowSpec(spec);
  const failed = workflowRegistry.captureWorkflowExecution({
    workflow: spec,
    success: false,
    verified: false,
    verificationStrength: "none",
    note: "Verification failed in test.",
    reflection: { summary: "Verification failed.", ambiguity: [], improvements: ["Fix verification"], reusable: false },
  });

  assert.equal(failed.spec.status, "candidate");
  assert.equal(failed.spec.failureCount, 1);
});

test("workflow service still triggers approvals when governed execution requires them", async () => {
  const { workflowExecutionService } = await loadModules();
  const sourcePath = path.join(ROOT, "Documents", "approval-source.txt");
  fs.writeFileSync(sourcePath, "approve me\n", "utf8");
  const result = await workflowExecutionService.maybeHandleWorkflowChatRequest(
    `rename file "${sourcePath}" to "approval-renamed.txt"`,
    { sessionId: "workflow-approval" }
  );

  assert.equal(result.status, "approval_required");
  assert.equal(Boolean(result.approval?.id), true);
  assert.equal(result.verified, false);
});

test("rollback still works for governed file mutations", async () => {
  const { governedActions } = await loadModules();
  const sourcePath = path.join(ROOT, "Documents", "rollback-source.txt");
  fs.writeFileSync(sourcePath, "rollback me\n", "utf8");

  const executed = governedActions.executeGovernedPlanDirect(
    {
      workflow_id: "rollback.rename",
      message: "rename a file",
      steps: [
        {
          action: "rename_file",
          args: {
            path: sourcePath,
            new_name: "rollback-target.txt",
            overwrite: false,
          },
        },
      ],
    },
    { autoApprove: true }
  );

  assert.equal(executed.status, "executed");
  const rollback = governedActions.rollbackGovernedRun(executed.run.runId);
  assert.equal(rollback.ok, true);
  assert.equal(fs.existsSync(sourcePath), true);
  assert.match(fs.readFileSync(sourcePath, "utf8"), /rollback me/i);
});

test("/api/chat payload includes workflow and verification metadata", async () => {
  const { httpRoutes } = await loadModules();
  const result = await invokeRoute(
    httpRoutes,
    "POST",
    "http://127.0.0.1/api/chat",
    {
      message: "create a folder in documents called RouteMetadata",
      sessionId: "workflow-route-metadata",
      localLlm: false,
    }
  );

  assert.equal(result.statusCode, 200);
  assert.equal(result.json.source, "workflow-planner");
  assert.equal(typeof result.json.workflowId, "string");
  assert.equal(result.json.verified, true);
  assert.equal(result.json.verificationStrength, "strong");
  assert.equal(result.json.status, "executed");
});

test("batch summarize guards against recursively processing generated summary artifacts", async () => {
  const { governedActions } = await loadModules();
  const sourceFolder = path.join(ROOT, "Documents", "batch-source");
  const outputFolder = path.join(sourceFolder, "Summaries");
  fs.mkdirSync(outputFolder, { recursive: true });
  fs.writeFileSync(path.join(sourceFolder, "alpha.txt"), "Alpha document", "utf8");
  fs.writeFileSync(path.join(outputFolder, "alpha.summary.md"), "# Document Summary\n\nIgnore me", "utf8");
  fs.writeFileSync(path.join(outputFolder, "summary-report.md"), "# Summary Export Report\n", "utf8");

  const first = governedActions.executeGovernedPlanDirect(
    {
      workflow_id: "batch.guard",
      message: "summarize a folder",
      steps: [
        {
          action: "batch_summarize_folder",
          args: {
            source_folder: sourceFolder,
            output_folder: outputFolder,
            patterns: [".txt", ".md"],
            recursive: true,
            mode: "concise",
          },
        },
      ],
    },
    { autoApprove: true }
  );

  const second = governedActions.executeGovernedPlanDirect(
    {
      workflow_id: "batch.guard.repeat",
      message: "summarize a folder again",
      steps: [
        {
          action: "batch_summarize_folder",
          args: {
            source_folder: sourceFolder,
            output_folder: outputFolder,
            patterns: [".txt", ".md"],
            recursive: true,
            mode: "concise",
          },
        },
      ],
    },
    { autoApprove: true }
  );

  assert.equal(first.status, "executed");
  assert.equal(second.status, "executed");
  assert.equal(first.run.results[0].result.count, 1);
  assert.equal(second.run.results[0].result.count, 1);
});
