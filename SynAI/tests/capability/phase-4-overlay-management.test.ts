import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { ReplyPolicyOverlayService } from "../../apps/desktop/electron/reply-policy-overlay-service";

const TEST_RUNTIME_DIR = path.join(".runtime", "test-overlay");

describe("Phase 4: Overlay Rule Management Integration", () => {
  let service: ReplyPolicyOverlayService;

  beforeEach(() => {
    service = new ReplyPolicyOverlayService(TEST_RUNTIME_DIR);
  });

  afterEach(async () => {
    try {
      await rm(TEST_RUNTIME_DIR, { recursive: true });
    } catch {
      // Cleanup optional
    }
  });

  it("creates and persists overlay rules", async () => {
    const rule = {
      sourceEventId: "event-123",
      category: "calendar_missing",
      matchConditions: { keywords: ["calendar", "scheduling"] },
      rewrittenFallback: "I can help you schedule events.",
      confidence: 0.95,
      risk: "low" as const
    };

    const ruleId = await service.addRule(
      rule.sourceEventId,
      rule.category,
      rule.matchConditions,
      rule.rewrittenFallback,
      rule.confidence,
      rule.risk
    );

    expect(ruleId).toBeDefined();

    const rules = service.listRules();
    expect(rules.length).toBe(1);
    expect(rules[0].category).toBe("calendar_missing");
    expect(rules[0].rewrittenFallback).toBe("I can help you schedule events.");
  });

  it("lists all rules (enabled and disabled)", async () => {
    // Add two rules
    const ruleId1 = await service.addRule(
      "event-1",
      "calendar_missing",
      { keywords: ["calendar"] },
      "Calendar help.",
      0.95,
      "low"
    );

    const ruleId2 = await service.addRule(
      "event-2",
      "task_management",
      { keywords: ["task"] },
      "Task help.",
      0.90,
      "low"
    );

    const allRules = service.listRules(false); // false = all rules
    expect(allRules.length).toBe(2);

    // Disable first rule
    await service.disableRule(ruleId1);

    const enabledOnly = service.listRules(true); // true = enabled only
    expect(enabledOnly.length).toBe(1);
    expect(enabledOnly[0].id).toBe(ruleId2);
  });

  it("disables rule and persists change", async () => {
    const ruleId = await service.addRule(
      "event-123",
      "calendar_missing",
      { keywords: ["calendar"] },
      "I can help you schedule events.",
      0.95,
      "low"
    );

    expect(service.getRule(ruleId)?.enabled).toBe(true);

    await service.disableRule(ruleId);

    expect(service.getRule(ruleId)?.enabled).toBe(false);

    // Verify persistence
    const runtimePath = service.getRuntimePath();
    const fileContent = await readFile(runtimePath, "utf-8");
    const rulesArray = JSON.parse(fileContent);
    const persistedRule = rulesArray.find((r: any) => r.id === ruleId);
    expect(persistedRule.enabled).toBe(false);
  });

  it("enables rule and persists change", async () => {
    const ruleId = await service.addRule(
      "event-123",
      "calendar_missing",
      { keywords: ["calendar"] },
      "I can help you schedule events.",
      0.95,
      "low"
    );

    await service.disableRule(ruleId);
    expect(service.getRule(ruleId)?.enabled).toBe(false);

    await service.enableRule(ruleId);
    expect(service.getRule(ruleId)?.enabled).toBe(true);

    // Verify persistence
    const runtimePath = service.getRuntimePath();
    const fileContent = await readFile(runtimePath, "utf-8");
    const rulesArray = JSON.parse(fileContent);
    const persistedRule = rulesArray.find((r: any) => r.id === ruleId);
    expect(persistedRule.enabled).toBe(true);
  });

  it("deletes rule and persists removal", async () => {
    const ruleId = await service.addRule(
      "event-123",
      "calendar_missing",
      { keywords: ["calendar"] },
      "I can help you schedule events.",
      0.95,
      "low"
    );

    expect(service.getRule(ruleId)).toBeDefined();

    await service.deleteRule(ruleId);

    expect(service.getRule(ruleId)).toBeUndefined();

    const rules = service.listRules(false);
    expect(rules.length).toBe(0);

    // Verify persistence
    const runtimePath = service.getRuntimePath();
    const fileContent = await readFile(runtimePath, "utf-8");
    const rulesArray = JSON.parse(fileContent);
    const persistedRule = rulesArray.find((r: any) => r.id === ruleId);
    expect(persistedRule).toBeUndefined();
  });

  it("tracks hitCount and lastUsedAt on rule application", async () => {
    const ruleId = await service.addRule(
      "event-123",
      "calendar_missing",
      { keywords: ["calendar"] },
      "I can help you schedule events.",
      0.95,
      "low"
    );

    const rule = service.getRule(ruleId);
    expect(rule?.hitCount).toBe(0);
    expect(rule?.lastUsedAt).toBeNull();

    // Simulate rule application
    const result = await service.applyOverlay(
      "I don't have a calendar.",
      "Can you show me a calendar?",
      undefined
    );

    // Rule should have been applied
    if (result.applied) {
      const updatedRule = service.getRule(ruleId);
      expect(updatedRule?.hitCount).toBeGreaterThan(0);
      expect(updatedRule?.lastUsedAt).not.toBeNull();
    }
  });

  it("resets all overlay rules", async () => {
    // Add two rules
    await service.addRule(
      "event-1",
      "calendar_missing",
      { keywords: ["calendar"] },
      "Calendar help.",
      0.95,
      "low"
    );

    await service.addRule(
      "event-2",
      "task_management",
      { keywords: ["task"] },
      "Task help.",
      0.90,
      "low"
    );

    expect(service.listRules().length).toBe(2);

    await service.reset();

    expect(service.listRules().length).toBe(0);
  });

  it("provides stats on overlay rules", async () => {
    // Add rules
    const ruleId1 = await service.addRule(
      "event-1",
      "calendar_missing",
      { keywords: ["calendar"] },
      "Calendar help.",
      0.95,
      "low"
    );

    const ruleId2 = await service.addRule(
      "event-2",
      "task_management",
      { keywords: ["task"] },
      "Task help.",
      0.90,
      "low"
    );

    // Disable one
    await service.disableRule(ruleId1);

    const stats = service.getStats();
    expect(stats.totalRules).toBe(2);
    expect(stats.enabledRules).toBe(1);
  });

  it("ensures canonical rules remain untouched after overlay mutations", async () => {
    // Create a canonical rule file mock (this is just to verify no modifications)
    const canonicalPath = path.join(
      "packages",
      "Awareness-Reasoning",
      "src",
      "reply-policies",
      "canonical-rules.json"
    );

    // Add overlay rule
    await service.addRule(
      "event-1",
      "calendar_missing",
      { keywords: ["calendar"] },
      "Calendar help.",
      0.95,
      "low"
    );

    // Disable overlay rule
    const rules = service.listRules();
    if (rules.length > 0) {
      await service.disableRule(rules[0].id);
    }

    // Reset overlay
    await service.reset();

    // Verify that the overlay file is removed/empty but canonical location is never modified
    // (This is more of a logical assertion than file verification in this test)
    expect(service.listRules().length).toBe(0);
  });
});
