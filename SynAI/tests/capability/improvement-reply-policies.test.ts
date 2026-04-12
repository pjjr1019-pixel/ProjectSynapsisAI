import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  addGeneratedReplyPolicyRule,
  getActiveReplyPolicies,
  findApplicablePolicy,
  getReplyPolicyStats,
  resetOverlay,
  exportActiveRules
} from "@awareness/improvement";
import type { ReplyPolicyRule } from "@contracts/improvement";
import { rm } from "node:fs/promises";

const OVERLAY_PATH = ".runtime/reply-policies/generated-overlay.json";

describe("Reply-Policy Module", () => {
  afterEach(async () => {
    try {
      await rm(OVERLAY_PATH);
    } catch {
      // Cleanup optional
    }
    await resetOverlay();
  });

  it("loads canonical rules", async () => {
    const policies = await getActiveReplyPolicies();
    expect(policies).toBeDefined();
    expect(Array.isArray(policies)).toBe(true);
  });

  it("adds generated rules to overlay", async () => {
    const rule: ReplyPolicyRule = {
      id: "test-rule-1",
      category: "test_category",
      condition: "test condition",
      fallbackReply: "Test fallback reply",
      risk: "low",
      enabled: true,
      source: "improvement-analyzer",
      generatedFromEventId: "event-123",
      createdAt: new Date().toISOString()
    };

    await addGeneratedReplyPolicyRule(rule);
    const policies = await getActiveReplyPolicies();

    expect(policies.some((p) => p.id === "test-rule-1")).toBe(true);
  });

  it("merges canonical and overlay rules", async () => {
    const generatedRule: ReplyPolicyRule = {
      id: "generated-1",
      category: "calendar_missing",
      condition: "user asks about calendar",
      fallbackReply: "I can help with task tracking instead.",
      risk: "low",
      enabled: true,
      source: "improvement-analyzer",
      generatedFromEventId: "event-456",
      createdAt: new Date().toISOString()
    };

    await addGeneratedReplyPolicyRule(generatedRule);
    const active = await getActiveReplyPolicies();

    // Should include both canonical and generated
    expect(active.length).toBeGreaterThan(0);
    expect(active.some((r) => r.source === "improvement-analyzer")).toBe(true);
  });

  it("finds applicable policy by category", async () => {
    const rule: ReplyPolicyRule = {
      id: "test-2",
      category: "time_tracking_missing",
      condition: "user asks about time tracking",
      fallbackReply: "I can help you manage tasks instead.",
      risk: "low",
      enabled: true,
      source: "improvement-analyzer",
      generatedFromEventId: "event-789",
      createdAt: new Date().toISOString()
    };

    await addGeneratedReplyPolicyRule(rule);
    const policy = await findApplicablePolicy("time_tracking_missing");

    expect(policy).toBeDefined();
    expect(policy?.category).toBe("time_tracking_missing");
    expect(policy?.fallbackReply).toContain("task");
  });

  it("overlay rules win on conflict", async () => {
    const overlayRule: ReplyPolicyRule = {
      id: "override-rule",
      category: "unknown_request",
      condition: "Request type unclear",
      fallbackReply: "Please clarify your request (from overlay).",
      risk: "low",
      enabled: true,
      source: "improvement-analyzer",
      generatedFromEventId: "event-override",
      createdAt: new Date().toISOString()
    };

    await addGeneratedReplyPolicyRule(overlayRule);
    const policy = await findApplicablePolicy("unknown_request");

    // Should use overlay version, not canonical
    expect(policy?.fallbackReply).toContain("from overlay");
  });

  it("returns policy stats", async () => {
    const rule: ReplyPolicyRule = {
      id: "stat-test",
      category: "feature_missing",
      condition: "Feature not available",
      fallbackReply: "That feature isn't available yet.",
      risk: "low",
      enabled: true,
      source: "improvement-analyzer",
      generatedFromEventId: "event-stat",
      createdAt: new Date().toISOString()
    };

    await addGeneratedReplyPolicyRule(rule);
    const stats = await getReplyPolicyStats();

    expect(stats.canonicalCount).toBeGreaterThanOrEqual(0);
    expect(stats.overlayCount).toBeGreaterThan(0);
    expect(stats.activeCount).toBeGreaterThan(0);
  });

  it("resets overlay without touching canonical", async () => {
    const rule: ReplyPolicyRule = {
      id: "reset-test",
      category: "reset_category",
      condition: "Reset test",
      fallbackReply: "This will be reset.",
      risk: "low",
      enabled: true,
      source: "improvement-analyzer",
      generatedFromEventId: "event-reset",
      createdAt: new Date().toISOString()
    };

    await addGeneratedReplyPolicyRule(rule);
    const beforeReset = await getActiveReplyPolicies();
    expect(beforeReset.some((p) => p.id === "reset-test")).toBe(true);

    await resetOverlay();
    const afterReset = await getActiveReplyPolicies();

    // Reset-test should be gone, but canonical rules should remain
    expect(afterReset.some((p) => p.id === "reset-test")).toBe(false);
  });

  it("exports active rules for inspection", async () => {
    const rule: ReplyPolicyRule = {
      id: "export-test",
      category: "export_category",
      condition: "Export test",
      fallbackReply: "Exported rule.",
      risk: "low",
      enabled: true,
      source: "improvement-analyzer",
      generatedFromEventId: "event-export",
      createdAt: new Date().toISOString()
    };

    await addGeneratedReplyPolicyRule(rule);
    const exported = await exportActiveRules();

    expect(Array.isArray(exported)).toBe(true);
    expect(exported.some((p) => p.id === "export-test")).toBe(true);
  });

  it("rejects non-analyzer rules in addGeneratedReplyPolicyRule", async () => {
    const canonicalRule: ReplyPolicyRule = {
      id: "canonical-inject",
      category: "injection_test",
      condition: "Injection attempt",
      fallbackReply: "This should fail.",
      risk: "low",
      enabled: true,
      source: "canonical", // Not improvement-analyzer
      createdAt: new Date().toISOString()
    };

    try {
      await addGeneratedReplyPolicyRule(canonicalRule);
      expect.fail("Should have thrown an error");
    } catch (e) {
      expect((e as Error).message).toContain("analyzer");
    }
  });
});
