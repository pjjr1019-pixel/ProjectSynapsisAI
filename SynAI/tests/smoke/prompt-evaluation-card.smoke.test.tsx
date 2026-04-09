// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PromptEvaluationRequest } from "@contracts";
import { PromptEvaluationCard } from "../../apps/desktop/src/features/local-chat/components/PromptEvaluationCard";

describe("prompt evaluation card smoke", () => {
  it("migrates the old generic default suite to the current SynAI-safe defaults", () => {
    window.localStorage.setItem(
      "synai.prompt-evaluation.draft",
      JSON.stringify({
        suiteName: "Local AI prompt evaluation",
        easyPrompt:
          "In three short bullets, explain what makes an AI reply feel helpful instead of robotic.",
        mediumPrompt:
          "A user says: 'Your last answer was too long and still did not solve my problem.' Write a better reply that is calm, brief, and specific.",
        hardPrompt:
          "You have partial evidence that a Windows setting may have changed, but the evidence is not conclusive. Answer without guessing, make uncertainty clear, and suggest the single best next check.",
        edgePrompt:
          "The user says: 'Be extremely detailed, but keep it to one sentence.' Give the best compromise and explain the tradeoff in plain language."
      })
    );

    render(
      <PromptEvaluationCard
        settings={{
          selectedModel: "phi4-mini:latest",
          defaultWebSearch: false,
          advancedRagEnabled: true,
          workspaceIndexingEnabled: true,
          webInRagEnabled: true,
          liveTraceVisible: false,
          responseMode: "smart",
          awarenessAnswerMode: "evidence-first"
        }}
        running={false}
        result={null}
        error={null}
        onRun={vi.fn(async () => {})}
      />
    );

    expect(screen.getByDisplayValue("SynAI grounded product eval")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(
        "Using the current SynAI README, explain how time-sensitive prompts are handled. Answer in exactly 3 short bullets labeled Trigger, Action, and Surfacing. Include the phrases `recent web search` and `Context Preview`."
      )
    ).toBeInTheDocument();
  });

  it("builds a prompt evaluation request from the editable suite and preset-owned run settings", async () => {
    window.localStorage.clear();
    const onRun = vi.fn(async (_request: PromptEvaluationRequest) => {});

    render(
      <PromptEvaluationCard
        settings={{
          selectedModel: "phi4-mini:latest",
          defaultWebSearch: true,
          advancedRagEnabled: true,
          workspaceIndexingEnabled: true,
          webInRagEnabled: true,
          liveTraceVisible: false,
          responseMode: "smart",
          awarenessAnswerMode: "evidence-first"
        }}
        running={false}
        result={null}
        error={null}
        onRun={onRun}
      />
    );

    fireEvent.change(screen.getByLabelText("Suite name"), {
      target: { value: "Desktop reply tuning" }
    });
    fireEvent.change(screen.getByLabelText(/Easy prompt/i), {
      target: { value: "Answer this in one calm sentence." }
    });

    fireEvent.click(screen.getByRole("button", { name: "Run 4-Prompt Eval" }));

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onRun).toHaveBeenCalledWith({
      suiteName: "Desktop reply tuning",
      suiteMode: "chat-only",
      cases: [
        {
          id: "easy-prompt",
          label: "Easy",
          difficulty: "easy",
          prompt: "Answer this in one calm sentence.",
          sourceScopeHint: "docs-only",
          formatPolicy: "preserve-exact-structure",
          checks: [
            {
              id: "memory-pipeline-has-six-lines",
              kind: "bullet-count",
              description: "Keep the memory strategy summary to exactly 6 numbered lines.",
              exact: 6
            },
            {
              id: "memory-pipeline-uses-required-steps",
              kind: "includes-all",
              description: "Use the required memory-pipeline steps from the architecture doc.",
              values: ["extract", "classify", "score", "deduplicate", "retrieve", "context"]
            },
            {
              id: "rewrite-avoids-machine-inventory",
              kind: "excludes-all",
              description: "Avoid off-target machine inventory details.",
              values: ["current cpu load", "current ram", "uptime", "top process", "top processes"]
            }
          ],
          routingExpectations: {
            awarenessUsed: false,
            deterministicAwareness: false,
            genericWritingPromptSuppressed: false
          },
          groundingExpectations: {
            minGroundedClaims: 1,
            maxUnsupportedClaims: 0,
            maxConflictedClaims: 0
          }
        },
        {
          id: "medium-prompt",
          label: "Medium",
          difficulty: "medium",
          prompt:
            "Using the current repo docs and settings copy, compare the two awareness answer modes. Use exactly 2 short bullets. Start one with `Evidence-first:` and include the phrase `local evidence`. Start the other with `LLM-primary:` and include the phrase `supporting context`.",
          sourceScopeHint: "repo-wide",
          formatPolicy: "preserve-exact-structure",
          checks: [
            {
              id: "mode-compare-has-two-bullets",
              kind: "bullet-count",
              description: "Keep the awareness-mode comparison to exactly 2 bullets.",
              exact: 2
            },
            {
              id: "mode-compare-uses-required-phrases",
              kind: "includes-all",
              description: "Use the required mode names and grounding phrases.",
              values: ["Evidence-first", "LLM-primary", "local evidence", "supporting context"]
            },
            {
              id: "mode-compare-stays-on-prompt",
              kind: "excludes-all",
              description: "Do not drift into machine inventory details.",
              values: ["current cpu load", "current ram", "uptime", "top process", "top processes"]
            }
          ],
          routingExpectations: {
            awarenessUsed: false,
            deterministicAwareness: false,
            genericWritingPromptSuppressed: false
          },
          groundingExpectations: {
            minGroundedClaims: 1,
            maxUnsupportedClaims: 0,
            maxConflictedClaims: 0
          }
        },
        {
          id: "hard-prompt",
          label: "Hard",
          difficulty: "hard",
          prompt:
            "Based on the current README only, answer this teammate question without overclaiming: 'What does Phase 1 already include, and what is intentionally not built yet?' Use exactly 2 sections titled Built now and Not built yet, with exactly 2 short bullets under each. Make sure one Built now bullet mentions `local Ollama chat`, and one Not built yet bullet mentions both `cloud sync` and `multi-agent systems`.",
          sourceScopeHint: "readme-only",
          formatPolicy: "preserve-exact-structure",
          checks: [
            {
              id: "scope-summary-has-four-bullets",
              kind: "bullet-count",
              description: "Use exactly 4 bullets across the two scope sections.",
              exact: 4
            },
            {
              id: "scope-summary-uses-required-details",
              kind: "includes-all",
              description: "Use the required scope headings and anchor features.",
              values: ["Built now", "Not built yet", "local Ollama chat", "cloud sync", "multi-agent systems"]
            },
            {
              id: "scope-summary-avoids-machine-inventory",
              kind: "excludes-all",
              description: "Do not drift into CPU, RAM, or process details.",
              values: ["current cpu load", "current ram", "top process", "top processes"]
            }
          ],
          routingExpectations: {
            awarenessUsed: false,
            deterministicAwareness: false,
            genericWritingPromptSuppressed: false
          },
          groundingExpectations: {
            minGroundedClaims: 1,
            maxUnsupportedClaims: 0,
            maxConflictedClaims: 0
          }
        },
        {
          id: "edge-prompt",
          label: "Edge",
          difficulty: "edge",
          prompt:
            "Using the current SynAI README, explain how time-sensitive prompts are handled. Answer in exactly 3 short bullets labeled Trigger, Action, and Surfacing. Include the phrases `recent web search` and `Context Preview`.",
          sourceScopeHint: "readme-only",
          formatPolicy: "preserve-exact-structure",
          checks: [
            {
              id: "time-sensitive-summary-has-three-bullets",
              kind: "bullet-count",
              description: "Keep the time-sensitive behavior summary to exactly 3 bullets.",
              exact: 3
            },
            {
              id: "time-sensitive-summary-uses-required-phrases",
              kind: "includes-all",
              description: "Use the required labels and surface names.",
              values: ["Trigger", "Action", "Surfacing", "recent web search", "Context Preview"]
            },
            {
              id: "time-sensitive-summary-avoids-machine-inventory",
              kind: "excludes-all",
              description: "Stay on product behavior instead of system status.",
              values: ["current cpu load", "current ram", "uptime", "top process", "top processes"]
            }
          ],
          routingExpectations: {
            awarenessUsed: false,
            deterministicAwareness: false,
            genericWritingPromptSuppressed: false
          },
          groundingExpectations: {
            minGroundedClaims: 1,
            maxUnsupportedClaims: 0,
            maxConflictedClaims: 0
          }
        }
      ],
      modelOverride: "phi4-mini:latest",
      responseMode: "smart",
      awarenessAnswerMode: "llm-primary",
      useWebSearch: false,
      ragOptions: {
        defaultEnabled: true,
        defaultUseWeb: false,
        defaultShowTrace: false,
        workspaceIndexingEnabled: true
      }
    });
  });

  it("loads the Windows awareness preset into the prompt editor", () => {
    window.localStorage.clear();

    render(
      <PromptEvaluationCard
        settings={{
          selectedModel: "phi4-mini:latest",
          defaultWebSearch: false,
          advancedRagEnabled: true,
          workspaceIndexingEnabled: true,
          webInRagEnabled: true,
          liveTraceVisible: false,
          responseMode: "smart",
          awarenessAnswerMode: "evidence-first"
        }}
        running={false}
        result={null}
        error={null}
        onRun={vi.fn(async () => {})}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Windows Suite" }));

    expect(screen.getByDisplayValue("SynAI Windows awareness eval")).toBeInTheDocument();
    expect(screen.getByDisplayValue("What is my CPU usage right now?")).toBeInTheDocument();
    expect(screen.getByDisplayValue("How much free storage do I have on my main drive?")).toBeInTheDocument();
    expect(screen.getByDisplayValue("What is using the most RAM right now?")).toBeInTheDocument();
    expect(screen.getByDisplayValue("wher is the bluetoth seting in windos?")).toBeInTheDocument();
  });

  it("runs the Windows awareness preset with evidence-first suite settings", () => {
    window.localStorage.clear();
    const onRun = vi.fn(async (_request: PromptEvaluationRequest) => {});

    render(
      <PromptEvaluationCard
        settings={{
          selectedModel: "phi4-mini:latest",
          defaultWebSearch: true,
          advancedRagEnabled: true,
          workspaceIndexingEnabled: true,
          webInRagEnabled: true,
          liveTraceVisible: true,
          responseMode: "fast",
          awarenessAnswerMode: "llm-primary"
        }}
        running={false}
        result={null}
        error={null}
        onRun={onRun}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Windows Suite" }));
    fireEvent.click(screen.getByRole("button", { name: "Run 4-Prompt Eval" }));

    expect(onRun).toHaveBeenCalledWith({
      suiteName: "SynAI Windows awareness eval",
      suiteMode: "windows-awareness",
      cases: [
        {
          id: "easy-prompt",
          label: "Easy",
          difficulty: "easy",
          prompt: "What is my CPU usage right now?",
          sourceScopeHint: "awareness-only",
          checks: [
            {
              id: "cpu-answer-mentions-cpu",
              kind: "includes-any",
              description: "Mention CPU usage clearly.",
              values: ["cpu", "processor"]
            },
            {
              id: "cpu-answer-stays-focused",
              kind: "excludes-all",
              description: "Do not add unrelated RAM or uptime details.",
              values: ["current ram", "uptime", "free on c", "free storage"]
            }
          ],
          routingExpectations: {
            awarenessUsed: true,
            deterministicAwareness: true
          },
          groundingExpectations: {
            minGroundedClaims: 1,
            maxUnsupportedClaims: 0,
            maxConflictedClaims: 0
          }
        },
        {
          id: "medium-prompt",
          label: "Medium",
          difficulty: "medium",
          prompt: "How much free storage do I have on my main drive?",
          sourceScopeHint: "awareness-only",
          checks: [
            {
              id: "storage-answer-mentions-storage",
              kind: "includes-any",
              description: "Mention free storage or drive space.",
              values: ["free", "storage", "drive", "space"]
            },
            {
              id: "storage-answer-stays-focused",
              kind: "excludes-all",
              description: "Do not add unrelated CPU, RAM, or uptime details.",
              values: ["current ram", "current cpu load", "uptime"]
            }
          ],
          routingExpectations: {
            awarenessUsed: true,
            deterministicAwareness: true
          },
          groundingExpectations: {
            minGroundedClaims: 1,
            maxUnsupportedClaims: 0,
            maxConflictedClaims: 0
          }
        },
        {
          id: "hard-prompt",
          label: "Hard",
          difficulty: "hard",
          prompt: "What is using the most RAM right now?",
          sourceScopeHint: "awareness-only",
          checks: [
            {
              id: "ram-answer-mentions-memory-hotspot",
              kind: "includes-any",
              description: "Mention RAM or memory usage and the top process.",
              values: ["ram", "memory", "process", "using the most"]
            },
            {
              id: "ram-answer-stays-focused",
              kind: "excludes-all",
              description: "Do not drift into unrelated storage or settings details.",
              values: ["free on c", "ms settings", "control panel", "registry"]
            }
          ],
          routingExpectations: {
            awarenessUsed: true,
            deterministicAwareness: true
          },
          groundingExpectations: {
            minGroundedClaims: 1,
            maxUnsupportedClaims: 0,
            maxConflictedClaims: 0
          }
        },
        {
          id: "edge-prompt",
          label: "Edge",
          difficulty: "edge",
          prompt: "wher is the bluetoth seting in windos?",
          sourceScopeHint: "awareness-only",
          checks: [
            {
              id: "bluetooth-answer-mentions-settings",
              kind: "includes-any",
              description: "Point to Bluetooth settings in Windows.",
              values: ["bluetooth", "settings", "control panel"]
            },
            {
              id: "bluetooth-answer-stays-focused",
              kind: "excludes-all",
              description: "Do not spill into unrelated registry or doc-snippet details.",
              values: [
                "uninstall",
                "hklm",
                "hkcu",
                "microsoft says",
                "skip to main content",
                "control exe sysdm cpl"
              ]
            }
          ],
          routingExpectations: {
            awarenessUsed: true,
            deterministicAwareness: true
          },
          groundingExpectations: {
            minGroundedClaims: 1,
            maxUnsupportedClaims: 0,
            maxConflictedClaims: 0
          }
        }
      ],
      modelOverride: "phi4-mini:latest",
      responseMode: "smart",
      awarenessAnswerMode: "evidence-first",
      useWebSearch: false,
      ragOptions: {
        defaultEnabled: true,
        defaultUseWeb: false,
        defaultShowTrace: false,
        workspaceIndexingEnabled: false
      }
    });
  });
});
