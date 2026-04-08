import type { LocalChatState } from "../types/localChat.types";

type Listener = () => void;

const initialState: LocalChatState = {
  appHealth: null,
  modelHealth: null,
  screenStatus: null,
  availableModels: [],
  settings: {
    selectedModel: "",
    defaultWebSearch: false,
    responseMode: "balanced"
  },
  conversations: [],
  activeConversationId: null,
  messages: [],
  contextPreview: null,
  memories: [],
  loading: false,
  pendingRequestId: null,
  pendingAssistantId: null,
  healthCheckState: "idle",
  healthCheckMessage: null,
  error: null
};

let state: LocalChatState = initialState;
const listeners = new Set<Listener>();

export const localChatStore = {
  getState: (): LocalChatState => state,
  setState: (patch: Partial<LocalChatState>): void => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  },
  resetState: (): void => {
    state = initialState;
    listeners.forEach((listener) => listener());
  },
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
