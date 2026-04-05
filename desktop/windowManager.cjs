'use strict';

const { getWindowIconPath } = require("./iconPaths.cjs");

// ---------------------------------------------------------------------------
// windowManager.cjs
// Manages the lifecycle of companion BrowserWindows in a multi-window
// desktop workspace.  Each window type declares whether it is a singleton
// (at most one instance) or supports multiple concurrent instances.
//
// All cross-window communication goes through a formal broadcast channel:
//   main  →  windowManager.broadcast(channel, payload)
//   renderer  ←  ipcRenderer.on('horizons:broadcast', ...)
//
// Shared state lives in the API server / main process.  Renderer windows
// keep only local UI state and react to broadcast hints to refetch.
// ---------------------------------------------------------------------------

const { getStoredBounds, attachBoundsPersistence } = require('./boundsPersistence.cjs');

/**
 * Default size, behaviour, and instance policy per companion window type.
 *
 * singleton: true  — at most one window of this type (focus if already open)
 * singleton: false — multiple instances allowed (future; not yet used)
 */
const WINDOW_CONFIGS = {
  chat: {
    width: 880,
    height: 720,
    minWidth: 600,
    minHeight: 500,
    resizable: true,
    title: 'Horizons – Chat Manager',
    singleton: true,
  },
  dev: {
    width: 900,
    height: 820,
    minWidth: 700,
    minHeight: 600,
    resizable: true,
    title: 'Horizons – Dev Workspace',
    singleton: true,
  },
  approval: {
    width: 380,
    height: 138,
    minWidth: 340,
    minHeight: 138,
    resizable: false,
    alwaysOnTop: true,
    title: 'Horizons – Approval',
    singleton: true,
  },
  diagnostics: {
    width: 780,
    height: 640,
    minWidth: 600,
    minHeight: 480,
    resizable: true,
    title: 'Horizons – Diagnostics',
    singleton: true,
  },
  tasks: {
    width: 1120,
    height: 800,
    minWidth: 820,
    minHeight: 580,
    resizable: true,
    title: 'Horizons – Task Scheduler',
    singleton: true,
  },
};

/**
 * Factory that creates a window manager instance.
 *
 * @param {{
 *   uiUrl:       string,
 *   preloadPath: string,
 *   screen:      Electron.Screen,
 *   BrowserWindow: typeof Electron.BrowserWindow,
 *   applySession: (session: Electron.Session) => void,
 *   apiUrl:      string,
 * }} opts
 */
function createWindowManager({ uiUrl, preloadPath, screen, BrowserWindow, applySession, apiUrl }) {
  /** @type {Map<string, Electron.BrowserWindow>} */
  const windows = new Map();
  const windowIconPath = getWindowIconPath();

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  function getCenteredPosition(width, height) {
    const wa = screen.getPrimaryDisplay().workArea;
    return {
      x: Math.round(wa.x + (wa.width - width) / 2),
      y: Math.round(wa.y + (wa.height - height) / 2),
    };
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Open the companion window for the given type.  If the window is already
   * open, bring it to front instead of creating a duplicate.
   *
   * @param {string} type  Window type key (chat, dev, approval, diagnostics, etc.)
   */
  function openWindow(type) {
    const existing = windows.get(type);
    if (existing && !existing.isDestroyed()) {
      // Singleton window types just focus the existing instance.
      const config = WINDOW_CONFIGS[type];
      if (!config || config.singleton !== false) {
        focusWindow(type);
        return;
      }
    }

    const config = WINDOW_CONFIGS[type];
    if (!config) {
      console.error(`[windowManager] Unknown companion window type: "${type}"`);
      return;
    }

    // Restore last position/size or fall back to centred defaults.
    const stored = getStoredBounds(type, screen);
    const defaults = getCenteredPosition(config.width, config.height);
    const x      = stored?.x      ?? defaults.x;
    const y      = stored?.y      ?? defaults.y;
    // Non-resizable windows always use config dimensions (ignore stale stored size)
    const width  = config.resizable ? (stored?.width  ?? config.width)  : config.width;
    const height = config.resizable ? (stored?.height ?? config.height) : config.height;

    const win = new BrowserWindow({
      x,
      y,
      width,
      height,
      minWidth:       config.minWidth,
      minHeight:      config.minHeight,
      resizable:      config.resizable,
      alwaysOnTop:    config.alwaysOnTop ?? false,
      show:           false,
      title:          config.title,
      frame:          false,
      titleBarStyle:  'hidden',
      autoHideMenuBar: true,
      backgroundColor: '#060b12',
      ...(windowIconPath ? { icon: windowIconPath } : {}),
      movable:        true,
      maximizable:    false,
      fullscreenable: false,
      webPreferences: {
        nodeIntegration:    false,
        contextIsolation:   true,
        sandbox:            true,
        preload:            preloadPath,
        additionalArguments: [
          ...(apiUrl ? [`--horizons-api-url=${apiUrl}`] : []),
          `--horizons-window-type=${type}`,
        ],
      },
    });

    // Apply the same CSP the main window uses.
    if (typeof applySession === 'function') {
      applySession(win.webContents.session);
    }

    // Prevent opening new OS windows from inside the renderer.
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/i.test(url)) {
        const { shell } = require('electron');
        void shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    win.once('ready-to-show', () => {
      if (!win.isDestroyed()) win.show();
    });

    win.on('closed', () => {
      windows.delete(type);
    });

    attachBoundsPersistence(win, type);
    windows.set(type, win);

    const targetUrl = `${uiUrl}?window=${encodeURIComponent(type)}`;
    win.loadURL(targetUrl).catch((err) => {
      console.error(`[windowManager] Failed to load ${type} window: ${err.message}`);
    });
  }

  /** Close the companion window for the given type (if open). */
  function closeWindow(type) {
    const win = windows.get(type);
    if (win && !win.isDestroyed()) win.close();
  }

  /** Bring the companion window for the given type to front (if open). */
  function focusWindow(type) {
    const win = windows.get(type);
    if (!win || win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }

  /** Returns true if the companion window of the given type is currently open. */
  function isWindowOpen(type) {
    const win = windows.get(type);
    return Boolean(win && !win.isDestroyed());
  }

  /**
   * Returns the open/bounds state for the given window type.
   * @returns {{ isOpen: boolean, bounds: {x,y,width,height}|null }}
   */
  function getWindowState(type) {
    const win = windows.get(type);
    if (!win || win.isDestroyed()) return { isOpen: false, bounds: null };
    const [x, y]         = win.getPosition();
    const [width, height] = win.getSize();
    return { isOpen: true, bounds: { x, y, width, height } };
  }

  /**
   * Returns the OS-level renderer process PID for the given window type,
   * or null if the window is not open.
   */
  function getRenderPid(type) {
    const win = windows.get(type);
    if (!win || win.isDestroyed()) return null;
    try { return win.webContents.getOSProcessId(); } catch { return null; }
  }

  // -------------------------------------------------------------------------
  // Broadcast — formal cross-window event channel
  // -------------------------------------------------------------------------

  /**
   * Send a broadcast event to every open companion window.
   * Renderers receive it via `ipcRenderer.on('horizons:broadcast', ...)`.
   *
   * @param {string} channel  Namespaced event name, e.g. 'approvals:changed'
   * @param {unknown} [payload]  JSON-serialisable data
   */
  function broadcast(channel, payload) {
    for (const [, win] of windows) {
      if (win && !win.isDestroyed()) {
        try {
          win.webContents.send('horizons:broadcast', { channel, payload });
        } catch { /* window may be closing */ }
      }
    }
  }

  /**
   * Send a broadcast event to a specific companion window only.
   * @param {string} type     Window type to target
   * @param {string} channel  Namespaced event name
   * @param {unknown} [payload]
   */
  function broadcastTo(type, channel, payload) {
    const win = windows.get(type);
    if (win && !win.isDestroyed()) {
      try {
        win.webContents.send('horizons:broadcast', { channel, payload });
      } catch { /* window may be closing */ }
    }
  }

  /** Returns all window type strings that are currently open. */
  function getOpenTypes() {
    const types = [];
    for (const [type, win] of windows) {
      if (win && !win.isDestroyed()) types.push(type);
    }
    return types;
  }

  /** Returns the known window configs (read-only view). */
  function getRegisteredTypes() {
    return Object.keys(WINDOW_CONFIGS);
  }

  return {
    openWindow,
    closeWindow,
    focusWindow,
    isWindowOpen,
    getWindowState,
    getRenderPid,
    broadcast,
    broadcastTo,
    getOpenTypes,
    getRegisteredTypes,
  };
}

module.exports = { createWindowManager, WINDOW_CONFIGS };
