import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import * as path from "node:path";

describe("main prompting delegation", () => {
  it("delegates prompting and prompt-eval analysis to extracted modules", () => {
    const source = readFileSync(path.join(__dirname, "main.ts"), "utf8");

    expect(source).toContain('from "./prompting/instruction-builders"');
    expect(source).toContain('from "./prompting/intent-contract"');
    expect(source).toContain('from "./prompting/planner"');
    expect(source).toContain('from "./prompting/synthesizer"');
    expect(source).toContain('from "./prompting/diagnostics"');
    expect(source).toContain('from "./prompting/task-classifier"');
    expect(source).toContain('from "./prompting/runtime-intent-bridge"');
    expect(source).toContain('from "./prompt-eval-analysis"');
    expect(source).toContain("attachPromptIntentBridgeToTask(");

    expect(source).not.toContain("const applyPromptPolicies =");
    expect(source).not.toContain("const createPlanningMessages =");
    expect(source).not.toContain("const createSynthesisMessages =");
    expect(source).not.toContain("const normalizePromptEvaluationCases =");
    expect(source).not.toContain("const buildPromptEvaluationRoutingReport =");
    expect(source).not.toContain("const evaluatePromptEvaluationCase =");
  });
});
