import type { MemoryCategory } from "../../../contracts/src/memory";

const CATEGORY_BASE: Record<MemoryCategory, number> = {
  preference: 0.65,
  personal_fact: 0.7,
  project: 0.72,
  goal: 0.8,
  constraint: 0.85,
  decision: 0.88,
  note: 0.55
};

export const scoreImportance = (category: MemoryCategory, text: string): number => {
  const base = CATEGORY_BASE[category];
  const lengthBoost = Math.min(text.length / 250, 0.1);
  const specificityBoost = /\b(always|never|must|deadline|ship|critical)\b/i.test(text) ? 0.05 : 0;
  return Math.min(1, Number((base + lengthBoost + specificityBoost).toFixed(2)));
};
