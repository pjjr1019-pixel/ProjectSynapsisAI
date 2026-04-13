/**
 * Phase 2: Traceable Runtime Logging - Session Manager
 * 
 * Runs in Electron main process to manage active traces and their lifecycle.
 * Provides methods to:
 * - Create root traces at turn start
 * - Finalize and persist completed traces
 * - Query trace stats
 * - Handle errors silently with counters
 */

import type { RuntimeTrace } from "./trace-schema";
import {
  createRootTrace,
  finalizeTrace,
} from "./trace-builder";
import {
  persistTrace,
  updateConversationHistoryWithTrace,
  queryTraces,
  getTracesStats,
} from "./trace-storage";

/**
 * Session-level statistics
 */
export interface TraceSessionStats {
  sessionId: string;
  tracesCreated: number;
  tracesCompleted: number;
  tracesFailed: number;
  persistenceErrors: number;
  parseErrors: number;
  ioErrors: number;
  startTime: number;
  lastActivity: number;
}

/**
 * Singleton trace session manager
 */
class TraceSessionManager {
  private sessionId: string;
  private activeTraces: Map<string, RuntimeTrace> = new Map();
  private stats: TraceSessionStats;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.stats = {
      sessionId: this.sessionId,
      tracesCreated: 0,
      tracesCompleted: 0,
      tracesFailed: 0,
      persistenceErrors: 0,
      parseErrors: 0,
      ioErrors: 0,
      startTime: Date.now(),
      lastActivity: Date.now(),
    };
  }

  /**
   * Initialize session (log startup)
   */
  initialize(): void {
    console.log(`[Trace Session] Initialized session: ${this.sessionId}`);
  }

  /**
   * Create and register a new root trace
   */
  createTrace(
    conversationId: string,
    turnId: number,
    rawUserInput: string,
    userId?: string
  ): RuntimeTrace {
    const trace = createRootTrace(conversationId, turnId, rawUserInput, userId);
    const key = this.getTraceKey(conversationId, turnId);
    this.activeTraces.set(key, trace);

    this.stats.tracesCreated++;
    this.stats.lastActivity = Date.now();

    console.log(
      `[Trace Session] Created trace ${trace.traceId} for conversation ${conversationId}, turn ${turnId}`
    );

    return trace;
  }

  /**
   * Retrieve an active trace
   */
  getTrace(conversationId: string, turnId: number): RuntimeTrace | undefined {
    const key = this.getTraceKey(conversationId, turnId);
    return this.activeTraces.get(key);
  }

  /**
   * Finalize a trace and persist it
   * Non-blocking: errors are tracked but don't throw
   */
  async finalizeAndPersist(
    conversationId: string,
    turnId: number,
    finalOutput?: string,
    finalOutputType?: string,
    metadata?: {
      model?: string;
      provider?: string;
      escalationUsed?: boolean;
      taskRoute?: string;
      relatedImprovementEventIds?: string[];
    }
  ): Promise<{
    success: boolean;
    traceId?: string;
    errors?: string[];
  }> {
    const key = this.getTraceKey(conversationId, turnId);
    const trace = this.activeTraces.get(key);

    if (!trace) {
      return {
        success: false,
        errors: [`No active trace found for ${key}`],
      };
    }

    const errors: string[] = [];

    try {
      // Finalize trace
      finalizeTrace(trace, finalOutput, finalOutputType, metadata);
      this.stats.tracesCompleted++;

      console.log(
        `[Trace Session] Finalized trace ${trace.traceId} (${Object.keys(trace.stages).length} stages)`
      );

      // Persist to file (non-blocking)
      const persistError = await persistTrace(trace);
      if (persistError) {
        errors.push("Failed to persist trace to runtime-traces.jsonl");
        this.stats.persistenceErrors++;
      }

      // Update conversation history (non-blocking)
      const historyError = await updateConversationHistoryWithTrace(
        conversationId,
        turnId,
        trace
      );
      if (historyError) {
        errors.push("Failed to update CONVERSATION-HISTORY.json");
        this.stats.ioErrors++;
      }

      // Clean up active trace
      this.activeTraces.delete(key);

      this.stats.lastActivity = Date.now();

      return {
        success: errors.length === 0,
        traceId: trace.traceId,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Exception during finalization: ${message}`);
      this.stats.parseErrors++;

      console.error("[Trace Session] Error finalizing trace:", err);

      return {
        success: false,
        traceId: trace.traceId,
        errors,
      };
    }
  }

  /**
   * Query completed traces
   */
  async queryTraces(
    conversationId?: string,
    limit?: number
  ): Promise<{ traces: RuntimeTrace[]; error?: string }> {
    return queryTraces(conversationId, limit);
  }

  /**
   * Get session statistics
   */
  async getStats(): Promise<TraceSessionStats & { storedTraces: any }> {
    const storedStats = await getTracesStats();
    return {
      ...this.stats,
      storedTraces: storedStats,
    };
  }

  /**
   * Get all active traces (for debugging)
   */
  getAllActiveTraces(): RuntimeTrace[] {
    return Array.from(this.activeTraces.values());
  }

  /**
   * Force finalize all pending traces (for shutdown)
   */
  async finalizeAllPending(): Promise<number> {
    let count = 0;
    for (const [key, trace] of Array.from(this.activeTraces.entries())) {
      try {
        finalizeTrace(trace);
        await persistTrace(trace);
        this.activeTraces.delete(key);
        count++;
      } catch (err) {
        console.error(`[Trace Session] Failed to finalize pending trace ${key}:`, err);
        this.stats.persistenceErrors++;
      }
    }
    return count;
  }

  /**
   * Clear all active traces (dangerous, for testing/reset)
   */
  clearAll(): void {
    this.activeTraces.clear();
    console.log("[Trace Session] Cleared all active traces");
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Internal helper: generate unique key for trace
   */
  private getTraceKey(conversationId: string, turnId: number): string {
    return `${conversationId}:${turnId}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const traceSessionManager = new TraceSessionManager();

/**
 * Initialize trace session on app startup
 */
export function initializeTraceSession(): void {
  traceSessionManager.initialize();
}

/**
 * Finalize all pending traces on app shutdown
 */
export async function finalizeTraceSessionOnShutdown(): Promise<void> {
  const count = await traceSessionManager.finalizeAllPending();
  console.log(`[Trace Session] Finalized ${count} pending traces on shutdown`);
}
