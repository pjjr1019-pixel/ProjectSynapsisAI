/**
 * Chat Analyzer Adapter
 * 
 * Non-blocking integration between the chat pipeline and improvement analyzer.
 * Subscribes to store changes, detects new responses, and triggers analysis.
 * 
 * Usage:
 *   import { subscribeToChatAnalysis } from "@awareness/integration/chat-analyzer-adapter";
 *   subscribeToChatAnalysis(localChatStore);
 */

import type { ChatMessage } from "@contracts";
import type { ImprovementEvent } from "@contracts/improvement";
import { analyzePromptReply } from "../improvement/analyzer";

interface ChatStoreType {
  getState: () => {
    messages: ChatMessage[];
    [key: string]: any;
  };
  subscribe: (listener: () => void) => () => void;
}

let previousMessageCount = 0;
let unsubscribe: (() => void) | null = null;
let analysisInFlight = false;

/**
 * Subscribe to chat store changes and analyze new responses.
 * Non-blocking: analysis runs in the background without affecting chat flow.
 */
export function subscribeToChatAnalysis(store: ChatStoreType): () => void {
  // Clean up previous subscription if any
  if (unsubscribe) {
    unsubscribe();
  }

  previousMessageCount = store.getState().messages.length;

  const handleStoreChange = () => {
    const state = store.getState();
    const currentMessages = state.messages;

    // Check if new messages were added
    if (currentMessages.length > previousMessageCount) {
      const newMessages = currentMessages.slice(previousMessageCount);
      previousMessageCount = currentMessages.length;

      // Find the latest user + assistant pair
      const lastUserMessage = [...currentMessages]
        .reverse()
        .find((m) => m.role === "user");
      const lastAssistantMessage = [...currentMessages]
        .reverse()
        .find((m) => m.role === "assistant");

      if (lastUserMessage && lastAssistantMessage) {
        // Trigger analysis in background (non-blocking)
        triggerAnalysisAsync(lastUserMessage, lastAssistantMessage).catch((err) => {
          // Silently log errors; never block chat
          console.warn("[Improvement Analyzer] Background analysis failed:", err);
        });
      }
    }
  };

  unsubscribe = store.subscribe(handleStoreChange);

  // Return cleanup function
  return () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };
}

/**
 * Analyze a prompt-reply pair without blocking.
 * Uses a flag to prevent concurrent analysis.
 */
async function triggerAnalysisAsync(
  userMessage: ChatMessage,
  assistantMessage: ChatMessage
): Promise<ImprovementEvent[]> {
  // Prevent concurrent analysis
  if (analysisInFlight) {
    return [];
  }

  analysisInFlight = true;
  try {
    const result = await analyzePromptReply({
      userPrompt: userMessage.content,
      assistantReply: assistantMessage.content,
      replyMetadata: (assistantMessage as any).metadata
    });

    // Events are automatically queued inside analyzePromptReply
    return result.events;
  } finally {
    analysisInFlight = false;
  }
}

/**
 * Get current subscription status.
 */
export function isAnalyzerSubscribed(): boolean {
  return unsubscribe !== null;
}
