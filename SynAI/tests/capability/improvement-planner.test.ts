import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  planImprovementEvent,
  planAllQueuedEvents,
  getPlanningStats
} from "@awareness/improvement";
import { insertImprovementEvent, queryImprovementEvents } from "@awareness/improvement";
import type { ImprovementEvent } from "@contracts/improvement";
import { configureDatabasePath } from "@memory/storage/db";
import { rm } from "node:fs/promises";

const TEST_DB_PATH = ".runtime/test-improvement-planner.json";

describe("Improvement Planner", () => {
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

  it("routes weak_reply to reply-policy update", async () => {
    const event = await insertImprovementEvent(
      "weak_reply",
      "update_reply_policy",
      "medium",
      "Can you show me a calendar?",
      "I don't have a calendar."
    );

    const plan = await planImprovementEvent(event);
    expect(plan.actions.length).toBeGreaterThan(0);
    expect(plan.actions[0].type).toBe("update_reply_policy");
    expect(plan.actions[0].replyPolicyRule).toBeDefined();
  });

  it("routes capability_gap with repeat to patch proposal", async () => {
    let event = await insertImprovementEvent(
      "capability_gap",
      "create_patch_proposal",
      "medium",
      "Can you track time?",
      "I don't support time tracking."
    );

    // Increment repeat count to 2
    event = await insertImprovementEvent(
      "capability_gap",
      "create_patch_proposal",
      "medium",
      "Can you track time?",
      "Still no time tracking."
    );

    const plan = await planImprovementEvent(event);
    expect(plan.actions.some((a) => a.type === "create_patch_proposal")).toBe(true);
    expect(plan.actions[0].patchProposal).toBeDefined();
  });

  it("routes tool_failure to escalate", async () => {
    const event = await insertImprovementEvent(
      "tool_failure",
      "escalate",
      "high",
      "Open my file",
      "Operation timed out."
    );

    const plan = await planImprovementEvent(event);
    expect(plan.actions.some((a) => a.type === "escalate")).toBe(true);
  });

  it("routes memory_candidate to update_memory", async () => {
    const event = await insertImprovementEvent(
      "memory_candidate",
      "update_memory",
      "low",
      "What's your name?",
      "I am SynAI, a local AI."
    );

    const plan = await planImprovementEvent(event);
    expect(plan.actions.some((a) => a.type === "update_memory")).toBe(true);
    expect(plan.actions[0].targetMemoryCategory).toBe("personal_fact");
  });

  it("generates patch proposals with test plans", async () => {
    const event = await insertImprovementEvent(
      "capability_gap",
      "create_patch_proposal",
      "medium",
      "Can you show a calendar?",
      "I don't have calendars.",
      { payload: { repeatCount: 2 } as any }
    );

    const plan = await planImprovementEvent(event);
    const patchAction = plan.actions.find((a) => a.type === "create_patch_proposal");
    expect(patchAction?.patchProposal?.testPlan?.length).toBeGreaterThan(0);
  });

  it("marks events as analyzed after planning", async () => {
    const event = await insertImprovementEvent(
      "weak_reply",
      "update_reply_policy",
      "medium",
      "Can you do X?",
      "I don't have that."
    );

    const plan = await planImprovementEvent(event);
    expect(plan.updatedEvent.status).toBe("analyzed");
  });

  it("returns planning stats", async () => {
    await insertImprovementEvent(
      "weak_reply",
      "update_reply_policy",
      "medium",
      "Can you show a calendar?",
      "I don't have a calendar."
    );

    const stats = await getPlanningStats();
    expect(stats.detected).toBeGreaterThanOrEqual(0);
    expect(stats.queued).toBeGreaterThanOrEqual(0);
    expect(stats.patchProposals).toBeDefined();
  });
});
