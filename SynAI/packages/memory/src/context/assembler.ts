import type { ChatMessage } from "../../../contracts/src/chat";
import type {
  AwarenessDigest,
  AwarenessQueryAnswer,
  ContextPreview,
  MemoryEntry,
  RetrievedMemory,
  WebSearchContext,
  WebSearchResult
} from "../../../contracts/src/memory";
import type { FileAwarenessSnapshot, MachineAwarenessSnapshot, ScreenAwarenessSnapshot } from "../../../contracts/src/awareness";
import { clipByChars, DEFAULT_CONTEXT_BUDGET, MAX_WEB_RESULTS_IN_PROMPT } from "./budget";
import {
  buildAwarenessContextSection,
  buildAwarenessQueryContextSection,
  buildFileAwarenessContextSection,
  buildMachineAwarenessContextSection,
  buildScreenAwarenessContextSection
} from "@awareness";

export interface AssembleContextInput {
  systemInstruction: string;
  summaryText: string;
  allMessages: ChatMessage[];
  stableMemories: MemoryEntry[];
  retrievedMemories: RetrievedMemory[];
  webSearch: WebSearchContext;
  awareness?: AwarenessDigest | null;
  awarenessQuery?: AwarenessQueryAnswer | null;
  machineAwareness?: MachineAwarenessSnapshot | null;
  fileAwareness?: FileAwarenessSnapshot | null;
  screenAwareness?: ScreenAwarenessSnapshot | null;
}

export interface AssembleContextResult {
  promptMessages: ChatMessage[];
  preview: ContextPreview;
}

const formatMemory = (memory: MemoryEntry): string =>
  `[${memory.category}] (${memory.importance.toFixed(2)}) ${memory.text}`;

const formatWebResult = (result: WebSearchResult): string =>
  `${result.title} | ${result.source}${result.publishedAt ? ` | ${result.publishedAt}` : ""}\n${result.snippet}\n${result.url}`;

const getLatestUserMessage = (messages: ChatMessage[]): string =>
  [...messages].reverse().find((message) => message.role === "user")?.content ?? "";

export const assembleContext = (input: AssembleContextInput): AssembleContextResult => {
  const stable = [...input.stableMemories]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, DEFAULT_CONTEXT_BUDGET.maxStableMemories);

  const retrieved = [...input.retrievedMemories]
    .sort((a, b) => b.score - a.score)
    .slice(0, DEFAULT_CONTEXT_BUDGET.maxRetrievedMemories);

  const recentMessages = input.allMessages.slice(-DEFAULT_CONTEXT_BUDGET.maxRecentMessages);
  const webResults = [...input.webSearch.results].slice(0, MAX_WEB_RESULTS_IN_PROMPT);
  const latestUserMessage = getLatestUserMessage(input.allMessages);
  const machineSection = buildMachineAwarenessContextSection(
    input.machineAwareness,
    latestUserMessage,
    input.awareness?.awarenessMode ?? "observe"
  );
  const fileSection = buildFileAwarenessContextSection(
    input.fileAwareness,
    latestUserMessage,
    input.awareness?.awarenessMode ?? "observe"
  );
  const screenSection = buildScreenAwarenessContextSection(
    input.screenAwareness,
    latestUserMessage,
    input.awareness?.awarenessMode ?? "observe"
  );
  const awarenessQuerySection = buildAwarenessQueryContextSection(
    input.awarenessQuery,
    latestUserMessage,
    input.awareness?.awarenessMode ?? "observe"
  );

  const sections = [
    input.systemInstruction,
    stable.length > 0 ? `Stable memory:\n${stable.map(formatMemory).join("\n")}` : "",
    retrieved.length > 0
      ? `Retrieved memory:\n${retrieved.map((item) => formatMemory(item.memory)).join("\n")}`
      : "",
    buildAwarenessContextSection(input.awareness),
    awarenessQuerySection,
    machineSection,
    fileSection,
    screenSection,
    input.summaryText ? `Rolling summary:\n${input.summaryText}` : "",
    input.webSearch.status === "used" && webResults.length > 0
      ? `Recent web results for "${input.webSearch.query}" (use these for time-sensitive facts and cite source names with dates when helpful):\n${webResults
          .map(formatWebResult)
          .join("\n\n")}`
      : ""
  ].filter(Boolean);

  const systemContent = clipByChars(sections.join("\n\n"), DEFAULT_CONTEXT_BUDGET.maxChars);
  const estimatedChars =
    systemContent.length +
    recentMessages.reduce((total, message) => total + message.content.length, 0);

  const promptMessages: ChatMessage[] = [
    {
      id: "system-context",
      conversationId: recentMessages[0]?.conversationId ?? "system",
      role: "system",
      content: systemContent,
      createdAt: new Date().toISOString()
    },
    ...recentMessages
  ];

  return {
    promptMessages,
    preview: {
      systemInstruction: input.systemInstruction,
      stableMemories: stable,
      retrievedMemories: retrieved,
      summarySnippet: clipByChars(input.summaryText, 600),
      recentMessagesCount: recentMessages.length,
      estimatedChars,
      webSearch: input.webSearch,
      awareness: input.awareness && input.awareness.includeInContext ? input.awareness : null,
      awarenessQuery: input.awarenessQuery ?? null,
      machineAwareness: machineSection ? input.machineAwareness?.summary ?? null : null,
      fileAwareness: fileSection ? input.fileAwareness?.summary ?? null : null,
      screenAwareness: screenSection ? input.screenAwareness?.summary ?? null : null
    }
  };
};
