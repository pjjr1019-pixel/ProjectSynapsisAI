/**
 * Proactive notification emitter for the optimizer control loop.
 *
 * Tracks the last pressure level and emits a notification (via the registered
 * callback) whenever pressure escalates to "high" or "critical".
 *
 * The notification callback is registered once by the Electron main process.
 * The server-side code in the control loop calls `checkAndNotify()` on each tick.
 */

/** @type {'low' | 'moderate' | 'high' | 'critical'} */
let lastNotifiedPressure = "low";
let lastNotifyTs = 0;
const NOTIFY_COOLDOWN_MS = 5 * 60_000; // 5 minutes between repeat notifications

/** @type {((opts: { title: string, body: string }) => void) | null} */
let _notifyFn = null;

/**
 * Register a callback that will be invoked when a proactive notification
 * should be shown to the user (e.g. Electron Notification).
 * @param {(opts: { title: string, body: string }) => void} fn
 */
export function registerNotifyCallback(fn) {
  _notifyFn = typeof fn === "function" ? fn : null;
}

const PRESSURE_RANK = { low: 0, moderate: 1, high: 2, critical: 3 };

/**
 * Call this from the optimizer tick with the current pressure and hotspot count.
 * Will fire a notification when appropriate.
 * @param {{ pressure: string, hotspotCount?: number, cpuPercent?: number, memPercent?: number }} state
 */
export function checkAndNotify(state) {
  const pressure = String(state?.pressure || "low");
  const rank = PRESSURE_RANK[pressure] ?? 0;
  const prevRank = PRESSURE_RANK[lastNotifiedPressure] ?? 0;
  const now = Date.now();

  // Only notify when escalating to high/critical AND respecting cooldown.
  if (rank >= 2 && rank > prevRank && now - lastNotifyTs > NOTIFY_COOLDOWN_MS) {
    lastNotifiedPressure = pressure;
    lastNotifyTs = now;
    const body = buildNotificationBody(state);
    if (_notifyFn) {
      try { _notifyFn({ title: `⚠️ System pressure: ${pressure}`, body }); } catch { /* isolation */ }
    }
  }

  // Reset tracking when pressure drops back down.
  if (rank < prevRank) {
    lastNotifiedPressure = pressure;
  }
}

function buildNotificationBody(state) {
  const parts = [];
  if (state.cpuPercent != null) parts.push(`CPU ${Math.round(state.cpuPercent)}%`);
  if (state.memPercent != null) parts.push(`Memory ${Math.round(state.memPercent)}%`);
  if (state.hotspotCount) parts.push(`${state.hotspotCount} hotspot(s)`);
  return parts.length ? parts.join(" · ") : "Resource usage elevated.";
}
