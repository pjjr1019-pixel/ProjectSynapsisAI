import { useEffect, useRef, useSyncExternalStore } from "react";
import type {
  AwarenessQueryAnswer,
  AwarenessQueryRequest,
  ChatMessage,
  Conversation,
  ModelHealth,
  PromptEvaluationRequest,
  ToggleMode,
  ScreenAwarenessStatus,
  StartAssistModeOptions
} from "@contracts";
import { localChatStore } from "../store/localChatStore";
import { formatTime } from "../../../shared/utils/time";
import type { ChatSettingsState } from "../types/localChat.types";
import {
  buildLiveUsageMessageMetadata,
  formatLiveUsageReply,
  isLiveUsageAnswer,
  LIVE_USAGE_REFRESH_MS
} from "../utils/liveUsageReply";
import {
  defaultChatSettings,
  loadPersistedChatSettings,
  persistChatSettings
} from "../utils/settingsPersistence";

const bridge = () => window.synai;

interface ScreenBridgeApi {
  getScreenStatus?: () => Promise<ScreenAwarenessStatus | null>;
  startAssistMode?: (options: StartAssistModeOptions) => Promise<ScreenAwarenessStatus | null>;
  stopAssistMode?: (reason?: string) => Promise<ScreenAwarenessStatus | null>;
}

interface AwarenessBridgeApi {
  queryAwareness?: (request: AwarenessQueryRequest) => Promise<AwarenessQueryAnswer | null>;
}

const screenBridge = (): ScreenBridgeApi => bridge() as ScreenBridgeApi;
const awarenessBridge = (): AwarenessBridgeApi => bridge() as AwarenessBridgeApi;

const setError = (message: string | null): void => {
  localChatStore.setState({ error: message });
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

export interface SendMessageOptions {
  ragMode?: ToggleMode;
  webMode?: ToggleMode;
  traceMode?: ToggleMode;
  codingMode?: ToggleMode;
  highQualityMode?: ToggleMode;
}

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

export const useLocalChat = (options: { chatVisible?: boolean } = {}) => {
  const chatVisible = options.chatVisible ?? true;
  const state = useSyncExternalStore(localChatStore.subscribe, localChatStore.getState);
  const liveUsageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveUsageSessionRef = useRef<{
    conversationId: string;
    messageId: string;
    query: string;
    answerMode: AwarenessQueryAnswer["answerMode"];
  } | null>(null);
  const liveUsageInFlightRef = useRef(false);

  // Rec #6: streaming chunk batching via requestAnimationFrame
  const streamingContentRef = useRef<string>("");
  const streamingRafRef = useRef<number | null>(null);
  const pendingAssistantIdRef = useRef<string | null>(null);

  const stopLiveUsageRefresh = (reason = "stop"): void => {
    void reason;
    if (liveUsageTimerRef.current !== null) {
      clearInterval(liveUsageTimerRef.current);
      liveUsageTimerRef.current = null;
    }
    liveUsageSessionRef.current = null;
    liveUsageInFlightRef.current = false;
  };

  const updateLiveUsageMessage = (
    session: NonNullable<typeof liveUsageSessionRef.current>,
    answer: AwarenessQueryAnswer
  ): void => {
    const refreshedAt = answer.generatedAt ?? new Date().toISOString();
    localChatStore.setState({
      messages: localChatStore.getState().messages.map((message) =>
        message.id === session.messageId
          ? {
              ...message,
              content: formatLiveUsageReply(answer, refreshedAt),
              metadata: buildLiveUsageMessageMetadata(answer, session.query, refreshedAt)
            }
          : message
      )
    });
  };

  const startLiveUsageRefresh = (session: {
    conversationId: string;
    messageId: string;
    query: string;
    answerMode: AwarenessQueryAnswer["answerMode"];
  }): void => {
    if (!chatVisible) {
      return;
    }

    stopLiveUsageRefresh("restart");
    liveUsageSessionRef.current = session;

    const tick = async (): Promise<void> => {
      if (liveUsageInFlightRef.current) {
        return;
      }

      const currentSession = liveUsageSessionRef.current;
      if (
        !currentSession ||
        !chatVisible ||
        currentSession.conversationId !== localChatStore.getState().activeConversationId
      ) {
        stopLiveUsageRefresh("inactive");
        return;
      }

      liveUsageInFlightRef.current = true;
      try {
        const refreshed = await awarenessBridge().queryAwareness?.({
          query: currentSession.query,
          awarenessAnswerMode: currentSession.answerMode ?? undefined,
          refresh: true,
          hints: {
            force: true,
            strictGrounding: true,
            maxScanMs: 250
          }
        });

        const latestSession = liveUsageSessionRef.current;
        if (!refreshed || !latestSession || latestSession.messageId !== currentSession.messageId || !isLiveUsageAnswer(refreshed)) {
          return;
        }

        updateLiveUsageMessage(latestSession, refreshed);
      } catch {
        // Leave the last known live values in place.
      } finally {
        liveUsageInFlightRef.current = false;
      }
    };

    liveUsageTimerRef.current = setInterval(() => {
      void tick();
    }, LIVE_USAGE_REFRESH_MS);
  };

  useEffect(() => {
    let appHealthTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const nextAppHealthDelay = (): number => {
      const runtime = localChatStore.getState().appHealth?.awareness;
      if (typeof document !== "undefined" && document.hidden) {
        return 12_000;
      }
      return runtime?.ready ? 8_000 : 4_000;
    };

    const refreshAppHealth = async (): Promise<void> => {
      try {
        const nextAppHealth = await bridge().getAppHealth();
        localChatStore.setState({ appHealth: nextAppHealth });
      } catch {
        // Keep the last known app health in place.
      }
    };

    const scheduleAppHealthPoll = (delayMs = nextAppHealthDelay()): void => {
      appHealthTimer = setTimeout(() => {
        void refreshAppHealth().finally(() => {
          if (!cancelled) {
            scheduleAppHealthPoll(nextAppHealthDelay());
          }
        });
      }, delayMs);
    };

    const flushStreamingContent = (): void => {
      streamingRafRef.current = null;
      const pendingId = pendingAssistantIdRef.current;
      const content = streamingContentRef.current;
      if (!pendingId) {
        return;
      }
      const s = localChatStore.getState();
      // Only update if still streaming this message
      if (s.pendingAssistantId !== pendingId) {
        return;
      }
      localChatStore.setState({
        messages: s.messages.map((message) =>
          message.id === pendingId ? { ...message, content } : message
        )
      });
    };

    const unsubscribeChatStream = bridge().subscribeChatStream((event) => {
      const currentState = localChatStore.getState();
      if (
        currentState.pendingRequestId !== event.requestId ||
        currentState.pendingAssistantId === null ||
        currentState.activeConversationId !== event.conversationId
      ) {
        return;
      }

      // Rec #6: accumulate content in a ref and flush via RAF — one store update per frame
      streamingContentRef.current = event.content;
      pendingAssistantIdRef.current = currentState.pendingAssistantId;

      if (streamingRafRef.current === null) {
        streamingRafRef.current = requestAnimationFrame(flushStreamingContent);
      }
    });

    const unsubscribeReasoningTrace =
      bridge().subscribeReasoningTrace?.((event) => {
        const currentState = localChatStore.getState();
        if (
          currentState.pendingRequestId !== event.requestId ||
          currentState.activeConversationId !== event.conversationId
        ) {
          return;
        }

        localChatStore.setState({
          pendingReasoningTrace: event.trace
        });
      }) ?? (() => {});

    const unsubscribeBackgroundSync = bridge().subscribeBackgroundSync((event) => {
      localChatStore.setState({
        conversations: event.conversations,
        modelHealth: event.modelStatus
      });
    });

    const start = async () => {
      localChatStore.setState({ loading: true });
      try {
        const persistedSettings = loadPersistedChatSettings(
          typeof window === "undefined" ? null : window.localStorage
        );
        localChatStore.setState({ settings: persistedSettings });

        const [appHealth, modelHealth, availableModels] = await Promise.all([
          bridge().getAppHealth(),
          bridge().getModelHealth(persistedSettings.selectedModel || undefined),
          bridge().listAvailableModels().catch(() => [])
        ]);
        const screenApi = screenBridge();
        const screenStatus = screenApi.getScreenStatus ? await screenApi.getScreenStatus().catch(() => null) : null;
        const hydratedSettings = hydrateSettingsFromModel(persistedSettings, modelHealth);
        persistChatSettings(hydratedSettings, typeof window === "undefined" ? null : window.localStorage);
        localChatStore.setState({
          appHealth,
          modelHealth,
          screenStatus,
          availableModels: mergeAvailableModels(availableModels, [hydratedSettings.selectedModel, modelHealth.model]),
          settings: hydratedSettings
        });
        scheduleAppHealthPoll();
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
      unsubscribeReasoningTrace();
      unsubscribeBackgroundSync();
      stopLiveUsageRefresh("unmount");
      if (appHealthTimer !== null) {
        clearTimeout(appHealthTimer);
      }
      cancelled = true;
      if (streamingRafRef.current !== null) {
        cancelAnimationFrame(streamingRafRef.current);
        streamingRafRef.current = null;
      }
    };
  }, []);

  // Rec #5: use the last message ID as a stable dep instead of the full messages array.
  // This prevents the effect from running on every streaming chunk (content change ≠ new message).
  const lastMessageId = state.messages[state.messages.length - 1]?.id ?? null;

  useEffect(() => {
    if (!chatVisible || state.loading || state.pendingRequestId || !state.activeConversationId) {
      stopLiveUsageRefresh(chatVisible ? "inactive" : "hidden");
      return;
    }

    const lastAssistant = [...state.messages].reverse().find((message) => message.role === "assistant");
    const awareness = lastAssistant?.metadata?.awareness;
    if (!lastAssistant || awareness?.intentFamily !== "live-usage" || !awareness.query) {
      stopLiveUsageRefresh("no-live-usage");
      return;
    }

    const currentSession = liveUsageSessionRef.current;
    if (
      currentSession &&
      currentSession.conversationId === state.activeConversationId &&
      currentSession.messageId === lastAssistant.id &&
      currentSession.query === awareness.query
    ) {
      return;
    }

    startLiveUsageRefresh({
      conversationId: state.activeConversationId,
      messageId: lastAssistant.id,
      query: awareness.query,
      answerMode: awareness.answerMode ?? state.settings.awarenessAnswerMode
    });

    return () => {
      if (!chatVisible) {
        stopLiveUsageRefresh("hidden");
      }
    };
  }, [
    chatVisible,
    state.activeConversationId,
    state.loading,
    lastMessageId,
    state.pendingRequestId,
    state.settings.awarenessAnswerMode
  ]);

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

  const startAssistMode = async (options: StartAssistModeOptions): Promise<void> => {
    try {
      const screenApi = screenBridge();
      if (!screenApi.startAssistMode) {
        setError("Screen awareness bridge unavailable");
        return;
      }

      const status = await screenApi.startAssistMode(options).catch(() => null);
      localChatStore.setState({ screenStatus: status });
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to start Assist Mode");
    }
  };

  const stopAssistMode = async (reason = "user-disabled"): Promise<void> => {
    try {
      const screenApi = screenBridge();
      if (!screenApi.stopAssistMode) {
        setError("Screen awareness bridge unavailable");
        return;
      }

      const status = await screenApi.stopAssistMode(reason).catch(() => null);
      localChatStore.setState({ screenStatus: status });
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to stop Assist Mode");
    }
  };

  const updateSettings = async (patch: Partial<ChatSettingsState>): Promise<void> => {
    const currentState = localChatStore.getState();
    const nextSettings = {
      ...currentState.settings,
      ...patch
    };

    persistChatSettings(nextSettings, typeof window === "undefined" ? null : window.localStorage);
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
    stopLiveUsageRefresh("new-conversation");
    localChatStore.setState({ loading: true });
    try {
      const created = await bridge().createConversation();
      const conversations = await bridge().listConversations();
      localChatStore.setState({
        conversations,
        activeConversationId: created.conversation.id,
        messages: created.messages,
        contextPreview: null,
        pendingReasoningTrace: null
      });
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create conversation");
    } finally {
      localChatStore.setState({ loading: false });
    }
  };

  const switchConversation = async (conversationId: string): Promise<void> => {
    stopLiveUsageRefresh("switch-conversation");
    localChatStore.setState({ loading: true, pendingReasoningTrace: null });
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
    stopLiveUsageRefresh("delete-conversation");
    localChatStore.setState({ loading: true, pendingReasoningTrace: null });
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
    stopLiveUsageRefresh("clear-conversation");
    localChatStore.setState({ loading: true });
    try {
      const result = await bridge().clearConversation(state.activeConversationId);
      localChatStore.setState({
        messages: result.messages,
        contextPreview: null,
        pendingReasoningTrace: null
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
    options?: SendMessageOptions
  ): Promise<void> => {
    if (!state.activeConversationId || !text.trim()) {
      return;
    }
    stopLiveUsageRefresh("new-message");
    const resolvedUseWebSearch =
      options?.webMode === "on" ? true : options?.webMode === "off" ? false : undefined;
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
      pendingReasoningTrace: null,
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
        responseMode: state.settings.responseMode,
        awarenessAnswerMode: state.settings.awarenessAnswerMode,
        codingMode:
          options?.codingMode && options.codingMode !== "inherit"
            ? options.codingMode
            : state.settings.codingModeEnabled
              ? "on"
              : "off",
        highQualityMode:
          options?.highQualityMode && options.highQualityMode !== "inherit"
            ? options.highQualityMode
            : state.settings.highQualityModeEnabled
              ? "on"
              : "off",
        ragOptions: {
          enabled: options?.ragMode ?? "inherit",
          useWeb: options?.webMode ?? "inherit",
          showTrace: options?.traceMode ?? "inherit",
          defaultEnabled: state.settings.highQualityModeEnabled,
          defaultUseWeb: state.settings.defaultWebSearch && state.settings.webInRagEnabled,
          defaultShowTrace: state.settings.liveTraceVisible,
          workspaceIndexingEnabled: state.settings.workspaceIndexingEnabled
        }
      });
      // Rec #6: cancel any pending RAF flush before writing the authoritative final state
      if (streamingRafRef.current !== null) {
        cancelAnimationFrame(streamingRafRef.current);
        streamingRafRef.current = null;
      }
      pendingAssistantIdRef.current = null;
      localChatStore.setState({
        conversations: mergeConversation(localChatStore.getState().conversations, response.conversation),
        activeConversationId: response.conversation.id,
        messages: response.messages,
        contextPreview: response.contextPreview,
        modelHealth: response.modelStatus,
        pendingRequestId: null,
        pendingAssistantId: null,
        pendingReasoningTrace: null
      });
      setError(null);
    } catch (error) {
      localChatStore.setState({
        messages: previousMessages,
        conversations: previousConversations,
        pendingRequestId: null,
        pendingAssistantId: null,
        pendingReasoningTrace: null
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
    stopLiveUsageRefresh("regenerate");
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
      const awareContextPreview = await bridge().getContextPreview(
        state.activeConversationId,
        lastUser.content,
        state.settings.awarenessAnswerMode,
        {
          defaultEnabled: state.settings.highQualityModeEnabled,
          defaultUseWeb: state.settings.defaultWebSearch && state.settings.webInRagEnabled,
          defaultShowTrace: state.settings.liveTraceVisible,
          workspaceIndexingEnabled: state.settings.workspaceIndexingEnabled
        }
      );
      localChatStore.setState({ contextPreview: awareContextPreview });
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

  const runPromptEvaluation = async (request: PromptEvaluationRequest): Promise<void> => {
    if (localChatStore.getState().promptEvaluationRunning) {
      return;
    }

    localChatStore.setState({
      promptEvaluationRunning: true,
      promptEvaluationError: null
    });

    try {
      const result = await bridge().runPromptEvaluation(request);
      localChatStore.setState({
        promptEvaluationResult: result,
        promptEvaluationError: null
      });
    } catch (error) {
      localChatStore.setState({
        promptEvaluationError:
          error instanceof Error ? error.message : "Failed to run prompt evaluation"
      });
    } finally {
      localChatStore.setState({ promptEvaluationRunning: false });
    }
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
    copyLastResponse,
    runPromptEvaluation,
    startAssistMode,
    stopAssistMode
  };
};
