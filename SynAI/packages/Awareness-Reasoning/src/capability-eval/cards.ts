import { readdir } from "node:fs/promises";
import * as path from "node:path";
import { loadCapabilityCardFromFile } from "./schema";
import type { CapabilityTestCard } from "./types";

const walkJsonFiles = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkJsonFiles(absolute)));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
      results.push(absolute);
    }
  }
  return results;
};

export interface LoadedCapabilityCard {
  filePath: string;
  card: CapabilityTestCard;
}

export const loadCapabilityCards = async (cardsRoot: string): Promise<LoadedCapabilityCard[]> => {
  const files = await walkJsonFiles(cardsRoot);
  const loaded = await Promise.all(
    files.map(async (filePath) => ({
      filePath,
      card: await loadCapabilityCardFromFile(filePath)
    }))
  );

  return loaded.sort((left, right) => {
    if (right.card.priority !== left.card.priority) {
      return right.card.priority - left.card.priority;
    }
    return left.card.id.localeCompare(right.card.id);
  });
};

export const findCardById = (
  cards: LoadedCapabilityCard[],
  cardId: string
): LoadedCapabilityCard | null => cards.find((entry) => entry.card.id === cardId) ?? null;

