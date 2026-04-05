// regression/config-load.test.mjs
// Regression test for config loading and error handling
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const configPath = path.resolve(
  __dirname,
  "..",
  "..",
  "config",
  "horizons-ai.defaults.json"
);

test("config loads and parses as valid JSON", () => {
  const raw = fs.readFileSync(configPath, "utf8");
  let parsed;
  assert.doesNotThrow(() => {
    parsed = JSON.parse(raw);
  }, "Config file should parse as valid JSON");
  assert(parsed && typeof parsed === "object", "Config should be an object");
  assert(parsed.repoName, "Config should have a repoName property");
});

test("config has required highValuePrefixes array", () => {
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);
  assert(Array.isArray(parsed.highValuePrefixes), "highValuePrefixes should be an array");
  assert(parsed.highValuePrefixes.length > 0, "highValuePrefixes should not be empty");
});
