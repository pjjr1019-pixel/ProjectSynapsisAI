import { describe, expect, it } from "vitest";
import { routeGovernedChatTask } from "../../packages/Governance-Execution/src/governed-chat/router";
import type { GovernedHistoryFinding } from "../../packages/Governance-Execution/src/governed-chat/types";
import type { GovernedTaskPlanRequest } from "../../packages/Governance-Execution/src/governed-chat/types";

const makeRequest = (text: string): GovernedTaskPlanRequest => ({
  requestId: `req-${text.slice(0, 8).replace(/\s+/g, "-")}`,
  conversationId: "conversation-1",
  text,
  messages: [],
  workspaceRoot: "C:/repo/SynAI",
  desktopPath: "C:/Users/Pgiov/Desktop",
  documentsPath: "C:/Users/Pgiov/Documents",
  machineAwareness: null,
  fileAwareness: null,
  screenAwareness: null,
  recentWebContext: null
});

describe("governed chat router", () => {
  it("routes research prompts into workflow execution", async () => {
    const route = await routeGovernedChatTask({
      request: makeRequest("Research the current state of AI and write a report and save it in my Documents.")
    });

    expect(route.decision).toBe("allow_with_verification");
    expect(route.actionType).toBe("workflow");
    expect(route.recommendedExecutor).toBe("workflow-orchestrator");
    expect(route.approvalRequired).toBe(false);
  });

  it("asks for clarification on ambiguous destructive prompts", async () => {
    const route = await routeGovernedChatTask({
      request: makeRequest("Delete this folder.")
    });

    expect(route.decision).toBe("clarify");
    expect(route.clarificationNeeded.length).toBeGreaterThan(0);
    expect(route.recommendedExecutor).toBe("answer-only");
  });

  it("marks explicit confirmations as approval confirmations", async () => {
    const route = await routeGovernedChatTask({
      request: makeRequest("approve")
    });

    expect(route.actionType).toBe("approval-confirmation");
    expect(route.decision).toBe("allow");
    expect(route.recommendedExecutor).toBe("approval-queue");
  });

  it("keeps docs and settings-copy comparison prompts answer-only", async () => {
    const route = await routeGovernedChatTask({
      request: makeRequest(
        "Using the current repo docs and settings copy, compare the two awareness answer modes."
      )
    });

    expect(route.decision).toBe("allow");
    expect(route.actionType).toBe("answer-only");
    expect(route.recommendedExecutor).toBe("answer-only");
  });

  it("routes Windows settings and add or remove programs prompts to desktop navigation", async () => {
    const settingsRoute = await routeGovernedChatTask({
      request: makeRequest("open windows settings")
    });

    expect(settingsRoute.decision).toBe("allow_with_verification");
    expect(settingsRoute.actionType).toBe("desktop-system-navigation");
    expect(settingsRoute.recommendedExecutor).toBe("desktop-actions");

    const addRemoveRoute = await routeGovernedChatTask({
      request: makeRequest("windows add remove program")
    });

    expect(addRemoveRoute.decision).toBe("allow_with_verification");
    expect(addRemoveRoute.actionType).toBe("desktop-system-navigation");
    expect(addRemoveRoute.recommendedExecutor).toBe("desktop-actions");
  });

  it("routes the remaining history-failed prompts to the correct executors", async () => {
    const applicationLaunchPrompts = ["open cmd", "open powershell", "open terminal", "open notepad++"];
    for (const text of applicationLaunchPrompts) {
      const route = await routeGovernedChatTask({
        request: makeRequest(text)
      });

      expect(route.decision).toBe("allow_with_verification");
      expect(route.actionType).toBe("workflow");
      expect(route.recommendedExecutor).toBe("workflow-orchestrator");
    }

    const browserPrompts = ["open youtube", "open facebook.com", "open duckduckgo"];
    for (const text of browserPrompts) {
      const route = await routeGovernedChatTask({
        request: makeRequest(text)
      });

      expect(route.decision).toBe("allow_with_verification");
      expect(route.actionType).toBe("workflow");
      expect(route.recommendedExecutor).toBe("workflow-orchestrator");
    }

    const registryRoute = await routeGovernedChatTask({
      request: makeRequest("open registry")
    });
    expect(registryRoute.decision).toBe("allow_with_verification");
    expect(registryRoute.actionType).toBe("desktop-system-navigation");
    expect(registryRoute.recommendedExecutor).toBe("desktop-actions");

    const fileDirectoryRoute = await routeGovernedChatTask({
      request: makeRequest("open file directory")
    });
    expect(fileDirectoryRoute.decision).toBe("allow_with_verification");
    expect(fileDirectoryRoute.actionType).toBe("workflow");
    expect(fileDirectoryRoute.recommendedExecutor).toBe("workflow-orchestrator");

    const closeSynaiRoute = await routeGovernedChatTask({
      request: makeRequest("close synai")
    });
    expect(closeSynaiRoute.decision).toBe("allow_with_verification");
    expect(closeSynaiRoute.actionType).toBe("workflow");
    expect(closeSynaiRoute.recommendedExecutor).toBe("workflow-orchestrator");

    const organizeRoute = await routeGovernedChatTask({
      request: makeRequest("orginaze my desktop")
    });
    expect(organizeRoute.decision).toBe("allow_with_verification");
    expect(organizeRoute.actionType).toBe("workflow");
    expect(organizeRoute.recommendedExecutor).toBe("workflow-orchestrator");
  });

  it("reuses the last surfaced process list for follow-up kill prompts", async () => {
    const request = {
      ...makeRequest("kill all them processes"),
      messages: [
        {
          id: "msg-1",
          conversationId: "conversation-1",
          role: "user" as const,
          content: "what are the top processes you mentioned?",
          createdAt: "2026-04-10T00:00:00.000Z"
        },
        {
          id: "msg-2",
          conversationId: "conversation-1",
          role: "assistant" as const,
          content: "Top processes: chrome.exe, explorer.exe, code.exe",
          createdAt: "2026-04-10T00:00:01.000Z"
        },
        {
          id: "msg-3",
          conversationId: "conversation-1",
          role: "user" as const,
          content: "kill all them processes",
          createdAt: "2026-04-10T00:00:02.000Z"
        }
      ]
    };

    const route = await routeGovernedChatTask({
      request
    });

    expect(route.decision).toBe("require_approval");
    expect(route.actionType).toBe("workflow");
    expect(route.artifacts.resolvedPrompt).toBe("terminate chrome.exe, explorer.exe, code.exe");
    expect(route.artifacts.processTargets).toEqual(["chrome.exe", "explorer.exe", "code.exe"]);
  });

  it("captures explicit failure feedback without forcing a clarification", async () => {
    const route = await routeGovernedChatTask({
      request: {
        ...makeRequest("didn't work"),
        messages: [
          {
            id: "msg-1",
            conversationId: "conversation-1",
            role: "user" as const,
            content: "open google",
            createdAt: "2026-04-10T00:00:00.000Z"
          },
          {
            id: "msg-2",
            conversationId: "conversation-1",
            role: "assistant" as const,
            content: "I opened Google.",
            createdAt: "2026-04-10T00:00:01.000Z"
          },
          {
            id: "msg-3",
            conversationId: "conversation-1",
            role: "user" as const,
            content: "didn't work",
            createdAt: "2026-04-10T00:00:02.000Z"
          }
        ]
      }
    });

    expect(route.decision).toBe("allow");
    expect(route.actionType).toBe("answer-only");
    expect(route.artifacts.userFailureFeedback).toBe("didn't work");
  });

  it("replays local history as plan-only instead of auto-executing", async () => {
    const findings: GovernedHistoryFinding[] = [
      {
        recovered_intent: "delete folder sandbox",
        prior_failure_signature: "delete sandbox :: approval required",
        repeated_request_count: 2,
        first_seen: "2026-04-10T10:00:00.000Z",
        last_seen: "2026-04-10T11:00:00.000Z",
        user_impact_score: 0.92,
        source_conversation_ids: ["c1"],
        latest_user_message: "Delete the folder Sandbox.",
        latest_assistant_message: "Need approval before deleting Sandbox.",
        suggested_executor: "desktop-actions",
        suggested_gap: "missing_governance_rule"
      }
    ];

    const route = await routeGovernedChatTask({
      request: makeRequest("Do what I asked yesterday that failed."),
      historyFindings: findings
    });

    expect(route.decision).toBe("allow_with_verification");
    expect(route.actionType).toBe("history-replay");
    expect(route.recommendedExecutor).toBe("desktop-actions");
    expect(route.artifacts.recoveredIntent).toBe("delete folder sandbox");
  });
});
