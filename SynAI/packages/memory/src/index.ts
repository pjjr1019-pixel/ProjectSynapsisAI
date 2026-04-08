import type { ChatMessage } from "../../contracts/src/chat";
import type {
  ContextPreview,
  MemoryEntry,
  RetrievedMemory,
  WebSearchContext
} from "../../contracts/src/memory";
import { assembleContext } from "./context/assembler";
import { buildRollingSummary } from "./processing/summarizer";
import { extractMemoriesFromText } from "./processing/memory-extractor";
import { findSimilarMemory } from "./processing/dedupe";
import { scoreImportance } from "./processing/importance";
import { keywordRetrieve } from "./retrieval/keyword";
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
  touchConversation
} from "./storage/conversations";
import { configureDatabasePath, loadDatabase } from "./storage/db";
import { addMessage, clearMessages, listMessages } from "./storage/messages";
import { deleteMemory, listMemories, searchMemoryKeywords, upsertMemory } from "./storage/memories";
import { deleteSummary, getSummary, upsertSummary } from "./storage/summaries";

const SYSTEM_INSTRUCTION =
  "You are SynAI local assistant. Be concise, helpful, and follow user constraints and decisions from memory.";

export const memorySystemInstruction = SYSTEM_INSTRUCTION;

const emptyWebSearch = (query = ""): WebSearchContext => ({
  status: "off",
  query,
  results: []
});

export const configureMemoryDatabase = (path: string): void => {
  configureDatabasePath(path);
};

export const createConversationRecord = async () => createConversation();
export const listConversationRecords = async () => listConversations();
export const loadConversationRecord = async (conversationId: string) => {
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    return null;
  }
  const messages = await listMessages(conversationId);
  return { conversation, messages };
};

export const deleteConversationRecord = async (conversationId: string): Promise<void> => {
  await deleteConversation(conversationId);
};

export const clearConversationMessages = async (conversationId: string) => {
  await clearMessages(conversationId);
  await deleteSummary(conversationId);
};

export const appendChatMessage = async (
  conversationId: string,
  role: ChatMessage["role"],
  content: string
) => {
  const message = await addMessage(conversationId, role, content);
  await touchConversation(conversationId);
  return message;
};

export const updateConversationTitleFromMessages = async (
  conversationId: string,
  fallback: string
): Promise<void> => {
  const messages = await listMessages(conversationId);
  if (messages.length < 2) {
    return;
  }
  const userText = messages.find((message) => message.role === "user")?.content ?? fallback;
  const title = userText.replace(/\s+/g, " ").trim().slice(0, 52) || "New conversation";
  await renameConversation(conversationId, title);
};

export const refreshRollingSummary = async (conversationId: string): Promise<void> => {
  const messages = await listMessages(conversationId);
  const rolling = buildRollingSummary(messages);
  if (!rolling.summary) {
    return;
  }
  await upsertSummary(conversationId, rolling.summary, rolling.summarizedCount);
};

export const extractAndStoreMemories = async (
  conversationId: string,
  text: string
): Promise<MemoryEntry[]> => {
  const extracted = extractMemoriesFromText(text);
  if (extracted.length === 0) {
    return [];
  }
  const currentMemories = await listMemories();
  const stored: MemoryEntry[] = [];
  for (const candidate of extracted) {
    const similar = findSimilarMemory(candidate.text, currentMemories);
    const textToPersist = similar?.text ?? candidate.text;
    const memory = await upsertMemory({
      category: candidate.category,
      text: textToPersist,
      sourceConversationId: conversationId,
      importance: scoreImportance(candidate.category, candidate.text)
    });
    stored.push(memory);
  }
  return stored;
};

export interface LoadedPromptContext {
  latestUserMessage: string;
  messages: ChatMessage[];
  summaryText: string;
  stableMemories: MemoryEntry[];
  retrievedMemories: RetrievedMemory[];
}

export const preparePromptContext = async (
  conversationId: string,
  latestUserMessage: string
): Promise<LoadedPromptContext> => {
  const [messages, summary, allMemories] = await Promise.all([
    listMessages(conversationId),
    getSummary(conversationId),
    listMemories()
  ]);
  const retrievedMemories = keywordRetrieve(latestUserMessage, allMemories).slice(0, 6);
  const stableMemories = allMemories.filter((memory) => memory.importance >= 0.75).slice(0, 8);

  return {
    latestUserMessage,
    messages,
    summaryText: summary?.text ?? "",
    stableMemories,
    retrievedMemories
  };
};

export const finalizePromptContext = (
  context: LoadedPromptContext,
  webSearch: WebSearchContext = emptyWebSearch(context.latestUserMessage)
): ReturnType<typeof assembleContext> =>
  assembleContext({
    systemInstruction: SYSTEM_INSTRUCTION,
    summaryText: context.summaryText,
    allMessages: context.messages,
    stableMemories: context.stableMemories,
    retrievedMemories: context.retrievedMemories,
    webSearch
  });

export const buildContextPreview = async (
  conversationId: string,
  latestUserMessage: string,
  webSearch: WebSearchContext = emptyWebSearch(latestUserMessage)
): Promise<ContextPreview> => {
  return finalizePromptContext(await preparePromptContext(conversationId, latestUserMessage), webSearch).preview;
};

export const buildPromptMessages = async (
  conversationId: string,
  latestUserMessage: string,
  webSearch: WebSearchContext = emptyWebSearch(latestUserMessage)
): Promise<{ promptMessages: ChatMessage[]; contextPreview: ContextPreview }> => {
  const assembled = finalizePromptContext(
    await preparePromptContext(conversationId, latestUserMessage),
    webSearch
  );
  return {
    promptMessages: assembled.promptMessages,
    contextPreview: assembled.preview
  };
};

export const listMemoryRecords = async () => listMemories();
export const searchMemoryRecords = async (query: string) => searchMemoryKeywords(query);
export const deleteMemoryRecord = async (memoryId: string) => deleteMemory(memoryId);

export const snapshotDatabase = async () => loadDatabase();

export * from "./types";
export * from "./storage/db";
export * from "./storage/conversations";
export * from "./storage/messages";
export * from "./storage/memories";
export * from "./storage/summaries";
export * from "./retrieval/keyword";
export * from "./processing/summarizer";
export * from "./processing/memory-extractor";
export * from "./processing/importance";
export * from "./processing/dedupe";
export * from "./context/assembler";
export * from "./context/budget";
