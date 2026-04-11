import type { ChatMessage, Conversation } from "../contracts/chat";
import type { ConversationSummary, MemoryEntry, RetrievedMemory } from "../contracts/memory";
import type { PromptBehaviorMemoryEntry } from "../contracts/prompt-preferences";
import type {
  CapabilityCaseRecord,
  CapabilityEventRecord,
  CapabilityRunRecord
} from "../contracts/capability-runner";

export interface SynAIDatabase {
  conversations: Conversation[];
  messages: ChatMessage[];
  memories: MemoryEntry[];
  promptBehaviorMemories: PromptBehaviorMemoryEntry[];
  summaries: ConversationSummary[];
  capabilityRuns: CapabilityRunRecord[];
  capabilityCases: CapabilityCaseRecord[];
  capabilityEvents: CapabilityEventRecord[];
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
  maxPromptBehaviorMemories?: number;
  maxWorkspaceHits?: number;
  maxWebResults?: number;
}


