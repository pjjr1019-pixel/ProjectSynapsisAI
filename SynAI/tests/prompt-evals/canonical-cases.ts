import type {
  PromptEvaluationCaseInput,
  PromptEvaluationGroundingExpectations,
  PromptEvaluationRoutingExpectations
} from "@contracts";

const groundedAnswerExpectation: PromptEvaluationGroundingExpectations = {
  minGroundedClaims: 1,
  maxUnsupportedClaims: 0,
  maxConflictedClaims: 0
};

const repoScopedExpectation: PromptEvaluationRoutingExpectations = {
  awarenessUsed: false,
  deterministicAwareness: false,
  genericWritingPromptSuppressed: false
};

export const canonicalPromptEvalCases: PromptEvaluationCaseInput[] = [
  {
    id: "readme-exact-time-sensitive",
    label: "README exact time-sensitive",
    difficulty: "edge",
    prompt:
      "Using the current SynAI README, explain how time-sensitive prompts are handled. Answer in exactly 3 short bullets labeled Trigger, Action, and Surfacing. Include the phrases `recent web search` and `Context Preview`.",
    sourceScopeHint: "readme-only",
    formatPolicy: "preserve-exact-structure",
    checks: [
      {
        id: "readme-time-sensitive-bullets",
        kind: "bullet-count",
        description: "Use exactly 3 bullets.",
        exact: 3
      },
      {
        id: "readme-time-sensitive-prefixes",
        kind: "line-prefixes",
        description: "Use the required bullet labels in order.",
        values: ["- Trigger", "- Action", "- Surfacing"]
      },
      {
        id: "readme-time-sensitive-phrases",
        kind: "includes-all",
        description: "Use the README-specific anchor phrases.",
        values: ["recent web search", "Context Preview"]
      }
    ],
    routingExpectations: {
      ...repoScopedExpectation,
      classifierCategories: {
        repo_grounded: true,
        exact_format: true,
        time_sensitive: true
      }
    },
    groundingExpectations: groundedAnswerExpectation
  },
  {
    id: "docs-only-windows-routing",
    label: "Docs-only Windows routing",
    difficulty: "hard",
    prompt:
      "Using the current repo docs only, explain where Windows awareness answers get formatted in the app. Use exactly 2 short bullets labeled Evidence and Routing.",
    sourceScopeHint: "docs-only",
    formatPolicy: "preserve-exact-structure",
    checks: [
      {
        id: "docs-only-windows-routing-bullets",
        kind: "bullet-count",
        description: "Use exactly 2 bullets.",
        exact: 2
      },
      {
        id: "docs-only-windows-routing-prefixes",
        kind: "line-prefixes",
        description: "Use the required labels in order.",
        values: ["- Evidence", "- Routing"]
      }
    ],
    routingExpectations: {
      ...repoScopedExpectation,
      classifierCategories: {
        repo_grounded: true,
        exact_format: true,
        awareness_local_state: true
      }
    },
    groundingExpectations: groundedAnswerExpectation
  },
  {
    id: "awareness-cpu-right-now",
    label: "Awareness CPU right now",
    difficulty: "easy",
    prompt: "What is my CPU usage right now?",
    sourceScopeHint: "awareness-only",
    checks: [
      {
        id: "awareness-cpu-mentions-cpu",
        kind: "includes-any",
        description: "Mention CPU or processor usage.",
        values: ["cpu", "processor"]
      }
    ],
    routingExpectations: {
      awarenessUsed: true,
      deterministicAwareness: true,
      classifierCategories: {
        awareness_local_state: true,
        time_sensitive: true
      }
    },
    groundingExpectations: groundedAnswerExpectation
  },
  {
    id: "time-sensitive-live-latest",
    label: "Time-sensitive live latest",
    difficulty: "hard",
    prompt:
      "What is the latest Windows release-health guidance today? Answer in exactly 2 short bullets labeled Date and Impact.",
    sourceScopeHint: "time-sensitive-live",
    formatPolicy: "preserve-exact-structure",
    checks: [
      {
        id: "time-sensitive-live-bullets",
        kind: "bullet-count",
        description: "Use exactly 2 bullets.",
        exact: 2
      },
      {
        id: "time-sensitive-live-prefixes",
        kind: "line-prefixes",
        description: "Use the required labels in order.",
        values: ["- Date", "- Impact"]
      }
    ],
    routingExpectations: {
      awarenessUsed: false,
      deterministicAwareness: false,
      genericWritingPromptSuppressed: false,
      classifierCategories: {
        exact_format: true,
        time_sensitive: true
      }
    }
  },
  {
    id: "generic-writing-suppressed",
    label: "Generic writing suppressed",
    difficulty: "medium",
    prompt:
      "Rewrite this reply to sound calmer without changing its meaning. Use exactly 2 bullets labeled Tone and Fix.",
    sourceScopeHint: "workspace-only",
    formatPolicy: "preserve-exact-structure",
    checks: [
      {
        id: "generic-writing-bullets",
        kind: "bullet-count",
        description: "Use exactly 2 bullets.",
        exact: 2
      },
      {
        id: "generic-writing-prefixes",
        kind: "line-prefixes",
        description: "Use the required labels in order.",
        values: ["- Tone", "- Fix"]
      }
    ],
    routingExpectations: {
      awarenessUsed: false,
      deterministicAwareness: false,
      genericWritingPromptSuppressed: true,
      classifierCategories: {
        exact_format: true,
        generic_writing: true
      }
    }
  },
  {
    id: "first-time-task-decomposition",
    label: "First-time task decomposition",
    difficulty: "medium",
    prompt:
      "I am using SynAI for the first time. Walk me through how to inspect a repo change safely. Use sections titled Goal, Steps, and Risks.",
    sourceScopeHint: "repo-wide",
    formatPolicy: "preserve-exact-structure",
    checks: [
      {
        id: "first-time-task-sections",
        kind: "includes-all",
        description: "Use the requested sections.",
        values: ["Goal", "Steps", "Risks"]
      }
    ],
    routingExpectations: {
      ...repoScopedExpectation,
      classifierCategories: {
        repo_grounded: true,
        exact_format: true,
        first_time_task: true
      }
    },
    groundingExpectations: groundedAnswerExpectation
  },
  {
    id: "readme-uncertainty-no-evidence",
    label: "README uncertainty no evidence",
    difficulty: "edge",
    prompt:
      "Based on the current README only, what cloud sync architecture is already implemented today? If the README does not confirm it, say that clearly in one sentence.",
    sourceScopeHint: "readme-only",
    formatPolicy: "preserve-exact-structure",
    checks: [
      {
        id: "readme-uncertainty-sentence",
        kind: "sentence-count",
        description: "Keep the uncertainty answer to one sentence.",
        exact: 1
      },
      {
        id: "readme-uncertainty-no-overclaim",
        kind: "includes-any",
        description: "Make the lack of evidence clear.",
        values: ["not confirmed", "does not confirm", "not documented"]
      }
    ],
    routingExpectations: {
      ...repoScopedExpectation,
      classifierCategories: {
        repo_grounded: true,
        exact_format: true,
        time_sensitive: true
      }
    },
    groundingExpectations: {
      maxUnsupportedClaims: 0,
      maxConflictedClaims: 0
    }
  },
  {
    id: "simple-human-reply-style",
    label: "Simple human reply style",
    difficulty: "medium",
    prompt:
      "Explain what governance approval means in this app. Keep it simple, easy to read, and human. Use exactly 2 short bullets labeled Meaning and Why.",
    sourceScopeHint: "workspace-only",
    formatPolicy: "preserve-exact-structure",
    checks: [
      {
        id: "simple-human-style-bullets",
        kind: "bullet-count",
        description: "Use exactly 2 bullets.",
        exact: 2
      },
      {
        id: "simple-human-style-prefixes",
        kind: "line-prefixes",
        description: "Use the required labels in order.",
        values: ["- Meaning", "- Why"]
      },
      {
        id: "simple-human-style-phrases",
        kind: "includes-any",
        description: "Use simple tone signals.",
        values: ["approval", "safe", "before"]
      },
      {
        id: "simple-human-style-no-robotic-filler",
        kind: "excludes-all",
        description: "Avoid robotic filler phrasing.",
        values: ["as an ai", "let me know if you'd like", "i cannot"]
      },
      {
        id: "simple-human-style-concise",
        kind: "sentence-count",
        description: "Keep the explanation short.",
        min: 1,
        max: 3
      }
    ],
    routingExpectations: {
      awarenessUsed: false,
      deterministicAwareness: false,
      genericWritingPromptSuppressed: true,
      classifierCategories: {
        generic_writing: true,
        exact_format: true
      }
    }
  },
  {
    id: "ambiguous-action-clarification",
    label: "Ambiguous action clarification",
    difficulty: "hard",
    prompt: "Delete a folder for me.",
    sourceScopeHint: "workspace-only",
    checks: [
      {
        id: "ambiguous-action-asks-for-target",
        kind: "includes-any",
        description: "Ask for the missing target folder.",
        values: ["which folder", "folder path", "target folder", "need the folder"]
      },
      {
        id: "ambiguous-action-keeps-it-short",
        kind: "sentence-count",
        description: "Keep clarification short and readable.",
        min: 1,
        max: 3
      },
      {
        id: "ambiguous-action-no-fake-completion",
        kind: "excludes-all",
        description: "Do not claim completion before clarification.",
        values: ["done", "deleted", "completed"]
      }
    ],
    routingExpectations: {
      awarenessUsed: false,
      deterministicAwareness: false,
      classifierCategories: {
        governed_action: true
      }
    }
  }
];
