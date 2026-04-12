/**
 * Hook for managing reply-policy overlay rules through the IPC bridge
 *
 * Provides:
 * - Polling overlay rules and stats
 * - Disabling/enabling rules
 * - Deleting rules
 * - Resetting all rules
 */

import { useCallback, useEffect, useState } from "react";

export interface ReplyPolicyRule {
  id: string;
  sourceEventId: string;
  category: string;
  matchConditions: {
    keywords?: string[];
    categoryPattern?: string;
  };
  rewrittenFallback: string;
  enabled: boolean;
  fingerprint: string;
  confidence: number;
  risk: "low" | "medium" | "high";
  hitCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OverlayStats {
  totalRules: number;
  enabledRules: number;
  totalTimesApplied: number;
  uniqueRulesApplied: number;
}

interface UseOverlayRulesOptions {
  autoRefreshMs?: number;
  enabled?: boolean;
}

export function useOverlayRules(options: UseOverlayRulesOptions = {}) {
  const { autoRefreshMs = 10000, enabled = true } = options;

  const [rules, setRules] = useState<ReplyPolicyRule[]>([]);
  const [stats, setStats] = useState<OverlayStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const bridge = (window as any).synai;

  /**
   * Fetch overlay rules and stats from the main process.
   */
  const refresh = useCallback(async () => {
    if (!enabled || !bridge?.listOverlayRules) {
      return;
    }

    setLoading(true);
    try {
      const [rulesResult, statsResult] = await Promise.all([
        bridge.listOverlayRules(false), // false = get all (enabled + disabled)
        bridge.getOverlayStats(),
      ]);

      setRules(rulesResult || []);
      setStats(statsResult || null);
      setError(null);
    } catch (err) {
      console.error("[useOverlayRules] Failed to load rules:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setRules([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [bridge, enabled]);

  /**
   * Disable a rule by ID.
   */
  const disableRule = useCallback(
    async (ruleId: string): Promise<void> => {
      if (!bridge?.disableOverlayRule) {
        return;
      }

      try {
        await bridge.disableOverlayRule(ruleId);
        // Refresh to get updated state
        await refresh();
      } catch (err) {
        console.error("[useOverlayRules] Failed to disable rule:", err);
        setError(err instanceof Error ? err.message : "Failed to disable rule");
      }
    },
    [bridge, refresh]
  );

  /**
   * Enable a rule by ID.
   */
  const enableRule = useCallback(
    async (ruleId: string): Promise<void> => {
      if (!bridge?.enableOverlayRule) {
        return;
      }

      try {
        await bridge.enableOverlayRule(ruleId);
        // Refresh to get updated state
        await refresh();
      } catch (err) {
        console.error("[useOverlayRules] Failed to enable rule:", err);
        setError(err instanceof Error ? err.message : "Failed to enable rule");
      }
    },
    [bridge, refresh]
  );

  /**
   * Delete a rule by ID.
   */
  const deleteRule = useCallback(
    async (ruleId: string): Promise<void> => {
      if (!bridge?.deleteOverlayRule) {
        return;
      }

      try {
        await bridge.deleteOverlayRule(ruleId);
        // Refresh to get updated state
        await refresh();
      } catch (err) {
        console.error("[useOverlayRules] Failed to delete rule:", err);
        setError(err instanceof Error ? err.message : "Failed to delete rule");
      }
    },
    [bridge, refresh]
  );

  /**
   * Reset all overlay rules (destructive operation).
   */
  const resetAll = useCallback(async (): Promise<void> => {
    if (!bridge?.resetOverlay) {
      return;
    }

    try {
      await bridge.resetOverlay();
      // Refresh to get updated state (should be empty)
      await refresh();
    } catch (err) {
      console.error("[useOverlayRules] Failed to reset overlay:", err);
      setError(err instanceof Error ? err.message : "Failed to reset overlay");
    }
  }, [bridge, refresh]);

  /**
   * Auto-refresh on mount and when enabled changes.
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Initial load
    void refresh();

    // Set up polling
    const interval = setInterval(() => {
      void refresh();
    }, autoRefreshMs);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, refresh, autoRefreshMs]);

  return {
    rules,
    stats,
    loading,
    error,
    refresh,
    disableRule,
    enableRule,
    deleteRule,
    resetAll,
  };
}
