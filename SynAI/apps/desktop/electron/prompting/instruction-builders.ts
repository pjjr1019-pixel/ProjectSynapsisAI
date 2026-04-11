import type {
  AwarenessAnswerMode,
  ChatMessage,
  PlanningPolicy,
  ChatReplyPolicy,
  PromptIntentContract,
  RagContextPreview,
  ReasoningProfile,
  ResponseMode
} from "@contracts";

export const responseModeInstruction = (mode: ResponseMode | undefined): string => {
  switch (mode) {
    case "fast":
      return "Reply style: prioritize quick, direct answers. Keep it short, plain-language, and human. Use 1-2 short sentences unless bullets are clearly better.";
    case "smart":
      return "Reply style: be careful and context-aware, but keep the wording simple and natural. Start with a direct answer, then only the most useful details.";
    default:
      return "Reply style: be clear, concise, and easy to read. Sound like a helpful human teammate, not a report. Prefer a short direct answer and a few short bullets over long paragraphs.";
  }
};

export const awarenessAnswerModeInstruction = (mode: AwarenessAnswerMode): string => {
  if (mode === "llm-primary") {
    return "Awareness answer mode: llm-primary. Use awareness context when relevant, but keep normal conversational behavior.";
  }

  return [
    "Awareness answer mode: evidence-first.",
    "Use retrieved local evidence first and avoid unsupported claims.",
    "If verified local evidence already answers the question, answer directly from that evidence.",
    "Do not tell the user to manually look up information you already have.",
    "Keep answers short and simple by default, with plain words and short sentences.",
    "Use this order when helpful:",
    "Direct answer",
    "Key facts",
    "Unclear or next checks only if needed"
  ].join("\n");
};

export const ragModeInstruction = (mode: RagContextPreview["mode"]): string =>
  mode === "advanced"
    ? [
        "Advanced RAG mode is active.",
        "Use retrieved memory, workspace evidence, awareness context, and optional web results together.",
        "Build a short internal plan, then answer from the evidence.",
        "Do not expose hidden chain-of-thought. Keep the final answer concise and grounded."
      ].join("\n")
    : "Fast mode is active. Answer directly and stay concise.";

export const reasoningProfileInstruction = (
  profile: ReasoningProfile | null | undefined
): string => {
  switch (profile) {
    case "research":
      return [
        "Reasoning profile: research.",
        "Use broader evidence and stronger grounding before conclusions.",
        "Prefer citing repo/workspace evidence when relevant.",
        "Allow longer answers only when depth materially helps."
      ].join("\n");
    case "action":
      return [
        "Reasoning profile: action.",
        "Use task-oriented language and clarify ambiguous target/scope before proposing execution.",
        "Separate direct answers from governed-task framing.",
        "Stay preview-first and approval-aware for system-changing work."
      ].join("\n");
    case "chat":
    default:
      return [
        "Reasoning profile: chat.",
        "Prefer direct, concise answers with low overhead.",
        "Avoid over-analysis for simple prompts."
      ].join("\n");
  }
};

export const planningPolicyInstruction = (
  planningPolicy: PlanningPolicy | null | undefined
): string => {
  switch (planningPolicy) {
    case "forced":
      return "Internal planning policy: forced. Build a brief structured plan before synthesis.";
    case "auto":
      return "Internal planning policy: auto. Plan only when complexity requires it.";
    case "off":
      return "Internal planning policy: off. Skip decomposition unless safety requires clarification.";
    default:
      return "";
  }
};

export const replyPolicyInstruction = (policy: ChatReplyPolicy): string => {
  const lines = [
    `Reply policy: source scope = ${policy.sourceScope}.`,
    "Use plain language and avoid robotic phrasing."
  ];

  switch (policy.sourceScope) {
    case "readme-only":
      lines.push("Use only README evidence already present in context for product facts.");
      break;
    case "docs-only":
      lines.push("Use only docs and README evidence already present in context for product facts.");
      break;
    case "repo-wide":
      lines.push("Use only current repo evidence already present in context for product facts.");
      break;
    case "awareness-only":
      lines.push("Use awareness evidence first for Windows and system answers.");
      break;
    case "time-sensitive-live":
      lines.push("Prefer recent live evidence for time-sensitive facts and keep dates or source names clear.");
      break;
    default:
      lines.push("Use local workspace evidence when it is available.");
      break;
  }

  if (policy.formatPolicy === "preserve-exact-structure") {
    lines.push("Follow the user's exact bullets, labels, sections, and counts.");
  }

  if (policy.groundingPolicy === "source-boundary") {
    lines.push(
      "Do not add facts beyond the allowed source scope. If evidence is missing, omit the claim or say it is not confirmed."
    );
  } else if (policy.groundingPolicy === "awareness-direct") {
    lines.push("Answer directly from evidence. If evidence is incomplete, state uncertainty and give the single best next check.");
  }

  if (policy.routingPolicy === "chat-first-source-scoped") {
    lines.push("Treat this as a repo-grounded chat request, not a Windows awareness request.");
  } else if (policy.routingPolicy === "windows-explicit-only") {
    lines.push("Use Windows awareness only when the question is explicitly about Windows or local machine state.");
  }

  return lines.join("\n");
};

export const buildPromptIntentInstruction = (promptIntent: PromptIntentContract | null | undefined): string => {
  if (!promptIntent) {
    return "";
  }

  const lines = [
    "Prompt intent:",
    `- Family: ${promptIntent.intentFamily}`,
    `- Goal: ${promptIntent.userGoal}`,
    `- Source scope: ${promptIntent.sourceScope}`,
    `- Output: ${promptIntent.outputContract.shape} | ${promptIntent.outputContract.length}${promptIntent.outputContract.preserveExactStructure ? " | preserve exact structure" : ""}`
  ];

  if (promptIntent.constraints.length > 0) {
    lines.push(`- Constraints: ${promptIntent.constraints.join(" | ")}`);
  }
  if (promptIntent.ambiguityFlags.length > 0) {
    lines.push(`- Ambiguity flags: ${promptIntent.ambiguityFlags.join(" | ")}`);
  }
  if (promptIntent.missingEvidence.length > 0) {
    lines.push(`- Missing evidence: ${promptIntent.missingEvidence.join(" | ")}`);
  }
  if (promptIntent.requiredChecks.length > 0) {
    lines.push(`- Required checks: ${promptIntent.requiredChecks.join(" | ")}`);
  }

  return lines.join("\n");
};

export const applyPromptPolicies = (
  promptMessages: ChatMessage[],
  responseMode: ResponseMode | undefined,
  awarenessAnswerMode: AwarenessAnswerMode,
  ragMode: RagContextPreview["mode"] = "fast",
  replyPolicy?: ChatReplyPolicy | null,
  promptIntent?: PromptIntentContract | null,
  reasoningProfile?: ReasoningProfile | null,
  planningPolicy?: PlanningPolicy | null
): ChatMessage[] =>
  promptMessages.map((message, index) =>
    index === 0 && message.role === "system"
      ? {
          ...message,
          content: [
            message.content,
            responseModeInstruction(responseMode),
            awarenessAnswerModeInstruction(awarenessAnswerMode),
            ragModeInstruction(ragMode),
            reasoningProfileInstruction(reasoningProfile),
            planningPolicyInstruction(planningPolicy),
            replyPolicy ? replyPolicyInstruction(replyPolicy) : "",
            buildPromptIntentInstruction(promptIntent)
          ]
            .filter(Boolean)
            .join("\n\n")
        }
      : message
  );
