const initialState = {
    appHealth: null,
    modelHealth: null,
    screenStatus: null,
    availableModels: [],
    settings: {
        selectedModel: "",
        defaultWebSearch: false,
        advancedRagEnabled: true,
        workspaceIndexingEnabled: true,
        webInRagEnabled: true,
        liveTraceVisible: false,
        responseMode: "balanced",
        awarenessAnswerMode: "evidence-first"
    },
    conversations: [],
    activeConversationId: null,
    messages: [],
    contextPreview: null,
    memories: [],
    loading: false,
    pendingRequestId: null,
    pendingAssistantId: null,
    pendingReasoningTrace: null,
    healthCheckState: "idle",
    healthCheckMessage: null,
    promptEvaluationRunning: false,
    promptEvaluationResult: null,
    promptEvaluationError: null,
    error: null
};
let state = initialState;
const listeners = new Set();
export const localChatStore = {
    getState: () => state,
    setState: (patch) => {
        state = { ...state, ...patch };
        listeners.forEach((listener) => listener());
    },
    resetState: () => {
        state = initialState;
        listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }
};
