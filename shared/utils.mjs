// ---------------------------------------------------------------------------
// Preferences normalization
// ---------------------------------------------------------------------------

/**
 * Normalize user preferences for task manager features.
 * Ensures all fields are present and in canonical form.
 * @param {object} prefs
 * @returns {object}
 */
export function normalizePrefs(prefs = {}) {
  return {
    monitoringEnabled: prefs.monitoringEnabled !== false,
    ignoredFingerprints: Array.isArray(prefs.ignoredFingerprints) ? prefs.ignoredFingerprints.map(String) : [],
    keepFingerprints: Array.isArray(prefs.keepFingerprints) ? prefs.keepFingerprints.map(String) : [],
    snoozedUntil: prefs.snoozedUntil && typeof prefs.snoozedUntil === "object" ? { ...prefs.snoozedUntil } : {},
    showProtected: prefs.showProtected === true,
  };
}
/**
 * Shared utility functions used across server/, portable_lib/, and shared/.
 *
 * Import from here instead of copy-pasting into individual modules.
 */

const MB = 1024 * 1024;
const GB = 1024 * MB;

// ---------------------------------------------------------------------------
// Number coercion
// ---------------------------------------------------------------------------

export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function toInteger(value, fallback = 0) {
  const n = Math.round(toNumber(value, fallback));
  return Number.isFinite(n) ? n : fallback;
}

export function round1(value) {
  return Math.round(toNumber(value) * 10) / 10;
}

export function clampPercent(value) {
  return Math.max(0, Math.min(100, toNumber(value)));
}

// ---------------------------------------------------------------------------
// Byte / percent formatting
// ---------------------------------------------------------------------------

export function formatBytes(value) {
  const bytes = Math.max(0, toNumber(value));
  if (bytes >= GB) return `${(bytes / GB).toFixed(bytes >= 10 * GB ? 0 : 1)} GB`;
  if (bytes >= MB) return `${Math.round(bytes / MB)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function formatPercent(value) {
  return `${Math.max(0, toNumber(value)).toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export function compactText(value, maxLength = 160) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

export function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// ---------------------------------------------------------------------------
// Arrays
// ---------------------------------------------------------------------------

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
