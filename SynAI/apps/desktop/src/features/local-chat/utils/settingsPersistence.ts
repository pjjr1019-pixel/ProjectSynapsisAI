import {
  isReasoningProfile,
  type AwarenessAnswerMode,
  type ReasoningProfile,
  type ResponseMode
} from "@contracts";
import type { ChatSettingsState } from "../types/localChat.types";

export const SETTINGS_STORAGE_KEY = "synai.chat.settings";

export const defaultChatSettings: ChatSettingsState = {
  reasoningProfile: "chat",
  selectedModel: "",
  defaultWebSearch: false,
  advancedRagEnabled: true,
  workspaceIndexingEnabled: true,
  webInRagEnabled: true,
  liveTraceVisible: false,
  responseMode: "balanced",
  awarenessAnswerMode: "evidence-first"
};

const normalizeResponseMode = (value: unknown): ResponseMode =>
  value === "fast" || value === "balanced" || value === "smart"
    ? value
    : defaultChatSettings.responseMode;

const normalizeAwarenessAnswerMode = (value: unknown): AwarenessAnswerMode =>
  value === "llm-primary" || value === "evidence-first"
    ? value
    : defaultChatSettings.awarenessAnswerMode;

const normalizeReasoningProfileValue = (value: unknown): ReasoningProfile =>
  isReasoningProfile(value) ? value : defaultChatSettings.reasoningProfile;

export const hydrateChatSettings = (
  value: Partial<ChatSettingsState> | null | undefined
): ChatSettingsState => ({
  reasoningProfile: normalizeReasoningProfileValue(value?.reasoningProfile),
  selectedModel:
    typeof value?.selectedModel === "string"
      ? value.selectedModel
      : defaultChatSettings.selectedModel,
  defaultWebSearch:
    typeof value?.defaultWebSearch === "boolean"
      ? value.defaultWebSearch
      : defaultChatSettings.defaultWebSearch,
  advancedRagEnabled:
    typeof value?.advancedRagEnabled === "boolean"
      ? value.advancedRagEnabled
      : defaultChatSettings.advancedRagEnabled,
  workspaceIndexingEnabled:
    typeof value?.workspaceIndexingEnabled === "boolean"
      ? value.workspaceIndexingEnabled
      : defaultChatSettings.workspaceIndexingEnabled,
  webInRagEnabled:
    typeof value?.webInRagEnabled === "boolean"
      ? value.webInRagEnabled
      : defaultChatSettings.webInRagEnabled,
  liveTraceVisible:
    typeof value?.liveTraceVisible === "boolean"
      ? value.liveTraceVisible
      : defaultChatSettings.liveTraceVisible,
  responseMode: normalizeResponseMode(value?.responseMode),
  awarenessAnswerMode: normalizeAwarenessAnswerMode(value?.awarenessAnswerMode)
});

export const loadPersistedChatSettings = (
  storage: Pick<Storage, "getItem"> | null | undefined
): ChatSettingsState => {
  if (!storage) {
    return defaultChatSettings;
  }

  try {
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return defaultChatSettings;
    }
    return hydrateChatSettings(JSON.parse(raw) as Partial<ChatSettingsState>);
  } catch {
    return defaultChatSettings;
  }
};

export const persistChatSettings = (
  settings: ChatSettingsState,
  storage: Pick<Storage, "setItem"> | null | undefined
): void => {
  if (!storage) {
    return;
  }

  storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};
