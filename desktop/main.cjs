const { app, BrowserWindow, dialog, globalShortcut, ipcMain, Notification: ElectronNotification, screen, shell, Tray, Menu, nativeImage } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const process = require("node:process");
const { spawn } = require("node:child_process");
const { extname, relative, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const { getTrayIconPath, getWindowIconPath } = require("./iconPaths.cjs");
const { createTaskManagerRuntimeHost } = require("./runtime-host.cjs");
const { createWindowManager } = require("./windowManager.cjs");

// GPU stability: use targeted Chromium switches instead of fully disabling hardware
// acceleration. This preserves smooth rendering on the target 6-8 GB VRAM hardware
// while suppressing the utility-process crashes that plagued some Windows setups.
// Pass --force-gpu on the CLI to bypass all of these overrides.
const FORCE_GPU = process.argv.includes("--force-gpu");
if (!FORCE_GPU) {
  app.commandLine.appendSwitch("disable-gpu-sandbox");
  app.commandLine.appendSwitch("ignore-gpu-blocklist");
  if (process.env.HORIZONS_DISABLE_D3D12 === "1") {
    app.commandLine.appendSwitch("disable-d3d12");
  }
}
if (process.platform === "win32") {
  app.setAppUserModelId("com.horizons.taskmanager.portable");
}

const TASKMANAGER_ROOT = resolve(__dirname, "..");
const DIST_ROOT = resolve(TASKMANAGER_ROOT, "dist");
const DIST_INDEX_PATH = resolve(DIST_ROOT, "index.html");
const TASKMANAGER_PATHS_URL = pathToFileURL(
  resolve(__dirname, "../portable_lib/taskmanager-paths.mjs")
).href;
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
const WINDOW_ICON_PATH = getWindowIconPath();
const TRAY_ICON_PATH = getTrayIconPath();

let mainWindow = null;
let splashWindow = null;
let windowManager = null;

const _splashStageStart = new Map();
const _splashBootStart = Date.now();

/**
 * Send a live log line to the splash screen terminal.
 * Tracks per-stage start times and includes elapsedMs on completion.
 * @param {string} id
 * @param {string} message
 * @param {'running'|'done'|'error'|'info'} [status]
 */
function splashLog(id, message, status = "running") {
  if (!splashWindow || splashWindow.isDestroyed()) return;

  let elapsedMs = null;
  if (status === "running" || status === "info") {
    if (!_splashStageStart.has(id)) _splashStageStart.set(id, Date.now());
  } else if (status === "done" || status === "error") {
    const start = _splashStageStart.get(id) ?? _splashBootStart;
    elapsedMs = Date.now() - start;
  }

  try {
    splashWindow.webContents.send("horizons:broadcast", {
      channel: "splash:log",
      payload: { id, message, status, elapsedMs },
    });
  } catch { /* splash may have been replaced already */ }
}

/** Trigger the fade-out animation on the splash before navigating away. */
function splashFadeOut() {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  try {
    splashWindow.webContents.send("horizons:broadcast", { channel: "splash:fadeout", payload: null });
  } catch { /* ignore */ }
}
let apiProcess = null;
let uiProcess = null;
let bundledUiServer = null;
let cleanupPromise = null;
let startupComplete = false;
let fatalErrorShown = false;
let isShuttingDown = false;
let uiPort = PREFERRED_UI_PORT;
let uiUrl = `http://127.0.0.1:${uiPort}`;
let taskmanagerPaths = null;
let runtimeHost = null;
let runtimeHostRegistered = false;
let currentWindowLayout = "collapsed";
let lastCollapsedWindowBounds = null;
let windowLayoutAnimation = null;
let mainWindowReadyResolver = null;
let mainWindowReadyPromise = null;
/** @type {((channel: string, payload?: unknown) => void) | null} */
let _broadcastToAll = null;

function getUiOrigin(port = uiPort) {
  return `http://127.0.0.1:${port}`;
}

// In dev (Vite HMR) we need unsafe-eval for the hot-module runtime.
// In production (prebuilt static assets) we strip it.
const IS_PORTABLE_UI_MODE =
  process.env.HORIZONS_PORTABLE_MODE === "1" ||
  (!fs.existsSync(resolve(TASKMANAGER_ROOT, "index.html")) && fs.existsSync(DIST_INDEX_PATH));
const IS_DEV_MODE = !app.isPackaged && !IS_PORTABLE_UI_MODE;

function buildContentSecurityPolicy(port = uiPort) {
  const uiOrigin = getUiOrigin(port);
  const scriptSrc = IS_DEV_MODE
    ? `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${uiOrigin}`
    : `script-src 'self' 'unsafe-inline' ${uiOrigin}`;
  return [
    `default-src 'self' ${uiOrigin}`,
    scriptSrc,
    `style-src 'self' 'unsafe-inline' ${uiOrigin}`,
    `img-src 'self' data: blob: ${uiOrigin}`,
    `font-src 'self' data: ${uiOrigin}`,
    `connect-src 'self' ${uiOrigin} ws://127.0.0.1:${port} ${API_URL}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; ");
}

function buildSplashHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Horizons Task Manager</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: linear-gradient(160deg, #050c18 0%, #070f1c 55%, #04080f 100%);
        color: #ddeeff;
        font-family: "Segoe UI Variable", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        overflow: hidden;
        user-select: none;
        transition: opacity 0.35s ease;
      }
      body.fading { opacity: 0; }

      /* ── Ambient background glow ── */
      body::before {
        content: "";
        position: fixed;
        inset: 0;
        background:
          radial-gradient(ellipse 70% 45% at 50% 0%, rgba(60,130,255,0.18) 0%, transparent 70%),
          radial-gradient(ellipse 40% 30% at 80% 80%, rgba(80,60,200,0.10) 0%, transparent 60%);
        pointer-events: none;
        z-index: 0;
      }

      /* ── Particle field ── */
      #particles {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
      }
      .pt {
        position: absolute;
        border-radius: 50%;
        background: rgba(140, 190, 255, 0.55);
        animation: pt-drift linear infinite;
      }

      .shell {
        position: relative;
        z-index: 1;
        width: min(100vw, 420px);
        padding: 0 28px 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      /* ── HUD Logo canvas ── */
      #logo-canvas {
        display: block;
        margin-bottom: 20px;
        /* soft ambient glow behind the canvas */
        filter: drop-shadow(0 0 18px rgba(60,140,255,0.45));
      }

      /* ── Title ── */
      .eyebrow {
        font-size: 10px;
        letter-spacing: 0.30em;
        text-transform: uppercase;
        color: rgba(160,195,255,0.55);
        margin-bottom: 6px;
      }
      h1 {
        font-size: 30px;
        font-weight: 700;
        letter-spacing: -0.04em;
        background: linear-gradient(135deg, #c8deff 0%, #7eb4ff 40%, #a8c8ff 100%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: shimmer 4s linear infinite;
        margin-bottom: 12px;
      }

      .status-hud {
        width: 100%;
        display: grid;
        gap: 8px;
        margin-bottom: 16px;
      }

      .status-pill {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid rgba(80,130,220,0.18);
        background: rgba(7, 14, 26, 0.78);
        box-shadow:
          inset 0 1px 0 rgba(120,170,255,0.08),
          0 10px 24px rgba(0,0,0,0.18);
      }

      .status-label {
        font-size: 9px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(140,180,255,0.5);
      }

      .status-value {
        font-size: 11px;
        font-family: "Cascadia Code","Fira Code","Consolas",monospace;
        color: rgba(224,238,255,0.92);
        font-variant-numeric: tabular-nums;
      }

      .status-value.process {
        color: rgba(184,214,255,0.78);
        text-align: right;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* ── Segmented progress bar ── */
      .progress-wrap {
        width: 100%;
        display: flex;
        gap: 4px;
        margin-bottom: 16px;
      }
      .seg {
        flex: 1;
        height: 3px;
        border-radius: 999px;
        background: rgba(80,130,220,0.18);
        overflow: hidden;
        position: relative;
      }
      .seg-fill {
        position: absolute;
        inset: 0;
        border-radius: 999px;
        background: linear-gradient(90deg, #3b7fff, #7eb4ff);
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 0.45s cubic-bezier(0.4,0,0.2,1);
        box-shadow: 0 0 8px rgba(100,170,255,0.6);
      }
      .seg.active .seg-fill  { transform: scaleX(0.5); }
      .seg.done   .seg-fill  { transform: scaleX(1); }

      /* ── Terminal log ── */
      .terminal {
        width: 100%;
        background: rgba(6,12,22,0.85);
        border: 1px solid rgba(80,130,220,0.18);
        border-radius: 12px;
        padding: 12px 14px;
        min-height: 120px;
        max-height: 180px;
        overflow-y: auto;
        box-shadow:
          0 0 0 1px rgba(40,80,160,0.10),
          0 4px 32px rgba(0,0,0,0.40),
          inset 0 1px 0 rgba(100,160,255,0.07);
        scrollbar-width: none;
      }
      .terminal::-webkit-scrollbar { display: none; }

      .terminal-header {
        font-size: 9px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: rgba(120,160,220,0.40);
        margin-bottom: 8px;
        font-family: "Cascadia Code","Fira Code","Consolas",monospace;
      }

      .log-entry {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-family: "Cascadia Code","Fira Code","Consolas",monospace;
        font-size: 11px;
        line-height: 1.5;
        color: rgba(180,210,255,0.75);
        animation: entry-slide-in 0.18s ease-out both;
        margin-bottom: 1px;
      }
      .log-entry:last-child { margin-bottom: 0; }

      .icon {
        flex-shrink: 0;
        width: 13px;
        text-align: center;
        margin-top: 1px;
      }
      .icon.running { color: #5b9bff; animation: icon-spin 1s linear infinite; display: inline-block; }
      .icon.done    { color: #4ade80; }
      .icon.error   { color: #f87171; }
      .icon.info    { color: rgba(140,180,255,0.40); }

      .msg { flex: 1; min-width: 0; }
      .msg.done  { color: rgba(180,210,255,0.45); }
      .msg.error { color: rgba(248,113,113,0.85); }

      .timing {
        flex-shrink: 0;
        font-size: 9.5px;
        color: rgba(120,160,220,0.35);
        margin-top: 2px;
        font-variant-numeric: tabular-nums;
      }
      .timing.done { color: rgba(100,200,130,0.45); }

      /* ── Keyframes ── */
      @keyframes shimmer {
        0%   { background-position: 0% center; }
        100% { background-position: 200% center; }
      }
      @keyframes entry-slide-in {
        from { opacity: 0; transform: translateX(-6px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes icon-spin { to { transform: rotate(360deg); } }
      @keyframes pt-drift {
        0%   { transform: translateY(0)   translateX(0)   scale(1);   opacity: 0; }
        10%  { opacity: 1; }
        90%  { opacity: 0.6; }
        100% { transform: translateY(-110vh) translateX(var(--dx)) scale(0.5); opacity: 0; }
      }
    </style>
  </head>
  <body>
    <canvas id="particles"></canvas>

    <main class="shell">
      <canvas id="logo-canvas" width="180" height="180"></canvas>

      <div class="eyebrow">Horizons AI</div>
      <h1>Task Manager</h1>

      <div class="status-hud">
        <div class="status-pill">
          <span class="status-label">Runtime</span>
          <span class="status-value" id="runtime-hud">00:00.0</span>
        </div>
        <div class="status-pill">
          <span class="status-label">Processes</span>
          <span class="status-value process" id="process-status">Preparing startup...</span>
        </div>
      </div>

      <!-- Segmented progress: 6 stages -->
      <div class="progress-wrap" id="progress">
        <div class="seg" id="seg-0"><div class="seg-fill"></div></div>
        <div class="seg" id="seg-1"><div class="seg-fill"></div></div>
        <div class="seg" id="seg-2"><div class="seg-fill"></div></div>
        <div class="seg" id="seg-3"><div class="seg-fill"></div></div>
        <div class="seg" id="seg-4"><div class="seg-fill"></div></div>
        <div class="seg" id="seg-5"><div class="seg-fill"></div></div>
      </div>

      <div class="terminal" id="terminal">
        <div class="terminal-header">// startup log</div>
        <div id="log"></div>
      </div>
    </main>

    <script>
      // ── HUD Logo ──────────────────────────────────────────────────────────
      (function() {
        const cv = document.getElementById('logo-canvas');
        const ctx = cv.getContext('2d');
        const S = 180, cx = S/2, cy = S/2;
        let t = 0;
        let dataVal = Math.floor(Math.random() * 9000 + 1000);
        let dataTimer = 0;

        // Hex path helper
        function hexPath(r, rot, sides) {
          sides = sides || 6;
          ctx.beginPath();
          for (let i = 0; i < sides; i++) {
            const a = (i / sides) * Math.PI * 2 + rot;
            const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
            i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
          }
          ctx.closePath();
        }

        // Glow helper
        function glow(color, blur) { ctx.shadowColor = color; ctx.shadowBlur = blur; }
        function noGlow() { ctx.shadowBlur = 0; }

        function draw() {
          ctx.clearRect(0, 0, S, S);

          // ── 1. Outer tick ring ──────────────────────────────────────────
          const outerR = 84;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(t * 0.18);
          for (let i = 0; i < 48; i++) {
            const a = (i / 48) * Math.PI * 2;
            const isCard = i % 12 === 0;
            const isMaj  = i % 4 === 0;
            const len    = isCard ? 9 : isMaj ? 6 : 3;
            const op     = isCard ? 0.9 : isMaj ? 0.55 : 0.25;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a)*(outerR-len), Math.sin(a)*(outerR-len));
            ctx.lineTo(Math.cos(a)*outerR,       Math.sin(a)*outerR);
            ctx.strokeStyle = 'rgba(100,180,255,' + op + ')';
            ctx.lineWidth = isCard ? 1.5 : 1;
            if (isCard) { glow('rgba(120,200,255,0.8)', 6); } else noGlow();
            ctx.stroke();
          }
          ctx.restore();
          noGlow();

          // ── 2. Rotating arc indicator ───────────────────────────────────
          const arcR = 77;
          const arcStart = t * 0.7;
          const arcEnd   = arcStart + Math.PI * 1.65;
          ctx.beginPath();
          ctx.arc(cx, cy, arcR, arcStart, arcEnd);
          const arcGrad = ctx.createLinearGradient(
            cx + arcR*Math.cos(arcStart), cy + arcR*Math.sin(arcStart),
            cx + arcR*Math.cos(arcEnd),   cy + arcR*Math.sin(arcEnd)
          );
          arcGrad.addColorStop(0,   'rgba(60,140,255,0)');
          arcGrad.addColorStop(0.7, 'rgba(80,170,255,0.5)');
          arcGrad.addColorStop(1,   'rgba(160,220,255,1)');
          ctx.strokeStyle = arcGrad;
          ctx.lineWidth = 2;
          glow('rgba(120,200,255,0.9)', 14);
          ctx.stroke();
          noGlow();

          // Leading dot at arc tip
          const tipX = cx + arcR * Math.cos(arcEnd);
          const tipY = cy + arcR * Math.sin(arcEnd);
          ctx.beginPath();
          ctx.arc(tipX, tipY, 3, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(200,235,255,1)';
          glow('rgba(180,220,255,1)', 18);
          ctx.fill();
          noGlow();

          // ── 3. Hexagon frame (counter-rotating) ────────────────────────
          ctx.save();
          ctx.lineWidth = 1.2;
          hexPath(62, -t * 0.4 + Math.PI/6);
          const hGrad = ctx.createLinearGradient(cx-62,cy-62,cx+62,cy+62);
          hGrad.addColorStop(0,   'rgba(140,210,255,0.9)');
          hGrad.addColorStop(0.5, 'rgba(60,130,255,0.5)');
          hGrad.addColorStop(1,   'rgba(120,195,255,0.9)');
          ctx.strokeStyle = hGrad;
          glow('rgba(80,160,255,0.7)', 10);
          ctx.stroke();
          noGlow();

          // Vertex dots on hex
          for (let i = 0; i < 6; i++) {
            const a = (i/6)*Math.PI*2 - t*0.4 + Math.PI/6;
            const vx = cx + 62*Math.cos(a), vy = cy + 62*Math.sin(a);
            ctx.beginPath();
            ctx.arc(vx, vy, 2.5, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(160,220,255,0.9)';
            glow('rgba(140,210,255,0.9)', 8);
            ctx.fill();
          }
          noGlow();
          ctx.restore();

          // ── 4. Pulse rings ──────────────────────────────────────────────
          for (let i = 0; i < 3; i++) {
            const phase = ((t * 0.55 + i * 2.09) % (Math.PI*2)) / (Math.PI*2);
            const pr = 26 + phase * 52;
            const op = Math.max(0, (1-phase) * 0.55);
            ctx.beginPath();
            ctx.arc(cx, cy, pr, 0, Math.PI*2);
            ctx.strokeStyle = 'rgba(80,160,255,' + op + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // ── 5. Inner core fill ──────────────────────────────────────────
          const coreGrad = ctx.createRadialGradient(cx-8, cy-8, 2, cx, cy, 26);
          coreGrad.addColorStop(0,   '#5090ff');
          coreGrad.addColorStop(0.45,'#1a3faa');
          coreGrad.addColorStop(1,   '#080f30');
          hexPath(26, Math.PI/6);
          ctx.fillStyle = coreGrad;
          glow('rgba(60,130,255,0.6)', 16);
          ctx.fill();
          noGlow();

          // Inner hex border
          hexPath(26, Math.PI/6);
          ctx.strokeStyle = 'rgba(120,190,255,0.6)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // ── 6. Scan line sweep ──────────────────────────────────────────
          const scanY = cy - 14 + (Math.sin(t * 1.4) * 0.5 + 0.5) * 28;
          const scanGrad = ctx.createLinearGradient(cx-22, 0, cx+22, 0);
          scanGrad.addColorStop(0, 'rgba(140,220,255,0)');
          scanGrad.addColorStop(0.5,'rgba(180,235,255,0.55)');
          scanGrad.addColorStop(1, 'rgba(140,220,255,0)');
          ctx.fillStyle = scanGrad;
          ctx.fillRect(cx-22, scanY-1, 44, 2);

          // ── 7. H glyph ──────────────────────────────────────────────────
          ctx.font = '700 26px "Segoe UI Variable","Segoe UI",Arial,sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          // Glitch: rare random X shift
          const glitchX = Math.random() < 0.015 ? (Math.random()-0.5)*5 : 0;
          const glitchY = Math.random() < 0.008 ? (Math.random()-0.5)*3 : 0;
          glow('rgba(200,230,255,0.9)', 18);
          ctx.fillStyle = 'rgba(225,242,255,0.97)';
          ctx.fillText('H', cx+glitchX, cy+glitchY);
          // Occasional chromatic glitch slice
          if (Math.random() < 0.012) {
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = 'rgba(255,80,80,1)';
            ctx.fillText('H', cx+glitchX+2, cy+glitchY);
            ctx.fillStyle = 'rgba(80,255,200,1)';
            ctx.fillText('H', cx+glitchX-2, cy+glitchY);
            ctx.globalAlpha = 1;
          }
          noGlow();

          // ── 8. 3 elliptical orbital dots ────────────────────────────────
          for (let i = 0; i < 3; i++) {
            const spd   = 0.6 + i * 0.35;
            const angle = t * spd + (i * Math.PI * 2 / 3);
            const tilt  = (i * Math.PI) / 3;
            // Ellipse tilted by tilt angle
            const ex = 68 * Math.cos(angle);
            const ey = 22 * Math.sin(angle);
            const rx = cx + ex*Math.cos(tilt) - ey*Math.sin(tilt);
            const ry = cy + ex*Math.sin(tilt) + ey*Math.cos(tilt);
            const dotOp = 0.4 + 0.6 * Math.max(0, Math.sin(angle));
            ctx.beginPath();
            ctx.arc(rx, ry, 2.8, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(120,200,255,' + dotOp + ')';
            glow('rgba(120,200,255,0.9)', 10);
            ctx.fill();
            // Trailing comet tail
            ctx.beginPath();
            ctx.arc(rx, ry, 1.2, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(200,235,255,' + (dotOp * 0.7) + ')';
            ctx.fill();
          }
          noGlow();

          // ── 9. Corner targeting brackets ────────────────────────────────
          const bOff = 6, bLen = 14, bW = 1.8;
          ctx.strokeStyle = 'rgba(100,185,255,0.75)';
          ctx.lineWidth = bW;
          glow('rgba(100,185,255,0.6)', 5);
          // TL
          ctx.beginPath(); ctx.moveTo(bOff+bLen,bOff); ctx.lineTo(bOff,bOff); ctx.lineTo(bOff,bOff+bLen); ctx.stroke();
          // TR
          ctx.beginPath(); ctx.moveTo(S-bOff-bLen,bOff); ctx.lineTo(S-bOff,bOff); ctx.lineTo(S-bOff,bOff+bLen); ctx.stroke();
          // BL
          ctx.beginPath(); ctx.moveTo(bOff+bLen,S-bOff); ctx.lineTo(bOff,S-bOff); ctx.lineTo(bOff,S-bOff-bLen); ctx.stroke();
          // BR
          ctx.beginPath(); ctx.moveTo(S-bOff-bLen,S-bOff); ctx.lineTo(S-bOff,S-bOff); ctx.lineTo(S-bOff,S-bOff-bLen); ctx.stroke();
          noGlow();

          // ── 10. Data readouts ────────────────────────────────────────────
          dataTimer += 0.016;
          if (dataTimer > 1.8) { dataVal = Math.floor(Math.random()*9000+1000); dataTimer = 0; }
          ctx.font = '500 8px "Cascadia Code","Fira Code","Consolas",monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(100,180,255,0.55)';
          ctx.fillText('SYS.CORE', cx, 12);
          ctx.fillText(dataVal + ' Hz', cx, S-6);
          // Side labels
          ctx.save();
          ctx.translate(9, cy);
          ctx.rotate(-Math.PI/2);
          ctx.fillText('ACTIVE', 0, 0);
          ctx.restore();
          ctx.save();
          ctx.translate(S-9, cy);
          ctx.rotate(Math.PI/2);
          ctx.fillText('AI//ON', 0, 0);
          ctx.restore();

          t += 0.016;
          requestAnimationFrame(draw);
        }
        draw();
      })();

      // ── Particle field ────────────────────────────────────────────────────
      (function() {
        const canvas = document.getElementById('particles');
        const ctx = canvas.getContext('2d');
        const COUNT = 55;
        const particles = [];

        function resize() {
          canvas.width  = window.innerWidth;
          canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < COUNT; i++) {
          particles.push({
            x:    Math.random() * window.innerWidth,
            y:    Math.random() * window.innerHeight,
            r:    Math.random() * 1.2 + 0.3,
            spd:  Math.random() * 0.25 + 0.08,
            dx:   (Math.random() - 0.5) * 0.4,
            op:   Math.random() * 0.5 + 0.15,
            phase: Math.random() * Math.PI * 2,
          });
        }

        let frame = 0;
        function draw() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          frame++;
          for (const p of particles) {
            p.y -= p.spd;
            p.x += p.dx;
            if (p.y < -4) { p.y = canvas.height + 4; p.x = Math.random() * canvas.width; }
            const twinkle = p.op * (0.7 + 0.3 * Math.sin(frame * 0.04 + p.phase));
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(160,200,255,' + twinkle + ')';
            ctx.fill();
          }
          requestAnimationFrame(draw);
        }
        draw();
      })();

      // ── Progress segments ─────────────────────────────────────────────────
      // Maps real stage IDs to segment indices (0-5).
      const SEG_MAP = {
        runtime: 0,
        prescan: 0,
        api:     1,
        ui:      2,
        bg:      3,
        scan:    3,
        data:    4,
        snapshot: 4,
        ready:   5,
        load:    5,
        renderer: 5,
        wm:      5,
      };
      const segEls = Array.from({length: 6}, (_, i) => document.getElementById('seg-' + i));
      const segState = Array(6).fill('idle'); // idle | active | done

      function advanceSeg(idx, state) {
        if (idx < 0 || idx > 5) return;
        // Activate all segments up to idx.
        for (let i = 0; i <= idx; i++) {
          if (segState[i] === 'idle') {
            segState[i] = 'active';
            segEls[i].className = 'seg active';
          }
        }
        if (state === 'done') {
          segState[idx] = 'done';
          segEls[idx].className = 'seg done';
        }
      }

      // ── Log terminal ──────────────────────────────────────────────────────
      const logEl   = document.getElementById('log');
      const stages  = {};
      const runtimeHudEl = document.getElementById('runtime-hud');
      const processStatusEl = document.getElementById('process-status');
      const bootStartMs = ${_splashBootStart};

      function fmtMs(ms) {
        return ms < 1000 ? ms + 'ms' : (ms / 1000).toFixed(1) + 's';
      }

      function fmtRuntime(ms) {
        const totalTenths = Math.max(0, Math.floor(ms / 100));
        const minutes = Math.floor(totalTenths / 600);
        const seconds = Math.floor((totalTenths % 600) / 10);
        const tenths = totalTenths % 10;
        return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0') + '.' + String(tenths);
      }

      function tickRuntimeHud() {
        if (!runtimeHudEl) return;
        runtimeHudEl.textContent = fmtRuntime(Date.now() - bootStartMs);
      }

      function updateProcessStatus(id, message, status) {
        if (!processStatusEl) return;
        if (id === 'prescan') {
          processStatusEl.textContent = status === 'done' ? message : 'Pre-scanning processes';
          return;
        }
        if (id === 'snapshot') {
          processStatusEl.textContent = status === 'done' ? message : 'Building live process snapshot';
          return;
        }
        if (id === 'renderer') {
          processStatusEl.textContent = status === 'done'
            ? message
            : status === 'error'
              ? 'Startup fallback engaged'
              : 'Waiting for process list';
          return;
        }
        if (id === 'ready' && status === 'error') {
          processStatusEl.textContent = 'Startup fallback engaged';
        }
      }

      tickRuntimeHud();
      window.setInterval(tickRuntimeHud, 100);

      function upsertEntry(id, message, status, elapsedMs) {
        const timingText = (status === 'done' || status === 'error') && elapsedMs != null
          ? fmtMs(elapsedMs)
          : '';

        if (stages[id]) {
          const el   = stages[id];
          const icon = el.querySelector('.icon');
          const msg  = el.querySelector('.msg');
          const tim  = el.querySelector('.timing');
          icon.className   = 'icon ' + status;
          icon.textContent = status === 'done' ? '✓' : status === 'error' ? '✗' : status === 'info' ? '·' : '◌';
          msg.className    = 'msg ' + status;
          msg.textContent  = message;
          if (tim) { tim.className = 'timing ' + status; tim.textContent = timingText; }
        } else {
          const iconText = status === 'done' ? '✓' : status === 'error' ? '✗' : status === 'info' ? '·' : '◌';
          const el = document.createElement('div');
          el.className = 'log-entry';
          el.innerHTML =
            '<span class="icon ' + status + '">' + iconText + '</span>' +
            '<span class="msg '  + status + '">' + message  + '</span>' +
            '<span class="timing ' + status + '">' + timingText + '</span>';
          stages[id] = el;
          logEl.appendChild(el);
          const t = document.getElementById('terminal');
          t.scrollTop = t.scrollHeight;
        }

        // Drive progress bar.
        const segIdx = SEG_MAP[id] ?? -1;
        if (segIdx >= 0) advanceSeg(segIdx, status === 'done' ? 'done' : 'active');
        updateProcessStatus(id, message, status);
      }

      // ── Broadcast subscription ────────────────────────────────────────────
      function trySubscribe() {
        if (window.horizonsDesktop && window.horizonsDesktop.broadcast) {
          window.horizonsDesktop.broadcast.on(function(channel, payload) {
            if (channel === 'splash:log') {
              upsertEntry(payload.id, payload.message, payload.status || 'running', payload.elapsedMs ?? null);
            }
            if (channel === 'splash:fadeout') {
              document.body.classList.add('fading');
            }
          });
        } else {
          setTimeout(trySubscribe, 50);
        }
      }
      trySubscribe();
    </script>
  </body>
</html>`;
}

const SPLASH_URL = `data:text/html;charset=utf-8,${encodeURIComponent(buildSplashHtml())}`;

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function prefixOutput(label, streamName, chunk) {
  const target = streamName === "stderr" ? process.stderr : process.stdout;
  const text = chunk.toString("utf8");
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (!line) continue;
    target.write(`[${label}] ${line}\n`);
  }
}

function watchChildOutput(child, label) {
  child.stdout?.on("data", (chunk) => prefixOutput(label, "stdout", chunk));
  child.stderr?.on("data", (chunk) => prefixOutput(label, "stderr", chunk));
}

function exitReason(code, signal) {
  if (signal) return `signal ${signal}`;
  if (typeof code === "number") return `code ${code}`;
  return "an unknown reason";
}

function checkHttp(url) {
  return new Promise((resolveCheck, rejectCheck) => {
    const req = http.request(url, { method: "GET" }, (res) => {
      res.resume();
      if (typeof res.statusCode === "number" && res.statusCode < 500) {
        resolveCheck();
        return;
      }
      rejectCheck(new Error(`HTTP ${res.statusCode || "unknown"}`));
    });

    req.setTimeout(2_000, () => {
      req.destroy(new Error("request timed out"));
    });
    req.on("error", rejectCheck);
    req.end();
  });
}

async function waitForUrl(url, label) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  let lastError = null;

  while (Date.now() < deadline) {
    if (isShuttingDown) {
      throw new Error("startup cancelled");
    }

    try {
      await checkHttp(url);
      return;
    } catch (error) {
      lastError = error;
    }

    await delay(500);
  }

  const reason = lastError instanceof Error ? ` (${lastError.message})` : "";
  throw new Error(`${label} did not become ready at ${url} within 60 seconds${reason}.`);
}

function probePortAvailability(port) {
  return new Promise((resolvePort, rejectPort) => {
    const probe = net.createServer();

    probe.once("error", (error) => {
      if (error?.code === "EADDRINUSE") {
        resolvePort(false);
        return;
      }

      rejectPort(error);
    });

    probe.once("listening", () => {
      probe.close((closeError) => {
        if (closeError) {
          rejectPort(closeError);
          return;
        }

        resolvePort(true);
      });
    });

    probe.listen(port, "127.0.0.1");
  });
}

async function findAvailablePort(startPort, attempts = 12) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const candidate = startPort + offset;
    try {
      const available = await probePortAvailability(candidate);
      if (available) return candidate;
    } catch {
      // Ignore probe errors while scanning a small local range.
    }
  }

  throw new Error(`No available local port found for the bundled UI starting at ${startPort}.`);
}

function getBundledUiContentType(filePath) {
  switch (extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".ico":
      return "image/x-icon";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    default:
      return "application/octet-stream";
  }
}

function resolveBundledUiFile(urlPath) {
  const rawPath = String(urlPath || "/").split("?")[0];
  const pathname = decodeURIComponent(rawPath || "/");

  if (pathname === "/" || pathname === "" || !pathname.startsWith("/assets/")) {
    return DIST_INDEX_PATH;
  }

  const candidate = resolve(DIST_ROOT, `.${pathname}`);
  const rel = relative(DIST_ROOT, candidate);
  if (!rel || rel.startsWith("..") || rel.includes(":")) {
    return null;
  }

  return candidate;
}

function createBundledUiServer() {
  return http.createServer((req, res) => {
    const targetFile = resolveBundledUiFile(req.url);
    if (!targetFile) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    fs.readFile(targetFile, (error, content) => {
      if (error) {
        if (targetFile === DIST_INDEX_PATH) {
          res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Bundled UI entrypoint is unavailable.");
          return;
        }

        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      res.writeHead(200, {
        "Content-Type": getBundledUiContentType(targetFile),
        "Cache-Control": targetFile === DIST_INDEX_PATH ? "no-cache" : "public, max-age=31536000, immutable",
      });
      res.end(content);
    });
  });
}

async function startBundledUiServer(port) {
  if (bundledUiServer) return;

  bundledUiServer = createBundledUiServer();
  await new Promise((resolveStart, rejectStart) => {
    const handleError = (error) => {
      bundledUiServer?.off("listening", handleListening);
      bundledUiServer = null;
      rejectStart(error);
    };
    const handleListening = () => {
      bundledUiServer?.off("error", handleError);
      resolveStart();
    };

    bundledUiServer.once("error", handleError);
    bundledUiServer.once("listening", handleListening);
    bundledUiServer.listen(port, "127.0.0.1");
  });
}

function closeBundledUiServer() {
  if (!bundledUiServer) return Promise.resolve();

  return new Promise((resolveClose) => {
    const server = bundledUiServer;
    bundledUiServer = null;
    server.close(() => resolveClose());
  });
}

function spawnRuntime({ label, command, file, args = [], cwd, env }) {
  const options = {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  };
  const child = file
    ? spawn(file, args, options)
    : spawn("cmd.exe", ["/d", "/s", "/c", command], options);

  watchChildOutput(child, label);

  child.once("error", (error) => {
    void handleFatalError(`Failed to start ${label}: ${error.message}`);
  });

  child.once("exit", (code, signal) => {
    if (isShuttingDown) return;
    const phase = startupComplete ? "while the standalone app was running" : "during startup";
    void handleFatalError(`${label} exited unexpectedly ${phase} (${exitReason(code, signal)}).`);
  });

  return child;
}

function isInternalUrl(url) {
  return String(url || "").startsWith(uiUrl) || String(url || "").startsWith(API_URL);
}

function applyDevContentSecurityPolicy(session) {
  session.webRequest.onHeadersReceived((details, callback) => {
    if (!String(details.url || "").startsWith(uiUrl)) {
      callback({ cancel: false, responseHeaders: details.responseHeaders });
      return;
    }

    callback({
      cancel: false,
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [buildContentSecurityPolicy()],
      },
    });
  });
}

function getStandaloneProtectedPids() {
  const pids = [process.pid];
  if (typeof apiProcess?.pid === "number") pids.push(apiProcess.pid);
  if (typeof uiProcess?.pid === "number") pids.push(uiProcess.pid);
  if (splashWindow && !splashWindow.isDestroyed()) {
    const splashPid = splashWindow.webContents.getOSProcessId();
    if (typeof splashPid === "number" && splashPid > 0) pids.push(splashPid);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    const webContentsPid = mainWindow.webContents.getOSProcessId();
    if (typeof webContentsPid === "number" && webContentsPid > 0) pids.push(webContentsPid);
  }
  // Protect companion window renderer processes so the optimizer never kills them.
  if (windowManager) {
    for (const type of windowManager.getOpenTypes()) {
      const pid = windowManager.getRenderPid(type);
      if (typeof pid === "number" && pid > 0) pids.push(pid);
    }
  }
  return [...new Set(pids.filter((value) => Number.isFinite(value) && value > 0))];
}

async function loadTaskmanagerPaths() {
  if (taskmanagerPaths) return taskmanagerPaths;
  const { getTaskmanagerPaths } = await import(TASKMANAGER_PATHS_URL);
  taskmanagerPaths = getTaskmanagerPaths();
  return taskmanagerPaths;
}

// Set to true once the API is up and ready to accept snapshots.
let apiReady = false;

async function ensureRuntimeHostReady() {
  if (!runtimeHost) {
    runtimeHost = createTaskManagerRuntimeHost({
      paths: await loadTaskmanagerPaths(),
      apiUrl: API_URL,
      shell,
      getProtectedPids: getStandaloneProtectedPids,
      // Forward snapshots as soon as the API is ready, not after UI loads.
      shouldForwardSnapshot: () => apiReady,
    });
  }

  if (!runtimeHostRegistered) {
    runtimeHost.registerIpc(ipcMain);
    runtimeHostRegistered = true;
  }

  return runtimeHost;
}

function focusMainWindow() {
  if (!startupComplete && splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.show();
    splashWindow.focus();
    return;
  }
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function closeSplashWindow() {
  if (!splashWindow || splashWindow.isDestroyed()) {
    splashWindow = null;
    return;
  }
  splashWindow.destroy();
  splashWindow = null;
}

function createMainWindowReadyPromise() {
  mainWindowReadyPromise = new Promise((resolve) => {
    mainWindowReadyResolver = resolve;
  });
  return mainWindowReadyPromise;
}

function resolveMainWindowReady(result = { ok: true, timedOut: false }) {
  if (!mainWindowReadyResolver) return;
  const resolve = mainWindowReadyResolver;
  mainWindowReadyResolver = null;
  resolve(result);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

function easeOutCubic(progress) {
  return 1 - Math.pow(1 - progress, 3);
}

function clearWindowLayoutAnimation() {
  if (!windowLayoutAnimation) return;
  clearInterval(windowLayoutAnimation.timer);
  windowLayoutAnimation.resolve(windowLayoutAnimation.lastBounds);
  windowLayoutAnimation = null;
}

function getStandaloneTargetBounds(mode) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { ok: false, mode, error: "Window unavailable" };
  }

  currentWindowLayout = "collapsed";

  if (mainWindow.isMaximized()) {
    const bounds = mainWindow.getBounds();
    return {
      ok: true,
      mode: currentWindowLayout,
      maximized: true,
      width: bounds.width,
      height: bounds.height,
    };
  }

  const currentBounds = mainWindow.getBounds();
  const display = screen.getDisplayMatching(currentBounds);
  const workArea = display.workArea;
  const collapsedBounds = lastCollapsedWindowBounds || currentBounds;
  const preferredWidth = COLLAPSED_WINDOW_WIDTH;
  const preferredHeight = COLLAPSED_WINDOW_HEIGHT;
  const x = clamp(
    collapsedBounds.x,
    workArea.x,
    Math.max(workArea.x, workArea.x + workArea.width - preferredWidth)
  );
  const y = clamp(
    collapsedBounds.y,
    workArea.y,
    Math.max(workArea.y, workArea.y + workArea.height - preferredHeight)
  );
  const maxWidthFromLeft = Math.max(MIN_WINDOW_WIDTH, workArea.x + workArea.width - x);
  const width = clamp(preferredWidth, MIN_WINDOW_WIDTH, maxWidthFromLeft);
  const maxHeightFromTop = Math.max(MIN_WINDOW_HEIGHT, workArea.y + workArea.height - y);
  const height = clamp(preferredHeight, MIN_WINDOW_HEIGHT, maxHeightFromTop);

  return {
    ok: true,
    mode: currentWindowLayout,
    maximized: false,
    x,
    y,
    width,
    height,
  };
}

function animateStandaloneWindowBounds(targetBounds) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return Promise.resolve(null);
  }

  clearWindowLayoutAnimation();

  return new Promise((resolve) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      resolve(null);
      return;
    }

    const startBounds = mainWindow.getBounds();
    const finalBounds = {
      x: targetBounds.x,
      y: targetBounds.y,
      width: targetBounds.width,
      height: targetBounds.height,
    };

    if (
      startBounds.x === finalBounds.x &&
      startBounds.y === finalBounds.y &&
      startBounds.width === finalBounds.width &&
      startBounds.height === finalBounds.height
    ) {
      resolve(finalBounds);
      return;
    }

    const startAt = Date.now();
    const animation = {
      timer: null,
      lastBounds: startBounds,
      resolve,
    };

    const tick = () => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        clearInterval(animation.timer);
        if (windowLayoutAnimation === animation) windowLayoutAnimation = null;
        resolve(null);
        return;
      }

      const elapsed = Date.now() - startAt;
      const progress = Math.min(1, elapsed / WINDOW_LAYOUT_ANIMATION_MS);
      const eased = easeOutCubic(progress);
      const nextBounds = {
        x: Math.round(lerp(startBounds.x, finalBounds.x, eased)),
        y: Math.round(lerp(startBounds.y, finalBounds.y, eased)),
        width: Math.round(lerp(startBounds.width, finalBounds.width, eased)),
        height: Math.round(lerp(startBounds.height, finalBounds.height, eased)),
      };

      animation.lastBounds = nextBounds;
      mainWindow.setBounds(nextBounds);

      if (progress >= 1) {
        clearInterval(animation.timer);
        if (windowLayoutAnimation === animation) windowLayoutAnimation = null;
        resolve(finalBounds);
      }
    };

    animation.timer = setInterval(tick, WINDOW_LAYOUT_ANIMATION_STEP_MS);
    windowLayoutAnimation = animation;
    tick();
  });
}

async function applyStandaloneWindowLayout(mode) {
  if (mode === "expanded" && currentWindowLayout !== "expanded" && mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMaximized()) {
    lastCollapsedWindowBounds = mainWindow.getBounds();
  }

  const target = getStandaloneTargetBounds(mode);
  if (!target?.ok || target.maximized) {
    return target;
  }

  const finalBounds = await animateStandaloneWindowBounds(target);
  if (target.mode === "collapsed" && finalBounds) {
    lastCollapsedWindowBounds = finalBounds;
  }

  return {
    ok: true,
    mode: target.mode,
    maximized: false,
    width: finalBounds?.width ?? target.width,
    height: finalBounds?.height ?? target.height,
  };
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: COLLAPSED_WINDOW_WIDTH,
    height: COLLAPSED_WINDOW_HEIGHT,
    minWidth: COLLAPSED_WINDOW_WIDTH,
    minHeight: COLLAPSED_WINDOW_HEIGHT,
    maxWidth: COLLAPSED_WINDOW_WIDTH,
    maxHeight: COLLAPSED_WINDOW_HEIGHT,
    show: false,
    title: "Horizons Task Manager",
    frame: false,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    backgroundColor: "#060b12",
    ...(WINDOW_ICON_PATH ? { icon: WINDOW_ICON_PATH } : {}),
    resizable: false,
    movable: true,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: PRELOAD_PATH,
      additionalArguments: [`--horizons-api-url=${API_URL}`],
    },
  });

  applyDevContentSecurityPolicy(mainWindow.webContents.session);
  mainWindow.setMinimumSize(COLLAPSED_WINDOW_WIDTH, COLLAPSED_WINDOW_HEIGHT);
  mainWindow.setMaximumSize(COLLAPSED_WINDOW_WIDTH, COLLAPSED_WINDOW_HEIGHT);

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedUrl) => {
    if (isShuttingDown) return;
    console.error(
      `[taskmanager] Renderer failed to load (${errorCode}): ${errorDescription} @ ${validatedUrl || uiUrl}`
    );
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    if (isShuttingDown) return;
    console.error(
      `[taskmanager] Renderer process exited (${details.reason || "unknown"}, code ${details.exitCode ?? "n/a"}).`
    );
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isInternalUrl(url) && /^https?:/i.test(url)) {
      void shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isInternalUrl(url)) return;
    if (!/^https?:/i.test(url)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });

  // Closing the main window = the user is done — shut everything down.
  mainWindow.on("close", (event) => {
    if (!isShuttingDown) {
      event.preventDefault();
      void beginShutdown().finally(() => app.exit());
    }
  });

  mainWindow.on("closed", () => {
    clearWindowLayoutAnimation();
    mainWindow = null;
  });

  return mainWindow;
}

function createSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    return splashWindow;
  }

  splashWindow = new BrowserWindow({
    width: COLLAPSED_WINDOW_WIDTH,
    height: COLLAPSED_WINDOW_HEIGHT,
    minWidth: COLLAPSED_WINDOW_WIDTH,
    minHeight: COLLAPSED_WINDOW_HEIGHT,
    maxWidth: COLLAPSED_WINDOW_WIDTH,
    maxHeight: COLLAPSED_WINDOW_HEIGHT,
    show: false,
    frame: false,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    backgroundColor: "#060b12",
    ...(WINDOW_ICON_PATH ? { icon: WINDOW_ICON_PATH } : {}),
    resizable: false,
    movable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: PRELOAD_PATH,
      additionalArguments: [`--horizons-api-url=${API_URL}`, "--horizons-window-type=splash"],
    },
  });

  applyDevContentSecurityPolicy(splashWindow.webContents.session);

  splashWindow.once("ready-to-show", () => {
    splashWindow?.show();
  });

  splashWindow.on("closed", () => {
    splashWindow = null;
  });

  return splashWindow;
}

async function loadWindowUrl(window, targetUrl, label) {
  await window.loadURL(targetUrl).catch((error) => {
    void handleFatalError(`Failed to load ${label}: ${error.message}`);
  });
}

async function showSplashWindow() {
  const window = createSplashWindow();
  await loadWindowUrl(window, SPLASH_URL, "the startup shell");
}

async function showTaskManagerUi() {
  const window = mainWindow && !mainWindow.isDestroyed() ? mainWindow : createMainWindow();
  createMainWindowReadyPromise();
  await loadWindowUrl(window, uiUrl, "the Task Manager UI");
}

async function revealTaskManagerUi() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { ok: false, error: "Main window unavailable." };
  }

  splashFadeOut();
  await delay(360);
  if (!mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
  closeSplashWindow();
  return { ok: true };
}

async function ensureApiReady() {
  const available = await probePortAvailability(API_PORT);
  if (!available) {
    splashLog("api", "API already running — attaching…");
    await waitForUrl(`${API_URL}/health`, "Horizons API");
    return;
  }

  splashLog(
    "api",
    IS_PORTABLE_UI_MODE ? "Spawning bundled API server (port 8787)..." : "Spawning API server (port 8787)…"
  );
  apiProcess = IS_PORTABLE_UI_MODE
    ? spawnRuntime({
        label: "Horizons API",
        file: process.execPath,
        args: [resolve(TASKMANAGER_ROOT, "server", "dev-api.mjs")],
        cwd: TASKMANAGER_ROOT,
        env: {
          ELECTRON_RUN_AS_NODE: "1",
          HORIZONS_FORCE_CHAT_API_PORT: String(API_PORT),
          CHAT_API_PORT: String(API_PORT),
          HORIZONS_DISABLE_IDLE_TRAINING_AUTOSTART: "1",
        },
      })
    : spawnRuntime({
        label: "Horizons API",
        command: "npm run dev:api",
        cwd: TASKMANAGER_ROOT,
        env: {
          HORIZONS_FORCE_CHAT_API_PORT: String(API_PORT),
          CHAT_API_PORT: String(API_PORT),
          HORIZONS_DISABLE_IDLE_TRAINING_AUTOSTART: "1",
        },
      });

  splashLog("api", "Waiting for API to respond…");
  await waitForUrl(`${API_URL}/health`, "Horizons API");
}

async function ensureTaskManagerUiReady() {
  if (IS_PORTABLE_UI_MODE) {
    if (!fs.existsSync(DIST_INDEX_PATH)) {
      throw new Error(`Bundled UI entrypoint was not found at ${DIST_INDEX_PATH}.`);
    }

    const preferredPortAvailable = await probePortAvailability(PREFERRED_UI_PORT);
    uiPort = preferredPortAvailable ? PREFERRED_UI_PORT : await findAvailablePort(PREFERRED_UI_PORT + 1);
    uiUrl = getUiOrigin(uiPort);

    splashLog("ui", preferredPortAvailable ? "Serving bundled UI from dist..." : `Serving bundled UI from dist on port ${uiPort}...`);
    await startBundledUiServer(uiPort);

    splashLog("ui", "Waiting for bundled UI to respond...");
    await waitForUrl(uiUrl, "Bundled Task Manager UI");
    return;
  }

  const available = await probePortAvailability(PREFERRED_UI_PORT);
  if (!available) {
    uiPort = PREFERRED_UI_PORT;
    uiUrl = getUiOrigin(uiPort);
    splashLog("ui", "UI already running — attaching…");
    await waitForUrl(uiUrl, "Task Manager UI");
    return;
  }

  uiPort = PREFERRED_UI_PORT;
  uiUrl = getUiOrigin(uiPort);
  splashLog("ui", "Spawning UI server (port 5180)…");
  uiProcess = spawnRuntime({
    label: "Task Manager UI",
    command: `npm run dev -- --host 127.0.0.1 --port ${uiPort} --strictPort`,
    cwd: TASKMANAGER_ROOT,
    env: {
      HORIZONS_FORCE_CHAT_API_PORT: String(API_PORT),
      CHAT_API_PORT: String(API_PORT),
      VITE_CHAT_API_URL: API_URL,
    },
  });

  splashLog("ui", "Waiting for UI to respond…");
  await waitForUrl(uiUrl, "Task Manager UI");
}

/**
 * Starts a mock terminal ticker that streams plausible-looking subsystem
 * log lines while real APIs load in the background.
 * Returns a stop() function — call it once everything is ready.
 */
function startMockTicker() {
  // Fixed sequence — fires once at the specified delay.
  const sequence = [
    { id: "m-brain",    msg: "Loading brain knowledge index…",          delay: 120  },
    { id: "m-embed",    msg: "Warming embedding engine…",               delay: 380  },
    { id: "m-governed", msg: "Registering governed action contracts…",  delay: 680  },
    { id: "m-session",  msg: "Restoring session state…",               delay: 950  },
    { id: "m-opt",      msg: "Starting optimizer registry…",            delay: 1350 },
    { id: "m-spec",     msg: "Loading specialist modules…",             delay: 1750 },
    { id: "m-audit",    msg: "Initializing audit log…",                delay: 2100 },
    { id: "m-notify",   msg: "Registering notification callbacks…",     delay: 2500 },
    { id: "m-scan",     msg: "Scanning runtime environment…",           delay: 2900 },
    { id: "m-policy",   msg: "Applying optimizer policy…",              delay: 3350 },
    { id: "m-llm",      msg: "Checking local LLM availability…",        delay: 3850 },
    { id: "m-cache",    msg: "Hydrating response cache…",               delay: 4300 },
    { id: "m-ipc",      msg: "Binding IPC channels…",                   delay: 4750 },
    { id: "m-tray",     msg: "Configuring system tray…",                delay: 5100 },
    { id: "m-hotkey",   msg: "Registering global shortcuts…",           delay: 5450 },
  ];

  // After the sequence, cycle looping messages every 2s so the terminal
  // stays alive however long startup takes.
  const loopMessages = [
    "Verifying service health…",
    "Finalizing module linkage…",
    "Warming background subsystems…",
    "Indexing process registry…",
    "Syncing optimizer telemetry…",
    "Calibrating resource thresholds…",
    "Preparing workspace context…",
    "Almost there…",
  ];

  let stopped = false;
  const timers = [];
  let loopIndex = 0;

  for (const { id, msg, delay: ms } of sequence) {
    const t = setTimeout(() => {
      if (stopped) return;
      splashLog(id, msg, "info");
    }, ms);
    timers.push(t);
  }

  // Start the loop after the fixed sequence ends.
  const LOOP_START = 6000;
  const LOOP_INTERVAL = 2000;
  function scheduleLoop() {
    const t = setTimeout(() => {
      if (stopped) return;
      const msg = loopMessages[loopIndex % loopMessages.length];
      loopIndex++;
      splashLog(`m-loop-${loopIndex}`, msg, "info");
      scheduleLoop();
    }, loopIndex === 0 ? LOOP_START : LOOP_INTERVAL);
    timers.push(t);
  }
  scheduleLoop();

  function stop() {
    stopped = true;
    for (const t of timers) clearTimeout(t);
  }

  return { stop };
}

/**
 * Poll /health until all background phases are done warming.
 * Streams phase status into the splash terminal as they complete.
 * Resolves once backgroundWarming === false or timeout.
 */
async function waitForBackgroundReady() {
  const PHASE_POLL_MS = 1200;
  const TIMEOUT_MS = 60_000;
  const deadline = Date.now() + TIMEOUT_MS;
  const donePhases = new Set();

  while (Date.now() < deadline) {
    if (isShuttingDown) return;
    try {
      const result = await new Promise((resolve, reject) => {
        const req = http.request(`${API_URL}/health`, { method: "GET" }, (res) => {
          let raw = "";
          res.on("data", (c) => { raw += c; });
          res.on("end", () => {
            try { resolve(JSON.parse(raw)); } catch { reject(new Error("parse")); }
          });
        });
        req.setTimeout(2000, () => req.destroy(new Error("timeout")));
        req.on("error", reject);
        req.end();
      });

      // Stream newly-completed phases to the splash terminal.
      if (result?.phases && typeof result.phases === "object") {
        for (const [name, phase] of Object.entries(result.phases)) {
          if (donePhases.has(name)) continue;
          const status = phase?.status;
          if (status === "ready") {
            donePhases.add(name);
            splashLog(`phase-${name}`, `${name} ready`, "done");
          } else if (status === "error") {
            donePhases.add(name);
            splashLog(`phase-${name}`, `${name} error — degraded`, "error");
          }
        }
      }

      if (result?.backgroundWarming === false) return;
    } catch { /* retry */ }

    await delay(PHASE_POLL_MS);
  }
  // Timed out — proceed anyway.
}

function killProcessTree(child) {
  if (!child?.pid) {
    return Promise.resolve();
  }

  return new Promise((resolveKill) => {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });

    killer.once("error", () => resolveKill());
    killer.once("exit", () => resolveKill());
  });
}

function beginShutdown() {
  if (!cleanupPromise) {
    isShuttingDown = true;
    resolveMainWindowReady({ ok: false, timedOut: true, reason: "shutdown" });
    closeSplashWindow();
    cleanupPromise = Promise.allSettled([
      killProcessTree(uiProcess),
      killProcessTree(apiProcess),
      closeBundledUiServer(),
    ]).finally(() => {
      apiProcess = null;
      uiProcess = null;
      cleanupPromise = null;
    });
  }

  return cleanupPromise;
}

async function handleFatalError(message) {
  if (fatalErrorShown) return;
  fatalErrorShown = true;
  console.error(`[taskmanager] ${message}`);
  closeSplashWindow();
  dialog.showErrorBox("Horizons Task Manager", message);
  await beginShutdown();
  app.exit(1);
}

// ---------------------------------------------------------------------------
// Quick Chat — global hotkey (Ctrl+Shift+Space) opens a small floating window
// ---------------------------------------------------------------------------

let quickChatWindow = null;

function createQuickChatWindow() {
  if (quickChatWindow && !quickChatWindow.isDestroyed()) {
    quickChatWindow.show();
    quickChatWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = primaryDisplay.workArea;
  const winW = 480;
  const winH = 340;

  quickChatWindow = new BrowserWindow({
    width: winW,
    height: winH,
    x: Math.round(screenW / 2 - winW / 2),
    y: Math.round(screenH * 0.2),
    show: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    transparent: false,
    backgroundColor: "#060b12",
    ...(WINDOW_ICON_PATH ? { icon: WINDOW_ICON_PATH } : {}),
    title: "Horizons Quick Chat",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: PRELOAD_PATH,
      additionalArguments: [`--horizons-api-url=${API_URL}`, "--horizons-window-type=quickchat"],
    },
  });

  applyDevContentSecurityPolicy(quickChatWindow.webContents.session);

  quickChatWindow.once("ready-to-show", () => {
    quickChatWindow?.show();
    quickChatWindow?.focus();
  });

  quickChatWindow.on("blur", () => {
    if (quickChatWindow && !quickChatWindow.isDestroyed()) quickChatWindow.hide();
  });

  quickChatWindow.on("closed", () => {
    quickChatWindow = null;
  });

  const target = uiUrl
    ? `${uiUrl}?window=quickchat`
    : `http://localhost:${PREFERRED_UI_PORT}?window=quickchat`;
  quickChatWindow.loadURL(target).catch(() => {});
}

function toggleQuickChat() {
  if (quickChatWindow && !quickChatWindow.isDestroyed() && quickChatWindow.isVisible()) {
    quickChatWindow.hide();
  } else {
    createQuickChatWindow();
  }
}

const registerQuickChatShortcut = () => {
  const hotkey = process.env.HORIZONS_QUICKCHAT_HOTKEY || "CommandOrControl+Shift+Space";
  try {
    globalShortcut.register(hotkey, toggleQuickChat);
  } catch (err) {
    console.error(`[taskmanager] Failed to register quick-chat hotkey (${hotkey}):`, err?.message || err);
  }
};
async function bootstrap() {
  createTray();
  createMainWindow();
  await showSplashWindow();

  const ticker = startMockTicker();

  splashLog("runtime", "Initializing runtime host...");
  await ensureRuntimeHostReady();
  splashLog("runtime", "Runtime host ready", "done");

  splashLog("prescan", "Pre-scanning processes...");
  splashLog("snapshot", "Building live process snapshot...");
  const processWarmupPromise = Promise.allSettled([
    runtimeHost
      .buildRuntimeManagerComputerOverview({ showProtected: true })
      .then((overview) => {
        const count = overview?.rows?.length ?? 0;
        splashLog(
          "prescan",
          count > 0 ? `Found ${count} process groups` : "Process pre-scan complete",
          "done"
        );
      })
      .catch(() => {
        splashLog("prescan", "Process pre-scan complete", "done");
      }),
    runtimeHost
      .readTaskManagerSnapshot()
      .then((snapshot) => {
        const processCount = Array.isArray(snapshot?.processes) ? snapshot.processes.length : 0;
        splashLog(
          "snapshot",
          processCount > 0 ? `Snapshot captured - ${processCount} processes` : "Snapshot captured",
          "done"
        );
      })
      .catch(() => {
        splashLog("snapshot", "Snapshot captured", "done");
      }),
  ]);

  splashLog("api", "Checking API port 8787...");
  splashLog("ui", "Checking UI port 5180...");
  try {
    await Promise.all([
      ensureApiReady().then(() => {
        apiReady = true;
        splashLog("api", "API server ready - port 8787", "done");
      }),
      ensureTaskManagerUiReady().then(() => {
        splashLog("ui", "UI server ready - port 5180", "done");
      }),
    ]);
  } catch (error) {
    ticker.stop();
    splashLog("api", `Startup failed: ${error instanceof Error ? error.message : String(error)}`, "error");
    void handleFatalError(`Core startup failed: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  splashLog("load", "Preloading Task Manager interface...");
  try {
    await showTaskManagerUi();
    splashLog("load", "Interface shell ready in background", "done");
  } catch (error) {
    ticker.stop();
    splashLog("load", `UI preload failed: ${error instanceof Error ? error.message : String(error)}`, "error");
    void handleFatalError(`UI preload failed: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  splashLog("wm", "Initializing window manager...");
  windowManager = createWindowManager({
    uiUrl,
    preloadPath: PRELOAD_PATH,
    screen,
    BrowserWindow,
    applySession: applyDevContentSecurityPolicy,
    apiUrl: API_URL,
  });
  splashLog("wm", "Window manager ready", "done");

  ticker.stop();
  splashLog("renderer", "Waiting for process list from renderer...");

  const uiReadyState = await Promise.race([
    mainWindowReadyPromise ?? Promise.resolve({ ok: false, timedOut: false, reason: "missing-readiness-promise" }),
    delay(12_000).then(() => ({ ok: false, timedOut: true, reason: "startup-timeout" })),
  ]);

  if (uiReadyState?.ok) {
    const rowCount = Number(uiReadyState.rowCount) > 0 ? Number(uiReadyState.rowCount) : 0;
    splashLog("renderer", `Process list ready - ${rowCount} rows`, "done");
    splashLog("ready", "Revealing interface", "done");
  } else {
    splashLog("renderer", "Startup fallback engaged", "error");
    splashLog("ready", "Startup took longer than expected - revealing interface", "error");
  }

  await revealTaskManagerUi();
  startupComplete = true;
  updateTrayTooltip("Horizons Task Manager - Running");
  registerQuickChatShortcut();

  void waitForBackgroundReady().catch((error) => {
    console.error("[taskmanager] Background warmup failed:", error?.message || error);
  });

  try {
    const { registerNotifyCallback } = await import(
      pathToFileURL(resolve(__dirname, "../portable_lib/proactive-notifications.mjs")).href
    );
    registerNotifyCallback(({ title, body }) => {
      if (!ElectronNotification.isSupported()) return;
      const n = new ElectronNotification({ title, body, silent: false });
      n.on("click", () => focusMainWindow());
      n.show();
    });
  } catch (err) {
    console.error("[taskmanager] Failed to wire proactive notifications:", err?.message || err);
  }
}

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    focusMainWindow();
  });

  ipcMain.handle("task-manager:open-window", async () => {
    focusMainWindow();
    return { ok: true };
  });
  ipcMain.handle("task-manager:startup-ready", async (event, payload) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { ok: false, error: "Main window unavailable." };
    }
    if (event.sender !== mainWindow.webContents) {
      return { ok: false, error: "Startup readiness must come from the main window." };
    }
    const stage = payload && typeof payload === "object" ? String(payload.stage || "") : "";
    const rowCount = Number(payload?.rowCount || 0);
    const groupCount = Number(payload?.groupCount || 0);
    const hasSnapshot = payload?.hasSnapshot === true;

    if (stage !== "process-list") {
      return { ok: false, error: "Unsupported startup readiness stage." };
    }
    if (!hasSnapshot || rowCount <= 0) {
      return { ok: false, error: "Startup readiness requires snapshot-backed process rows." };
    }

    resolveMainWindowReady({
      ok: true,
      timedOut: false,
      stage,
      rowCount,
      groupCount,
      hasSnapshot,
    });
    return { ok: true };
  });
  ipcMain.handle("task-manager:set-window-layout", async () => {
    return applyStandaloneWindowLayout("collapsed");
  });
  ipcMain.on("task-manager:drag-window", (_, x, y) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      clearWindowLayoutAnimation();
      const display = screen.getDisplayMatching(mainWindow.getBounds());
      const workArea = display.workArea;
      const clampedX = clamp(
        Math.round(x),
        workArea.x,
        Math.max(workArea.x, workArea.x + workArea.width - COLLAPSED_WINDOW_WIDTH)
      );
      const clampedY = clamp(
        Math.round(y),
        workArea.y,
        Math.max(workArea.y, workArea.y + workArea.height - COLLAPSED_WINDOW_HEIGHT)
      );
      const nextBounds = {
        x: clampedX,
        y: clampedY,
        width: COLLAPSED_WINDOW_WIDTH,
        height: COLLAPSED_WINDOW_HEIGHT,
      };
      lastCollapsedWindowBounds = nextBounds;
      mainWindow.setBounds(nextBounds);
    }
  });

  ipcMain.handle("task-manager:minimize-window", async (event) => {
    // Target the window that sent the IPC message, not always the main window.
    const win = event.sender.getOwnerBrowserWindow?.() ?? mainWindow;
    if (win && !win.isDestroyed()) win.minimize();
    return { ok: true };
  });
  ipcMain.handle("task-manager:toggle-maximize-window", async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        await new Promise((resolveUnmax) => {
          mainWindow.once("unmaximize", resolveUnmax);
          mainWindow.unmaximize();
        });
        await applyStandaloneWindowLayout("collapsed");
      }
    }

    return { ok: true, maximized: false };
  });
  ipcMain.handle("task-manager:close-window", async (event) => {
    // Target the window that sent the IPC message so companion windows can
    // close themselves without closing the main Task Manager window.
    const win = event.sender.getOwnerBrowserWindow?.() ?? mainWindow;
    if (win && !win.isDestroyed()) win.close();
    return { ok: true };
  });
  ipcMain.handle("task-manager:is-maximized-window", async () => {
    const maximized = Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isMaximized());
    return { ok: true, maximized };
  });

  // ---------------------------------------------------------------------------
  // Companion window IPC — chat, dev, approval, diagnostics
  // ---------------------------------------------------------------------------

  // Legacy per-type handlers (kept for backward compat with existing renderers)
  ipcMain.handle("window:open-chat",      async () => { windowManager?.openWindow("chat");      return { ok: true }; });
  ipcMain.handle("window:open-dev",       async () => { windowManager?.openWindow("dev");       return { ok: true }; });
  ipcMain.handle("window:open-approval",  async () => { windowManager?.openWindow("approval");  return { ok: true }; });
  ipcMain.handle("window:close-chat",     async () => { windowManager?.closeWindow("chat");     return { ok: true }; });
  ipcMain.handle("window:close-dev",      async () => { windowManager?.closeWindow("dev");      return { ok: true }; });
  ipcMain.handle("window:close-approval", async () => { windowManager?.closeWindow("approval"); return { ok: true }; });
  ipcMain.handle("window:focus-chat",     async () => { windowManager?.focusWindow("chat");     return { ok: true }; });
  ipcMain.handle("window:focus-dev",      async () => { windowManager?.focusWindow("dev");      return { ok: true }; });
  ipcMain.handle("window:focus-approval", async () => { windowManager?.focusWindow("approval"); return { ok: true }; });
  ipcMain.handle("window:open-tasks",     async () => { windowManager?.openWindow("tasks");     return { ok: true }; });
  ipcMain.handle("window:close-tasks",    async () => { windowManager?.closeWindow("tasks");    return { ok: true }; });
  ipcMain.handle("window:focus-tasks",    async () => { windowManager?.focusWindow("tasks");    return { ok: true }; });
  ipcMain.handle("window:get-state",      async (_event, type) => {
    return windowManager?.getWindowState(String(type)) ?? { isOpen: false, bounds: null };
  });

  // Generic window lifecycle (works for any registered type including diagnostics)
  ipcMain.handle("window:open", async (_event, type) => {
    const t = String(type || "").trim();
    if (!t) return { ok: false, error: "Missing window type" };
    windowManager?.openWindow(t);
    return { ok: true };
  });
  ipcMain.handle("window:close", async (_event, type) => {
    windowManager?.closeWindow(String(type));
    return { ok: true };
  });
  ipcMain.handle("window:focus", async (_event, type) => {
    windowManager?.focusWindow(String(type));
    return { ok: true };
  });
  ipcMain.handle("window:get-open-types", async () => {
    return windowManager?.getOpenTypes() ?? [];
  });

  // ---------------------------------------------------------------------------
  // Cross-window broadcast relay
  // ---------------------------------------------------------------------------
  // A renderer sends  window:broadcast(channel, payload)  and we forward
  // the event to all other companion windows AND the main window.
  // ---------------------------------------------------------------------------

  ipcMain.handle("window:broadcast", async (event, channel, payload) => {
    const sender = event.sender;
    // Forward to all companion windows
    if (windowManager) {
      for (const type of windowManager.getOpenTypes()) {
        const state = windowManager.getWindowState(type);
        if (!state?.isOpen) continue;
        // broadcastTo sends to the window's webContents
        windowManager.broadcastTo(type, channel, payload);
      }
    }
    // Forward to main window if it wasn't the sender
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents !== sender) {
      try {
        mainWindow.webContents.send('horizons:broadcast', { channel, payload });
      } catch { /* closing */ }
    }
    return { ok: true };
  });

  /**
   * Helper: broadcast from the main process to ALL windows (main + companions).
   * Used by server-originated events (approval changes, subsystem status, etc.)
   */
  function broadcastToAll(channel, payload) {
    // Main window
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.webContents.send('horizons:broadcast', { channel, payload });
      } catch { /* closing */ }
    }
    // Companion windows
    if (windowManager) {
      windowManager.broadcast(channel, payload);
    }
  }

  // Store broadcastToAll on module scope so other parts of bootstrap can use it
  _broadcastToAll = broadcastToAll;

  // ---------------------------------------------------------------------------
  // System tray — keeps the process alive when the window is closed so the
  // optimizer and crawler loops continue running in the background.
  // ---------------------------------------------------------------------------

  let tray = null;

  function buildTrayIcon() {
    // 16×16 monochrome PNG encoded as a 1×1 transparent placeholder.
    // Electron will use a simple template image if a real icon file is present
    // at desktop/tray-icon.png — fall back to an empty image if not.
    try {
      return TRAY_ICON_PATH ? nativeImage.createFromPath(TRAY_ICON_PATH) : nativeImage.createEmpty();
    } catch {
      return nativeImage.createEmpty();
    }
  }

  function updateTrayTooltip(label) {
    if (tray && !tray.isDestroyed()) {
      tray.setToolTip(label || "Horizons Task Manager");
    }
  }

  function createTray() {
    if (tray && !tray.isDestroyed()) return;
    tray = new Tray(buildTrayIcon());
    tray.setToolTip("Horizons Task Manager");
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Open Task Manager",
        click: () => {
          focusMainWindow();
          if (!mainWindow || mainWindow.isDestroyed()) {
            createMainWindow();
            void showTaskManagerUi();
          }
        },
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          void beginShutdown().finally(() => app.exit());
        },
      },
    ]);
    tray.setContextMenu(contextMenu);
    tray.on("click", () => focusMainWindow());
  }

  app.on("window-all-closed", () => {
    if (process.platform === "darwin") {
      app.dock?.hide();
      return;
    }
    // All windows closed on Windows/Linux — shut down child processes and exit.
    void beginShutdown().finally(() => app.exit());
  });

  // IPC for renderer to close quick-chat
  ipcMain.handle("quickchat:close", async () => {
    if (quickChatWindow && !quickChatWindow.isDestroyed()) quickChatWindow.hide();
    return { ok: true };
  });

  // ---------------------------------------------------------------------------
  // Proactive notifications — IPC bridge
  // ---------------------------------------------------------------------------

  ipcMain.handle("horizons:notify", async (_event, opts) => {
    if (!ElectronNotification.isSupported()) return { ok: false, reason: "not_supported" };
    const n = new ElectronNotification({
      title: String(opts?.title || "Horizons AI"),
      body: String(opts?.body || ""),
      silent: opts?.silent === true,
    });
    n.on("click", () => focusMainWindow());
    n.show();
    return { ok: true };
  });

  app.on("before-quit", (event) => {
    globalShortcut.unregisterAll();
    if (cleanupPromise) {
      event.preventDefault();
      cleanupPromise.finally(() => app.exit());
      return;
    }

    if (!isShuttingDown) {
      event.preventDefault();
      void beginShutdown().finally(() => app.exit());
    }
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      if (isShuttingDown) return;
      void beginShutdown().finally(() => app.exit());
    });
  }

  app.on("child-process-gone", (_event, details) => {
    if (isShuttingDown) return;
    const serviceName = details.serviceName ? ` (${details.serviceName})` : "";
    console.error(
      `[taskmanager] Child process gone: ${details.type}${serviceName} | ${details.reason || "unknown"} | code ${details.exitCode ?? "n/a"}`
    );
  });

  app.whenReady().then(bootstrap).catch((error) => {
    void handleFatalError(error instanceof Error ? error.message : String(error));
  });
}
