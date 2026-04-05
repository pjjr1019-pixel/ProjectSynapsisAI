/**
 * ScriptRegistry — Formal script registry facade.
 *
 * Wraps ScriptIndexService and adds typed lookup, availability checks,
 * registration enforcement, and last-run metadata from the execution log.
 *
 * All governed-action integrations (e.g. run_approved_script) go through
 * this class to ensure only registered scripts can execute.
 */

import fs from "node:fs";
import { ScriptIndexService } from "./index-service.mjs";

function safeReadJsonLines(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const text = fs.readFileSync(filePath, "utf8").trim();
    if (!text) return [];
    return text
      .split("\n")
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export class ScriptRegistry {
  /**
   * @param {{ paths: import("./paths.mjs").SpecialistPaths }} opts
   */
  constructor({ paths }) {
    this.paths = paths;
    this.indexService = new ScriptIndexService({ paths });
    this._built = false;
  }

  /** Build (or rebuild) the underlying index from registry + manifest sources. */
  build() {
    const result = this.indexService.build();
    this._built = true;
    return result;
  }

  /** Ensure the index has been built at least once. */
  _ensureBuilt() {
    if (!this._built) this.build();
  }

  // ── Lookup ───────────────────────────────────────────────────────────────

  /** Returns all registered script manifests. */
  getAll() {
    this._ensureBuilt();
    return this.indexService.getManifests();
  }

  /** Returns only scripts whose availability is not disabled. */
  getAvailable() {
    return this.getAll().filter(
      (m) => m.policy_class !== "destructive" || m.safe_to_autorun === false
    );
  }

  /**
   * Look up a script by its exact ID.
   * @param {string} scriptId
   * @returns {object|null} The full manifest entry, or null.
   */
  getEntry(scriptId) {
    this._ensureBuilt();
    const manifests = this.indexService.getManifests();
    return manifests.find((m) => m.id === scriptId) || null;
  }

  /**
   * Check whether a script ID is present in the registry.
   * @param {string} scriptId
   * @returns {boolean}
   */
  isRegistered(scriptId) {
    return this.getEntry(scriptId) !== null;
  }

  /**
   * Look up a script via the alias index (e.g. "show cpu hogs" → "list_running_processes").
   * @param {string} phrase
   * @returns {object|null} The resolved manifest or null.
   */
  resolveAlias(phrase) {
    this._ensureBuilt();
    const state = this.indexService.getState();
    const lower = String(phrase).toLowerCase();
    const resolvedId =
      state.exactNameIndex?.[lower] || state.aliasIndex?.[lower] || null;
    if (!resolvedId) return null;
    return this.getEntry(resolvedId);
  }

  // ── Guard ────────────────────────────────────────────────────────────────

  /**
   * Guard: reject execution of unregistered scripts.
   *
   * @param {string} scriptId
   * @returns {{ allowed: boolean, reason: string, entry: object|null }}
   */
  guardExecution(scriptId) {
    const entry = this.getEntry(scriptId);
    if (!entry) {
      return {
        allowed: false,
        reason: `Script "${scriptId}" is not in the registry. Execution blocked.`,
        entry: null,
      };
    }
    return { allowed: true, reason: "registered", entry };
  }

  // ── Last-run metadata ────────────────────────────────────────────────────

  /**
   * Return the most recent execution record for a given script from the
   * specialist execution log. Returns null if the log is missing or the
   * script has never run.
   *
   * @param {string} scriptId
   * @returns {{ ts: string, mode: string, result: object }|null}
   */
  getLastRunMeta(scriptId) {
    const lines = safeReadJsonLines(this.paths.specialistExecutionLogFile);
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].script_id === scriptId) return lines[i];
    }
    return null;
  }

  // ── Summary (for API / dev panel) ────────────────────────────────────────

  /**
   * Return a summary of the registry suitable for API responses.
   * @returns {{ count: number, ids: string[], categories: Record<string, string[]> }}
   */
  getSummary() {
    const manifests = this.getAll();
    const categories = {};
    for (const m of manifests) {
      const cat = m.category || "general";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(m.id);
    }
    return {
      count: manifests.length,
      ids: manifests.map((m) => m.id),
      categories,
    };
  }
}
