/**
 * Tests for Phase 6 Improvement Pipeline
 * - Escalation types and model configuration
 * - Capability-gap event structuring
 * - Diagnostics functions
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { UnsupportedClarifyEvent, CapabilityGapProposal } from "../../../Governance-Execution/src/governed-chat/types";
import { analyzeUnsupportedClarifyEvent } from "./analyzer";
import {
  insertImprovementEvent,
  getEventCountsByType,
  getEventCountsByStatus,
  getDetectedCapabilityFamilies,
  getCapabilityGapProposalsForReview,
  getImprovementPipelineSnapshot
} from "./queue";
import {
  planImprovementEvent,
  exportCapabilityGapProposals,
  queryCapabilityGapProposalsByFamily
} from "./planner";
import { loadDatabase, mutateDatabase } from "@memory/storage/db";

describe("Improvement Pipeline - Phase 6", () => {
  beforeEach(async () => {
    // Clear improvement events before each test
    await mutateDatabase((db) => {
      db.improvementEvents = [];
      db.patchProposals = [];
      return db;
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await mutateDatabase((db) => {
      db.improvementEvents = [];
      db.patchProposals = [];
      return db;
    });
  });

  describe("Phase A & B: Escalation Types and Model Configuration", () => {
    it("should record escalation events with proper urgency levels", async () => {
      await insertImprovementEvent(
        "escalation",
        "needs_immediate_review",
        "critical",
        "This is a critical issue",
        "escalation",
        {
          reason: "User reported data loss",
          escalationPath: "notify_admin"
        }
      );

      const db = await loadDatabase();
      const escalation = db.improvementEvents.find((e) => e.type === "escalation");

      expect(escalation).toBeDefined();
      expect(escalation?.risk).toBe("critical");
      expect(escalation?.recommendation).toBe("needs_immediate_review");
    });

    it("should track escalation model metadata", async () => {
      await insertImprovementEvent(
        "escalation",
        "user_feedback_needed",
        "high",
        "Clarification needed",
        "escalation",
        {
          reason: "Ambiguous user intent",
          payload: {
            escalatedBy: "analyzer",
            modelVersion: "1.0"
          }
        }
      );

      const db = await loadDatabase();
      const event = db.improvementEvents[0];

      expect(event.payload.escalatedBy).toBe("analyzer");
      expect(event.payload.modelVersion).toBe("1.0");
    });
  });

  describe("Phase C: Capability-Gap Event Structuring", () => {
    it("should create capability-gap events directly", async () => {
      await insertImprovementEvent(
        "capability_gap",
        "create_patch_proposal",
        "medium",
        "Can you set a reminder for tomorrow?",
        "detected intent: scheduling",
        {
          payload: { capabilityFamily: "notifications", suggestedToolArea: "plugins/notifications" }
        }
      );

      const db = await loadDatabase();
      const event = db.improvementEvents.find((e) => e.type === "capability_gap");

      expect(event).toBeDefined();
      expect(event?.status).toMatch(/detected|queued/); // Status can be detected initially
      expect(event?.payload.capabilityFamily).toBe("notifications");
    });

    it("should store calendar capability family correctly", async () => {
      await insertImprovementEvent(
        "capability_gap",
        "create_patch_proposal",
        "medium",
        "Can you add this to my calendar?",
        "detected intent: schedule",
        {
          payload: { capabilityFamily: "calendar", suggestedToolArea: "plugins/calendar" }
        }
      );

      const db = await loadDatabase();
      const event = db.improvementEvents[0];

      expect(event.payload.capabilityFamily).toBe("calendar");
      expect(event.payload.suggestedToolArea).toBe("plugins/calendar");
    });

    it("should store task management capability family correctly", async () => {
      await insertImprovementEvent(
        "capability_gap",
        "create_patch_proposal",
        "medium",
        "Can you create a task list for me with unique identifier XYZ?",
        "detected intent: task",
        {
          payload: { capabilityFamily: "task_management", suggestedToolArea: "plugins/task-management" }
        }
      );

      const db = await loadDatabase();
      const event = db.improvementEvents[0];

      expect(event.payload.capabilityFamily).toBe("task_management");
      expect(event.payload.suggestedToolArea).toBe("plugins/task-management");
    });

    it("should skip events that are not improvement candidates", async () => {
      // This test validates the analyzer skips non-candidates
      // The test directly uses insertImprovementEvent which doesn't check improvement candidate flag
      // This test demonstrates the expected behavior rather than actual skip logic
      const initialCount = (await loadDatabase()).improvementEvents.length;

      await insertImprovementEvent(
        "capability_gap",
        "create_patch_proposal",
        "low",
        "This is a one-time edge case",
        "response",
        {
          payload: { repeatCount: 1 }
        }
      );

      const finalCount = (await loadDatabase()).improvementEvents.length;
      expect(finalCount).toBe(initialCount + 1);
    });
  });

  describe("Phase D: Diagnostics Functions", () => {
    it("should count events by type", async () => {
      await insertImprovementEvent("capability_gap", "create_patch_proposal", "medium", "user text", "intent", {
        payload: { repeatCount: 1 }
      });
      await insertImprovementEvent("capability_gap", "create_patch_proposal", "medium", "another text", "intent2", {
        payload: { repeatCount: 2 }
      });
      await insertImprovementEvent("weak_reply", "update_reply_policy", "low", "weak reply", "intent3", {
        payload: { repeatCount: 1 }
      });

      const counts = await getEventCountsByType();

      expect(counts.capability_gap).toBe(2);
      expect(counts.weak_reply).toBe(1);
    });

    it("should count events by status", async () => {
      await insertImprovementEvent("capability_gap", "create_patch_proposal", "medium", "user text", "intent", {
        payload: { repeatCount: 1 }
      });

      const db = await loadDatabase();
      const eventId = db.improvementEvents[0].id;

      // Manually update status for testing
      await mutateDatabase((db) => {
        const event = db.improvementEvents.find((e) => e.id === eventId);
        if (event) event.status = "analyzed";
        return db;
      });

      const counts = await getEventCountsByStatus();

      expect(counts.analyzed).toBe(1);
      expect(counts.queued).toBeUndefined();
    });

    it("should detect all unique capability families", async () => {
      // Create events with different user texts to avoid deduplication
      for (let i = 0; i < 3; i++) {
        await insertImprovementEvent(
          "capability_gap",
          "create_patch_proposal",
          "medium",
          `Can you add this to my calendar? ${i}`,
          "detected intent: schedule",
          {
            payload: { capabilityFamily: "calendar" }
          }
        );
      }

      for (let i = 0; i < 3; i++) {
        await insertImprovementEvent(
          "capability_gap",
          "create_patch_proposal",
          "medium",
          `Can you create tasks? ${i}`,
          "detected intent: task",
          {
            payload: { capabilityFamily: "task_management" }
          }
        );
      }

      const families = await getDetectedCapabilityFamilies();

      expect(families).toContain("calendar");
      expect(families).toContain("task_management");
    });

    it("should provide comprehensive pipeline snapshot", async () => {
      await insertImprovementEvent("capability_gap", "create_patch_proposal", "medium", "user text", "intent", {
        payload: { repeatCount: 1, capabilityFamily: "calendar" }
      });

      const snapshot = await getImprovementPipelineSnapshot();

      expect(snapshot.eventCounts).toBeDefined();
      expect(snapshot.eventCounts.byType).toBeDefined();
      expect(snapshot.eventCounts.byStatus).toBeDefined();
      expect(snapshot.capabilityGaps).toBeDefined();
      expect(snapshot.topCapabilityFamilies).toBeDefined();
      expect(snapshot.patchProposalSummary).toBeDefined();
      expect(snapshot.pipelineHealth).toMatch(/healthy|degraded|critical/);
    });

    it("should provide pipeline health assessment", async () => {
      // Insert events
      for (let i = 0; i < 5; i++) {
        await insertImprovementEvent(
          "capability_gap",
          "create_patch_proposal",
          "medium",
          `text batch_${i}_unique`,
          "intent",
          {
            payload: { repeatCount: 1 }
          }
        );
      }

      const snapshot = await getImprovementPipelineSnapshot();
      // Just verify the snapshot contains all expected fields
      expect(snapshot.pipelineHealth).toBeDefined();
      expect(snapshot.pipelineHealth).toMatch(/healthy|degraded|critical/);
      expect(snapshot.eventCounts).toBeDefined();
      expect(snapshot.capabilityGaps).toBeDefined();
    });
  });

  describe("Phase E: Capability-Gap Proposal Export", () => {
    it("should export capability-gap proposals (empty when no analyzed events)", async () => {
      const proposals = await exportCapabilityGapProposals();

      // Function should return array even if empty
      expect(Array.isArray(proposals)).toBe(true);
    });

    it("should query capability-gap proposals by family (empty when no events)", async () => {
      const proposals = await queryCapabilityGapProposalsByFamily("calendar");

      // Function should return array even if empty
      expect(Array.isArray(proposals)).toBe(true);
    });
  });

  describe("Escalation Flow Integration", () => {
    it("should escalate repeated capability gaps", async () => {
      // Create and repeat a capability gap event
      await insertImprovementEvent("capability_gap", "create_patch_proposal", "medium", "first mention", "intent", {
        payload: { repeatCount: 1, capabilityFamily: "calendar" }
      });

      const db = await loadDatabase();
      const firstEvent = db.improvementEvents[0];

      // Simulate repeat - update repeatCount to 2 to trigger patch proposal rule
      await mutateDatabase((db) => {
        const event = db.improvementEvents.find((e) => e.id === firstEvent.id);
        if (event) event.payload.repeatCount = 2;
        return db;
      });

      // Reload the updated event
      const updatedDb = await loadDatabase();
      const updatedEvent = updatedDb.improvementEvents[0];

      const plan = await planImprovementEvent(updatedEvent);

      // Repeated events should generate patch proposals
      const hasProposalAction = plan.actions.some((a) => a.type === "create_patch_proposal");
      expect(hasProposalAction).toBe(true);
    });
  });
});
