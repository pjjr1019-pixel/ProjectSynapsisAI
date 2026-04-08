import { getOllamaConfig, ollamaEmbeddings } from "./ollama";

export const getEmbeddings = async (text: string): Promise<number[]> => {
  const config = getOllamaConfig();
  if (!config.embedModel) {
    return [];
  }
  return ollamaEmbeddings(config, text);
};
