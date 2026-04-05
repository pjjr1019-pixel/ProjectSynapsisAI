---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/desktop/preload.cjs"
source_name: "preload.cjs"
top_level: "taskmanager"
surface: "desktop"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".cjs"
score: 70
selected_rank: 765
content_hash: "b01faeb33bbbb5e43e34eb14fa295c10da472d1fc67b65770256a298b8bbff42"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "cjs"
  - "code"
  - "desktop"
  - "high-value"
  - "scripts"
imports:
  - "electron"
---

# taskmanager/desktop/preload.cjs

> Code module; imports electron

## Key Signals

- Source path: taskmanager/desktop/preload.cjs
- Surface: desktop
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 70
- Tags: cjs, code, desktop, high-value, scripts
- Imports: electron

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: cjs, code, desktop, high-value, scripts, taskmanager
- Source link target: taskmanager/desktop/preload.cjs

## Excerpt

~~~javascript
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

const apiBaseUrl = readApiBaseUrl();

contextBridge.exposeInMainWorld(
  "horizonsDesktop",
  Object.freeze({
    isDesktop: true,
    platform: process.platform,
    apiBaseUrl,
    taskManager: Object.freeze({
      openWindow: () => ipcRenderer.invoke("task-manager:open-window"),
      setWindowLayout: (input) => ipcRenderer.invoke("task-manager:set-window-layout", input),
      minimizeWindow: () => ipcRenderer.invoke("task-manager:minimize-window"),
      toggleMaximizeWindow: () => ipcRenderer.invoke("task-manager:toggle-maximize-window"),
      closeWindow: () => ipcRenderer.invoke("task-manager:close-window"),
~~~