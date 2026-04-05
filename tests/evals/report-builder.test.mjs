import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildPromptEvalArtifacts,
  writePromptEvalArtifacts,
} from "./report-builder.mjs";

test("report builder emits markdown, json, and failure logs", () => {
  const runResult = {
    runStamp: "2026-04-05T12-00-00-000Z",
    generatedAt: "2026-04-05T12:00:00.000Z",
    durationMs: 1234,
    summary: {
      totalCases: 1,
      totalExecutions: 1,
      passCount: 0,
      failCount: 1,
      flakyCount: 0,
    },
    cases: [
      {
        id: "case.one",
        mode: "route",
        prompt: "create a folder",
        tags: ["workflow", "route"],
        expect: { source_equals: "workflow-planner", status_equals: "executed" },
        pass: false,
        flaky: false,
        executions: [
          {
            prompt: "create a folder",
            payload: { source: "fallback", status: null, reply: "Nope" },
            assertion: { failureLabels: ["wrong_source"] },
            approvalFlow: { autoApprove: false },
          },
        ],
        batch: { failureLabels: [], uniqueWorkflowIds: [] },
      },
    ],
  };

  const artifacts = buildPromptEvalArtifacts(runResult);
  assert.match(artifacts.markdown, /Overall Summary/i);
  assert.ok(artifacts.failures.length >= 1);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prompt-eval-report-"));
  const output = writePromptEvalArtifacts(runResult, {
    resultsRoot: path.join(root, "results"),
    historyRoot: path.join(root, "history"),
  });

  assert.equal(fs.existsSync(output.latestResultsPath.replace(/\//g, path.sep)), true);
  assert.equal(fs.existsSync(output.latestReportPath.replace(/\//g, path.sep)), true);
  assert.equal(fs.existsSync(output.failuresPath.replace(/\//g, path.sep)), true);
  assert.equal(fs.existsSync(output.historyPath.replace(/\//g, path.sep)), true);
});
