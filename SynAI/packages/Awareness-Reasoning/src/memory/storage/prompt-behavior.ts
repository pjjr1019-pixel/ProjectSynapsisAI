import type {
  PromptBehaviorMemoryEntry,
  PromptBehaviorResolution,
  RetrievedPromptBehaviorMemory
} from "../../contracts/prompt-preferences";
import type { PromptIntentFamily } from "../../contracts/prompt-intent";
import type { ChatReplySourceScope } from "../../contracts/chat";
import { mutateDatabase, readDatabaseValue } from "./db";

const createId = (): string => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 32);

const normalizeLine = (value: string): string => value.replace(/\s+/g, " ").trim();

const STYLE_HINT_PATTERNS: Array<{ pattern: RegExp; tag: string }> = [
  { pattern: /\b(simple|plain language|plain english|easy to read|readable)\b/i, tag: "style-simple-readable" },
  { pattern: /\b(human|natural|conversational|less robotic|not robotic)\b/i, tag: "style-human-tone" },
  { pattern: /\b(concise|brief|short|very short)\b/i, tag: "style-brief" }
];

const deriveStyleHintTags = (hints: string[]): string[] => {
  const corpus = hints.join(" ");
  return STYLE_HINT_PATTERNS.filter((entry) => entry.pattern.test(corpus)).map((entry) => entry.tag);
};

const normalizeHints = (hints: string[]): string[] =>
  [
    ...new Set(
      hints
        .map(normalizeLine)
        .filter(Boolean)
        .flatMap((entry) => [entry.toLowerCase(), ...tokenize(entry), ...deriveStyleHintTags([entry])])
    )
  ]
    .slice(0, 24);

const normalizeChecks = (checks: PromptBehaviorResolution["requiredChecks"]): PromptBehaviorResolution["requiredChecks"] =>
  [...new Set(checks.filter(Boolean))];

const normalizeResolution = (resolution: PromptBehaviorResolution): PromptBehaviorResolution => ({
  ...resolution,
  requiredChecks: normalizeChecks(resolution.requiredChecks)
});

const normalizeConfidence = (value: number | null | undefined): number => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0.5;
  }
  return Math.max(0, Math.min(1, value));
};

const buildMatchKey = (parts: string[]): string =>
  normalizeLine(parts.join(" | "))
    .toLowerCase()
    .slice(0, 280);

export interface UpsertPromptBehaviorPreferenceInput {
  sourceConversationId: string;
  summary: string;
  preferenceLabel: string;
  matchHints: string[];
  resolution: PromptBehaviorResolution;
  confidence?: number;
}

export interface UpsertResolvedPromptPatternInput {
  sourceConversationId: string;
  summary: string;
  patternSummary: string;
  matchHints: string[];
  resolution: PromptBehaviorResolution;
  confidence?: number;
}

export interface MatchPromptBehaviorInput {
  query: string;
  intentFamily?: PromptIntentFamily | null;
  sourceScope?: ChatReplySourceScope | null;
  limit?: number;
}

export const listPromptBehaviorMemories = async (): Promise<PromptBehaviorMemoryEntry[]> =>
  readDatabaseValue((db) => db.promptBehaviorMemories.filter((entry) => !entry.archived));

export const upsertPromptBehaviorPreference = async (
  input: UpsertPromptBehaviorPreferenceInput
): Promise<PromptBehaviorMemoryEntry> => {
  const now = new Date().toISOString();
  const summary = normalizeLine(input.summary);
  const preferenceLabel = normalizeLine(input.preferenceLabel);
  const matchHints = normalizeHints([preferenceLabel, ...input.matchHints]);
  const resolution = normalizeResolution(input.resolution);
  const matchKey = buildMatchKey([
    "behavior_preference",
    preferenceLabel,
    resolution.sourceScope,
    resolution.outputShape,
    String(resolution.preserveExactStructure)
  ]);
  const confidence = normalizeConfidence(input.confidence);
  let stored: PromptBehaviorMemoryEntry | null = null;

  await mutateDatabase((db) => {
    const existingIndex = db.promptBehaviorMemories.findIndex(
      (entry) => !entry.archived && entry.entryKind === "behavior_preference" && entry.matchKey === matchKey
    );

    if (existingIndex >= 0) {
      const existing = db.promptBehaviorMemories[existingIndex];
      const updated: PromptBehaviorMemoryEntry = {
        ...existing,
        updatedAt: now,
        sourceConversationId: input.sourceConversationId,
        summary,
        preferenceLabel,
        matchHints,
        resolution,
        confidence: Math.max(existing.confidence, confidence)
      };
      const promptBehaviorMemories = [...db.promptBehaviorMemories];
      promptBehaviorMemories[existingIndex] = updated;
      stored = updated;
      return {
        ...db,
        promptBehaviorMemories
      };
    }

    const created: PromptBehaviorMemoryEntry = {
      id: createId(),
      entryKind: "behavior_preference",
      sourceConversationId: input.sourceConversationId,
      createdAt: now,
      updatedAt: now,
      archived: false,
      confidence,
      lastAppliedAt: null,
      matchKey,
      matchHints,
      summary,
      preferenceLabel,
      resolution
    };
    stored = created;
    return {
      ...db,
      promptBehaviorMemories: [...db.promptBehaviorMemories, created]
    };
  });

  return stored!;
};

export const upsertResolvedPromptPattern = async (
  input: UpsertResolvedPromptPatternInput
): Promise<PromptBehaviorMemoryEntry> => {
  const now = new Date().toISOString();
  const summary = normalizeLine(input.summary);
  const patternSummary = normalizeLine(input.patternSummary);
  const matchHints = normalizeHints([patternSummary, ...input.matchHints]);
  const resolution = normalizeResolution(input.resolution);
  const matchKey = buildMatchKey([
    "resolved_pattern",
    patternSummary,
    resolution.intentFamily,
    resolution.sourceScope,
    resolution.outputShape,
    String(resolution.preserveExactStructure)
  ]);
  const confidence = normalizeConfidence(input.confidence);
  let stored: PromptBehaviorMemoryEntry | null = null;

  await mutateDatabase((db) => {
    const existingIndex = db.promptBehaviorMemories.findIndex(
      (entry) => !entry.archived && entry.entryKind === "resolved_pattern" && entry.matchKey === matchKey
    );

    if (existingIndex >= 0) {
      const existing = db.promptBehaviorMemories[existingIndex];
      const updated: PromptBehaviorMemoryEntry = {
        ...existing,
        updatedAt: now,
        sourceConversationId: input.sourceConversationId,
        summary,
        patternSummary,
        matchHints,
        resolution,
        confidence: Math.max(existing.confidence, confidence)
      };
      const promptBehaviorMemories = [...db.promptBehaviorMemories];
      promptBehaviorMemories[existingIndex] = updated;
      stored = updated;
      return {
        ...db,
        promptBehaviorMemories
      };
    }

    const created: PromptBehaviorMemoryEntry = {
      id: createId(),
      entryKind: "resolved_pattern",
      sourceConversationId: input.sourceConversationId,
      createdAt: now,
      updatedAt: now,
      archived: false,
      confidence,
      lastAppliedAt: null,
      matchKey,
      matchHints,
      summary,
      patternSummary,
      resolution
    };
    stored = created;
    return {
      ...db,
      promptBehaviorMemories: [...db.promptBehaviorMemories, created]
    };
  });

  return stored!;
};

export const matchPromptBehaviorMemories = async ({
  query,
  intentFamily = null,
  sourceScope = null,
  limit = 4
}: MatchPromptBehaviorInput): Promise<RetrievedPromptBehaviorMemory[]> => {
  const terms = tokenize(query);
  const styleTags = deriveStyleHintTags([query]);
  if (terms.length === 0) {
    return [];
  }

  return readDatabaseValue((db) =>
    db.promptBehaviorMemories
      .filter((entry) => !entry.archived)
      .map((entry) => {
        const hintHits = terms.reduce(
          (total, term) =>
            total + (entry.matchHints.some((hint) => hint === term || hint.includes(term) || term.includes(hint)) ? 1 : 0),
          0
        );
        const hintScore = hintHits === 0 ? 0 : hintHits / Math.max(terms.length, 1);
        const intentScore = intentFamily && entry.resolution.intentFamily === intentFamily ? 0.35 : 0;
        const sourceScore = sourceScope && entry.resolution.sourceScope === sourceScope ? 0.25 : 0;
        const styleScore = styleTags.some((tag) => entry.matchHints.includes(tag)) ? 0.18 : 0;
        const confidenceScore = entry.confidence * 0.2;
        const score = hintScore + intentScore + sourceScore + styleScore + confidenceScore;
        const reason: RetrievedPromptBehaviorMemory["reason"] =
          intentScore + sourceScore + styleScore > hintScore ? "intent" : "keyword";

        return {
          entry,
          score,
          reason
        };
      })
      .filter((candidate) => candidate.score >= 0.2)
      .sort((left, right) => right.score - left.score || right.entry.updatedAt.localeCompare(left.entry.updatedAt))
      .slice(0, Math.max(1, limit))
  );
};

export const markPromptBehaviorMemoriesApplied = async (entryIds: string[]): Promise<void> => {
  const uniqueIds = new Set(entryIds.map((value) => value.trim()).filter(Boolean));
  if (uniqueIds.size === 0) {
    return;
  }
  const appliedAt = new Date().toISOString();
  await mutateDatabase((db) => {
    let changed = false;
    const promptBehaviorMemories = db.promptBehaviorMemories.map((entry) => {
      if (!uniqueIds.has(entry.id)) {
        return entry;
      }
      changed = true;
      return {
        ...entry,
        lastAppliedAt: appliedAt,
        updatedAt: appliedAt
      };
    });

    if (!changed) {
      return db;
    }

    return {
      ...db,
      promptBehaviorMemories
    };
  });
};
