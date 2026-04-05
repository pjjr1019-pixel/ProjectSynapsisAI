// regression/desktop-main-startup.test.mjs
// Regression test for desktop/main.cjs startup logic (mocked Electron)
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mainPath = path.resolve(
  __dirname,
  "..",
  "..",
  "desktop",
  "main.cjs"
);
const mainUrl = pathToFileURL(mainPath).href;

test("desktop/main.cjs can be imported without fatal error (smoke test)", async () => {
  // This is a smoke test: we check that importing the file does not throw
  // (Full Electron integration tests would require a test runner with Electron)
  await assert.doesNotReject(async () => {
    await import(mainUrl);
  }, "main.cjs should load without fatal error");
});
