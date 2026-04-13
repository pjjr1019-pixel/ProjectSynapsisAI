/**
 * Phase 2: Runtime Trace Tests - Core Infrastructure
 * 
 * Tests cover:
 * - Trace creation and stage management
 * - Serialization/deserialization
 * - Validation
 * - Failure resilience
 */

import {
  createRootTrace,
  createTraceStage,
  completeTraceStage,
  addStageToTrace,
  finalizeTrace,
  recordTraceError,
  serializeTrace,
  deserializeTrace,
  validateTrace,
  createTraceSummary,
  addTraceEvent
} from "../trace-builder";
import type { RuntimeTrace, TraceStage } from "../trace-schema";

describe("Phase 2: Runtime Trace Infrastructure", () => {
  describe("Root Trace Creation", () => {
    it("should create a root trace with required fields", () => {
      const conversationId = "conv-123";
      const turnId = 1;
      const userInput = "What is the weather?";

      const trace = createRootTrace(conversationId, turnId, userInput);

      expect(trace.traceId).toBeDefined();
      expect(trace.traceId.length).toBeGreaterThan(0);
      expect(trace.conversationId).toBe(conversationId);
      expect(trace.turnId).toBe(turnId);
      expect(trace.rawUserInput).toBe(userInput);
      expect(trace.timestamp).toBeGreaterThan(0);
      expect(trace.status).toBe("active");
      expect(Object.keys(trace.stages).length).toBe(0);
    });

    it("should handle optional userId", () => {
      const trace = createRootTrace("conv-456", 2, "test", "user-789");
      expect(trace.userId).toBe("user-789");
    });
  });

  describe("Trace Stage Management", () => {
    it("should create and add a stage to trace", () => {
      const trace = createRootTrace("conv-123", 1, "input");
      const stage = createTraceStage(
        trace.traceId,
        "router",
        "Route Classification",
        {
          stageType: "router",
          rawInput: "input",
          chosenRoute: "general"
        }
      );

      expect(stage.stageId).toBeDefined();
      expect(stage.parentTraceId).toBe(trace.traceId);
      expect(stage.stageType).toBe("router");
      expect(stage.status).toBe("started");
      expect(stage.duration).toBeUndefined();

      addStageToTrace(trace, stage);
      expect(trace.stages["router"]).toBeDefined();
      expect(trace.stages["router"].stageId).toBe(stage.stageId);
    });

    it("should complete a stage with duration", async () => {
      const stage = createTraceStage("parent-id", "execution", "Model Execution", {
        stageType: "chat-execution",
        promptPreview: "Summarize this..."
      });

      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 50));

      completeTraceStage(stage, { tokens: 120 });

      expect(stage.endTime).toBeDefined();
      expect(stage.endTime! >= stage.startTime).toBe(true);
      expect(stage.duration! > 0).toBe(true);
      expect(stage.status).toBe("completed");
      expect(stage.result.tokens).toBe(120);
    });

    it("should handle stage errors", () => {
      const stage = createTraceStage("parent-id", "verification", "Verification", {
        stageType: "verification"
      });

      const error = { message: "Verification failed", code: "VERIFY_FAILED", stack: "..." };
      completeTraceStage(stage, undefined, error);

      expect(stage.status).toBe("errored");
      expect(stage.error?.message).toBe("Verification failed");
    });

    it("should add events within a stage", () => {
      const stage = createTraceStage("parent-id", "memory", "Memory Retrieval", {
        stageType: "memory-retrieval"
      });

      const event1 = addTraceEvent(stage, "pattern-detected", { pattern: "preference" });
      const event2 = addTraceEvent(stage, "item-retrieved", { id: "mem-456", confidence: 0.92 });

      expect(stage.events?.length).toBe(2);
      expect(stage.events?.[0].type).toBe("pattern-detected");
      expect(stage.events?.[1].payload.confidence).toBe(0.92);
    });
  });

  describe("Trace Finalization", () => {
    it("should finalize trace with metadata", () => {
      const trace = createRootTrace("conv-123", 1, "hello");
      const stage = createTraceStage(trace.traceId, "router", "Route", {
        stageType: "router",
        chosenRoute: "general"
      });
      addStageToTrace(trace, stage);

      finalizeTrace(trace, "Response text", "text", {
        model: "mistral",
        provider: "ollama",
        escalationUsed: false,
        taskRoute: "general"
      });

      expect(trace.status).toBe("completed");
      expect(trace.finalOutput).toBe("Response text");
      expect(trace.completedAt).toBeDefined();
      expect(trace.totalDuration! > 0).toBe(true);
      expect(trace.stageCount).toBe(1);
      expect(trace.model).toBe("mistral");
      expect(trace.provider).toBe("ollama");
    });

    it("should record errors in trace", () => {
      const trace = createRootTrace("conv-123", 1, "input");
      recordTraceError(trace, "execution", "Model timeout");
      recordTraceError(trace, "verification", "Failed check");

      expect(trace.errors?.length).toBe(2);
      expect(trace.errors?.[0]).toMatchObject({
        stage: "execution",
        message: "Model timeout"
      });
    });
  });

  describe("Trace Serialization", () => {
    it("should serialize and deserialize trace", () => {
      const trace = createRootTrace("conv-456", 2, "What time is it?", "alice");
      const stage = createTraceStage(trace.traceId, "router", "Route", {
        stageType: "router",
        chosenRoute: "general"
      });
      addStageToTrace(trace, stage);
      completeTraceStage(stage);
      finalizeTrace(trace, "It is 3 PM", "text", { model: "neural" });

      const serialized = serializeTrace(trace);
      expect(serialized.length).toBeGreaterThan(0);

      const deserialized = deserializeTrace(serialized);
      expect(deserialized.traceId).toBe(trace.traceId);
      expect(deserialized.conversationId).toBe("conv-456");
      expect(deserialized.rawUserInput).toBe("What time is it?");
      expect(deserialized.finalOutput).toBe("It is 3 PM");
      expect(deserialized.userId).toBe("alice");
    });

    it("should handle undefined values in serialization", () => {
      const trace = createRootTrace("conv-789", 3, "test");
      completeTraceStage(createTraceStage(trace.traceId, "test", "Test", {
        stageType: "router"
      }));

      const serialized = serializeTrace(trace);
      expect(serialized).not.toContain("undefined");

      const deserialized = deserializeTrace(serialized);
      expect(deserialized.finalOutput).toBeUndefined();
    });
  });

  describe("Trace Validation", () => {
    it("should validate a complete trace", () => {
      const trace = createRootTrace("conv-123", 1, "input");
      const stage = createTraceStage(trace.traceId, "router", "Route", {
        stageType: "router"
      });
      addStageToTrace(trace, stage);
      completeTraceStage(stage);
      finalizeTrace(trace);

      const validation = validateTrace(trace);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it("should detect missing required fields", () => {
      const incomplete = {
        conversationId: "conv-123",
        // Missing other required fields
      } as unknown as RuntimeTrace;

      const validation = validateTrace(incomplete);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(e => e.includes("traceId"))).toBe(true);
    });

    it("should detect invalid stage timestamps", () => {
      const trace = createRootTrace("conv-123", 1, "input");
      const stage = createTraceStage(trace.traceId, "test", "Test", {
        stageType: "router"
      });
      stage.endTime = stage.startTime - 1000; // Invalid: ends before starts
      addStageToTrace(trace, stage);

      const validation = validateTrace(trace);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes("endTime"))).toBe(true);
    });
  });

  describe("Trace Summary", () => {
    it("should create lightweight summary for CONVERSATION-HISTORY", () => {
      const trace = createRootTrace("conv-123", 1, "input");
      const s1 = createTraceStage(trace.traceId, "router", "Router", {
        stageType: "router"
      });
      const s2 = createTraceStage(trace.traceId, "exec", "Exec", {
        stageType: "chat-execution"
      });
      addStageToTrace(trace, s1);
      addStageToTrace(trace, s2);
      recordTraceError(trace, "router", "Error 1");
      finalizeTrace(trace, "Result", "text", { model: "m1" });

      const summary = createTraceSummary(trace);
      expect(summary.traceId).toBe(trace.traceId);
      expect(summary.status).toBe("completed");
      expect(summary.stageCount).toBe(2);
      expect(summary.errorCount).toBe(1);
      expect(summary.totalDuration! > 0).toBe(true);
      expect(summary.model).toBe("m1");
    });
  });

  describe("Edge Cases - Resilience", () => {
    it("should handle multiple stages with same type", () => {
      const trace = createRootTrace("conv-123", 1, "input");
      const retrieval1 = createTraceStage(trace.traceId, "mem", "Mem 1", {
        stageType: "memory-retrieval"
      });
      const retrieval2 = createTraceStage(trace.traceId, "mem", "Mem 2", {
        stageType: "memory-retrieval"
      });

      addStageToTrace(trace, retrieval1);
      addStageToTrace(trace, retrieval2);

      // Should have created unique keys for duplicate types
      const stageKeys = Object.keys(trace.stages);
      expect(stageKeys.length).toBe(2);
    });

    it("should preserve trace even with late metadata updates", () => {
      const trace = createRootTrace("conv-123", 1, "input");
      const stage = createTraceStage(trace.traceId, "test", "Test", {
        stageType: "router"
      });
      addStageToTrace(trace, stage);

      // Finalize
      finalizeTrace(trace, "output", "text");

      // Update metadata after finalization
      trace.model = "updated-model";
      trace.provider = "updated-provider";

      expect(trace.model).toBe("updated-model");
      expect(trace.finalOutput).toBe("output");
    });

    it("should handle empty trace", () => {
      const trace = createRootTrace("conv-123", 1, "");
      finalizeTrace(trace);

      expect(trace.status).toBe("completed");
      expect(trace.stageCount).toBe(0);
      expect(Object.keys(trace.stages).length).toBe(0);
    });
  });
});
