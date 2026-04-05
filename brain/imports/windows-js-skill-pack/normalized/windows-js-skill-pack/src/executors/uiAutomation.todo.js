/**
 * Placeholder executor for future Windows UI Automation integration.
 *
 * Why this exists:
 * - Opening Settings and classic tools is easy with URIs, control.exe, and standard commands.
 * - Interacting *inside* arbitrary windows usually needs UI Automation / AutoHotkey / Power Automate /
 *   app-specific APIs.
 *
 * Suggested future contract:
 *   {
 *     executor: "uiAutomation",
 *     app: "Settings",
 *     steps: [
 *       { action: "focusWindow", selector: { name: "Settings" } },
 *       { action: "click", selector: { automationId: "SomeControlId" } }
 *     ]
 *   }
 */
async function runUiAutomation(_skill) {
  throw new Error("uiAutomation executor is not implemented in this starter pack.");
}

module.exports = { runUiAutomation };
