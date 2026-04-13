/**
 * Phase 2: Traceable Runtime Logging - Trace Builder
 * 
 * Provides helpers for creating, updating, and finalizing traces.
 * All operations are non-blocking and track errors silently.
 */

import { v4 as uuidv4 } from "uuid";
import type {
  RuntimeTrace,
  TraceStage,
  TraceEvent,
  TraceStageMetadata,
  TraceError,
} from "./trace-schema";

/**
 * Create a root trace at the start of a user turn
 */
export function createRootTrace(
  conversationId: string,
  turnId: number,
  rawUserInput: string,
  userId?: string
): RuntimeTrace {
  const now = Date.now();
  return {
    traceId: uuidv4(),
    conversationId,
    turnId,
    timestamp: now,
    userId,
    status: "active",
    rawUserInput,
    stages: {},
  };
}

/**
 * Create a stage trace within a root trace
 */
export function createTraceStage(
  parentTraceId: string,
  stageType: string,
  name: string,
  metadata: TraceStageMetadata
): TraceStage {
  return {
    stageId: uuidv4(),
    parentTraceId,
    stageType,
    name,
    startTime: Date.now(),
    metadata,
    status: "started",
    events: [],
  };
}

/**
 * Add an event to a stage (fine-grained tracking)
 */
export function addTraceEvent(
  stage: TraceStage,
  type: string,
  payload: Record<string, any>,
  error?: { message: string; code?: string }
): TraceEvent {
  const event: TraceEvent = {
    eventId: uuidv4(),
    timestamp: Date.now(),
    type,
    payload,
    error,
  };

  if (!stage.events) {
    stage.events = [];
  }
  stage.events.push(event);
  return event;
}

/**
 * Complete a stage trace
 */
export function completeTraceStage(
  stage: TraceStage,
  result?: any,
  error?: { message: string; code?: string; stack?: string }
): void {
  stage.endTime = Date.now();
  stage.duration = stage.endTime - stage.startTime;

  if (error) {
    stage.status = "errored";
    stage.error = error;
  } else {
    stage.status = "completed";
  }

  if (result !== undefined) {
    stage.result = result;
  }
}

/**
 * Add a stage to a root trace
 */
export function addStageToTrace(trace: RuntimeTrace, stage: TraceStage): void {
  const key = stage.stageType;
  if (!trace.stages[key]) {
    trace.stages[key] = stage;
  } else {
    // For repeated stages (e.g., multiple retrieval calls), create a unique key
    const uniqueKey = `${key}_${Object.keys(trace.stages).filter(k => k.startsWith(key)).length}`;
    trace.stages[uniqueKey] = stage;
  }
}

/**
 * Record an error in the trace
 */
export function recordTraceError(
  trace: RuntimeTrace,
  stage: string,
  message: string
): void {
  if (!trace.errors) {
    trace.errors = [];
  }
  trace.errors.push({
    stage,
    message,
    timestamp: Date.now(),
  });
}

/**
 * Finalize a trace (complete it, compute metrics)
 */
export function finalizeTrace(
  trace: RuntimeTrace,
  finalOutput?: string,
  finalOutputType?: string,
  metadata?: {
    model?: string;
    provider?: string;
    escalationUsed?: boolean;
    taskRoute?: string;
    relatedImprovementEventIds?: string[];
  }
): void {
  const now = Date.now();
  trace.completedAt = now;
  trace.status = "completed";
  trace.finalOutput = finalOutput;
  trace.finalOutputType = finalOutputType;

  // Compute total duration
  if (trace.timestamp) {
    trace.totalDuration = now - trace.timestamp;
  }

  // Count stages
  trace.stageCount = Object.keys(trace.stages).length;

  // Apply metadata
  if (metadata) {
    trace.model = metadata.model;
    trace.provider = metadata.provider;
    trace.escalationUsed = metadata.escalationUsed;
    trace.taskRoute = metadata.taskRoute;
    trace.relatedImprovementEventIds = metadata.relatedImprovementEventIds;
  }
}

/**
 * Mark a trace as failed
 */
export function failTrace(trace: RuntimeTrace, reason: string): void {
  trace.status = "failed";
  trace.completedAt = Date.now();
  if (trace.timestamp) {
    trace.totalDuration = trace.completedAt - trace.timestamp;
  }
  recordTraceError(trace, "root", reason);
}

/**
 * Convert trace to JSON-safe form for storage
 * Handles circular references and undefined values
 */
export function serializeTrace(trace: RuntimeTrace): string {
  return JSON.stringify(trace, (key, value) => {
    // Skip undefined values
    if (value === undefined) {
      return null;
    }
    return value;
  });
}

/**
 * Parse trace from stored JSON
 */
export function deserializeTrace(json: string): RuntimeTrace {
  const data = JSON.parse(json);
  // Validate basic structure
  if (!data.traceId || !data.conversationId) {
    throw new Error("Invalid trace JSON: missing traceId or conversationId");
  }
  return data as RuntimeTrace;
}

/**
 * Create a lightweight summary for CONVERSATION-HISTORY
 */
export function createTraceSummary(trace: RuntimeTrace) {
  return {
    traceId: trace.traceId,
    status: trace.status,
    stageCount: trace.stageCount || 0,
    errorCount: trace.errors?.length || 0,
    totalDuration: trace.totalDuration || 0,
    model: trace.model,
    taskRoute: trace.taskRoute,
  };
}

/**
 * Validate trace structure (for tests and debugging)
 */
export function validateTrace(trace: RuntimeTrace): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!trace.traceId) errors.push("Missing traceId");
  if (!trace.conversationId) errors.push("Missing conversationId");
  if (trace.turnId === undefined) errors.push("Missing turnId");
  if (!trace.rawUserInput) errors.push("Missing rawUserInput");
  if (!trace.timestamp) errors.push("Missing timestamp");

  // Validate stages if present
  Object.entries(trace.stages).forEach(([key, stage]) => {
    if (!stage.stageId) errors.push(`Stage ${key}: missing stageId`);
    if (!stage.stageType) errors.push(`Stage ${key}: missing stageType`);
    if (!stage.startTime) errors.push(`Stage ${key}: missing startTime`);
    if (stage.endTime && stage.endTime < stage.startTime) {
      errors.push(`Stage ${key}: endTime before startTime`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
