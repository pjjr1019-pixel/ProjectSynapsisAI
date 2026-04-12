/**
 * Improvement Runtime Service
 * 
 * Runs on the main/Node.js process side of Electron.
 * Handles:
 * - Analyzer execution after chat responses
 * - Event persistence to disk
 * - Planner classification
 * - Memory/governance adapters
 * - IPC bridge between main ↔ renderer
 * 
 * The renderer never directly owns file persistence for improvement state.
 */

import * as path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { ipcMain, BrowserWindow } from "electron";
import type { ImprovementEvent } from "@contracts/improvement";
import { IPC_CHANNELS } from "@contracts";
import { analyzePromptReply } from "@awareness/improvement/analyzer";
import { planImprovementEvent } from "@awareness/improvement/planner";
import { insertImprovementEvent, queryImprovementEvents } from "@awareness/improvement/queue";
import type { ChatMessage } from "@contracts";
import { getReplyPolicyOverlayService, type ReplyPolicyRule, type OverlayApplyResult } from "./reply-policy-overlay-service";

interface ImprovementRuntimeConfig {
  runtimeRoot: string;
  mainWindow?: BrowserWindow | null;
  emitProgress?: (msg: string) => void;
}

interface ImprovementSystemState {
  enabled: boolean;
  lastAnalyzedAt: number;
  eventCount: number;
}

export class ImprovementRuntimeService {
  private runtimeRoot: string;
  private eventsPath: string;
  private statePath: string;
  private mainWindow: BrowserWindow | null = null;
  private emitProgress: (msg: string) => void;
  
  private state: ImprovementSystemState = {
    enabled: true,
    lastAnalyzedAt: 0,
    eventCount: 0
  };

  private eventSubscribers = new Set<(event: ImprovementEvent) => void>();

  constructor(config: ImprovementRuntimeConfig) {
    this.runtimeRoot = config.runtimeRoot;
    this.mainWindow = config.mainWindow ?? null;
    this.emitProgress = config.emitProgress ?? ((msg: string) => console.log("[Improvement]", msg));
    
    this.eventsPath = path.join(this.runtimeRoot, "improvement", "events.jsonl");
    this.statePath = path.join(this.runtimeRoot, "improvement", "state.json");
  }

  /**
   * Initialize the improvement runtime service.
   * Sets up directories, loads state, registers IPC handlers.
   */
  async initialize(): Promise<void> {
    this.emitProgress("Initializing improvement runtime service");

    // Ensure directories exist
    await mkdir(path.dirname(this.eventsPath), { recursive: true });

    // Load persisted state
    await this.loadState();

    // Register IPC handlers
    this.registerIpcHandlers();

    this.emitProgress("Improvement runtime service initialized");
  }

  /**
   * Analyze a chat response and generate improvement events.
   * Called after appendChatMessage for the assistant reply.
   * Non-blocking: fires in background.
   */
  async analyzeReply(
    userMessage: ChatMessage,
    assistantMessage: ChatMessage
  ): Promise<void> {
    if (!this.state.enabled) {
      return;
    }

    // Fire and forget — don't block chat
    setImmediate(() => {
      this.performAnalysis(userMessage, assistantMessage)
        .catch((err) => {
          console.warn("[Improvement Analyzer] Background analysis failed:", err);
        });
    });
  }

  /**
   * Internal: perform analysis and persistence.
   */
  private async performAnalysis(
    userMessage: ChatMessage,
    assistantMessage: ChatMessage
  ): Promise<void> {
    try {
      this.emitProgress("Analyzing prompt-reply pair");

      // Run the analyzer (pure logic, no file I/O)
      const analysisResult = await analyzePromptReply({
        userPrompt: userMessage.content,
        assistantReply: assistantMessage.content,
        replyMetadata: (assistantMessage as any).metadata
      });

      if (!analysisResult.events || analysisResult.events.length === 0) {
        return;
      }

      // Process each event through the planner
      for (const event of analysisResult.events) {
        // Persist initial event to queue
        await insertImprovementEvent({
          ...event,
          status: "queued"
        });

        // Run planner to classify and route
        const plannedOutput = await planImprovementEvent(event);

        // Process planner actions: route to appropriate subsystems
        for (const action of plannedOutput.actions) {
          if (action.type === "update_reply_policy" && action.replyPolicyRule) {
            // Phase 3: Wire planner output to overlay rule creation
            // Only for low-risk, clearly weak fallback cases (conservative scope)
            try {
              await this.addReplyPolicyRule(
                action.replyPolicyRule.sourceEventId || event.id,
                action.replyPolicyRule.category,
                action.replyPolicyRule.matchConditions,
                action.replyPolicyRule.rewrittenFallback,
                action.replyPolicyRule.confidence,
                action.replyPolicyRule.risk
              );
              this.emitProgress(
                `Overlay rule created: ${action.replyPolicyRule.category} (${action.replyPolicyRule.risk} risk)`
              );
            } catch (err) {
              console.error("[Improvement] Failed to create reply-policy rule:", err);
            }
          }
        }

        // Update state
        this.state.eventCount++;
        this.state.lastAnalyzedAt = Date.now();

        // Notify subscribers with planned event
        this.notifySubscribers(plannedOutput.updatedEvent);

        this.emitProgress(`Event queued: ${event.type} (${plannedOutput.actions.length} actions)`);
      }

      // Save state
      await this.saveState();
    } catch (err) {
      console.error("[Improvement Analyzer] Analysis error:", err);
    }
  }

  /**
   * Get recent improvement events.
   * Called from renderer via IPC.
   */
  async listEvents(options?: { limit?: number; status?: string }): Promise<ImprovementEvent[]> {
    const limit = options?.limit ?? 10;
    const status = options?.status;

    try {
      const events = await queryImprovementEvents({ limit, status });
      return events;
    } catch (err) {
      console.error("[Improvement] Failed to list events:", err);
      return [];
    }
  }

  /**
   * Get a specific improvement event by ID.
   */
  async getEvent(eventId: string): Promise<ImprovementEvent | null> {
    try {
      const events = await queryImprovementEvents({ limit: 1000 });
      return events.find((e) => e.id === eventId) ?? null;
    } catch (err) {
      console.error("[Improvement] Failed to get event:", err);
      return null;
    }
  }

  /**
   * Update event status (e.g., dismiss, approve, apply).
   * Persists change to events.jsonl file.
   */
  async updateEventStatus(eventId: string, newStatus: string): Promise<ImprovementEvent | null> {
    try {
      const events = await queryImprovementEvents({ limit: 1000 });
      const eventIndex = events.findIndex((e) => e.id === eventId);

      if (eventIndex === -1) {
        return null;
      }

      const event = events[eventIndex];

      // Update event status
      const updated: ImprovementEvent = {
        ...event,
        status: newStatus as any,
        updatedAt: new Date().toISOString()
      };

      // Persist updated event back to file
      events[eventIndex] = updated;
      
      // Write all events back to newline-delimited JSON
      const jsonlContent = events
        .map(e => JSON.stringify(e))
        .join('\n') + (events.length > 0 ? '\n' : '');
      
      await mkdir(path.dirname(this.eventsPath), { recursive: true });
      await writeFile(this.eventsPath, jsonlContent, 'utf-8');

      // Notify subscribers
      this.notifySubscribers(updated);

      return updated;
    } catch (err) {
      console.error("[Improvement] Failed to update event status:", err);
      return null;
    }
  }

  /**
   * Get current improvement mode (enabled/disabled).
   */
  getMode(): boolean {
    return this.state.enabled;
  }

  /**
   * Set improvement mode (enable/disable analysis).
   */
  setMode(enabled: boolean): void {
    this.state.enabled = enabled;
    this.emitProgress(`Improvement mode switched to: ${enabled ? "ON" : "OFF"}`);
  }

  /**
   * Subscribe to new improvement events (for renderer UI).
   */
  subscribe(listener: (event: ImprovementEvent) => void): () => void {
    this.eventSubscribers.add(listener);
    return () => {
      this.eventSubscribers.delete(listener);
    };
  }

  /**
   * Internal: notify all subscribers of new event.
   */
  private notifySubscribers(event: ImprovementEvent): void {
    for (const listener of this.eventSubscribers) {
      try {
        listener(event);
      } catch (err) {
        console.error("[Improvement] Subscriber error:", err);
      }
    }
  }

  /**
   * Register IPC handlers to expose this service to the renderer.
   */
  private registerIpcHandlers(): void {
    // List recent events
    ipcMain.handle(
      IPC_CHANNELS.improvementListEvents,
      async (
        _event,
        options?: { limit?: number; status?: string }
      ): Promise<ImprovementEvent[]> => {
        return this.listEvents(options);
      }
    );

    // Get single event
    ipcMain.handle(
      IPC_CHANNELS.improvementGetEvent,
      async (_event, eventId: string): Promise<ImprovementEvent | null> => {
        return this.getEvent(eventId);
      }
    );

    // Update event status
    ipcMain.handle(
      IPC_CHANNELS.improvementUpdateStatus,
      async (_event, eventId: string, status: string): Promise<ImprovementEvent | null> => {
        return this.updateEventStatus(eventId, status);
      }
    );

    // Get mode
    ipcMain.handle(IPC_CHANNELS.improvementGetMode, async (): Promise<boolean> => {
      return this.getMode();
    });

    // Set mode
    ipcMain.handle(IPC_CHANNELS.improvementSetMode, async (_event, enabled: boolean): Promise<void> => {
      this.setMode(enabled);
    });

    // Phase 3: Overlay inspection APIs
    ipcMain.handle(
      IPC_CHANNELS.overlayListRules,
      async (_event, enabledOnly?: boolean): Promise<ReplyPolicyRule[]> => {
        return this.listOverlayRules(enabledOnly ?? false);
      }
    );

    ipcMain.handle(
      IPC_CHANNELS.overlayGetRule,
      async (_event, ruleId: string): Promise<ReplyPolicyRule | undefined> => {
        return this.getOverlayRule(ruleId);
      }
    );

    ipcMain.handle(
      IPC_CHANNELS.overlayDisableRule,
      async (_event, ruleId: string): Promise<void> => {
        return this.disableOverlayRule(ruleId);
      }
    );

    ipcMain.handle(
      IPC_CHANNELS.overlayEnableRule,
      async (_event, ruleId: string): Promise<void> => {
        return this.enableOverlayRule(ruleId);
      }
    );

    ipcMain.handle(
      IPC_CHANNELS.overlayDeleteRule,
      async (_event, ruleId: string): Promise<void> => {
        return this.deleteOverlayRule(ruleId);
      }
    );

    ipcMain.handle(
      IPC_CHANNELS.overlayReset,
      async (): Promise<void> => {
        return this.resetOverlay();
      }
    );

    ipcMain.handle(
      IPC_CHANNELS.overlayGetStats,
      async () => {
        return this.getOverlayStats();
      }
    );

    this.emitProgress("IPC handlers registered");
  }

  /**
   * Load persisted state from disk.
   */
  private async loadState(): Promise<void> {
    try {
      const content = await readFile(this.statePath, "utf-8");
      const saved = JSON.parse(content);
      this.state = { ...this.state, ...saved };
      this.emitProgress(`State loaded: ${this.state.eventCount} events`);
    } catch {
      // State file doesn't exist or is invalid — use defaults
      this.emitProgress("State file not found, using defaults");
    }
  }

  /**
   * Save current state to disk.
   */
  private async saveState(): Promise<void> {
    try {
      await mkdir(path.dirname(this.statePath), { recursive: true });
      await writeFile(this.statePath, JSON.stringify(this.state, null, 2), "utf-8");
    } catch (err) {
      console.error("[Improvement] Failed to save state:", err);
    }
  }

  /**
   * Phase 3: Add a reply-policy overlay rule (called by planner for weak fallback cases).
   * Only called from planner when a low-risk weak fallback is detected.
   * Narrow scope: "I don't have calendar", "I can't access task manager", etc.
   */
  async addReplyPolicyRule(
    sourceEventId: string,
    category: string,
    matchConditions: ReplyPolicyRule["matchConditions"],
    rewrittenFallback: string,
    confidence?: number,
    risk?: "low" | "medium" | "high"
  ): Promise<ReplyPolicyRule> {
    const overlayService = getReplyPolicyOverlayService();
    const rule = await overlayService.addRule(
      sourceEventId,
      category,
      matchConditions,
      rewrittenFallback,
      confidence,
      risk
    );
    this.emitProgress(`Added overlay rule: ${category} (confidence: ${rule.confidence})`);
    return rule;
  }

  /**
   * Phase 3: Get overlay service for consuming rules during reply generation.
   * Returns the singleton overlay service (used in main.ts hook).
   */
  getReplyPolicyOverlay() {
    return getReplyPolicyOverlayService();
  }

  /**
   * Phase 3: Get overlay statistics (for renderer inspection).
   */
  async getOverlayStats() {
    const overlayService = getReplyPolicyOverlayService();
    return overlayService.getStats();
  }

  /**
   * Phase 3: List overlay rules (for renderer inspection).
   */
  async listOverlayRules(enabledOnly: boolean = false): Promise<ReplyPolicyRule[]> {
    const overlayService = getReplyPolicyOverlayService();
    return overlayService.listRules(enabledOnly);
  }

  /**
   * Phase 3: Get a specific overlay rule by ID.
   */
  async getOverlayRule(ruleId: string): Promise<ReplyPolicyRule | undefined> {
    const overlayService = getReplyPolicyOverlayService();
    return overlayService.getRule(ruleId);
  }

  /**
   * Phase 3: Disable an overlay rule (renderer can trigger via IPC).
   */
  async disableOverlayRule(ruleId: string): Promise<void> {
    const overlayService = getReplyPolicyOverlayService();
    await overlayService.disableRule(ruleId);
    this.emitProgress(`Disabled overlay rule: ${ruleId}`);
  }

  /**
   * Phase 3: Enable an overlay rule.
   */
  async enableOverlayRule(ruleId: string): Promise<void> {
    const overlayService = getReplyPolicyOverlayService();
    await overlayService.enableRule(ruleId);
    this.emitProgress(`Enabled overlay rule: ${ruleId}`);
  }

  /**
   * Phase 3: Delete an overlay rule permanently.
   */
  async deleteOverlayRule(ruleId: string): Promise<void> {
    const overlayService = getReplyPolicyOverlayService();
    await overlayService.deleteRule(ruleId);
    this.emitProgress(`Deleted overlay rule: ${ruleId}`);
  }

  /**
   * Phase 3: Reset all overlay rules.
   */
  async resetOverlay(): Promise<void> {
    const overlayService = getReplyPolicyOverlayService();
    await overlayService.reset();
    this.emitProgress("Reset all overlay rules");
  }

  /**
   * Cleanup: unsubscribe listeners, save state.
   */
  async cleanup(): Promise<void> {
    this.emitProgress("Cleaning up improvement runtime service");
    this.eventSubscribers.clear();
    await this.saveState();
  }
}

/**
 * Singleton instance of the improvement runtime service.
 * Initialize once in main.ts on app startup.
 */
let improvementRuntimeService: ImprovementRuntimeService | null = null;

export function createImprovementRuntimeService(
  config: ImprovementRuntimeConfig
): ImprovementRuntimeService {
  if (improvementRuntimeService) {
    return improvementRuntimeService;
  }

  improvementRuntimeService = new ImprovementRuntimeService(config);
  return improvementRuntimeService;
}

export function getImprovementRuntimeService(): ImprovementRuntimeService | null {
  return improvementRuntimeService;
}
