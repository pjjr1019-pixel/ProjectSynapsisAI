/**
 * Phase 3 Reply Policy Overlay Service
 * 
 * Main-process service for managing overlay rules that rewrite weak fallback replies.
 * Rules persist to .runtime/improvement/reply-policies/overlay.json at runtime.
 * 
 * Lifecycle:
 * 1. Planner creates rules for low-risk weak fallback cases (async, background)
 * 2. Rules stored in memory + persisted to disk
 * 3. Before chat message persistence, overlay consumption checks & applies matching rules
 * 4. Adapted replies recorded for analytics
 * 
 * Boundaries:
 * - Main process ONLY: owns all file I/O and persistence
 * - Renderer: can inspect rules & disable/reset via typed IPC
 * - No renderer file access, no canonical file modifications
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { app } from "electron";

export interface ReplyPolicyRule {
  id: string;
  sourceEventId: string;
  category: string;                    // e.g., "weak_reply", "calendar_missing"
  matchConditions: {
    keywords?: string[];               // weak fallback keyword patterns
    categoryPattern?: string;           // regex pattern for event category
  };
  rewrittenFallback: string;           // better reply to use instead
  enabled: boolean;
  fingerprint: string;                 // dedup hash: hash(sourceEventId + category + rewrittenFallback)
  confidence: number;                  // [0-1] rule applicability
  risk: "low" | "medium" | "high";
  hitCount: number;                    // times this rule was applied
  lastUsedAt: string | null;           // ISO timestamp
  createdAt: string;                   // ISO timestamp
  updatedAt: string;                   // ISO timestamp
}

export interface OverlayApplyResult {
  ruleId: string | null;
  originalReply: string;
  adaptedReply: string | null;
  matchedFingerprint: string | null;
  confidence: number;
  applied: boolean;
}

export interface OverlayStats {
  totalRules: number;
  enabledRules: number;
  totalApplied: number;
  uniqueRulesApplied: Set<string>;
}

export class ReplyPolicyOverlayService {
  private rules: Map<string, ReplyPolicyRule> = new Map();
  private runtimeDir: string;
  private overlayPath: string;
  private weakFallbackPatterns = [
    /i don't (have|support|can)/i,
    /i can't (help|do|access)/i,
    /not (available|implemented|supported)/i,
    /i'm unable to/i,
    /this (feature|capability|function) (is not|isn't|isn't yet)/i,
    /i don't have (access|support) for/i
  ];

  constructor(customRuntimeDir?: string) {
    // Allow test override of runtime directory
    if (customRuntimeDir) {
      this.runtimeDir = customRuntimeDir;
    } else {
      try {
        this.runtimeDir = path.join(app.getPath("userData"), ".runtime", "improvement");
      } catch (err) {
        // Fallback for test environment where app is not available
        const homeDir = process.env.HOME || process.env.USERPROFILE || "/tmp";
        this.runtimeDir = path.join(homeDir, ".synai-runtime", "improvement");
      }
    }
    this.overlayPath = path.join(this.runtimeDir, "reply-policies", "overlay.json");
    this.ensureRuntimeDir();
    this.loadRulesFromDisk();
  }

  /**
   * Ensure runtime directory structure exists
   */
  private ensureRuntimeDir(): void {
    const policyDir = path.dirname(this.overlayPath);
    if (!fs.existsSync(policyDir)) {
      fs.mkdirSync(policyDir, { recursive: true });
    }
  }

  /**
   * Load rules from disk into memory
   */
  private loadRulesFromDisk(): void {
    try {
      if (fs.existsSync(this.overlayPath)) {
        const content = fs.readFileSync(this.overlayPath, "utf-8");
        const rulesArray = JSON.parse(content) as ReplyPolicyRule[];
        this.rules.clear();
        rulesArray.forEach((rule) => {
          this.rules.set(rule.id, rule);
        });
      }
    } catch (error) {
      console.error("[ReplyPolicyOverlayService] Failed to load rules from disk:", error);
      this.rules.clear();
    }
  }

  /**
   * Persist rules to disk
   */
  private async persistRulesToDisk(): Promise<void> {
    try {
      const rulesArray = Array.from(this.rules.values());
      const json = JSON.stringify(rulesArray, null, 2);
      fs.writeFileSync(this.overlayPath, json, "utf-8");
    } catch (error) {
      console.error("[ReplyPolicyOverlayService] Failed to persist rules to disk:", error);
    }
  }

  /**
   * Compute dedup fingerprint for a rule
   */
  private computeFingerprint(sourceEventId: string, category: string, rewrittenFallback: string): string {
    const combined = `${sourceEventId}|${category}|${rewrittenFallback}`;
    return createHash("sha256").update(combined).digest("hex").slice(0, 16);
  }

  /**
   * Add a new rule (or deduplicate if fingerprint exists)
   */
  async addRule(
    sourceEventId: string,
    category: string,
    matchConditions: ReplyPolicyRule["matchConditions"],
    rewrittenFallback: string,
    confidence: number = 0.8,
    risk: "low" | "medium" | "high" = "low"
  ): Promise<string> {
    const fingerprint = this.computeFingerprint(sourceEventId, category, rewrittenFallback);

    // Check if dedup fingerprint already exists
    for (const existingRule of this.rules.values()) {
      if (existingRule.fingerprint === fingerprint && existingRule.enabled) {
        // Rule already exists, just return its ID
        return existingRule.id;
      }
    }

    const newRule: ReplyPolicyRule = {
      id: `rule-${randomUUID().slice(0, 8)}`,
      sourceEventId,
      category,
      matchConditions,
      rewrittenFallback,
      enabled: true,
      fingerprint,
      confidence,
      risk,
      hitCount: 0,
      lastUsedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.rules.set(newRule.id, newRule);
    await this.persistRulesToDisk();

    return newRule.id;
  }

  /**
   * Detect if reply is a weak fallback based on keyword patterns
   */
  private isWeakFallback(reply: string): boolean {
    return this.weakFallbackPatterns.some((pattern) => pattern.test(reply));
  }

  /**
   * Check if a rule's conditions match the user context and weak reply.
   * 
   * For category-specific rules (e.g., calendar_missing, task_management_missing):
   * - User prompt/context must contain the category keywords (determines if rule applies at all)
   * - Assistant reply must be a weak fallback (checked earlier in applyOverlay)
   * - Do NOT require assistant reply to contain category keywords (many weak fallbacks are generic)
   * 
   * For generic rules (weak_reply):
   * - Keywords match in reply only
   */
  private ruleMatches(rule: ReplyPolicyRule, reply: string, userPrompt: string): boolean {
    if (!rule.enabled) {
      return false;
    }

    const { matchConditions } = rule;

    // For category-specific rules, check if user prompt mentions the category
    if (rule.category !== "weak_reply") {
      // User prompt MUST mention category keywords for category-specific rules
      if (matchConditions.keywords && matchConditions.keywords.length > 0) {
        // If no user prompt provided, skip context check (backwards compatibility)
        if (!userPrompt) {
          return false;
        }
        const promptContainsCategoryKeyword = matchConditions.keywords.some((keyword) =>
          userPrompt.toLowerCase().includes(keyword.toLowerCase())
        );
        if (!promptContainsCategoryKeyword) {
          return false;  // Category keyword not in prompt → rule doesn't apply
        }
      }
      // Reply weakness check is already done in applyOverlay() before calling this
      return true;
    }

    // For generic weak_reply rules, check keywords in reply
    if (matchConditions.keywords && matchConditions.keywords.length > 0) {
      const anyReplyKeywordMatches = matchConditions.keywords.some((keyword) =>
        reply.toLowerCase().includes(keyword.toLowerCase())
      );
      if (!anyReplyKeywordMatches) {
        return false;
      }
    }

    return true;
  }

  /**
   * Find all matching rules for a context-aware lookup.
   * 
   * Precondition: applyOverlay() already verified reply is a weak fallback.
   * This function narrows down by matching user context (prompt keywords).
   */
  findMatchingRules(reply: string, userPrompt?: string): ReplyPolicyRule[] {
    const matching: ReplyPolicyRule[] = [];

    for (const rule of this.rules.values()) {
      if (this.ruleMatches(rule, reply, userPrompt)) {
        matching.push(rule);
      }
    }

    // Sort by confidence (descending) then hitCount (descending)
    matching.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return b.hitCount - a.hitCount;
    });

    return matching;
  }

  /**
   * Apply overlay consumption with context awareness.
   * 
   * Critical fix (Phase 3 correction):
   * - Requires userPrompt to ensure category-specific rules only fire when user asked about that category
   * - Generic "I don't have X" reply will NOT trigger calendar_missing rule if user asked about weather
   * - Calendar prompt + generic weak fallback WILL trigger calendar_missing rule
   * 
   * Returns the original or adapted reply.
   */
  async applyOverlay(reply: string, userPrompt?: string, sourceEventIdHint?: string): Promise<OverlayApplyResult> {
    const result: OverlayApplyResult = {
      ruleId: null,
      originalReply: reply,
      adaptedReply: null,
      matchedFingerprint: null,
      confidence: 0,
      applied: false
    };

    // Only attempt overlay if reply looks like weak fallback
    if (!this.isWeakFallback(reply)) {
      return result;
    }

    // Find rules matching user context AND weak reply
    const matchingRules = this.findMatchingRules(reply, userPrompt);
    if (matchingRules.length === 0) {
      return result;
    }

    // Use highest-confidence rule
    const selectedRule = matchingRules[0];

    // Update rule stats
    selectedRule.hitCount++;
    selectedRule.lastUsedAt = new Date().toISOString();
    selectedRule.updatedAt = new Date().toISOString();
    this.rules.set(selectedRule.id, selectedRule);
    await this.persistRulesToDisk();

    result.ruleId = selectedRule.id;
    result.adaptedReply = selectedRule.rewrittenFallback;
    result.matchedFingerprint = selectedRule.fingerprint;
    result.confidence = selectedRule.confidence;
    result.applied = true;

    return result;
  }

  /**
   * Disable a rule by ID
   */
  async disableRule(ruleId: string): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      rule.updatedAt = new Date().toISOString();
      this.rules.set(ruleId, rule);
      await this.persistRulesToDisk();
    }
  }

  /**
   * Enable a rule by ID
   */
  async enableRule(ruleId: string): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      rule.updatedAt = new Date().toISOString();
      this.rules.set(ruleId, rule);
      await this.persistRulesToDisk();
    }
  }

  /**
   * Delete a rule permanently
   */
  async deleteRule(ruleId: string): Promise<void> {
    this.rules.delete(ruleId);
    await this.persistRulesToDisk();
  }

  /**
   * Reset all rules
   */
  async reset(): Promise<void> {
    this.rules.clear();
    if (fs.existsSync(this.overlayPath)) {
      fs.unlinkSync(this.overlayPath);
    }
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): ReplyPolicyRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * List all rules
   */
  listRules(enabledOnly: boolean = false): ReplyPolicyRule[] {
    const rules = Array.from(this.rules.values());
    if (enabledOnly) {
      return rules.filter((r) => r.enabled);
    }
    return rules;
  }

  /**
   * Get overlay statistics
   */
  getStats(): OverlayStats {
    const allRules = Array.from(this.rules.values());
    const uniqueRulesApplied = new Set<string>();

    for (const rule of allRules) {
      if (rule.hitCount > 0) {
        uniqueRulesApplied.add(rule.id);
      }
    }

    return {
      totalRules: allRules.length,
      enabledRules: allRules.filter((r) => r.enabled).length,
      totalApplied: allRules.reduce((sum, r) => sum + r.hitCount, 0),
      uniqueRulesApplied
    };
  }

  /**
   * Get runtime overlay file path (for reference/debugging)
   */
  getRuntimePath(): string {
    return this.overlayPath;
  }
}

// Singleton instance
let overlayService: ReplyPolicyOverlayService | null = null;

export function getReplyPolicyOverlayService(): ReplyPolicyOverlayService {
  if (!overlayService) {
    overlayService = new ReplyPolicyOverlayService();
  }
  return overlayService;
}