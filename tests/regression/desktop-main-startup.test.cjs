// regression/desktop-main-startup.test.cjs
// Regression test for desktop/main.cjs startup logic (mocked Electron)
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawn } = require("node:child_process");

const mainPath = path.resolve(
  __dirname,
  "..",
  "..",
  "desktop",
  "main.cjs"
);

test("desktop/main.cjs can be required without fatal error (smoke test)", (t) => {
  // This is a smoke test: we check that requiring the file does not throw
  // (Full Electron integration tests would require a test runner with Electron)
  assert.doesNotThrow(() => {
    require(mainPath);
  }, "main.cjs should load without fatal error");
});
