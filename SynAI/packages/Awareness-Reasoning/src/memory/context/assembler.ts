import type { ChatMessage } from "../../contracts/chat";
import type {
  ContextPreview,
  MemoryEntry,
  RetrievedMemory,
  WebSearchContext,
  WebSearchResult
} from "../../contracts/memory";
import type { RagContextPreview, WorkspaceChunkHit } from "../../contracts/rag";
import type {
  AwarenessAnswerMode,
  AwarenessDigest,
  OfficialKnowledgeContext,
  AwarenessQueryAnswer,
  FileAwarenessSnapshot,
  MachineAwarenessSnapshot,
  ScreenAwarenessSnapshot
} from "../../contracts/awareness";
import { clipByChars, DEFAULT_CONTEXT_BUDGET, MAX_WEB_RESULTS_IN_PROMPT } from "./budget";
import {
  buildAwarenessContextSection,
  buildOfficialKnowledgeContextSection,
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
  workspaceHits?: WorkspaceChunkHit[];
  webSearch: WebSearchContext;
  awareness?: AwarenessDigest | null;
  awarenessQuery?: AwarenessQueryAnswer | null;
  awarenessAnswerMode?: AwarenessAnswerMode | null;
  officialKnowledge?: OfficialKnowledgeContext | null;
  machineAwareness?: MachineAwarenessSnapshot | null;
  fileAwareness?: FileAwarenessSnapshot | null;
  screenAwareness?: ScreenAwarenessSnapshot | null;
  rag?: RagContextPreview | null;
}

export interface AssembleContextResult {
  promptMessages: ChatMessage[];
  preview: ContextPreview;
}

const formatMemory = (memory: MemoryEntry): string =>
  `[${memory.category}] (${memory.importance.toFixed(2)}) ${memory.text}`;

const formatWebResult = (result: WebSearchResult): string =>
  `${result.title} | ${result.source}${result.publishedAt ? ` | ${result.publishedAt}` : ""}\n${result.snippet}\n${result.url}`;

const formatWorkspaceHit = (hit: WorkspaceChunkHit, index: number): string =>
  `[WS${index + 1}] ${hit.relativePath}:${hit.startLine}-${hit.endLine} | ${hit.reason} | score ${hit.score.toFixed(
    2
  )}\n${hit.excerpt}`;

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
  const workspaceHits = [...(input.workspaceHits ?? input.rag?.workspaceHits ?? [])].slice(0, 4);
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
  const officialKnowledgeSection = buildOfficialKnowledgeContextSection(input.officialKnowledge);
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
    workspaceHits.length > 0
      ? `Workspace context:\n${workspaceHits.map((hit, index) => formatWorkspaceHit(hit, index)).join("\n\n")}`
      : "",
    buildAwarenessContextSection(input.awareness),
    officialKnowledgeSection,
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
      workspaceHits,
      summarySnippet: clipByChars(input.summaryText, 600),
      recentMessagesCount: recentMessages.length,
      estimatedChars,
      webSearch: input.webSearch,
      awareness: input.awareness && input.awareness.includeInContext ? input.awareness : null,
      awarenessQuery: input.awarenessQuery ?? null,
      awarenessAnswerMode: input.awarenessAnswerMode ?? null,
      awarenessGrounding: input.awarenessQuery
        ? {
            status: input.awarenessQuery.bundle.groundingStatus,
            confidenceLevel: input.awarenessQuery.bundle.confidenceLevel,
            isFresh: input.awarenessQuery.bundle.freshness.isFresh,
            ageMs: input.awarenessQuery.bundle.freshness.ageMs,
            traceCount: input.awarenessQuery.bundle.evidenceTraceIds.length
          }
        : null,
      officialKnowledge: input.officialKnowledge ?? null,
      machineAwareness: machineSection ? input.machineAwareness?.summary ?? null : null,
      fileAwareness: fileSection ? input.fileAwareness?.summary ?? null : null,
      screenAwareness: screenSection ? input.screenAwareness?.summary ?? null : null,
      startupDigest: input.awareness?.startupDigest ?? null,
      awarenessRuntime: null,
      rag: input.rag ?? null
    }
  };
};



