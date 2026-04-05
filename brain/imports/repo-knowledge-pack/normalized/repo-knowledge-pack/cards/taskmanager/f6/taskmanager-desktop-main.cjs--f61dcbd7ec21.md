---
schema_version: 1
pack_id: "repo-knowledge-pack"
card_type: "file-summary"
source_path: "taskmanager/desktop/main.cjs"
source_name: "main.cjs"
top_level: "taskmanager"
surface: "desktop"
classification: "high-value"
kind: "code"
language: "javascript"
extension: ".cjs"
score: 70
selected_rank: 764
content_hash: "310a648c9ab470dae2943228255502d4466d809e235fe5df6974eaec738cdfee"
generated_at: "2026-04-02T15:23:30.410Z"
tags:
  - "cjs"
  - "code"
  - "desktop"
  - "high-value"
  - "scripts"
imports:
  - "./runtime-host.cjs"
  - "electron"
  - "node:child_process"
  - "node:http"
  - "node:net"
  - "node:path"
  - "node:process"
---

# taskmanager/desktop/main.cjs

> Code module; imports ./runtime-host.cjs, electron, node:child_process, node:http

## Key Signals

- Source path: taskmanager/desktop/main.cjs
- Surface: desktop
- Classification: high-value
- Kind: code
- Language: javascript
- Top level: taskmanager
- Score: 70
- Tags: cjs, code, desktop, high-value, scripts
- Imports: ./runtime-host.cjs, electron, node:child_process, node:http, node:net, node:path

## Lookup Notes

- Use the card path in lookup.json to jump directly to this summary.
- Open the source from this card with the repository-relative path.
- Primary lookup terms: cjs, code, desktop, high-value, scripts, taskmanager
- Source link target: taskmanager/desktop/main.cjs

## Excerpt

~~~javascript
const { app, BrowserWindow, dialog, ipcMain, screen, shell } = require("electron");
const http = require("node:http");
const net = require("node:net");
const process = require("node:process");
const { spawn } = require("node:child_process");
const { resolve } = require("node:path");

const { createTaskManagerRuntimeHost } = require("./runtime-host.cjs");

// Some Windows setups in this repo environment were crashing Electron's GPU/network
// utility processes, which then surfaced in the renderer as repeated fetch failures.
app.disableHardwareAcceleration();

const TASKMANAGER_ROOT = resolve(__dirname, "..");
const API_PORT = 8787;
const PREFERRED_UI_PORT = 5180;
const API_URL = `http://127.0.0.1:${API_PORT}`;
const STARTUP_TIMEOUT_MS = 60_000;
const PRELOAD_PATH = resolve(__dirname, "preload.cjs");
const COLLAPSED_WINDOW_WIDTH = 388;
const EXPANDED_WINDOW_WIDTH = 1040;
const COLLAPSED_WINDOW_HEIGHT = 713;
const EXPANDED_WINDOW_HEIGHT = 990;
const MIN_WINDOW_WIDTH = COLLAPSED_WINDOW_WIDTH;
const MIN_WINDOW_HEIGHT = 616;
const WINDOW_LAYOUT_ANIMATION_MS = 320;
const WINDOW_LAYOUT_ANIMATION_STEP_MS = 16;
~~~