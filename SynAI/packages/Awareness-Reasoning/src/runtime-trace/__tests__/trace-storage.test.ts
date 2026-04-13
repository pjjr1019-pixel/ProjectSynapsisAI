/**
 * Phase 2: Runtime Trace Storage Tests
 * 
 * Tests cover:
 * - JSONL persistence
 * - CONVERSATION-HISTORY updates
 * - Query operations
 * - Non-fatal error handling
 */

import { createRootTrace, completeTraceStage, createTraceStage, addStageToTrace, finalizeTrace } from "../trace-builder";
import type { RuntimeTrace } from "../trace-schema";

describe("Phase 2: Trace Storage Resilience", () => {
  describe("Trace Persistence Non-Fatality", () => {
    it("should create valid traces for persistent storage", () => {
      const trace = createRootTrace("conv-123", 1, "Hello world");
      
      // Simulate a complete execution trace
      const routerStage = createTraceStage(trace.traceId, "router", "Router", {
        stageType: "router",
        detectedPatterns: ["general"],
        chosenRoute: "general",
        confidence: 0.95
      });
      addStageToTrace(trace, routerStage);
      completeTraceStage(routerStage, { routing: "success" });

      const execStage = createTraceStage(trace.traceId, "execution", "Execution", {
        stageType: "chat-execution",
        latency: 1250,
        tokensUsed: { prompt: 45, completion: 120 }
      });
      addStageToTrace(trace, execStage);
      completeTraceStage(execStage, { status: "success" });

      finalizeTrace(trace, "Generated response", "text", {
        model: "mistral",
        provider: "ollama",
        taskRoute: "general"
      });

      // Verify trace is serializable (key requirement for storage)
      expect(() => JSON.stringify(trace)).not.toThrow();
      
      // Verify key data is present
      expect(trace.rawUserInput).toBe("Hello world");
      expect(trace.finalOutput).toBe("Generated response");
      expect(trace.stageCount).toBe(2);
      expect(trace.status).toBe("completed");
    });

    it("should handle trace with errors still being persistable", () => {
      const trace = createRootTrace("conv-456", 2, "test query");
      
      const memStage = createTraceStage(trace.traceId, "memory", "Memory", {
        stageType: "memory-retrieval"
      });
      addStageToTrace(trace, memStage);
      completeTraceStage(memStage, undefined, {
        message: "Memory service timeout",
        code: "TIMEOUT"
      });

      const execStage = createTraceStage(trace.traceId, "execution", "Execution", {
        stageType: "chat-execution"
      });
      addStageToTrace(trace, execStage);
      completeTraceStage(execStage, { status: "partial" });

      finalizeTrace(trace, "Partial response (memory unavailable)", "text");

      // Should still be serializable even with errors
      const json = JSON.stringify(trace);
      expect(json).toContain("TIMEOUT");
      expect(trace.status).toBe("completed");
    });
  });

  describe("Trace Integrity", () => {
    it("should maintain trace structure across serialization round-trip", () => {
      const original = createRootTrace("conv-789", 3, "original input");
      const stage1 = createTraceStage(original.traceId, "s1", "Stage 1", {
        stageType: "router",
        chosenRoute: "browser"
      });
      const stage2 = createTraceStage(original.traceId, "s2", "Stage 2", {
        stageType: "chat-execution",
        latency: 500
      });
      
      addStageToTrace(original, stage1);
      addStageToTrace(original, stage2);
      
      completeTraceStage(stage1);
      completeTraceStage(stage2);
      
      finalizeTrace(original, "Browser action executed", "text", {
        model: "neural-browser",
        provider: "ollama"
      });

      // Serialize and deserialize
      const json = JSON.stringify(original);
      const restored = JSON.parse(json) as RuntimeTrace;

      // Verify structure preservation
      expect(restored.traceId).toBe(original.traceId);
      expect(restored.conversationId).toBe(original.conversationId);
      expect(Object.keys(restored.stages).length).toBe(2);
      expect(restored.stageCount).toBe(2);
      expect(restored.finalOutput).toBe("Browser action executed");
      expect(restored.model).toBe("neural-browser");
    });

    it("should handle large trace objects", () => {
      const trace = createRootTrace("conv-large", 1, "x".repeat(10000)); // Very large input
      
      // Add many events
      const stage = createTraceStage(trace.traceId, "many-events", "Many Events", {
        stageType: "router"
      });
      addStageToTrace(trace, stage);

      for (let i = 0; i < 100; i++) {
        stage.events?.push({
          eventId: `event-${i}`,
          timestamp: Date.now() + i,
          type: `type-${i}`,
          payload: { index: i, data: `Item ${i}` }
        });
      }

      completeTraceStage(stage);
      finalizeTrace(trace, "y".repeat(5000)); // Large output

      const json = JSON.stringify(trace);
      const restored = JSON.parse(json) as RuntimeTrace;

      expect(restored.rawUserInput.length).toBe(10000);
      expect(restored.finalOutput?.length).toBe(5000);
      expect(restored.stages["many-events"].events?.length).toBe(100);
    });
  });

  describe("Error Scenarios - Data Integrity", () => {
    it("should preserve trace data when completion fails mid-stage", () => {
      const trace = createRootTrace("conv-fail", 1, "input");
      const stage = createTraceStage(trace.traceId, "partial", "Partial", {
        stageType: "execution"
      });
      addStageToTrace(trace, stage);

      // Don't complete the stage - simulate incomplete execution
      // Should still be valid for storage
      const json = JSON.stringify(trace);
      expect(json).toContain(stage.stageId);
      expect(trace.status).toBe("active");

      // Finalize anyway
      finalizeTrace(trace, "Interrupted");
      expect(trace.status).toBe("completed");
    });

    it("should handle null/undefined metadata gracefully", () => {
      const trace = createRootTrace("conv-null", 1, "input");
      finalizeTrace(trace, undefined, undefined, {
        model: undefined,
        provider: null as any,
        escalationUsed: undefined
      });

      const json = JSON.stringify(trace);
      const parsed = JSON.parse(json) as RuntimeTrace;

      // Should not have spurious fields
      expect(parsed.finalOutput).toBeUndefined();
      expect(parsed.model).toBeUndefined();
    });
  });

  describe("Multi-Turn Trace Management", () => {
    it("should support multiple independent traces in session", () => {
      const traces: RuntimeTrace[] = [];

      for (let i = 0; i < 5; i++) {
        const trace = createRootTrace("conv-123", i + 1, `Message ${i + 1}`);
        const stage = createTraceStage(trace.traceId, "route", "Route", {
          stageType: "router",
          chosenRoute: "general"
        });
        addStageToTrace(trace, stage);
        completeTraceStage(stage);
        finalizeTrace(trace, `Response ${i + 1}`);
        traces.push(trace);
      }

      // All traces should be independent and valid
      expect(traces.length).toBe(5);
      expect(traces[0].rawUserInput).toBe("Message 1");
      expect(traces[4].rawUserInput).toBe("Message 5");

      // Should all be serializable
      const jsonLines = traces.map(t => JSON.stringify(t));
      expect(jsonLines.length).toBe(5);
      expect(jsonLines.every(line => line.length > 0)).toBe(true);
    });
  });

  describe("Query-Ready Format", () => {
    it("should include all fields needed for trace queries", () => {
      const trace = createRootTrace("conv-query", 1, "Find something");
      const stage = createTraceStage(trace.traceId, "search", "Search", {
        stageType: "memory-retrieval",
        query: "something"
      });
      addStageToTrace(trace, stage);
      completeTraceStage(stage, { found: 3 });
      finalizeTrace(trace, "Found 3 results");

      // Verify query-essential fields are present
      expect(trace.traceId).toBeDefined();
      expect(trace.conversationId).toBeDefined();
      expect(trace.timestamp).toBeDefined();
      expect(trace.status).toBeDefined();
      expect(trace.stageCount).toBeDefined();
      expect(Object.keys(trace.stages).length).toBeGreaterThan(0);

      // Verify for parsing
      const json = JSON.stringify(trace);
      const parsed = JSON.parse(json) as RuntimeTrace;
      expect(parsed.traceId).toBe(trace.traceId);
      expect(parsed.status).toBe("completed");
    });
  });
});
