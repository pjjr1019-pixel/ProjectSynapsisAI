import test from "node:test";
import assert from "node:assert/strict";

import { isDirectLocalAiStatusQuery } from "../../server/http-routes.mjs";

test("local AI status shortcut only matches direct provider-status questions", () => {
  assert.equal(isDirectLocalAiStatusQuery("what local llm model am I using right now"), true);
  assert.equal(isDirectLocalAiStatusQuery("is local ai offline right now"), true);

  assert.equal(
    isDirectLocalAiStatusQuery(
      "Create an advanced workflow called Morning AI Radar that runs every weekday at 7:15 AM and scans AI model, GPU, and local-LLM news"
    ),
    false
  );

  assert.equal(
    isDirectLocalAiStatusQuery("compare Ollama and LM Studio for local llm workflows"),
    false
  );
});

