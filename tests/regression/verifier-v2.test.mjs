import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { createTempTaskmanagerRoot, applyRuntimeTestEnv, importFresh } from "../helpers/runtime-test-utils.mjs";

const ROOT = createTempTaskmanagerRoot("horizons-verifier-v2-");
applyRuntimeTestEnv(ROOT);

test("verifier v2 reports strong verification and doneScore=1 for successful file write", async () => {
  const verifier = await importFresh("portable_lib/workflow-verifier.mjs");
  const target = path.join(ROOT, "Documents", "verifier-strong.txt");
  fs.writeFileSync(target, "hello verifier\n", "utf8");

  const result = verifier.verifyGovernedRun({
    plan: { steps: [{ id: "step-1", action: "write_text_file", args: { path: target, content: "hello verifier" } }] },
    run: { dryRun: false, results: [{ success: true, result: { path: target } }] },
  });

  assert.equal(result.executed, true);
  assert.equal(result.verified, true);
  assert.equal(result.verificationStrength, "strong");
  assert.equal(result.doneScore, 1);
  assert.equal(result.remediationHint, null);
});

test("verifier v2 reports partial doneScore and remediation hint when checks fail", async () => {
  const verifier = await importFresh("portable_lib/workflow-verifier.mjs");
  const target = path.join(ROOT, "Documents", "verifier-missing.txt");

  const result = verifier.verifyGovernedRun({
    plan: { steps: [{ id: "step-1", action: "write_text_file", args: { path: target, content: "expected" } }] },
    run: { dryRun: false, results: [{ success: true, result: { path: target } }] },
  });

  assert.equal(result.executed, true);
  assert.equal(result.verified, false);
  assert.equal(result.verificationStrength, "none");
  assert.ok(result.doneScore < 1);
  assert.equal(typeof result.remediationHint, "string");
  assert.ok(result.failedChecks.length > 0);
});
