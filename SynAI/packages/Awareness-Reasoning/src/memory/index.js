import { assembleContext } from "./context/assembler";
import { buildRollingSummary } from "./processing/summarizer";
import { extractMemoriesFromText } from "./processing/memory-extractor";
import { findSimilarMemory } from "./processing/dedupe";
import { scoreImportance } from "./processing/importance";
import { keywordRetrieve } from "./retrieval/keyword";
import { rankRetrievedMemories } from "./retrieval/ranking";
import { semanticRetrieve } from "./retrieval/semantic";
import { createConversation, deleteConversation, getConversation, listConversations, renameConversation, touchConversation } from "./storage/conversations";
import { configureDatabasePath, loadDatabase } from "./storage/db";
import { addMessage, clearMessages, listMessages } from "./storage/messages";
import { batchUpsertMemories, deleteMemory, listMemories, searchMemoryKeywords } from "./storage/memories";
import { deleteSummary, getSummary, upsertSummary } from "./storage/summaries";
import { queryWorkspaceIndex } from "../retrieval";
const SYSTEM_INSTRUCTION = [
    "You are SynAI local assistant.",
    "Write like a natural, helpful teammate.",
    "Always answer in simple, plain language.",
    "Start with the answer the user wants.",
    "Keep most replies to one short paragraph or up to 4 short bullets unless the user asks for more detail.",
    "Do not repeat the same point in multiple ways.",
    "Avoid report-style headings and markdown emphasis unless the user asks for them.",
    "When the user asks for exact bullets, labels, sections, or source boundaries, follow those exactly.",
    "Do not add facts that are not supported by the allowed evidence in context.",
    "If local evidence already answers the question, answer directly instead of telling the user how to look it up.",
    "Follow user constraints and decisions from memory."
].join(" ");
export const memorySystemInstruction = SYSTEM_INSTRUCTION;
const emptyWebSearch = (query = "") => ({
    status: "off",
    query,
    results: []
});
export const configureMemoryDatabase = (path) => {
    configureDatabasePath(path);
};
export const createConversationRecord = async () => createConversation();
export const listConversationRecords = async () => listConversations();
export const loadConversationRecord = async (conversationId) => {
    const conversation = await getConversation(conversationId);
    if (!conversation) {
        return null;
    }
    const messages = await listMessages(conversationId);
    return { conversation, messages };
};
export const deleteConversationRecord = async (conversationId) => {
    await deleteConversation(conversationId);
};
export const clearConversationMessages = async (conversationId) => {
    await clearMessages(conversationId);
    await deleteSummary(conversationId);
};
export const appendChatMessage = async (conversationId, role, content, sources, metadata) => {
    const message = await addMessage(conversationId, role, content, sources, metadata);
    await touchConversation(conversationId);
    return message;
};
export const updateConversationTitleFromMessages = async (conversationId, fallback) => {
    const messages = await listMessages(conversationId);
    if (messages.length < 2) {
        return;
    }
    const userText = messages.find((message) => message.role === "user")?.content ?? fallback;
    const title = userText.replace(/\s+/g, " ").trim().slice(0, 52) || "New conversation";
    await renameConversation(conversationId, title);
};
export const refreshRollingSummary = async (conversationId) => {
    const messages = await listMessages(conversationId);
    const rolling = buildRollingSummary(messages);
    if (!rolling.summary) {
        return;
    }
    await upsertSummary(conversationId, rolling.summary, rolling.summarizedCount);
};
export const extractAndStoreMemories = async (conversationId, text) => {
    const extracted = extractMemoriesFromText(text);
    if (extracted.length === 0) {
        return [];
    }
    const currentMemories = await listMemories();
    // Resolve deduplication before batching so all upserts go into one DB write
    const candidates = extracted.map((candidate) => {
        const similar = findSimilarMemory(candidate.text, currentMemories);
        return {
            category: candidate.category,
            text: similar?.text ?? candidate.text,
            sourceConversationId: conversationId,
            importance: scoreImportance(candidate.category, candidate.text)
        };
    });
    return batchUpsertMemories(candidates);
};
const emptyRetrievalStats = () => ({
    memoryKeyword: 0,
    memorySemantic: 0,
    workspace: 0,
    awareness: 0,
    web: 0,
    total: 0
});
const withRetrievalTotal = (stats) => ({
    ...stats,
    total: stats.memoryKeyword + stats.memorySemantic + stats.workspace + stats.awareness + stats.web
});
export const preparePromptContext = async (conversationId, latestUserMessage, options = {}) => {
    const [messages, summary, allMemories] = await Promise.all([
        listMessages(conversationId),
        getSummary(conversationId),
        listMemories()
    ]);
    const keywordRetrieved = keywordRetrieve(latestUserMessage, allMemories);
    const semanticRetrieved = options.enableSemanticMemory
        ? await semanticRetrieve(latestUserMessage, allMemories, {
            embedder: options.memoryEmbedder
        })
        : [];
    const retrievedMemories = rankRetrievedMemories(keywordRetrieved, semanticRetrieved, 6);
    const stableMemories = allMemories.filter((memory) => memory.importance >= 0.75).slice(0, 8);
    const workspaceResult = options.workspace
        ? await queryWorkspaceIndex(latestUserMessage, options.workspace)
        : null;
    const retrieval = withRetrievalTotal({
        memoryKeyword: keywordRetrieved.slice(0, 6).length,
        memorySemantic: semanticRetrieved.slice(0, 6).length,
        workspace: workspaceResult?.hits.length ?? 0,
        awareness: 0,
        web: 0,
        total: 0
    });
    return {
        latestUserMessage,
        messages,
        summaryText: summary?.text ?? "",
        stableMemories,
        retrievedMemories,
        workspaceHits: workspaceResult?.hits ?? [],
        workspaceIndexStatus: workspaceResult?.status ?? null,
        retrieval
    };
};
export const finalizePromptContext = (context, webSearch = emptyWebSearch(context.latestUserMessage), awareness = null, awarenessQuery = null, awarenessAnswerMode = null, officialKnowledge = null, machineAwareness = null, fileAwareness = null, screenAwareness = null, ragContext = null, runtimePreview = null) => assembleContext({
    systemInstruction: SYSTEM_INSTRUCTION,
    summaryText: context.summaryText,
    allMessages: context.messages,
    stableMemories: context.stableMemories,
    retrievedMemories: context.retrievedMemories,
    workspaceHits: context.workspaceHits,
    webSearch,
    awareness,
    awarenessQuery,
    awarenessAnswerMode,
    officialKnowledge,
    machineAwareness,
    fileAwareness,
    screenAwareness,
    runtimePreview,
    rag: ragContext
});
export const buildContextPreview = async (conversationId, latestUserMessage, webSearch = emptyWebSearch(latestUserMessage), awareness = null, awarenessQuery = null, awarenessAnswerMode = null, officialKnowledge = null, machineAwareness = null, fileAwareness = null, screenAwareness = null, ragContext = null, options = {}, runtimePreview = null) => {
    return finalizePromptContext(await preparePromptContext(conversationId, latestUserMessage, options), webSearch, awareness, awarenessQuery, awarenessAnswerMode, officialKnowledge, machineAwareness, fileAwareness, screenAwareness, ragContext, runtimePreview).preview;
};
export const buildPromptMessages = async (conversationId, latestUserMessage, webSearch = emptyWebSearch(latestUserMessage), awareness = null, awarenessQuery = null, awarenessAnswerMode = null, officialKnowledge = null, machineAwareness = null, fileAwareness = null, screenAwareness = null, ragContext = null, options = {}, runtimePreview = null) => {
    const assembled = finalizePromptContext(await preparePromptContext(conversationId, latestUserMessage, options), webSearch, awareness, awarenessQuery, awarenessAnswerMode, officialKnowledge, machineAwareness, fileAwareness, screenAwareness, ragContext, runtimePreview);
    return {
        promptMessages: assembled.promptMessages,
        contextPreview: assembled.preview
    };
};
export const listMemoryRecords = async () => listMemories();
export const searchMemoryRecords = async (query) => searchMemoryKeywords(query);
export const deleteMemoryRecord = async (memoryId) => deleteMemory(memoryId);
export const snapshotDatabase = async () => loadDatabase();
export * from "./types";
export * from "./storage/db";
export * from "./storage/conversations";
export * from "./storage/messages";
export * from "./storage/memories";
export * from "./storage/summaries";
export * from "./retrieval/keyword";
export * from "./retrieval/ranking";
export * from "./retrieval/semantic";
export * from "./processing/summarizer";
export * from "./processing/memory-extractor";
export * from "./processing/importance";
export * from "./processing/dedupe";
export * from "./context/assembler";
export * from "./context/budget";
