# Phase 2: Runtime Trace Schema Documentation

## Overview

Phase 2 introduces hierarchical, per-turn runtime tracing for the SynAI Electron + React + TypeScript local AI app. Each chat turn from user input to final output is captured in a structured `RuntimeTrace` with nested `TraceStage` events.

**Key Design Principles:**
- Non-fatal: All logging failures are caught and tracked silently  
- Hierarchical: Root trace → nested stages → fine-grained events
- Queryable: Traces persist to JSONL (database-friendly) and CONVERSATION-HISTORY (human-readable)
- IPC-accessible: Renderer can query traces via `queryRuntimeTraces`, `getRuntimeTraceStats` channels

---

## RootTrace: Top-Level Execution Record

Each user message that triggers a response generates one `RuntimeTrace` that captures the complete request-response cycle.

### Structure

```typescript
{
  // Identity
  traceId: "550e8400-e29b-41d4-a716-446655440000",    // UUID
  conversationId: "conv-123",                          // Session identifier
  turnId: 1704067200000,                               // Timestamp as unique turn ID
  
  // Lifecycle
  timestamp: 1704067200000,     // Creation time (ms)
  completedAt: 1704067205500,   // Finalization time (ms)
  status: "completed",          // "active" | "completed" | "failed"
  
  // User context
  userId: "alice",              // Optional
  rawUserInput: "What's the weather in Seattle?",
  
  // Final result
  finalOutput: "Based on current conditions...",
  finalOutputType: "text",      // "text" | "command" | "clarification" | etc.
  
  // Nested execution stages
  stages: {
    "router": { ... },
    "memory-retrieval": { ... },
    "chat-execution": { ... },
    "verification": { ... }
  },
  
  // Metadata
  model: "mistral",
  provider: "ollama",
  escalationUsed: false,
  taskRoute: "general",         // From router decision
  
  // Metrics
  totalDuration: 5500,          // ms
  stageCount: 4,
  
  // Errors
  errors: [
    { stage: "verification", message: "Minor check failed", timestamp: 1704067204000 }
  ],
  
  // Related events
  relatedImprovementEventIds: ["imp-789", "imp-790"]
}
```

### Lifecycle

1. **Created** (`rooteTrace.status = "active"`): `traceSessionManager.createTrace()` in `handleSendChatAdvanced()` entry
2. **Populated**: Stages added and completed as execution progresses
3. **Finalized** (`status = "completed"`): `traceSessionManager.finalizeAndPersist()` in finally block
4. **Persisted**: Written to `runtime-traces.jsonl` and summary to `CONVERSATION-HISTORY.json`

---

## TraceStage: Execution Phase Recording

Each major instrumentation area contributes one `TraceStage` capturing that phase's inputs, decisions, and outputs.

### Structure

```typescript
{
  // Identity  
  stageId: "7a85c6d9-3d5e-4f21-a1b2-cdef01234567",
  parentTraceId: "550e8400-e29b-41d4-a716-446655440000",
  stageType: "router",      // Key for querying by phase
  name: "Intent Classification",
  
  // Timing
  startTime: 1704067200000,
  endTime: 1704067200150,
  duration: 150,            // ms
  
  // Stage-specific metadata (discriminated union)
  metadata: {
    stageType: "router",
    rawInput: "What's the weather in Seattle?",
    normalizedInput: "what's the weather in seattle",
    detectedPatterns: ["web-query"],
    chosenRoute: "browser-task",
    confidence: 0.87
  },
  
  // Fine-grained events within stage
  events: [
    {
      eventId: "evt-1",
      timestamp: 1704067200020,
      type: "pattern-detected",
      payload: { pattern: "web-query", matched: true }
    },
    {
      eventId: "evt-2",
      timestamp: 1704067200140,
      type: "route-decision",
      payload: { route: "browser-task", reason: "High confidence pattern match" }
    }
  ],
  
  // Execution result
  status: "completed",      // "started" | "completed" | "errored"
  result: {
    routingDecision: "browser-task",
    alternatives: ["general-query", "local-search"]
  },
  
  // Errors if occurred
  error: undefined
}
```

### Stage Types Instrumented

| Stage | File | Captures |
|-------|------|----------|
| `router` | `governed-chat/router.ts` | Intent classification, chosen route, confidence |
| `capability-selection` | `capability-runner.ts` | Selected capabilities, scoring method, alternatives |
| `memory-retrieval` | `memory/processing/memory-extractor.ts` | Query, matching patterns, retrieved items, confidence |
| `context-assembly` | `context/task-skills.ts` | Assembled context size, applied skills, overlays |
| `model-setup` | `local-ai/provider.ts` | Model name, provider, health check, escalation decision |
| `grounding` | `governed-chat/verification.ts` | Applied policies, guardrails, response modifications |
| `chat-execution` | `main.ts` (handleSendChatAdvanced) | Prompt snapshot, raw output, tokens, latency |
| `verification` | `governed-chat/verification.ts` | Verification checks, score, evidence |
| `improvement-analysis` | `improvement-runtime-service.ts` | Classification, generated events, suggested improvements |

---

## TraceEvent: Fine-Grained Execution Point

Optional events within a stage for detailed tracking (e.g., pattern detection, retrieval hit, API call).

```typescript
{
  eventId: "7f23d8c1-9e4a-4b3f-a2c5-def1234567890",
  timestamp: 1704067200025,
  type: "pattern-detected",              // Event category
  payload: {
    pattern: "query-pattern-1",
    matched: true,
    score: 0.94
  },
  error: undefined  // Optional if event failed
}
```

---

## Storage Format

### JSONL File: `data/runtime-traces.jsonl`

Append-only line-delimited JSON. Each line is a **completed** `RuntimeTrace`:

```
{"traceId":"...","conversationId":"conv-123","status":"completed",...}
{"traceId":"...","conversationId":"conv-123","status":"completed",...}
{"traceId":"...","conversationId":"conv-456","status":"completed",...}
```

**Append safety:** JSONL format prevents corruption if write is interrupted mid-line.

### Summary in `CONVERSATION-HISTORY.json`

Light trace summary in existing conversation history entry:

```json
{
  "conversations": [
    {
      "conversationId": "conv-123",
      "entries": [
        {
          "turn": 1,
          "timestamp": "2024-01-01T12:00:00Z",
          "userPrompt": "What's the weather?",
          "assistantReply": "Based on current conditions...",
          "trace": {
            "traceId": "550e8400-...",
            "status": "completed",
            "stageCount": 4,
            "errorCount": 0,
            "totalDuration": 5500,
            "model": "mistral",
            "taskRoute": "browser-task"
          }
        }
      ]
    }
  ]
}
```

---

## IPC Channels

### Query Traces

**Channel:** `trace:query`

**Request:**
```typescript
{
  conversationId?: string;    // Optional filter
  limit?: number;             // Max results (default: all)
}
```

**Response:**
```typescript
{
  traces: RuntimeTrace[];
  error?: string;
}
```

### Trace Statistics

**Channel:** `trace:stats`

**Request:** (none)

**Response:**
```typescript
{
  sessionId: string;
  tracesCreated: number;
  tracesCompleted: number;
  tracesFailed: number;
  persistenceErrors: number;
  parseErrors: number;
  ioErrors: number;
  startTime: number;
  lastActivity: number;
  storedTraces: {
    totalTraces: number;
    completedTraces: number;
    failedTraces: number;
    fileSize: number;
  }
}
```

### Subscribe to Traces (Deferred)

**Channel:** `trace:subscribe`  
**Status:** Currently returns empty unsubscribe function (placeholder for Phase 3)

---

## Metadata by Stage Type

### RouterStageMetadata

```typescript
{
  stageType: "router";
  rawInput?: string;
  normalizedInput?: string;
  detectedPatterns?: string[];        // e.g., ["browser-task", "registry-control"]
  chosenRoute?: string;
  confidence?: number;                 // 0.0 - 1.0
  escalationFlag?: boolean;
}
```

### CapabilitySelectionMetadata

```typescript
{
  stageType: "capability-selection";
  selectedCapabilities?: Array<{
    id: string;
    name: string;
    method?: string;
  }>;
  candidateCapabilities?: Array<{
    id: string;
    name: string;
    score?: number;
  }>;
  selectionReason?: string;
  selectionMethod?: string;            // "catalog" | "similarity" | "manual"
}
```

### MemoryRetrievalMetadata

```typescript
{
  stageType: "memory-retrieval";
  query?: string;
  matchedPatterns?: Array<{
    pattern: string;
    type: string;                      // "preference", "personal_fact", "project", etc.
  }>;
  retrievedItems?: Array<{
    type: string;
    reference: string;                 // "memory:123", "fact:xyz"
    confidence?: number;
  }>;
  retrievalMethod?: string;
  itemCount?: number;
}
```

### ExecutionMetadata (chat-execution)

```typescript
{
  stageType: "chat-execution";
  promptSnapshotSize?: number;         // Bytes
  promptPreview?: string;              // First 200 chars
  rawModelOutput?: string;
  tokensUsed?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
  latency?: number;                    // ms
  streamingEnabled?: boolean;
  chunkCount?: number;
}
```

### VerificationMetadata

```typescript
{
  stageType: "verification";
  checksPerformed?: Array<{
    checkType: string;                 // "file-exists", "service-state"
    target?: string;
    passed: boolean;
    evidence?: string;
  }>;
  overallScore?: number;               // 0.0 - 1.0
  reasonsSummary?: string[];
  expectedStateSummary?: string;
}
```

---

## Sample Trace JSON

### Full Example

```json
{
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "conversationId": "conv-123",
  "turnId": 1704067200000,
  "timestamp": 1704067200000,
  "completedAt": 1704067205500,
  "userId": "alice",
  "status": "completed",
  "rawUserInput": "Open VS Code and create a file called test.tsx with a React component",
  "finalOutput": "VS Code opened and file created successfully. Component template inserted.",
  "finalOutputType": "text",
  "model": "mistral",
  "provider": "ollama",
  "escalationUsed": false,
  "taskRoute": "ui-automation",
  "totalDuration": 5500,
  "stageCount": 5,
  "stages": {
    "router": {
      "stageId": "st-router-001",
      "parentTraceId": "550e8400-e29b-41d4-a716-446655440000",
      "stageType": "router",
      "name": "Intent Classification",
      "startTime": 1704067200000,
      "endTime": 1704067200150,
      "duration": 150,
      "status": "completed",
      "metadata": {
        "stageType": "router",
        "rawInput": "Open VS Code and create a file called test.tsx with a React component",
        "normalizedInput": "open vs code and create a file called test.tsx with a react component",
        "detectedPatterns": ["ui-automation"],
        "chosenRoute": "ui-automation",
        "confidence": 0.92
      },
      "result": { "routing": "ui-automation" }
    },
    "memory-retrieval": {
      "stageId": "st-mem-001",
      "parentTraceId": "550e8400-e29b-41d4-a716-446655440000",
      "stageType": "memory-retrieval",
      "name": "Context Retrieval",
      "startTime": 1704067200150,
      "endTime": 1704067200600,
      "duration": 450,
      "status": "completed",
      "metadata": {
        "stageType": "memory-retrieval",
        "query": "react component creation preferences",
        "matchedPatterns": [
          { "pattern": "react-style", "type": "preference" }
        ],
        "retrievedItems": [
          { "type": "preference", "reference": "mem:456", "confidence": 0.88 }
        ],
        "itemCount": 1
      },
      "events": [
        {
          "eventId": "evt-m1",
          "timestamp": 1704067200200,
          "type": "pattern-matched",
          "payload": { "pattern": "react-style-preference" }
        }
      ],
      "result": { "itemsRetrieved": 1 }
    },
    "chat-execution": {
      "stageId": "st-exec-001",
      "parentTraceId": "550e8400-e29b-41d4-a716-446655440000",
      "stageType": "chat-execution",
      "name": "Model Execution",
      "startTime": 1704067200600,
      "endTime": 1704067205000,
      "duration": 4400,
      "status": "completed",
      "metadata": {
        "stageType": "chat-execution",
        "promptSnapshotSize": 1250,
        "latency": 4400,
        "tokensUsed": { "prompt": 340, "completion": 128, "total": 468 },
        "streamingEnabled": false
      },
      "result": { "tokensGenerated": 128 }
    },
    "verification": {
      "stageId": "st-verify-001",
      "parentTraceId": "550e8400-e29b-41d4-a716-446655440000",
      "stageType": "verification",
      "name": "Response Verification",
      "startTime": 1704067205000,
      "endTime": 1704067205400,
      "duration": 400,
      "status": "completed",
      "metadata": {
        "stageType": "verification",
        "checksPerformed": [
          {
            "checkType": "ui-automation-result",
            "target": "VS Code process",
            "passed": true,
            "evidence": "Process running with PID 12345"
          }
        ],
        "overallScore": 0.98
      },
      "result": { "verified": true }
    },
    "improvement-analysis": {
      "stageId": "st-imp-001",
      "parentTraceId": "550e8400-e29b-41d4-a716-446655440000",
      "stageType": "improvement-analysis",
      "name": "Post-Response Analysis",
      "startTime": 1704067205400,
      "endTime": 1704067205500,
      "duration": 100,
      "status": "completed",
      "metadata": {
        "stageType": "improvement-analysis",
        "analysisClassification": "ui-automation-successful",
        "eventsGenerated": [
          { "eventId": "imp-789", "type": "success-pattern", "status": "recorded" }
        ]
      }
    }
  },
  "errors": []
}
```

---

## Error Handling & Resilience

### Persistence Failures (Non-Fatal)

If writing to `runtime-traces.jsonl` fails (disk full, permission denied):
1. Error is logged to stderr: `[Trace] Error persisting trace: ...`
2. Failure counter incremented: `TraceSessionStats.persistenceErrors++`
3. App continues normally
4. Stats retrievable via `getRuntimeTraceStats()`

### Trace Query Failures

IPC query channels return graceful responses:

```typescript
{
  traces: [],
  error: "Failed to read traces file: ENOENT"
}
```

---

## Query Patterns

### Get all traces for a conversation

```typescript
await window.synai.queryRuntimeTraces("conv-123", 100)
```

Response: Last 100 traces for conversation.

### Get recent traces

```typescript
await window.synai.queryRuntimeTraces(undefined, 50)
```

Response: Last 50 traces (all conversations).

### Get session stats

```typescript
const stats = await window.synai.getRuntimeTraceStats()
// Returns: { tracesCreated: 42, tracesCompleted: 41, persistenceErrors: 0, ... }
```

---

## Performance & Size

- **Per-turn trace size:** ~5-50 KB (depends on complexity)
- **Storage format:** JSONL (database-optimized, human-readable)
- **Append overhead:** Negligible (one line per trace)
- **Query performance:** O(n) full file scan (acceptable for local file; optimization in Phase 3)
- **Retention:** Manual pruning with `pruneOldTraces(keepCount)` helper

---

## Remaining TODOs (Phase 3+)

- [ ] UI trace visualization (browse/filter/search in React UI)
- [ ] Real-time trace streaming via IPC subscription
- [ ] Advanced filtering & export API (by stage type, date range, etc.)
- [ ] Trace pattern analysis for performance insights
- [ ] Compression/archival for old traces (data hygiene)
- [ ] SQLite backend for large-scale trace analysis

---

## References

- Schema types: `packages/Awareness-Reasoning/src/runtime-trace/trace-schema.ts`
- Builder helpers: `packages/Awareness-Reasoning/src/runtime-trace/trace-builder.ts`
- Storage layer: `packages/Awareness-Reasoning/src/runtime-trace/trace-storage.ts`
- Session manager: `apps/desktop/electron/trace-session-manager.ts`
- IPC contracts: `packages/Awareness-Reasoning/src/contracts/ipc.ts` (channels)
- Tests: `packages/Awareness-Reasoning/src/runtime-trace/__tests__/`
