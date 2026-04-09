import type { ChatMessage, Conversation } from "../contracts/chat";
import type { ConversationSummary, MemoryEntry, RetrievedMemory } from "../contracts/memory";

export interface SynAIDatabase {
  conversations: Conversation[];
  messages: ChatMessage[];
  memories: MemoryEntry[];
  summaries: ConversationSummary[];
}

export interface RetrievalResult {
  retrieved: RetrievedMemory[];
  stable: MemoryEntry[];
}

export interface ContextBudget {
  maxChars: number;
  maxStableMemories: number;
  maxRetrievedMemories: number;
  maxRecentMessages: number;
}


