// regression/taskmanager-paths.test.mjs
// Regression test for portable_lib/taskmanager-paths.mjs path resolution
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modulePath = path.resolve(
  __dirname,
  "..",
  "..",
  "portable_lib",
  "taskmanager-paths.mjs"
);

let mod;
test("taskmanager-paths module loads and exports expected functions", async () => {
  mod = await import(`${pathToFileURL(modulePath).href}?test=${Date.now()}`);
  assert(typeof mod.resolveExistingPath === "function", "resolveExistingPath should be exported");
  assert(typeof mod.getOptimizationReportPaths === "function", "getOptimizationReportPaths should be exported");
});

test("resolveExistingPath returns first existing path", () => {
  const existing = __filename;
  const fallback = path.join(__dirname, "nonexistent.file");
  const result = mod.resolveExistingPath(existing, [fallback]);
  assert.equal(result, existing, "Should return the existing path");
});

test("resolveExistingPath returns primary if none exist", () => {
  const primary = path.join(__dirname, "nonexistent.file");
  const fallback = path.join(__dirname, "also-nonexistent.file");
  const result = mod.resolveExistingPath(primary, [fallback]);
  assert.equal(result, primary, "Should return primary if none exist");
});
