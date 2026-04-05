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

const ROOT = createTempTaskmanagerRoot("horizons-route-smoke-");
seedMinimalTaskmanagerState(ROOT);
applyRuntimeTestEnv(ROOT);

let loaded;
async function loadModules() {
  loaded ||= Promise.all([
    importFresh("portable_lib/governed-actions.mjs"),
    importFresh("server/http-routes.mjs"),
  ]).then(([governedActions, httpRoutes]) => ({ governedActions, httpRoutes }));
  return loaded;
}

test.beforeEach(async () => {
  const { governedActions } = await loadModules();
  resetRuntimeTestRoot(ROOT);
  governedActions.__resetGovernedActionsForTests();
});

test("route smoke: runtime shortcut -> workflow -> fallback ordering", async () => {
  const { httpRoutes } = await loadModules();

  const runtime = await invokeRoute(httpRoutes, "POST", "http://127.0.0.1/api/chat", {
    message: "what is using the most CPU right now?",
    sessionId: "smoke-runtime",
    localLlm: false,
  });
  assert.equal(runtime.statusCode, 200);
  assert.equal(runtime.json.source, "task-manager-runtime");

  const workflow = await invokeRoute(httpRoutes, "POST", "http://127.0.0.1/api/chat", {
    message: "create a folder in documents called RouteSmokeReports",
    sessionId: "smoke-workflow",
    localLlm: false,
  });
  assert.equal(workflow.statusCode, 200);
  assert.equal(workflow.json.source, "workflow-planner");
  assert.equal(workflow.json.status, "executed");
  assert.equal(typeof workflow.json.workflowId, "string");
  assert.equal(workflow.json.verified, true);
  assert.ok(["strong", "weak"].includes(workflow.json.verificationStrength));

  const fallback = await invokeRoute(httpRoutes, "POST", "http://127.0.0.1/api/chat", {
    message: "hello there",
    sessionId: "smoke-fallback",
    localLlm: false,
  });
  assert.equal(fallback.statusCode, 200);
  assert.ok(["scenario", "fallback", "clarification"].includes(fallback.json.source));
  assert.equal(Boolean(fallback.json.status), false);
});

test("route smoke: approve finalization returns workflow metadata and verifier v2 fields", async () => {
  const { httpRoutes } = await loadModules();
  const sourcePath = path.join(ROOT, "Documents", "smoke-approval-source.txt");
  fs.writeFileSync(sourcePath, "approval smoke\n", "utf8");

  const requested = await invokeRoute(httpRoutes, "POST", "http://127.0.0.1/api/chat", {
    message: `rename file \"${sourcePath}\" to \"smoke-approval-renamed.txt\"`,
    sessionId: "smoke-approval",
    localLlm: false,
  });
  assert.equal(requested.statusCode, 200);
  assert.equal(requested.json.status, "approval_required");
  assert.equal(Boolean(requested.json.approval?.id), true);

  const approved = await invokeRoute(httpRoutes, "POST", "http://127.0.0.1/api/task-manager/actions/approve", {
    id: requested.json.approval.id,
  });

  assert.equal(approved.statusCode, 200);
  assert.equal(approved.json.ok, true);
  assert.equal(approved.json.status, "executed");
  assert.equal(approved.json.source, "workflow-planner");
  assert.equal(typeof approved.json.workflowId, "string");
  assert.equal(typeof approved.json.verification?.doneScore, "number");
  assert.equal(typeof approved.json.doneScore, "number");
  assert.equal(approved.json.executed, true);
  assert.equal(approved.json.verified, true);
});

test("route smoke: rollback route success path", async () => {
  const { httpRoutes } = await loadModules();
  const sourcePath = path.join(ROOT, "Documents", "rollback-smoke-source.txt");
  fs.writeFileSync(sourcePath, "rollback smoke\n", "utf8");

  const executed = await invokeRoute(httpRoutes, "POST", "http://127.0.0.1/api/task-manager/actions/execute", {
    workflow_id: "smoke.rollback.rename",
    message: "rename file",
    steps: [
      {
        action: "rename_file",
        args: { path: sourcePath, new_name: "rollback-smoke-renamed.txt", overwrite: false },
      },
    ],
    autoApprove: true,
  });
  assert.equal(executed.statusCode, 200);
  assert.equal(executed.json.status, "executed");

  const rolledBack = await invokeRoute(httpRoutes, "POST", "http://127.0.0.1/api/task-manager/actions/rollback", {
    runId: executed.json.run.runId,
  });
  assert.equal(rolledBack.statusCode, 200);
  assert.equal(rolledBack.json.ok, true);
  assert.equal(rolledBack.json.source, "governed-actions");
});

test("route smoke: /api/task-manager/chat delegation stays aligned with /api/chat", async () => {
  const { httpRoutes } = await loadModules();
  const payload = { message: "create a folder in documents called DelegationSmoke", sessionId: "smoke-delegation", localLlm: false };
  const direct = await invokeRoute(httpRoutes, "POST", "http://127.0.0.1/api/chat", payload);
  const delegated = await invokeRoute(httpRoutes, "POST", "http://127.0.0.1/api/task-manager/chat", payload);

  assert.equal(direct.statusCode, 200);
  assert.equal(delegated.statusCode, 200);
  assert.equal(delegated.json.source, direct.json.source);
  assert.equal(delegated.json.status, direct.json.status);
  assert.equal(Boolean(delegated.json.workflowId), Boolean(direct.json.workflowId));
});
