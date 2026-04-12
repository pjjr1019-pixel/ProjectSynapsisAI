/**
 * Reply-Policy Module
 * 
 * Two-layer design:
 * - Canonical layer: source-controlled, manually reviewed rules
 * - Runtime overlay layer: auto-generated rules from improvement analyzer
 * 
 * Query time: merged view (canonical + overlay, overlay wins on conflict).
 */

import type { ReplyPolicyRule } from "@contracts/improvement";
import { loadDatabase, mutateDatabase } from "@memory/storage/db";
import { readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { mkdir } from "node:fs/promises";

const CANONICAL_RULES_PATH = "packages/Awareness-Reasoning/src/reply-policies/canonical-rules.json";
const OVERLAY_RULES_PATH = ".runtime/reply-policies/generated-overlay.json";

/**
 * Initialize or load the canonical rules file.
 */
async function getCanonicalRules(): Promise<ReplyPolicyRule[]> {
  try {
    const content = await readFile(CANONICAL_RULES_PATH, "utf-8");
    return JSON.parse(content) as ReplyPolicyRule[];
  } catch {
    // If canonical file doesn't exist yet, return empty array
    // (It will be created on first manual edit)
    return [];
  }
}

/**
 * Load runtime overlay rules (generated from analyzer).
 */
async function getOverlayRules(): Promise<ReplyPolicyRule[]> {
  try {
    const content = await readFile(OVERLAY_RULES_PATH, "utf-8");
    return JSON.parse(content) as ReplyPolicyRule[];
  } catch {
    // If overlay doesn't exist, no generated rules yet
    return [];
  }
}

/**
 * Save runtime overlay rules to file.
 */
async function saveOverlayRules(rules: ReplyPolicyRule[]): Promise<void> {
  await mkdir(dirname(OVERLAY_RULES_PATH), { recursive: true });
  await writeFile(OVERLAY_RULES_PATH, JSON.stringify(rules, null, 2), "utf-8");
}

/**
 * Add a generated rule to the runtime overlay.
 */
export async function addGeneratedReplyPolicyRule(rule: ReplyPolicyRule): Promise<void> {
  if (rule.source !== "improvement-analyzer") {
    throw new Error("addGeneratedReplyPolicyRule accepts only analyzer-generated rules");
  }

  const overlay = await getOverlayRules();

  // Check for duplicates (same category + condition)
  const exists = overlay.find((r) => r.category === rule.category && r.condition === rule.condition);
  if (!exists) {
    overlay.push(rule);
    await saveOverlayRules(overlay);
  }
}

/**
 * Get the merged view of all active rules (canonical + overlay).
 * Overlay rules win on conflict (same category).
 */
export async function getActiveReplyPolicies(): Promise<ReplyPolicyRule[]> {
  const canonical = await getCanonicalRules();
  const overlay = await getOverlayRules();

  // Merge: overlay wins by category
  const byCategory: Record<string, ReplyPolicyRule> = {};

  for (const rule of canonical) {
    if (rule.enabled) {
      byCategory[rule.category] = rule;
    }
  }

  for (const rule of overlay) {
    if (rule.enabled) {
      byCategory[rule.category] = rule;
    }
  }

  return Object.values(byCategory);
}

/**
 * Find a rule that matches a condition.
 * Used during reply generation to pick a better fallback.
 */
export async function findApplicablePolicy(
  category: string,
  _condition?: string
): Promise<ReplyPolicyRule | null> {
  const policies = await getActiveReplyPolicies();
  return policies.find((p) => p.category === category && p.enabled) || null;
}

/**
 * Get statistics on canonical vs generated rules.
 */
export async function getReplyPolicyStats(): Promise<{
  canonicalCount: number;
  overlayCount: number;
  activeCount: number;
  disabledCount: number;
}> {
  const canonical = await getCanonicalRules();
  const overlay = await getOverlayRules();
  const active = await getActiveReplyPolicies();

  const all = [...canonical, ...overlay];
  const disabled = all.filter((r) => !r.enabled).length;

  return {
    canonicalCount: canonical.length,
    overlayCount: overlay.length,
    activeCount: active.length,
    disabledCount: disabled
  };
}

/**
 * Reset the runtime overlay (discard all generated rules).
 * The canonical rules remain untouched in source control.
 */
export async function resetOverlay(): Promise<void> {
  await saveOverlayRules([]);
}

/**
 * Export all currently active rules (for inspection/export).
 */
export async function exportActiveRules(): Promise<ReplyPolicyRule[]> {
  return getActiveReplyPolicies();
}
