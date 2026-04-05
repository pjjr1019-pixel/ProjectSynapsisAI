import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeBatchBehavior,
  evaluateExecutionAssertions,
  getValueAtPath,
} from "./assertions.mjs";

test("getValueAtPath reads nested object and array segments", () => {
  const payload = { plan: { steps: [{ action: "create_folder" }] } };
  assert.equal(getValueAtPath(payload, "plan.steps.0.action"), "create_folder");
});

test("evaluateExecutionAssertions checks structured payload fields before reply text", () => {
  const result = evaluateExecutionAssertions(
    {
      mode: "route",
      route: { handled: true },
      payload: {
        reply: "Workflow complete. Verification passed.",
        source: "workflow-planner",
        status: "executed",
        workflowId: "wf-1",
        workflowStatus: "candidate",
        verified: true,
        verificationStrength: "strong",
        plan: { steps: [{ action: "create_folder" }] },
        run: { runId: "run-1" },
      },
    },
    {
      expect: {
        source_in: ["workflow-planner", "workflow"],
        status_equals: "executed",
        workflow_required: true,
        verified: true,
        verification_strength: "strong",
        payload_paths_present: ["workflowId", "plan.steps.0.action", "run.runId"],
        reply_contains_any: ["Workflow complete"],
      },
    }
  );

  assert.equal(result.passed, true);
});

test("analyzeBatchBehavior detects duplicate workflows and ignores expected reuse progression", () => {
  const duplicate = analyzeBatchBehavior(
    { expect: {} },
    [
      { payload: { workflowId: "wf-1", source: "workflow-planner", status: "executed", workflowStatus: "candidate", verified: true, verificationStrength: "strong" } },
      { payload: { workflowId: "wf-2", source: "workflow-planner", status: "executed", workflowStatus: "candidate", verified: true, verificationStrength: "strong" } },
    ],
    { workflowCountAfterCase: 2 }
  );
  assert.ok(duplicate.failureLabels.includes("duplicate_workflow_behavior"));

  const reuseProgression = analyzeBatchBehavior(
    { expect: { workflow_reuse: "eventual" } },
    [
      { payload: { workflowId: "wf-1", source: "workflow-planner", status: "executed", workflowStatus: "candidate", verified: true, verificationStrength: "strong" } },
      { payload: { workflowId: "wf-1", source: "workflow", status: "executed", workflowStatus: "trusted", verified: true, verificationStrength: "strong" } },
    ],
    { workflowCountAfterCase: 1 }
  );
  assert.equal(reuseProgression.flaky, false);
  assert.equal(reuseProgression.passed, true);
});
