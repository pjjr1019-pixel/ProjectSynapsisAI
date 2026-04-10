import { readdir, readFile } from "node:fs/promises";
import * as path from "node:path";

export interface CapabilityCardDescriptor {
  id: string;
  name: string;
  filePath: string;
}

export interface CapabilityCliCardResult {
  cardId: string;
  status: "passed" | "failed";
  artifactDir: string;
}

export interface CapabilityCliSummary {
  runId: string;
  totals: {
    total: number;
    passed: number;
    failed: number;
  };
  cardResults: CapabilityCliCardResult[];
}

const walkJsonFiles = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJsonFiles(absolute)));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
      files.push(absolute);
    }
  }
  return files;
};

export const discoverCapabilityCards = async (
  cardsRoot: string
): Promise<CapabilityCardDescriptor[]> => {
  const files = await walkJsonFiles(cardsRoot);
  const cards: CapabilityCardDescriptor[] = [];
  for (const filePath of files) {
    const raw = await readFile(filePath, "utf8").catch(() => null);
    if (!raw) {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      continue;
    }
    if (typeof parsed !== "object" || parsed === null) {
      continue;
    }
    const record = parsed as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.name !== "string") {
      continue;
    }
    cards.push({
      id: record.id,
      name: record.name,
      filePath
    });
  }

  return cards.sort((left, right) => left.id.localeCompare(right.id));
};

export const buildCapabilityCliArgs = (input: {
  command: "run" | "rerun-failed";
  cardId?: string;
}): string[] => {
  if (input.command === "rerun-failed") {
    return ["run", "capability:rerun-failed", "--", "--json"];
  }
  if (!input.cardId) {
    return ["run", "capability:run:all", "--", "--json"];
  }
  return ["run", "capability:run", "--", "--card-id", input.cardId, "--json"];
};

const extractJsonObject = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Capability CLI output was empty.");
  }
  if (trimmed.startsWith("{")) {
    return trimmed;
  }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error("Capability CLI did not return JSON output.");
  }
  return trimmed.slice(firstBrace, lastBrace + 1);
};

export const parseCapabilityCliSummary = (rawOutput: string): CapabilityCliSummary => {
  const parsed = JSON.parse(extractJsonObject(rawOutput)) as Partial<CapabilityCliSummary>;
  if (
    typeof parsed.runId !== "string" ||
    typeof parsed.totals !== "object" ||
    parsed.totals === null ||
    !Array.isArray(parsed.cardResults)
  ) {
    throw new Error("Capability CLI summary shape is invalid.");
  }

  return {
    runId: parsed.runId,
    totals: {
      total: Number((parsed.totals as { total?: number }).total ?? 0),
      passed: Number((parsed.totals as { passed?: number }).passed ?? 0),
      failed: Number((parsed.totals as { failed?: number }).failed ?? 0)
    },
    cardResults: parsed.cardResults
      .filter(
        (entry): entry is CapabilityCliCardResult =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as { cardId?: unknown }).cardId === "string" &&
          typeof (entry as { status?: unknown }).status === "string" &&
          typeof (entry as { artifactDir?: unknown }).artifactDir === "string"
      )
      .map((entry) => ({
        cardId: entry.cardId,
        status: entry.status === "passed" ? "passed" : "failed",
        artifactDir: entry.artifactDir
      }))
  };
};

export const resolveCardArtifactPath = (
  summary: CapabilityCliSummary,
  cardId: string
): string | null =>
  summary.cardResults.find((entry) => entry.cardId === cardId)?.artifactDir ?? null;
