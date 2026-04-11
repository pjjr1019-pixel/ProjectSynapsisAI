import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS, type SynAIBridge } from "@contracts";

const api: SynAIBridge = {
  getAppHealth: () => ipcRenderer.invoke(IPC_CHANNELS.appHealth),
  getModelHealth: (modelOverride) => ipcRenderer.invoke(IPC_CHANNELS.modelHealth, modelOverride),
  listAvailableModels: () => ipcRenderer.invoke(IPC_CHANNELS.listModels),
  sendChat: (payload) => ipcRenderer.invoke(IPC_CHANNELS.sendChat, payload),
  subscribeChatStream: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: Parameters<typeof listener>[0]) =>
      listener(payload);
    ipcRenderer.on(IPC_CHANNELS.chatStream, wrapped);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.chatStream, wrapped);
    };
  },
  subscribeReasoningTrace: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: Parameters<typeof listener>[0]) =>
      listener(payload);
    ipcRenderer.on(IPC_CHANNELS.reasoningTrace, wrapped);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.reasoningTrace, wrapped);
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
  listDesktopActions: () => ipcRenderer.invoke(IPC_CHANNELS.desktopActionCatalog),
  suggestDesktopAction: (prompt) => ipcRenderer.invoke(IPC_CHANNELS.desktopActionSuggest, prompt),
  issueDesktopActionApproval: (request, approvedBy, ttlMs) =>
    ipcRenderer.invoke(IPC_CHANNELS.desktopActionApprove, request, approvedBy, ttlMs),
  executeDesktopAction: (request) => ipcRenderer.invoke(IPC_CHANNELS.desktopActionExecute, request),
  rollbackDesktopAction: (commandId, approvedBy, dryRun) =>
    ipcRenderer.invoke(IPC_CHANNELS.rollbackDesktopAction, commandId, approvedBy, dryRun),
  suggestWorkflow: (prompt) => ipcRenderer.invoke(IPC_CHANNELS.workflowPlanSuggest, prompt),
  issueWorkflowApproval: (plan, approvedBy, ttlMs) =>
    ipcRenderer.invoke(IPC_CHANNELS.workflowApprove, plan, approvedBy, ttlMs),
  executeWorkflow: (request) => ipcRenderer.invoke(IPC_CHANNELS.workflowExecute, request),
  subscribeWorkflowProgress: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: Parameters<typeof listener>[0]) =>
      listener(payload);
    ipcRenderer.on(IPC_CHANNELS.workflowProgress, wrapped);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.workflowProgress, wrapped);
    };
  },
  runPromptEvaluation: (payload) => ipcRenderer.invoke(IPC_CHANNELS.promptEvaluationRun, payload),
  getGovernanceDashboard: () => ipcRenderer.invoke(IPC_CHANNELS.governanceDashboard),
  getGovernanceApprovalQueue: () => ipcRenderer.invoke(IPC_CHANNELS.governanceApprovalQueue),
  queryGovernanceAudit: (query) => ipcRenderer.invoke(IPC_CHANNELS.governanceAuditQuery, query),
  queryAwareness: (request) => ipcRenderer.invoke(IPC_CHANNELS.awarenessQuery, request),
  listOfficialKnowledgeSources: () => ipcRenderer.invoke(IPC_CHANNELS.officialKnowledgeSources),
  setOfficialKnowledgeSourceEnabled: (sourceId, enabled) =>
    ipcRenderer.invoke(IPC_CHANNELS.officialKnowledgeSourceUpdate, sourceId, enabled),
  refreshOfficialKnowledgeSource: (sourceId) =>
    ipcRenderer.invoke(IPC_CHANNELS.officialKnowledgeSourceRefresh, sourceId),
  getContextPreview: (conversationId, latestUserMessage, awarenessAnswerMode, ragOptions, reasoningProfile) =>
    ipcRenderer.invoke(
      IPC_CHANNELS.contextPreview,
      conversationId,
      latestUserMessage,
      awarenessAnswerMode,
      ragOptions,
      reasoningProfile
    ),
  getScreenStatus: () => ipcRenderer.invoke(IPC_CHANNELS.screenStatus),
  getScreenForegroundWindow: () => ipcRenderer.invoke(IPC_CHANNELS.screenForegroundWindow),
  getScreenUiTree: () => ipcRenderer.invoke(IPC_CHANNELS.screenUiTree),
  getScreenLastEvents: () => ipcRenderer.invoke(IPC_CHANNELS.screenLastEvents),
  startAssistMode: (options) => ipcRenderer.invoke(IPC_CHANNELS.screenStartAssist, options),
  stopAssistMode: (reason) => ipcRenderer.invoke(IPC_CHANNELS.screenStopAssist, { reason }),
  runAgentRuntimeTask: (task) => ipcRenderer.invoke(IPC_CHANNELS.agentRuntimeRun, task),
  listAgentRuntimeJobs: () => ipcRenderer.invoke(IPC_CHANNELS.agentRuntimeList),
  inspectAgentRuntimeJob: (jobId) => ipcRenderer.invoke(IPC_CHANNELS.agentRuntimeInspect, jobId),
  resumeAgentRuntimeJob: (jobId) => ipcRenderer.invoke(IPC_CHANNELS.agentRuntimeResume, jobId),
  cancelAgentRuntimeJob: (jobId) => ipcRenderer.invoke(IPC_CHANNELS.agentRuntimeCancel, jobId),
  recoverAgentRuntimeJob: (jobId) => ipcRenderer.invoke(IPC_CHANNELS.agentRuntimeRecover, jobId),
  subscribeAgentRuntimeProgress: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: Parameters<typeof listener>[0]) =>
      listener(payload);
    ipcRenderer.on(IPC_CHANNELS.agentRuntimeProgress, wrapped);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.agentRuntimeProgress, wrapped);
    };
  },
  getCapabilityRunnerCatalogSummary: () => ipcRenderer.invoke(IPC_CHANNELS.capabilityRunnerCatalog),
  listCapabilityRuns: () => ipcRenderer.invoke(IPC_CHANNELS.capabilityRunnerRuns),
  getCapabilityRunSnapshot: (runId) => ipcRenderer.invoke(IPC_CHANNELS.capabilityRunnerSnapshot, runId),
  startCapabilityRun: (request) => ipcRenderer.invoke(IPC_CHANNELS.capabilityRunnerStart, request),
  pauseCapabilityRun: (runId) => ipcRenderer.invoke(IPC_CHANNELS.capabilityRunnerPause, runId),
  resumeCapabilityRun: (runId) => ipcRenderer.invoke(IPC_CHANNELS.capabilityRunnerResume, runId),
  stopCapabilityRun: (runId) => ipcRenderer.invoke(IPC_CHANNELS.capabilityRunnerStop, runId),
  rerunFailedCapabilityRun: (runId) => ipcRenderer.invoke(IPC_CHANNELS.capabilityRunnerRerunFailed, runId),
  exportCapabilityRunMarkdown: (runId) => ipcRenderer.invoke(IPC_CHANNELS.capabilityRunnerExport, runId),
  subscribeCapabilityRunnerEvents: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: Parameters<typeof listener>[0]) =>
      listener(payload);
    ipcRenderer.on(IPC_CHANNELS.capabilityRunnerEvents, wrapped);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.capabilityRunnerEvents, wrapped);
    };
  }
};

contextBridge.exposeInMainWorld("synai", api);

