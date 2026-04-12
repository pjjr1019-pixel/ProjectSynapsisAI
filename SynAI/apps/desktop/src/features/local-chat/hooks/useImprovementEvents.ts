/**
 * Hook for accessing improvement events through the IPC bridge
 * 
 * Provides:
 * - Querying recent events
 * - Subscribing to new events
 * - Updating event status
 * - Checking/changing mode
 */

import { useCallback, useEffect, useState } from "react";
import type { ImprovementEvent } from "@contracts/improvement";

interface UseImprovementEventsOptions {
  limit?: number;
  autoRefreshMs?: number;
  enabled?: boolean;
}

export function useImprovementEvents(options: UseImprovementEventsOptions = {}) {
  const {
    limit = 10,
    autoRefreshMs = 5000,
    enabled = true
  } = options;

  const [events, setEvents] = useState<ImprovementEvent[]>([]);
  const [mode, setMode] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const bridge = (window as any).synai;

  /**
   * Query recent events from the main process.
   */
  const refresh = useCallback(async () => {
    if (!enabled || !bridge?.listImprovementEvents) {
      return;
    }

    setLoading(true);
    try {
      const results = await bridge.listImprovementEvents({ limit, status: "detected" });
      setEvents(results || []);
      setError(null);
    } catch (err) {
      console.error("[useImprovementEvents] Failed to load events:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [bridge, limit, enabled]);

  /**
   * Get a single event by ID.
   */
  const getEvent = useCallback(
    async (eventId: string): Promise<ImprovementEvent | null> => {
      if (!bridge?.getImprovementEvent) {
        return null;
      }

      try {
        return await bridge.getImprovementEvent(eventId);
      } catch (err) {
        console.error("[useImprovementEvents] Failed to get event:", err);
        return null;
      }
    },
    [bridge]
  );

  /**
   * Update event status (dismiss, approve, etc.).
   */
  const updateStatus = useCallback(
    async (eventId: string, status: string): Promise<void> => {
      if (!bridge?.updateImprovementEventStatus) {
        return;
      }

      try {
        await bridge.updateImprovementEventStatus(eventId, status);
        // Refresh to get updated state
        await refresh();
      } catch (err) {
        console.error("[useImprovementEvents] Failed to update status:", err);
      }
    },
    [bridge, refresh]
  );

  /**
   * Get current mode (enabled/disabled).
   */
  const getMode = useCallback(async () => {
    if (!bridge?.getImprovementMode) {
      return;
    }

    try {
      const isEnabled = await bridge.getImprovementMode();
      setMode(isEnabled);
    } catch (err) {
      console.error("[useImprovementEvents] Failed to get mode:", err);
    }
  }, [bridge]);

  /**
   * Set mode (enable/disable).
   */
  const setModeEnabled = useCallback(
    async (isEnabled: boolean): Promise<void> => {
      if (!bridge?.setImprovementMode) {
        return;
      }

      try {
        await bridge.setImprovementMode(isEnabled);
        setMode(isEnabled);
      } catch (err) {
        console.error("[useImprovementEvents] Failed to set mode:", err);
      }
    },
    [bridge]
  );

  /**
   * Auto-refresh on mount and when enabled changes.
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Initial load
    void refresh();
    void getMode();

    // Set up polling
    const interval = setInterval(() => {
      void refresh();
    }, autoRefreshMs);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, refresh, getMode, autoRefreshMs]);

  /**
   * Subscribe to new events.
   */
  useEffect(() => {
    if (!enabled || !bridge?.subscribeImprovementEvents) {
      return;
    }

    const unsubscribe = bridge.subscribeImprovementEvents((event: ImprovementEvent) => {
      setEvents((prev) => {
        // Add new event if not already present
        if (!prev.some((e) => e.id === event.id)) {
          return [event, ...prev].slice(0, limit);
        }
        return prev;
      });
    });

    return () => {
      unsubscribe?.();
    };
  }, [enabled, bridge, limit]);

  return {
    events,
    mode,
    loading,
    error,
    refresh,
    getEvent,
    updateStatus,
    getMode,
    setModeEnabled
  };
}
