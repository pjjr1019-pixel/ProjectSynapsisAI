import { app, BrowserWindow, ipcMain, shell } from "electron";
import * as path from "node:path";
import {
  IPC_CHANNELS,
  type AppHealth,
  type ChatMessage,
  type ContextPreview,
  type ConversationWithMessages,
  type ModelHealth,
  type ResponseMode,
  type SendChatRequest,
  type SendChatResponse
} from "../../../packages/contracts/src";
import {
  checkOllamaHealth,
  createOllamaProvider,
  getOllamaConfig,
  listOllamaModels
} from "../../../packages/local-ai/src";
import {
  appendChatMessage,
  buildPromptMessages,
  clearConversationMessages,
  configureMemoryDatabase,
  createConversationRecord,
  deleteConversationRecord,
  deleteMemoryRecord,
  extractAndStoreMemories,
  finalizePromptContext,
  listConversationRecords,
  listMemoryRecords,
  loadConversationRecord,
  memorySystemInstruction,
  preparePromptContext,
  refreshRollingSummary,
  removeLastAssistantMessage,
  searchMemoryRecords,
  updateConversationTitleFromMessages
} from "../../../packages/memory/src";
import { resolveRecentWebContext } from "../../../packages/web-search/src";

const provider = createOllamaProvider();
const startedAt = new Date().toISOString();
let mainWindow: BrowserWindow | null = null;
let busy = false;

const APP_VERSION = "0.1.0";

const responseModeInstruction = (mode: ResponseMode | undefined): string => {
  switch (mode) {
    case "fast":
      return "Reply style: prioritize quick, direct answers. Keep the response compact unless the user asks for depth.";
    case "smart":
      return "Reply style: be more thorough, careful, and context-aware. Include important caveats and nuance when it helps.";
    default:
      return "Reply style: balance speed and quality. Be clear, concise, and helpful.";
  }
};

const createWindow = async (): Promise<void> => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    backgroundColor: "#0a0f1a",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      void shell.openExternal(url);
      return { action: "deny" };
    }

    return { action: "allow" };
  });
};

const emptyContextPreview: ContextPreview = {
  systemInstruction: memorySystemInstruction,
  stableMemories: [],
  retrievedMemories: [],
  summarySnippet: "",
  recentMessagesCount: 0,
  estimatedChars: 0,
  webSearch: {
    status: "off",
    query: "",
    results: []
  }
};

const createModelStatus = (
  status: ModelHealth["status"],
  detail?: string,
  modelOverride?: string
): ModelHealth => {
  const config = getOllamaConfig(modelOverride ? { model: modelOverride } : undefined);

  return {
    status,
    provider: "ollama",
    model: config.model,
    baseUrl: config.baseUrl,
    detail,
    checkedAt: new Date().toISOString()
  };
};

const applyResponseMode = (
  promptMessages: ChatMessage[],
  responseMode: ResponseMode | undefined
): ChatMessage[] =>
  promptMessages.map((message, index) =>
    index === 0 && message.role === "system"
      ? {
          ...message,
          content: `${message.content}\n\n${responseModeInstruction(responseMode)}`
        }
      : message
  );

const sendRendererEvent = <T>(channel: string, payload: T): void => {
  mainWindow?.webContents.send(channel, payload);
};

const scheduleConversationMaintenance = (
  conversationId: string,
  userText: string,
  assistantReply: string,
  modelOverride?: string
): void => {
  void (async () => {
    await Promise.allSettled([
      extractAndStoreMemories(conversationId, `${userText}\n${assistantReply}`),
      refreshRollingSummary(conversationId),
      updateConversationTitleFromMessages(conversationId, userText)
    ]);

    const [conversations, modelStatus] = await Promise.all([
      listConversationRecords(),
      checkOllamaHealth(false, modelOverride ? { model: modelOverride } : undefined).catch((error) =>
        createModelStatus(
          "error",
          error instanceof Error ? error.message : "Background health check failed",
          modelOverride
        )
      )
    ]);

    sendRendererEvent(IPC_CHANNELS.backgroundSync, {
      conversationId,
      conversations,
      modelStatus
    });
  })();
};

const resolveConversation = async (conversationId: string): Promise<ConversationWithMessages> => {
  const loaded = await loadConversationRecord(conversationId);
  if (loaded) {
    return loaded;
  }
  const conversation = await createConversationRecord();
  return {
    conversation,
    messages: []
  };
};

const handleSendChat = async (payload: SendChatRequest): Promise<SendChatResponse> => {
  busy = true;
  const requestId = payload.requestId ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const modelOverride = payload.modelOverride?.trim() || undefined;
  let contextPreview = emptyContextPreview;

  try {
    const resolved = await resolveConversation(payload.conversationId);
    const conversationId = resolved.conversation.id;
    if (payload.regenerate) {
      await removeLastAssistantMessage(conversationId);
    } else {
      await appendChatMessage(conversationId, "user", payload.text);
    }

    const [preparedPromptContext, recentWeb] = await Promise.all([
      preparePromptContext(conversationId, payload.text),
      resolveRecentWebContext(payload.text, Boolean(payload.useWebSearch))
    ]);
    const latestContext = finalizePromptContext(preparedPromptContext, recentWeb);
    contextPreview = latestContext.contextPreview;
    const promptMessages = applyResponseMode(latestContext.promptMessages, payload.responseMode);
    const assistantReply = await provider.chatStream(
      promptMessages,
      (content) => {
        sendRendererEvent(IPC_CHANNELS.chatStream, {
          requestId,
          conversationId,
          content
        });
      },
      modelOverride ? { model: modelOverride } : undefined
    );
    const assistantSources = recentWeb.status === "used" ? recentWeb.results : undefined;
    const assistantMessage = await appendChatMessage(
      conversationId,
      "assistant",
      assistantReply,
      assistantSources
    );

    const conversationWithMessages = await resolveConversation(conversationId);
    scheduleConversationMaintenance(conversationId, payload.text, assistantReply, modelOverride);

    return {
      conversation: conversationWithMessages.conversation,
      assistantMessage,
      messages: conversationWithMessages.messages,
      contextPreview,
      modelStatus: createModelStatus("connected", undefined, modelOverride)
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown chat error";
    const resolved = await resolveConversation(payload.conversationId);
    const assistantMessage = await appendChatMessage(
      resolved.conversation.id,
      "assistant",
      `Local model error: ${detail}`
    );
    const conversationWithMessages = await resolveConversation(resolved.conversation.id);
    const modelStatus = await checkOllamaHealth(false);
    return {
      conversation: conversationWithMessages.conversation,
      assistantMessage,
      messages: conversationWithMessages.messages,
      contextPreview,
      modelStatus: createModelStatus("error", detail, modelOverride)
    };
  } finally {
    busy = false;
  }
};

const registerIpc = (): void => {
  ipcMain.handle(IPC_CHANNELS.appHealth, async (): Promise<AppHealth> => ({
    status: "ok",
    startedAt,
    version: APP_VERSION
  }));

  ipcMain.handle(IPC_CHANNELS.modelHealth, async (_event, modelOverride?: string) =>
    checkOllamaHealth(busy, modelOverride ? { model: modelOverride } : undefined)
  );

  ipcMain.handle(IPC_CHANNELS.listModels, async () => {
    try {
      return await listOllamaModels(getOllamaConfig());
    } catch {
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.createConversation, async () => {
    const conversation = await createConversationRecord();
    return { conversation, messages: [] };
  });

  ipcMain.handle(IPC_CHANNELS.listConversations, async () => listConversationRecords());

  ipcMain.handle(IPC_CHANNELS.loadConversation, async (_event, conversationId: string) =>
    loadConversationRecord(conversationId)
  );

  ipcMain.handle(IPC_CHANNELS.clearConversation, async (_event, conversationId: string) => {
    await clearConversationMessages(conversationId);
    return resolveConversation(conversationId);
  });

  ipcMain.handle(IPC_CHANNELS.deleteConversation, async (_event, conversationId: string) => {
    await deleteConversationRecord(conversationId);
  });

  ipcMain.handle(IPC_CHANNELS.sendChat, async (_event, payload: SendChatRequest) =>
    handleSendChat(payload)
  );

  ipcMain.handle(IPC_CHANNELS.searchMemories, async (_event, query: string) =>
    searchMemoryRecords(query)
  );

  ipcMain.handle(IPC_CHANNELS.listMemories, async () => listMemoryRecords());

  ipcMain.handle(IPC_CHANNELS.deleteMemory, async (_event, memoryId: string) => {
    await deleteMemoryRecord(memoryId);
  });

  ipcMain.handle(
    IPC_CHANNELS.contextPreview,
    async (_event, conversationId: string, latestUserMessage: string) =>
      buildPromptMessages(conversationId, latestUserMessage).then((result) => result.contextPreview)
  );
};

app.whenReady().then(async () => {
  const databasePath = path.join(app.getPath("userData"), "synai-db.json");
  configureMemoryDatabase(databasePath);
  registerIpc();
  await createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});
