import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  insertImprovementEvent,
  queryImprovementEvents,
  updateImprovementEventStatus,
  getReadyToProcessEvents,
  getEventsByStatus
} from "@awareness/improvement";
import { configureDatabasePath } from "@memory/storage/db";
import { rm } from "node:fs/promises";

const TEST_DB_PATH = ".runtime/test-improvement-queue.json";

describe("Improvement Event Queue", () => {
  beforeEach(async () => {
    configureDatabasePath(TEST_DB_PATH);
  });

  afterEach(async () => {
    try {
      await rm(TEST_DB_PATH);
    } catch {
      // Cleanup optional
    }
  });

  it("inserts improvement events", async () => {
    const event = await insertImprovementEvent(
      "weak_reply",
      "update_reply_policy",
      "medium",
      "Can you show a calendar?",
      "I don't have that."
    );

    expect(event.id).toBeDefined();
    expect(event.type).toBe("weak_reply");
    expect(event.status).toBe("detected");
  });

  it("deduplicates near-identical prompts", async () => {
    const prompt1 = "Can you show a calendar?";
    const prompt2 = "  can you show a calendar?  "; // Near-identical but different whitespace/case
    
    const event1 = await insertImprovementEvent(
      "capability_gap",
      "create_patch_proposal",
      "medium",
      prompt1,
      "No calendar here."
    );

    const event2 = await insertImprovementEvent(
      "weak_reply",
      "update_reply_policy",
      "low",
      prompt2,
      "Still no calendar."
    );

    // Should return the SAME event (by ID) because fingerprints match after normalization
    expect(event2.id).toBe(event1.id);
    // Previously had repeatCount=1, now should be 2
    expect(event2.payload.repeatCount).toBe(2);
    expect(event2.payload.fingerprint).toBe(event1.payload.fingerprint);
  });

  it("extends cooldown on duplicate detection", async () => {
    const event1 = await insertImprovementEvent(
      "weak_reply",
      "update_reply_policy",
      "medium",
      "Can you show a calendar?",
      "No."
    );

    const cooldown1 = event1.payload.cooldownUntil;

    const event2 = await insertImprovementEvent(
      "weak_reply",
      "update_reply_policy",
      "medium",
      "Can you show a calendar?",
      "Still no."
    );

    const cooldown2 = event2.payload.cooldownUntil;
    const date1 = new Date(cooldown1).getTime();
    const date2 = new Date(cooldown2).getTime();

    // Cooldown should have extended (10 min instead of 5)
    expect(date2).toBeGreaterThan(date1);
  });

  it("queries events by status", async () => {
    await insertImprovementEvent(
      "weak_reply",
      "update_reply_policy",
      "medium",
      "A",
      "B"
    );
    await insertImprovementEvent(
      "capability_gap",
      "create_patch_proposal",
      "high",
      "C",
      "D"
    );

    const detected = await getEventsByStatus("detected");
    expect(detected.length).toBe(2);
  });

  it("queries events by type", async () => {
    await insertImprovementEvent(
      "weak_reply",
      "update_reply_policy",
      "medium",
      "A",
      "B"
    );
    await insertImprovementEvent(
      "capability_gap",
      "create_patch_proposal",
      "high",
      "C",
      "D"
    );

    const results = await queryImprovementEvents({ type: "weak_reply" });
    expect(results.length).toBe(1);
    expect(results[0].type).toBe("weak_reply");
  });

  it("queries events by risk", async () => {
    await insertImprovementEvent(
      "weak_reply",
      "update_reply_policy",
      "low",
      "A",
      "B"
    );
    await insertImprovementEvent(
      "tool_failure",
      "escalate",
      "high",
      "C",
      "D"
    );

    const highRisk = await queryImprovementEvents({ risk: "high" });
    expect(highRisk.length).toBeGreaterThan(0);
    expect(highRisk.every((e) => e.risk === "high")).toBe(true);
  });

  it("updates event status", async () => {
    const event = await insertImprovementEvent(
      "weak_reply",
      "update_reply_policy",
      "medium",
      "A",
      "B"
    );

    const updated = await updateImprovementEventStatus(event.id, "queued");
    expect(updated?.status).toBe("queued");
  });

  it("returns ready-to-process events in priority order", async () => {
    // Create events with cooldown already expired (1 minute in the past)
    const pastCooldown = new Date(Date.now() - 60 * 1000).toISOString();

    const low = await insertImprovementEvent(
      "weak_reply",
      "update_reply_policy",
      "low",
      "A",
      "B",
      { payload: { cooldownUntil: pastCooldown } }
    );
    const high = await insertImprovementEvent(
      "tool_failure",
      "escalate",
      "high",
      "C",
      "D",
      { payload: { cooldownUntil: pastCooldown } }
    );

    const ready = await getReadyToProcessEvents();
    expect(ready.length).toBeGreaterThan(0);

    // High risk should come before low
    const highIndex = ready.findIndex((e) => e.id === high.id);
    const lowIndex = ready.findIndex((e) => e.id === low.id);
    expect(highIndex).toBeLessThan(lowIndex);
  });

  it("excludes events in cooldown from ready list", async () => {
    const event1 = await insertImprovementEvent(
      "capability_gap",
      "create_patch_proposal",
      "medium",
      "Can you show a calendar?",
      "No."
    );

    // Trigger cooldown by inserting duplicate
    await insertImprovementEvent(
      "capability_gap",
      "create_patch_proposal",
      "medium",
      "Can you show a calendar?",
      "Still no."
    );

    const ready = await getReadyToProcessEvents();
    // The event is now in cooldown, so it won't appear in ready list
    expect(ready.every((e) => e.payload.cooldownUntil === undefined || new Date(e.payload.cooldownUntil) <= new Date())).toBe(true);
  });
});
