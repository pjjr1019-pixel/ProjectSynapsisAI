import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS, type SynAIBridge } from "../../../packages/contracts/src";

const api: SynAIBridge = {
  getAppHealth: () => ipcRenderer.invoke(IPC_CHANNELS.appHealth),
  getModelHealth: () => ipcRenderer.invoke(IPC_CHANNELS.modelHealth),
  sendChat: (payload) => ipcRenderer.invoke(IPC_CHANNELS.sendChat, payload),
  subscribeChatStream: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: Parameters<typeof listener>[0]) =>
      listener(payload);
    ipcRenderer.on(IPC_CHANNELS.chatStream, wrapped);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.chatStream, wrapped);
    };
  },
  subscribeBackgroundSync: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: Parameters<typeof listener>[0]) =>
      listener(payload);
    ipcRenderer.on(IPC_CHANNELS.backgroundSync, wrapped);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.backgroundSync, wrapped);
    };
  },
  createConversation: () => ipcRenderer.invoke(IPC_CHANNELS.createConversation),
  listConversations: () => ipcRenderer.invoke(IPC_CHANNELS.listConversations),
  loadConversation: (conversationId) => ipcRenderer.invoke(IPC_CHANNELS.loadConversation, conversationId),
  clearConversation: (conversationId) => ipcRenderer.invoke(IPC_CHANNELS.clearConversation, conversationId),
  deleteConversation: (conversationId) => ipcRenderer.invoke(IPC_CHANNELS.deleteConversation, conversationId),
  searchMemories: (query) => ipcRenderer.invoke(IPC_CHANNELS.searchMemories, query),
  listMemories: () => ipcRenderer.invoke(IPC_CHANNELS.listMemories),
  deleteMemory: (memoryId) => ipcRenderer.invoke(IPC_CHANNELS.deleteMemory, memoryId),
  getContextPreview: (conversationId, latestUserMessage) =>
    ipcRenderer.invoke(IPC_CHANNELS.contextPreview, conversationId, latestUserMessage)
};

contextBridge.exposeInMainWorld("synai", api);
