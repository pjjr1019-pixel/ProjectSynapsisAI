/**
 * Phase 2: Traceable Runtime Logging - Trace Storage
 * 
 * Handles persistent storage of completed traces:
 * - Primary: runtime-traces.jsonl (append-only, JSONL format)
 * - Secondary: Updates CONVERSATION-HISTORY.json with light summary
 * 
 * All I/O is non-blocking and errors are silently tracked.
 */

import * as fs from "fs/promises";
import * as path from "path";
import type { RuntimeTrace, ConversationTraceSummary } from "./trace-schema";
import { serializeTrace, createTraceSummary } from "./trace-builder";

const DATA_DIR = path.join(process.cwd(), "data");
const TRACES_FILE = path.join(DATA_DIR, "runtime-traces.jsonl");
const HISTORY_FILE = path.join(DATA_DIR, "CONVERSATION-HISTORY.json");

/**
 * Ensure data directory exists
 */
async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    // Directory already exists or other error - continue
    console.error("[Trace Storage] Warning: Failed to create data directory:", err);
  }
}

/**
 * Append a completed trace to runtime-traces.jsonl
 * Non-blocking, returns error count (0 = success)
 */
export async function persistTrace(trace: RuntimeTrace): Promise<number> {
  try {
    await ensureDataDir();

    // Serialize trace
    const line = serializeTrace(trace);

    // Append to JSONL file
    await fs.appendFile(TRACES_FILE, line + "\n", "utf-8");

    return 0;
  } catch (err) {
    console.error(
      "[Trace Storage] Error persisting trace:",
      err instanceof Error ? err.message : String(err)
    );
    return 1;
  }
}

/**
 * Update CONVERSATION-HISTORY.json with trace summary
 * Reads existing file, finds matching turn, adds trace summary
 */
export async function updateConversationHistoryWithTrace(
  conversationId: string,
  turnId: number,
  trace: RuntimeTrace
): Promise<number> {
  try {
    await ensureDataDir();

    // Read existing history
    let history: any = { conversations: [] };
    try {
      const content = await fs.readFile(HISTORY_FILE, "utf-8");
      history = JSON.parse(content);
    } catch (err) {
      // File doesn't exist yet, start with empty structure
      if (
        err instanceof Error &&
        !err.message.includes("ENOENT")
      ) {
        console.error("[Trace Storage] Warning: Failed to read history:", err);
      }
    }

    // Ensure conversations array exists
    if (!Array.isArray(history.conversations)) {
      history.conversations = [];
    }

    // Find or create conversation
    let conversation = history.conversations.find(
      (c: any) => c.conversationId === conversationId
    );
    if (!conversation) {
      conversation = { conversationId, entries: [] };
      history.conversations.push(conversation);
    }

    // Ensure entries array exists
    if (!Array.isArray(conversation.entries)) {
      conversation.entries = [];
    }

    // Find or create turn entry
    let entry = conversation.entries.find((e: any) => e.turn === turnId);
    if (!entry) {
      entry = { turn: turnId };
      conversation.entries.push(entry);
    }

    // Add trace summary
    entry.trace = createTraceSummary(trace);

    // Write back
    await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");

    return 0;
  } catch (err) {
    console.error(
      "[Trace Storage] Error updating history:",
      err instanceof Error ? err.message : String(err)
    );
    return 1;
  }
}

/**
 * Query completed traces from runtime-traces.jsonl
 * Optionally filter by conversationId
 */
export async function queryTraces(
  conversationId?: string,
  limit?: number
): Promise<{ traces: RuntimeTrace[]; error?: string }> {
  try {
    // Check if file exists
    try {
      await fs.access(TRACES_FILE);
    } catch (err) {
      // File not found, return empty
      return { traces: [] };
    }

    const content = await fs.readFile(TRACES_FILE, "utf-8");
    const lines = content.trim().split("\n").filter(line => line.length > 0);

    let traces: RuntimeTrace[] = [];
    for (const line of lines) {
      try {
        const trace = JSON.parse(line) as RuntimeTrace;
        if (!conversationId || trace.conversationId === conversationId) {
          traces.push(trace);
        }
      } catch (err) {
        // Skip malformed lines
        console.error("[Trace Storage] Warning: Failed to parse trace line:", err);
      }
    }

    // Apply limit if specified
    if (limit && limit > 0) {
      traces = traces.slice(-limit);
    }

    return { traces };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Trace Storage] Error querying traces:", message);
    return {
      traces: [],
      error: message,
    };
  }
}

/**
 * Get summary statistics about stored traces
 */
export async function getTracesStats(): Promise<{
  totalTraces: number;
  completedTraces: number;
  failedTraces: number;
  fileSize: number;
  error?: string;
}> {
  try {
    // Check if file exists
    try {
      await fs.access(TRACES_FILE);
    } catch (err) {
      // File not found
      return {
        totalTraces: 0,
        completedTraces: 0,
        failedTraces: 0,
        fileSize: 0,
      };
    }

    const stats = await fs.stat(TRACES_FILE);
    const content = await fs.readFile(TRACES_FILE, "utf-8");
    const lines = content.trim().split("\n").filter(line => line.length > 0);

    let completedCount = 0;
    let failedCount = 0;

    for (const line of lines) {
      try {
        const trace = JSON.parse(line) as RuntimeTrace;
        if (trace.status === "completed") {
          completedCount++;
        } else if (trace.status === "failed") {
          failedCount++;
        }
      } catch (err) {
        // Skip malformed lines
      }
    }

    return {
      totalTraces: lines.length,
      completedTraces: completedCount,
      failedTraces: failedCount,
      fileSize: stats.size,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Trace Storage] Error getting stats:", message);
    return {
      totalTraces: 0,
      completedTraces: 0,
      failedTraces: 0,
      fileSize: 0,
      error: message,
    };
  }
}

/**
 * Clear old traces (keep last N)
 * Useful for data hygiene
 */
export async function pruneOldTraces(keepCount: number = 1000): Promise<number> {
  try {
    // Check if file exists
    try {
      await fs.access(TRACES_FILE);
    } catch (err) {
      return 0;
    }

    const content = await fs.readFile(TRACES_FILE, "utf-8");
    const lines = content.trim().split("\n").filter(line => line.length > 0);

    if (lines.length <= keepCount) {
      return 0; // Nothing to prune
    }

    const toRemove = lines.length - keepCount;
    const remaining = lines.slice(toRemove).join("\n") + "\n";

    await fs.writeFile(TRACES_FILE, remaining, "utf-8");

    return toRemove;
  } catch (err) {
    console.error(
      "[Trace Storage] Error pruning traces:",
      err instanceof Error ? err.message : String(err)
    );
    return 0;
  }
}

/**
 * Export all traces to a JSON file (for backup or analysis)
 */
export async function exportTraces(outputPath: string): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    const { traces, error } = await queryTraces();

    if (error) {
      return { success: false, count: 0, error };
    }

    await fs.writeFile(outputPath, JSON.stringify(traces, null, 2), "utf-8");

    return {
      success: true,
      count: traces.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      count: 0,
      error: message,
    };
  }
}
