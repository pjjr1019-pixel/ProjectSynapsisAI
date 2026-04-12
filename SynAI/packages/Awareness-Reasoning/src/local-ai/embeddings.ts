import { getOllamaConfig, ollamaEmbeddings } from "./ollama";
import type { LocalAIRequestOptions } from "./provider";
import { resolveScheduledLocalAISelection, withScheduledLocalAITask } from "./scheduler";

export const getEmbeddings = async (text: string, overrides: LocalAIRequestOptions = {}): Promise<number[]> => {
  const config = getOllamaConfig(overrides);
  const embedModel = overrides.embedModel ?? config.embedModel;
  if (!embedModel) {
    return [];
  }
  const selection = resolveScheduledLocalAISelection(
    {
      ...config,
      embedModel
    },
    {
      ...overrides,
      taskClass: "embedding",
      reason: overrides.reason ?? "embedding request"
    }
  );
  const result = await withScheduledLocalAITask(selection, async ({ config: scheduledConfig, summary }) =>
    ollamaEmbeddings(
      {
        ...scheduledConfig,
        embedModel
      },
      text,
      {
        keepAliveMs: summary.keepAliveMs
      }
    )
  );
  return result.result;
};
