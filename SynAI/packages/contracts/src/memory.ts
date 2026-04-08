export type MemoryCategory =
  | "preference"
  | "personal_fact"
  | "project"
  | "goal"
  | "constraint"
  | "decision"
  | "note";

export interface MemoryEntry {
  id: string;
  category: MemoryCategory;
  text: string;
  sourceConversationId: string;
  createdAt: string;
  updatedAt: string;
  importance: number;
  archived: boolean;
  keywords: string[];
}

export interface ConversationSummary {
  id: string;
  conversationId: string;
  text: string;
  sourceMessageCount: number;
  updatedAt: string;
}

export interface RetrievedMemory {
  memory: MemoryEntry;
  score: number;
  reason: "keyword" | "semantic";
}

export type WebSearchStatus = "off" | "used" | "no_results" | "error";

export interface WebSearchResult {
  title: string;
  url: string;
  source: string;
  snippet: string;
  publishedAt: string | null;
}

export interface WebSearchContext {
  status: WebSearchStatus;
  query: string;
  results: WebSearchResult[];
  error?: string;
}

export interface ContextPreview {
  systemInstruction: string;
  stableMemories: MemoryEntry[];
  retrievedMemories: RetrievedMemory[];
  summarySnippet: string;
  recentMessagesCount: number;
  estimatedChars: number;
  webSearch: WebSearchContext;
}
