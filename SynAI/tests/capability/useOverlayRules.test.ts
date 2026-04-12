import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useOverlayRules, type ReplyPolicyRule, type OverlayStats } from "../../apps/desktop/src/features/local-chat/hooks/useOverlayRules";

describe("useOverlayRules Hook", () => {
  let mockBridge: any;

  beforeEach(() => {
    mockBridge = {
      listOverlayRules: vi.fn(),
      getOverlayStats: vi.fn(),
      disableOverlayRule: vi.fn(),
      enableOverlayRule: vi.fn(),
      deleteOverlayRule: vi.fn(),
      resetOverlay: vi.fn()
    };

    (window as any).synai = mockBridge;
  });

  it("initializes with empty rules and null stats", async () => {
    mockBridge.listOverlayRules.mockResolvedValue([]);
    mockBridge.getOverlayStats.mockResolvedValue(null);

    const { result } = renderHook(() => useOverlayRules({ autoRefreshMs: 100 }));

    // Hook auto-polls on mount, so loading starts as true
    // Wait for it to complete initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rules).toEqual([]);
    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("auto-polls rules and stats on mount", async () => {
    const mockRules: ReplyPolicyRule[] = [
      {
        id: "rule-1",
        sourceEventId: "event-1",
        category: "calendar_missing",
        matchConditions: { keywords: ["calendar"] },
        rewrittenFallback: "I can help with calendar tasks.",
        enabled: true,
        fingerprint: "abc123",
        confidence: 0.95,
        risk: "low",
        hitCount: 2,
        lastUsedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    const mockStats: OverlayStats = {
      totalRules: 1,
      enabledRules: 1,
      totalTimesApplied: 2,
      uniqueRulesApplied: 1
    };

    mockBridge.listOverlayRules.mockResolvedValue(mockRules);
    mockBridge.getOverlayStats.mockResolvedValue(mockStats);

    const { result } = renderHook(() => useOverlayRules({ autoRefreshMs: 100, enabled: true }));

    await waitFor(() => {
      expect(result.current.rules.length).toBe(1);
    });

    expect(result.current.rules).toEqual(mockRules);
    expect(result.current.stats).toEqual(mockStats);
    expect(mockBridge.listOverlayRules).toHaveBeenCalled();
    expect(mockBridge.getOverlayStats).toHaveBeenCalled();
  });

  it("handles load error gracefully", async () => {
    const testError = new Error("Bridge unavailable");
    mockBridge.listOverlayRules.mockRejectedValue(testError);
    mockBridge.getOverlayStats.mockRejectedValue(testError);

    const { result } = renderHook(() => useOverlayRules({ autoRefreshMs: 100, enabled: true }));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.rules).toEqual([]);
    expect(result.current.stats).toBeNull();
    expect(result.current.error).toContain("Bridge unavailable");
  });

  it("disables rule and refreshes", async () => {
    const mockRules: ReplyPolicyRule[] = [
      {
        id: "rule-1",
        sourceEventId: "event-1",
        category: "calendar_missing",
        matchConditions: { keywords: ["calendar"] },
        rewrittenFallback: "I can help with calendar tasks.",
        enabled: true,
        fingerprint: "abc123",
        confidence: 0.95,
        risk: "low",
        hitCount: 2,
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    const updatedRules = [{ ...mockRules[0], enabled: false }];

    mockBridge.listOverlayRules.mockResolvedValueOnce(mockRules);
    mockBridge.getOverlayStats.mockResolvedValue({ totalRules: 1, enabledRules: 1, totalTimesApplied: 2, uniqueRulesApplied: 1 });
    mockBridge.disableOverlayRule.mockResolvedValue(undefined);
    mockBridge.listOverlayRules.mockResolvedValueOnce(updatedRules);

    const { result } = renderHook(() => useOverlayRules({ autoRefreshMs: 100, enabled: true }));

    await waitFor(() => {
      expect(result.current.rules.length).toBe(1);
    });

    await act(async () => {
      await result.current.disableRule("rule-1");
    });

    expect(mockBridge.disableOverlayRule).toHaveBeenCalledWith("rule-1");
  });

  it("enables rule and refreshes", async () => {
    const mockRules: ReplyPolicyRule[] = [
      {
        id: "rule-1",
        sourceEventId: "event-1",
        category: "calendar_missing",
        matchConditions: { keywords: ["calendar"] },
        rewrittenFallback: "I can help with calendar tasks.",
        enabled: false,
        fingerprint: "abc123",
        confidence: 0.95,
        risk: "low",
        hitCount: 0,
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    mockBridge.listOverlayRules.mockResolvedValue(mockRules);
    mockBridge.getOverlayStats.mockResolvedValue({ totalRules: 1, enabledRules: 0, totalTimesApplied: 0, uniqueRulesApplied: 0 });
    mockBridge.enableOverlayRule.mockResolvedValue(undefined);

    const { result } = renderHook(() => useOverlayRules({ autoRefreshMs: 100 }));

    await waitFor(() => {
      expect(result.current.rules.length).toBe(1);
    });

    await act(async () => {
      await result.current.enableRule("rule-1");
    });

    expect(mockBridge.enableOverlayRule).toHaveBeenCalledWith("rule-1");
  });

  it("deletes rule and refreshes", async () => {
    const mockRules: ReplyPolicyRule[] = [
      {
        id: "rule-1",
        sourceEventId: "event-1",
        category: "calendar_missing",
        matchConditions: { keywords: ["calendar"] },
        rewrittenFallback: "I can help with calendar tasks.",
        enabled: true,
        fingerprint: "abc123",
        confidence: 0.95,
        risk: "low",
        hitCount: 2,
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    mockBridge.listOverlayRules.mockResolvedValueOnce(mockRules);
    mockBridge.getOverlayStats.mockResolvedValue({ totalRules: 1, enabledRules: 1, totalTimesApplied: 2, uniqueRulesApplied: 1 });
    mockBridge.deleteOverlayRule.mockResolvedValue(undefined);
    mockBridge.listOverlayRules.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useOverlayRules({ autoRefreshMs: 100 }));

    await waitFor(() => {
      expect(result.current.rules.length).toBe(1);
    });

    await act(async () => {
      await result.current.deleteRule("rule-1");
    });

    expect(mockBridge.deleteOverlayRule).toHaveBeenCalledWith("rule-1");
  });

  it("resets all rules and refreshes", async () => {
    const mockRules: ReplyPolicyRule[] = [
      {
        id: "rule-1",
        sourceEventId: "event-1",
        category: "calendar_missing",
        matchConditions: { keywords: ["calendar"] },
        rewrittenFallback: "I can help with calendar tasks.",
        enabled: true,
        fingerprint: "abc123",
        confidence: 0.95,
        risk: "low",
        hitCount: 2,
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    mockBridge.listOverlayRules.mockResolvedValueOnce(mockRules);
    mockBridge.getOverlayStats.mockResolvedValue({ totalRules: 1, enabledRules: 1, totalTimesApplied: 2, uniqueRulesApplied: 1 });
    mockBridge.resetOverlay.mockResolvedValue(undefined);
    mockBridge.listOverlayRules.mockResolvedValueOnce([]);
    mockBridge.getOverlayStats.mockResolvedValue({ totalRules: 0, enabledRules: 0, totalTimesApplied: 0, uniqueRulesApplied: 0 });

    const { result } = renderHook(() => useOverlayRules({ autoRefreshMs: 100 }));

    await waitFor(() => {
      expect(result.current.rules.length).toBe(1);
    });

    await act(async () => {
      await result.current.resetAll();
    });

    expect(mockBridge.resetOverlay).toHaveBeenCalled();
  });

  it("handles disable error gracefully", async () => {
    const mockRules: ReplyPolicyRule[] = [
      {
        id: "rule-1",
        sourceEventId: "event-1",
        category: "calendar_missing",
        matchConditions: { keywords: ["calendar"] },
        rewrittenFallback: "I can help with calendar tasks.",
        enabled: true,
        fingerprint: "abc123",
        confidence: 0.95,
        risk: "low",
        hitCount: 2,
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    mockBridge.listOverlayRules.mockResolvedValue(mockRules);
    mockBridge.getOverlayStats.mockResolvedValue({ totalRules: 1, enabledRules: 1, totalTimesApplied: 2, uniqueRulesApplied: 1 });
    mockBridge.disableOverlayRule.mockRejectedValue(new Error("Failed to disable"));

    const { result } = renderHook(() => useOverlayRules({ autoRefreshMs: 100 }));

    await waitFor(() => {
      expect(result.current.rules.length).toBe(1);
    });

    await act(async () => {
      await result.current.disableRule("rule-1");
    });

    expect(result.current.error).toContain("Failed to disable");
  });
});
