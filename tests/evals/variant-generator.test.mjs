import test from "node:test";
import assert from "node:assert/strict";
import { generatePromptVariants } from "./variant-generator.mjs";

test("generatePromptVariants creates deterministic traceable variants", () => {
  const variants = generatePromptVariants({
    id: "variant.case",
    prompt: "open control panel",
    allowVariants: true,
  });

  assert.ok(variants.length >= 4);
  assert.ok(variants.some((entry) => entry.kind === "typo"));
  assert.ok(variants.some((entry) => entry.prompt.toLowerCase().includes("please")));
  assert.ok(variants.every((entry) => entry.baseCaseId === "variant.case"));
});
