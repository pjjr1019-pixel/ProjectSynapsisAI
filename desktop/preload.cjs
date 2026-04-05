const { contextBridge, ipcRenderer } = require("electron");

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8787";

function readApiBaseUrl() {
  const arg = process.argv.find((value) => String(value || "").startsWith("--horizons-api-url="));
  const fromArg = arg ? String(arg).slice("--horizons-api-url=".length).trim() : "";
  const fromEnv =
    String(process.env.HORIZONS_TASKMANAGER_API_URL || "").trim() ||
    String(process.env.VITE_CHAT_API_URL || "").trim();
  const resolved = fromArg || fromEnv || DEFAULT_API_BASE_URL;
  return resolved.replace(/\/$/, "");
}

function readWindowType() {
  const arg = process.argv.find((value) => String(value || "").startsWith("--horizons-window-type="));
  return arg ? String(arg).slice("--horizons-window-type=".length).trim() : "main";
}

const apiBaseUrl = readApiBaseUrl();
const windowType = readWindowType();

// ---------------------------------------------------------------------------
// Broadcast listener bridge
// ---------------------------------------------------------------------------
// The main process sends 'horizons:broadcast' to each renderer via
// webContents.send().  We expose a subscribe/unsubscribe API on the
// window bridge so renderer code never touches ipcRenderer directly.
// ---------------------------------------------------------------------------
const broadcastListeners = new Set();

ipcRenderer.on("horizons:broadcast", (_event, message) => {
  const channel = message && typeof message === "object" ? String(message.channel || "") : "";
  const payload = message && typeof message === "object" && "payload" in message ? message.payload : undefined;
  for (const listener of broadcastListeners) {
    try { listener(channel, payload); } catch { /* isolate listener errors */ }
  }
});

contextBridge.exposeInMainWorld(
  "horizonsDesktop",
  Object.freeze({
    isDesktop: true,
    platform: process.platform,
    apiBaseUrl,
    /** The window type this renderer is serving (main, chat, dev, approval, diagnostics). */
    windowType,
    taskManager: Object.freeze({
      openWindow: () => ipcRenderer.invoke("task-manager:open-window"),
      setWindowLayout: (input) => ipcRenderer.invoke("task-manager:set-window-layout", input),
      minimizeWindow: () => ipcRenderer.invoke("task-manager:minimize-window"),
      toggleMaximizeWindow: () => ipcRenderer.invoke("task-manager:toggle-maximize-window"),
      closeWindow: () => ipcRenderer.invoke("task-manager:close-window"),
      dragWindow: (x, y) => ipcRenderer.send("task-manager:drag-window", x, y),
      isMaximizedWindow: () => ipcRenderer.invoke("task-manager:is-maximized-window"),
      notifyStartupReady: (payload) => ipcRenderer.invoke("task-manager:startup-ready", payload),
      getSnapshot: () => ipcRenderer.invoke("task-manager:get-snapshot"),
      stopGroup: (input) => ipcRenderer.invoke("task-manager:stop-group", input),
      revealPath: (input) => ipcRenderer.invoke("task-manager:reveal-path", input),
    }),
    runtimeManager: Object.freeze({
      getComputerOverview: (input) => ipcRenderer.invoke("runtime-manager:get-computer-overview", input),
      scan: (input) => ipcRenderer.invoke("runtime-manager:scan", input),
      optimize: (input) => ipcRenderer.invoke("runtime-manager:optimize", input),
      applyAction: (input) => ipcRenderer.invoke("runtime-manager:apply-action", input),
    }),
    windowManager: Object.freeze({
      openChat:      () => ipcRenderer.invoke("window:open-chat"),
      openDev:       () => ipcRenderer.invoke("window:open-dev"),
      openApproval:  () => ipcRenderer.invoke("window:open-approval"),
      openTasks:     () => ipcRenderer.invoke("window:open-tasks"),
      closeChat:     () => ipcRenderer.invoke("window:close-chat"),
      closeDev:      () => ipcRenderer.invoke("window:close-dev"),
      closeApproval: () => ipcRenderer.invoke("window:close-approval"),
      closeTasks:    () => ipcRenderer.invoke("window:close-tasks"),
      focusChat:     () => ipcRenderer.invoke("window:focus-chat"),
      focusDev:      () => ipcRenderer.invoke("window:focus-dev"),
      focusApproval: () => ipcRenderer.invoke("window:focus-approval"),
      focusTasks:    () => ipcRenderer.invoke("window:focus-tasks"),
      getState:      (type) => ipcRenderer.invoke("window:get-state", type),
      /** Generic open for any registered window type. */
      open:  (type) => ipcRenderer.invoke("window:open", type),
      /** Generic close for any registered window type. */
      close: (type) => ipcRenderer.invoke("window:close", type),
      /** Generic focus for any registered window type. */
      focus: (type) => ipcRenderer.invoke("window:focus", type),
      /** List all currently open companion window types. */
      getOpenTypes: () => ipcRenderer.invoke("window:get-open-types"),
    }),
    /** Cross-window broadcast channel. */
    broadcast: Object.freeze({
      /** Subscribe to broadcast events from the main process / other windows. */
      on:  (listener) => { broadcastListeners.add(listener); },
      /** Unsubscribe a previously registered listener. */
      off: (listener) => { broadcastListeners.delete(listener); },
      /** Send a broadcast event to all other windows (goes via main process). */
      send: (channel, payload) => ipcRenderer.invoke("window:broadcast", channel, payload),
    }),
    /** Quick-chat helpers. */
    quickChat: Object.freeze({
      close: () => ipcRenderer.invoke("quickchat:close"),
    }),
    /** Native notification bridge. */
    notify: (opts) => ipcRenderer.invoke("horizons:notify", opts),
  })
);
