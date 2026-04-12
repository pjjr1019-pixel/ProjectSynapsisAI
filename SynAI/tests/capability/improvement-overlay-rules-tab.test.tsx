import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OverlayRulesTab } from "../../apps/desktop/src/features/local-chat/components/improvement/OverlayRulesTab";
import type { ReplyPolicyRule, OverlayStats } from "../../apps/desktop/src/features/local-chat/hooks/useOverlayRules";

describe("OverlayRulesTab Component", () => {
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

  it("renders empty state when no rules exist", async () => {
    mockBridge.listOverlayRules.mockResolvedValue([]);
    mockBridge.getOverlayStats.mockResolvedValue(null);

    render(<OverlayRulesTab />);

    await waitFor(() => {
      expect(screen.getByText("No overlay rules yet")).toBeInTheDocument();
    });
  });

  it("renders loading state", async () => {
    mockBridge.listOverlayRules.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 1000))
    );
    mockBridge.getOverlayStats.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(null), 1000))
    );

    render(<OverlayRulesTab />);

    expect(screen.getByText("Loading overlay rules...")).toBeInTheDocument();
  });

  it("renders error state with retry button", async () => {
    const testError = new Error("Bridge error");
    mockBridge.listOverlayRules.mockRejectedValue(testError);
    mockBridge.getOverlayStats.mockRejectedValue(testError);

    render(<OverlayRulesTab />);

    await waitFor(() => {
      expect(screen.getByText(/Error loading overlay rules/)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
  });

  it("renders rules list with correct properties", async () => {
    const mockRules: ReplyPolicyRule[] = [
      {
        id: "rule-1",
        sourceEventId: "event-1",
        category: "calendar_missing",
        matchConditions: { keywords: ["calendar", "scheduling"] },
        rewrittenFallback: "I can help you schedule events or view your calendar.",
        enabled: true,
        fingerprint: "abc123",
        confidence: 0.95,
        risk: "low",
        hitCount: 3,
        lastUsedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    const mockStats: OverlayStats = {
      totalRules: 1,
      enabledRules: 1,
      totalTimesApplied: 3,
      uniqueRulesApplied: 1
    };

    mockBridge.listOverlayRules.mockResolvedValue(mockRules);
    mockBridge.getOverlayStats.mockResolvedValue(mockStats);

    render(<OverlayRulesTab />);

    await waitFor(() => {
      expect(screen.getByText("calendar_missing")).toBeInTheDocument();
    });

    expect(screen.getByText(/95%/)).toBeInTheDocument();
    expect(screen.getByText(/Applied 3x/)).toBeInTheDocument();
    expect(screen.getByText(/Total rules: 1/)).toBeInTheDocument();
  });

  it("renders stats correctly", async () => {
    const mockRules: ReplyPolicyRule[] = [
      {
        id: "rule-1",
        sourceEventId: "event-1",
        category: "calendar_missing",
        matchConditions: { keywords: ["calendar"] },
        rewrittenFallback: "I can help you schedule events.",
        enabled: true,
        fingerprint: "abc123",
        confidence: 0.95,
        risk: "low",
        hitCount: 5,
        lastUsedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "rule-2",
        sourceEventId: "event-2",
        category: "task_management",
        matchConditions: { keywords: ["task", "todo"] },
        rewrittenFallback: "I can help track tasks.",
        enabled: false,
        fingerprint: "def456",
        confidence: 0.85,
        risk: "medium",
        hitCount: 0,
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    const mockStats: OverlayStats = {
      totalRules: 2,
      enabledRules: 1,
      totalTimesApplied: 5,
      uniqueRulesApplied: 1
    };

    mockBridge.listOverlayRules.mockResolvedValue(mockRules);
    mockBridge.getOverlayStats.mockResolvedValue(mockStats);

    render(<OverlayRulesTab />);

    await waitFor(() => {
      expect(screen.getByText(/Total rules: 2/)).toBeInTheDocument();
      expect(screen.getByText(/Enabled: 1/)).toBeInTheDocument();
      expect(screen.getByText(/Applied: 5x/)).toBeInTheDocument();
    });
  });

  it("opens detail drawer when rule is clicked", async () => {
    const mockRules: ReplyPolicyRule[] = [
      {
        id: "rule-1",
        sourceEventId: "event-1",
        category: "calendar_missing",
        matchConditions: { keywords: ["calendar"] },
        rewrittenFallback: "I can help you schedule events or view your calendar.",
        enabled: true,
        fingerprint: "abc123",
        confidence: 0.95,
        risk: "low",
        hitCount: 3,
        lastUsedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    mockBridge.listOverlayRules.mockResolvedValue(mockRules);
    mockBridge.getOverlayStats.mockResolvedValue({ totalRules: 1, enabledRules: 1, totalTimesApplied: 3, uniqueRulesApplied: 1 });

    render(<OverlayRulesTab />);

    await waitFor(() => {
      expect(screen.getByText("calendar_missing")).toBeInTheDocument();
    });

    const ruleRow = screen.getByText("calendar_missing").closest("div");
    fireEvent.click(ruleRow!);

    await waitFor(() => {
      expect(screen.getByText("Rule Details")).toBeInTheDocument();
      // Also verify the rule details are displayed
      expect(screen.getByText("Rewritten Fallback:")).toBeInTheDocument();
    });
  });

  it("disables rule when toggle is clicked", async () => {
    const mockRules: ReplyPolicyRule[] = [
      {
        id: "rule-1",
        sourceEventId: "event-1",
        category: "calendar_missing",
        matchConditions: { keywords: ["calendar"] },
        rewrittenFallback: "I can help you schedule events or view your calendar.",
        enabled: true,
        fingerprint: "abc123",
        confidence: 0.95,
        risk: "low",
        hitCount: 3,
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    mockBridge.listOverlayRules.mockResolvedValue(mockRules);
    mockBridge.getOverlayStats.mockResolvedValue({ totalRules: 1, enabledRules: 1, totalTimesApplied: 3, uniqueRulesApplied: 1 });
    mockBridge.disableOverlayRule.mockResolvedValue(undefined);

    render(<OverlayRulesTab />);

    await waitFor(() => {
      expect(screen.getByText("calendar_missing")).toBeInTheDocument();
    });

    const toggleButton = screen.getByRole("button", { name: /✓/ });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(mockBridge.disableOverlayRule).toHaveBeenCalledWith("rule-1");
    });
  });

  it("shows confirmation modal for reset all action", async () => {
    const mockRules: ReplyPolicyRule[] = [
      {
        id: "rule-1",
        sourceEventId: "event-1",
        category: "calendar_missing",
        matchConditions: { keywords: ["calendar"] },
        rewrittenFallback: "I can help you schedule events or view your calendar.",
        enabled: true,
        fingerprint: "abc123",
        confidence: 0.95,
        risk: "low",
        hitCount: 3,
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    mockBridge.listOverlayRules.mockResolvedValue(mockRules);
    mockBridge.getOverlayStats.mockResolvedValue({ totalRules: 1, enabledRules: 1, totalTimesApplied: 3, uniqueRulesApplied: 1 });

    render(<OverlayRulesTab />);

    await waitFor(() => {
      expect(screen.getByText("calendar_missing")).toBeInTheDocument();
    });

    const resetButton = screen.getByRole("button", { name: /Clear All Overlay Rules/ });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.getByText(/Delete all overlay rules\?/)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Yes, Delete All/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/ })).toBeInTheDocument();
  });

  it("calls resetOverlay when confirmed", async () => {
    const mockRules: ReplyPolicyRule[] = [
      {
        id: "rule-1",
        sourceEventId: "event-1",
        category: "calendar_missing",
        matchConditions: { keywords: ["calendar"] },
        rewrittenFallback: "I can help you schedule events or view your calendar.",
        enabled: true,
        fingerprint: "abc123",
        confidence: 0.95,
        risk: "low",
        hitCount: 3,
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    mockBridge.listOverlayRules.mockResolvedValueOnce(mockRules);
    mockBridge.getOverlayStats.mockResolvedValue({ totalRules: 1, enabledRules: 1, totalTimesApplied: 3, uniqueRulesApplied: 1 });
    mockBridge.resetOverlay.mockResolvedValue(undefined);
    mockBridge.listOverlayRules.mockResolvedValueOnce([]);
    mockBridge.getOverlayStats.mockResolvedValueOnce({ totalRules: 0, enabledRules: 0, totalTimesApplied: 0, uniqueRulesApplied: 0 });

    render(<OverlayRulesTab />);

    await waitFor(() => {
      expect(screen.getByText("calendar_missing")).toBeInTheDocument();
    });

    const resetButton = screen.getByRole("button", { name: /Clear All Overlay Rules/ });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.getByText(/Delete all overlay rules\?/)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", { name: /Yes, Delete All/ });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockBridge.resetOverlay).toHaveBeenCalled();
    });
  });

  it("disables Clear All button when no rules exist", async () => {
    mockBridge.listOverlayRules.mockResolvedValue([]);
    mockBridge.getOverlayStats.mockResolvedValue(null);

    render(<OverlayRulesTab />);

    await waitFor(() => {
      expect(screen.getByText("No overlay rules yet")).toBeInTheDocument();
    });

    const resetButton = screen.getByRole("button", { name: /Clear All Overlay Rules/ });
    expect(resetButton).toBeDisabled();
  });
});
