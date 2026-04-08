import { useEffect, useSyncExternalStore } from "react";
import type { ChatMessage, Conversation, ModelHealth } from "@contracts";
import { localChatStore } from "../store/localChatStore";
import { formatTime } from "../../../shared/utils/time";
import type { ChatSettingsState } from "../types/localChat.types";

const bridge = () => window.synai;

const setError = (message: string | null): void => {
  localChatStore.setState({ error: message });
};

const SETTINGS_STORAGE_KEY = "synai.chat.settings";

const defaultSettings: ChatSettingsState = {
  selectedModel: "",
  defaultWebSearch: false,
  responseMode: "balanced"
};

const loadPersistedSettings = (): ChatSettingsState => {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return defaultSettings;
    }

    const parsed = JSON.parse(raw) as Partial<ChatSettingsState>;
    return {
      selectedModel: parsed.selectedModel ?? defaultSettings.selectedModel,
      defaultWebSearch: parsed.defaultWebSearch ?? defaultSettings.defaultWebSearch,
      responseMode: parsed.responseMode ?? defaultSettings.responseMode
    };
  } catch {
    return defaultSettings;
  }
};

const persistSettings = (settings: ChatSettingsState): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};

const mergeAvailableModels = (...lists: Array<Array<string | null | undefined>>): string[] => {
  const seen = new Set<string>();

  for (const list of lists) {
    for (const item of list) {
      const value = item?.trim();
      if (value) {
        seen.add(value);
      }
    }
  }

  return [...seen];
};

const createOptimisticMessage = (
  conversationId: string,
  role: ChatMessage["role"],
  content: string
): ChatMessage => ({
  id: `optimistic-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  conversationId,
  role,
  content,
  createdAt: new Date().toISOString()
});

const mergeConversation = (
  conversations: Conversation[],
  nextConversation: Conversation
): Conversation[] => {
  const filtered = conversations.filter((conversation) => conversation.id !== nextConversation.id);
  return [nextConversation, ...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

const buildOptimisticMessages = (
  messages: ChatMessage[],
  conversationId: string,
  text: string,
  regenerate: boolean
): { messages: ChatMessage[]; pendingAssistant: ChatMessage } => {
  const pendingAssistant = createOptimisticMessage(conversationId, "assistant", "");

  if (regenerate) {
    const lastAssistantIndex = [...messages].reverse().findIndex((message) => message.role === "assistant");
    const trimmedMessages =
      lastAssistantIndex === -1
        ? messages
        : messages.filter((_, index) => index !== messages.length - 1 - lastAssistantIndex);

    return {
      messages: [...trimmedMessages, pendingAssistant],
      pendingAssistant
    };
  }

  const optimisticUser = createOptimisticMessage(conversationId, "user", text);

  return {
    messages: [...messages, optimisticUser, pendingAssistant],
    pendingAssistant
  };
};

const buildHealthCheckFeedback = (
  modelHealth: ModelHealth
): { state: "success" | "failure"; message: string } => {
  const checkedAt = formatTime(modelHealth.checkedAt);

  if (modelHealth.status === "connected") {
    return {
      state: "success",
      message: `Health check succeeded at ${checkedAt}. ${modelHealth.model} is reachable.`
    };
  }

  if (modelHealth.status === "disconnected") {
    return {
      state: "failure",
      message: `Health check failed at ${checkedAt}. Could not reach Ollama at ${modelHealth.baseUrl}.`
    };
  }

  return {
    state: "failure",
    message: `Health check failed at ${checkedAt}. ${modelHealth.detail ?? "Unknown model error."}`
  };
};

const loadConversation = async (conversationId: string): Promise<void> => {
  const loaded = await bridge().loadConversation(conversationId);
  if (!loaded) {
    return;
  }
  localChatStore.setState({
    activeConversationId: loaded.conversation.id,
    messages: loaded.messages
  });
};

const ensureConversation = async (): Promise<Conversation> => {
  const conversations = await bridge().listConversations();
  if (conversations.length > 0) {
    localChatStore.setState({
      conversations,
      activeConversationId: conversations[0].id
    });
    await loadConversation(conversations[0].id);
    return conversations[0];
  }
  const created = await bridge().createConversation();
  localChatStore.setState({
    conversations: [created.conversation],
    activeConversationId: created.conversation.id,
    messages: created.messages
  });
  return created.conversation;
};

const hydrateSettingsFromModel = (
  settings: ChatSettingsState,
  modelHealth: ModelHealth
): ChatSettingsState =>
  settings.selectedModel
    ? settings
    : {
        ...settings,
        selectedModel: modelHealth.model
      };

export const useLocalChat = () => {
  const state = useSyncExternalStore(localChatStore.subscribe, localChatStore.getState);

  useEffect(() => {
    const unsubscribeChatStream = bridge().subscribeChatStream((event) => {
      const currentState = localChatStore.getState();
      if (
        currentState.pendingRequestId !== event.requestId ||
        currentState.pendingAssistantId === null ||
        currentState.activeConversationId !== event.conversationId
      ) {
        return;
      }

      localChatStore.setState({
        messages: currentState.messages.map((message) =>
          message.id === currentState.pendingAssistantId
            ? { ...message, content: event.content }
            : message
        )
      });
    });

    const unsubscribeBackgroundSync = bridge().subscribeBackgroundSync((event) => {
      localChatStore.setState({
        conversations: event.conversations,
        modelHealth: event.modelStatus
      });
    });

    const start = async () => {
      localChatStore.setState({ loading: true });
      try {
        const persistedSettings = loadPersistedSettings();
        localChatStore.setState({ settings: persistedSettings });

        const [appHealth, modelHealth, availableModels] = await Promise.all([
          bridge().getAppHealth(),
          bridge().getModelHealth(persistedSettings.selectedModel || undefined),
          bridge().listAvailableModels().catch(() => [])
        ]);
        const hydratedSettings = hydrateSettingsFromModel(persistedSettings, modelHealth);
        persistSettings(hydratedSettings);
        localChatStore.setState({
          appHealth,
          modelHealth,
          availableModels: mergeAvailableModels(availableModels, [hydratedSettings.selectedModel, modelHealth.model]),
          settings: hydratedSettings
        });
        await ensureConversation();
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to initialize local chat");
      } finally {
        localChatStore.setState({ loading: false });
      }
    };
    void start();

    return () => {
      unsubscribeChatStream();
      unsubscribeBackgroundSync();
    };
  }, []);

  const refreshModelHealth = async (): Promise<void> => {
    const currentSettings = localChatStore.getState().settings;
    localChatStore.setState({
      loading: true,
      healthCheckState: "running",
      healthCheckMessage: "Running health check..."
    });
    try {
      const [modelHealth, availableModels] = await Promise.all([
        bridge().getModelHealth(currentSettings.selectedModel || undefined),
        bridge().listAvailableModels().catch(() => localChatStore.getState().availableModels)
      ]);
      const feedback = buildHealthCheckFeedback(modelHealth);
      localChatStore.setState({
        modelHealth,
        availableModels: mergeAvailableModels(availableModels, [currentSettings.selectedModel, modelHealth.model]),
        healthCheckState: feedback.state,
        healthCheckMessage: feedback.message
      });
      setError(feedback.state === "failure" ? modelHealth.detail ?? feedback.message : null);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Health check failed";
      localChatStore.setState({
        healthCheckState: "failure",
        healthCheckMessage: `Health check failed at ${formatTime(new Date().toISOString())}. ${detail}`
      });
      setError(detail);
    } finally {
      localChatStore.setState({ loading: false });
    }
  };

  const updateSettings = async (patch: Partial<ChatSettingsState>): Promise<void> => {
    const currentState = localChatStore.getState();
    const nextSettings = {
      ...currentState.settings,
      ...patch
    };

    persistSettings(nextSettings);
    localChatStore.setState({ settings: nextSettings });

    if (patch.selectedModel !== undefined && patch.selectedModel !== currentState.settings.selectedModel) {
      try {
        const [modelHealth, availableModels] = await Promise.all([
          bridge().getModelHealth(nextSettings.selectedModel || undefined),
          bridge().listAvailableModels().catch(() => currentState.availableModels)
        ]);
        localChatStore.setState({
          modelHealth,
          availableModels: mergeAvailableModels(availableModels, [nextSettings.selectedModel, modelHealth.model])
        });
        setError(modelHealth.status === "error" ? modelHealth.detail ?? null : null);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to update model setting");
      }
    }
  };

  const createConversation = async (): Promise<void> => {
    localChatStore.setState({ loading: true });
    try {
      const created = await bridge().createConversation();
      const conversations = await bridge().listConversations();
      localChatStore.setState({
        conversations,
        activeConversationId: created.conversation.id,
        messages: created.messages,
        contextPreview: null
      });
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create conversation");
    } finally {
      localChatStore.setState({ loading: false });
    }
  };

  const switchConversation = async (conversationId: string): Promise<void> => {
    localChatStore.setState({ loading: true });
    try {
      await loadConversation(conversationId);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load conversation");
    } finally {
      localChatStore.setState({ loading: false });
    }
  };

  const deleteConversation = async (conversationId: string): Promise<void> => {
    localChatStore.setState({ loading: true });
    try {
      await bridge().deleteConversation(conversationId);
      await ensureConversation();
      const conversations = await bridge().listConversations();
      localChatStore.setState({ conversations });
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to delete conversation");
    } finally {
      localChatStore.setState({ loading: false });
    }
  };

  const clearConversation = async (): Promise<void> => {
    if (!state.activeConversationId) {
      return;
    }
    localChatStore.setState({ loading: true });
    try {
      const result = await bridge().clearConversation(state.activeConversationId);
      localChatStore.setState({
        messages: result.messages,
        contextPreview: null
      });
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to clear conversation");
    } finally {
      localChatStore.setState({ loading: false });
    }
  };

  const sendMessage = async (
    text: string,
    regenerate = false,
    options?: { useWebSearch?: boolean }
  ): Promise<void> => {
    if (!state.activeConversationId || !text.trim()) {
      return;
    }
    const resolvedUseWebSearch = options?.useWebSearch ?? state.settings.defaultWebSearch;
    const requestId = `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const previousMessages = state.messages;
    const previousConversations = state.conversations;
    const optimistic = buildOptimisticMessages(
      state.messages,
      state.activeConversationId,
      text,
      regenerate
    );

    localChatStore.setState({
      loading: true,
      pendingRequestId: requestId,
      pendingAssistantId: optimistic.pendingAssistant.id,
      messages: optimistic.messages,
      modelHealth: state.modelHealth
        ? {
            ...state.modelHealth,
            status: "busy",
            checkedAt: new Date().toISOString()
          }
        : state.modelHealth
    });
    try {
      const response = await bridge().sendChat({
        conversationId: state.activeConversationId,
        text,
        regenerate,
        requestId,
        useWebSearch: resolvedUseWebSearch,
        modelOverride: state.settings.selectedModel || undefined,
        responseMode: state.settings.responseMode
      });
      localChatStore.setState({
        conversations: mergeConversation(localChatStore.getState().conversations, response.conversation),
        activeConversationId: response.conversation.id,
        messages: response.messages,
        contextPreview: response.contextPreview,
        modelHealth: response.modelStatus,
        pendingRequestId: null,
        pendingAssistantId: null
      });
      setError(null);
    } catch (error) {
      localChatStore.setState({
        messages: previousMessages,
        conversations: previousConversations,
        pendingRequestId: null,
        pendingAssistantId: null
      });
      setError(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      localChatStore.setState({ loading: false });
    }
  };

  const regenerateLastReply = async (): Promise<void> => {
    const lastUser = [...state.messages].reverse().find((message) => message.role === "user");
    if (!lastUser) {
      return;
    }
    await sendMessage(lastUser.content, true);
  };

  const refreshRetrievedMemory = async (): Promise<void> => {
    if (!state.activeConversationId) {
      return;
    }
    const lastUser = [...state.messages].reverse().find((message) => message.role === "user");
    if (!lastUser) {
      return;
    }
    try {
      const contextPreview = await bridge().getContextPreview(state.activeConversationId, lastUser.content);
      localChatStore.setState({ contextPreview });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to refresh context preview");
    }
  };

  const listMemories = async (): Promise<void> => {
    try {
      const memories = await bridge().listMemories();
      localChatStore.setState({ memories });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to list memories");
    }
  };

  const searchMemories = async (query: string): Promise<void> => {
    try {
      const memories = await bridge().searchMemories(query);
      localChatStore.setState({ memories });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to search memories");
    }
  };

  const deleteMemory = async (memoryId: string): Promise<void> => {
    try {
      await bridge().deleteMemory(memoryId);
      await listMemories();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to delete memory");
    }
  };

  const copyLastResponse = async (): Promise<void> => {
    const lastAssistant = [...state.messages].reverse().find((message) => message.role === "assistant");
    if (!lastAssistant) {
      return;
    }
    await navigator.clipboard.writeText(lastAssistant.content);
  };

  return {
    ...state,
    refreshModelHealth,
    updateSettings,
    createConversation,
    switchConversation,
    deleteConversation,
    clearConversation,
    sendMessage,
    regenerateLastReply,
    refreshRetrievedMemory,
    listMemories,
    searchMemories,
    deleteMemory,
    copyLastResponse
  };
};
