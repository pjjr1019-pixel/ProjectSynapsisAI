/**
 * Conversation Logger — Main Process
 * 
 * Handles file I/O for persisting conversations to disk
 * Runs in the main Electron process with full file system access
 */

import { writeFile, readFile, mkdir } from "node:fs/promises";
import * as path from "node:path";
import type { ChatMessage } from "@contracts";

export interface ConversationLogEntry {
  timestamp: string;
  conversationId: string;
  turn: number;
  userPrompt: string;
  assistantReply: string;
  model?: string;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ConversationHistory {
  version: "1.0";
  createdAt: string;
  lastUpdated: string;
  totalTurns: number;
  entries: ConversationLogEntry[];
}

/**
 * Get the conversation history file path
 */
export const getConversationHistoryPath = (dataDir: string): string => {
  return path.join(dataDir, "CONVERSATION-HISTORY.json");
};

/**
 * Load conversation history from disk (or create empty if not exists)
 */
export const loadConversationHistory = async (
  dataDir: string
): Promise<ConversationHistory> => {
  try {
    const filePath = getConversationHistoryPath(dataDir);
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    // If file doesn't exist, return empty history
    return {
      version: "1.0",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      totalTurns: 0,
      entries: []
    };
  }
};

/**
 * Save conversation history to disk
 */
export const saveConversationHistory = async (
  dataDir: string,
  history: ConversationHistory
): Promise<void> => {
  try {
    // Ensure directory exists
    await mkdir(dataDir, { recursive: true });
    
    const filePath = getConversationHistoryPath(dataDir);
    const json = JSON.stringify(history, null, 2);
    await writeFile(filePath, json, "utf-8");
  } catch (error) {
    console.error(
      "Failed to save conversation history:",
      error instanceof Error ? error.message : String(error)
    );
  }
};

/**
 * Add a conversation turn to history and persist
 */
export const logConversationTurn = async (
  dataDir: string,
  conversationId: string,
  userMessage: ChatMessage,
  assistantMessage: ChatMessage,
  model?: string,
  settings?: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    // Load current history
    const history = await loadConversationHistory(dataDir);

    // Count user messages to determine turn number
    const turnNumber = history.entries.filter((e) => e.conversationId === conversationId).length + 1;

    // Create new entry
    const entry: ConversationLogEntry = {
      timestamp: new Date().toISOString(),
      conversationId,
      turn: turnNumber,
      userPrompt: userMessage.content,
      assistantReply: assistantMessage.content,
      model,
      settings,
      metadata
    };

    // Add to history and update metadata
    history.entries.push(entry);
    history.lastUpdated = new Date().toISOString();
    history.totalTurns = history.entries.length;

    // Persist to disk
    await saveConversationHistory(dataDir, history);
  } catch (error) {
    console.error(
      "Failed to log conversation turn:",
      error instanceof Error ? error.message : String(error)
    );
  }
};

/**
 * Export conversation history as a markdown file for readability
 */
export const exportConversationHistoryAsMarkdown = async (
  dataDir: string,
  outputPath?: string
): Promise<string> => {
  try {
    const history = await loadConversationHistory(dataDir);
    const exportPath = outputPath || path.join(dataDir, "CONVERSATION-HISTORY.md");

    let markdown = `# SynAI Conversation History\n\n`;
    markdown += `**Created:** ${history.createdAt}\n`;
    markdown += `**Last Updated:** ${history.lastUpdated}\n`;
    markdown += `**Total Turns:** ${history.totalTurns}\n\n`;

    // Group by conversation
    const byConversation = new Map<string, ConversationLogEntry[]>();
    for (const entry of history.entries) {
      if (!byConversation.has(entry.conversationId)) {
        byConversation.set(entry.conversationId, []);
      }
      byConversation.get(entry.conversationId)!.push(entry);
    }

    // Write each conversation
    for (const [convId, entries] of byConversation) {
      markdown += `## Conversation ${convId.slice(0, 8)}\n\n`;
      for (const entry of entries) {
        markdown += `### Turn ${entry.turn}\n`;
        markdown += `**Timestamp:** ${entry.timestamp}\n`;
        if (entry.model) {
          markdown += `**Model:** ${entry.model}\n`;
        }
        markdown += `\n**User Prompt:**\n\`\`\`\n${entry.userPrompt}\n\`\`\`\n\n`;
        markdown += `**Assistant Reply:**\n\`\`\`\n${entry.assistantReply}\n\`\`\`\n\n`;
        if (entry.metadata) {
          markdown += `**Metadata:** \`${JSON.stringify(entry.metadata)}\`\n\n`;
        }
      }
    }

    await writeFile(exportPath, markdown, "utf-8");
    return exportPath;
  } catch (error) {
    console.error(
      "Failed to export conversation history:",
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};

/**
 * Clear all conversation history
 */
export const clearConversationHistory = async (dataDir: string): Promise<void> => {
  try {
    const emptyHistory: ConversationHistory = {
      version: "1.0",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      totalTurns: 0,
      entries: []
    };
    await saveConversationHistory(dataDir, emptyHistory);
  } catch (error) {
    console.error(
      "Failed to clear conversation history:",
      error instanceof Error ? error.message : String(error)
    );
  }
};
