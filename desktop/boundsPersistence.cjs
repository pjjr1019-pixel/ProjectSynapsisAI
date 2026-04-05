'use strict';

// ---------------------------------------------------------------------------
// boundsPersistence.cjs
// Persists per-window bounds to {userData}/window-bounds.json.
// Lazy-resolves the userData path — safe to require before app.whenReady().
// ---------------------------------------------------------------------------

const path = require('node:path');
const fs = require('node:fs');

const BOUNDS_FILE_NAME = 'window-bounds.json';
const DEBOUNCE_MS = 400;

let boundsFilePath = null;
let boundsCache = null;
const debounceTimers = new Map();

function getBoundsFilePath() {
  if (!boundsFilePath) {
    // app.getPath is only available after Electron initialises; call lazily.
    const { app } = require('electron');
    boundsFilePath = path.join(app.getPath('userData'), BOUNDS_FILE_NAME);
  }
  return boundsFilePath;
}

function loadBoundsFile() {
  if (boundsCache !== null) return boundsCache;
  try {
    const raw = fs.readFileSync(getBoundsFilePath(), 'utf8');
    boundsCache = JSON.parse(raw) || {};
  } catch {
    boundsCache = {};
  }
  return boundsCache;
}

function saveBoundsFile(data) {
  try {
    fs.writeFileSync(getBoundsFilePath(), JSON.stringify(data, null, 2), 'utf8');
    boundsCache = data;
  } catch {
    // Disk unavailable — ignore.
  }
}

/**
 * Validate that the center point of the given bounds falls within at least
 * one display's work area.  Returns null if the bounds are off-screen.
 *
 * @param {{ x: number, y: number, width: number, height: number }} bounds
 * @param {Electron.Screen} screen
 * @returns {{ x: number, y: number, width: number, height: number } | null}
 */
function validateBounds(bounds, screen) {
  if (
    !bounds ||
    typeof bounds.x !== 'number' ||
    typeof bounds.y !== 'number' ||
    typeof bounds.width !== 'number' ||
    typeof bounds.height !== 'number'
  ) {
    return null;
  }

  const displays = screen.getAllDisplays();
  const cx = bounds.x + Math.floor(bounds.width / 2);
  const cy = bounds.y + Math.floor(bounds.height / 2);

  const isOnScreen = displays.some((display) => {
    const { x, y, width, height } = display.workArea;
    return cx >= x && cx <= x + width && cy >= y && cy <= y + height;
  });

  return isOnScreen ? bounds : null;
}

/**
 * Read stored bounds for a window type.  Returns validated bounds or null.
 *
 * @param {string} type  - 'chat' | 'dev' | 'approval'
 * @param {Electron.Screen} screen
 * @returns {{ x: number, y: number, width: number, height: number } | null}
 */
function getStoredBounds(type, screen) {
  const data = loadBoundsFile();
  const stored = data[String(type)];
  if (!stored || typeof stored !== 'object') return null;
  return validateBounds(stored, screen);
}

function saveBoundsDebounced(type, bounds) {
  if (debounceTimers.has(type)) {
    clearTimeout(debounceTimers.get(type));
  }

  const timer = setTimeout(() => {
    debounceTimers.delete(type);
    const data = { ...loadBoundsFile() };
    data[String(type)] = bounds;
    saveBoundsFile(data);
  }, DEBOUNCE_MS);

  debounceTimers.set(type, timer);
}

/**
 * Attach move/resize listeners to a BrowserWindow that automatically persist
 * its bounds under the given key.
 *
 * @param {Electron.BrowserWindow} win
 * @param {string} type
 */
function attachBoundsPersistence(win, type) {
  const saveBounds = () => {
    if (!win || win.isDestroyed() || win.isMinimized() || win.isMaximized()) return;
    const [x, y] = win.getPosition();
    const [width, height] = win.getSize();
    saveBoundsDebounced(type, { x, y, width, height });
  };

  win.on('move', saveBounds);
  win.on('resize', saveBounds);

  win.on('closed', () => {
    if (debounceTimers.has(type)) {
      clearTimeout(debounceTimers.get(type));
      debounceTimers.delete(type);
    }
  });
}

module.exports = { getStoredBounds, attachBoundsPersistence };
