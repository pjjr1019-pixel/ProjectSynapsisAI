import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadPromptEvalCases } from "./case-loader.mjs";

test("loadPromptEvalCases loads grouped files and filters by tag", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prompt-eval-cases-"));
  fs.writeFileSync(
    path.join(root, "group.json"),
    JSON.stringify(
      {
        cases: [
          {
            id: "case.one",
            prompt: "hello",
            tags: ["fallback"],
          },
          {
            id: "case.two",
            prompt: "create a folder",
            mode: "route",
            tags: ["workflow"],
          },
        ],
      },
      null,
      2
    ),
    "utf8"
  );

  const fallbackCases = loadPromptEvalCases({ root, tags: ["fallback"] });
  assert.equal(fallbackCases.length, 1);
  assert.equal(fallbackCases[0].id, "case.one");

  const workflowCase = loadPromptEvalCases({ root, caseIds: ["case.two"] });
  assert.equal(workflowCase.length, 1);
  assert.equal(workflowCase[0].mode, "route");
  assert.equal(workflowCase[0].repeat, 1);
});
