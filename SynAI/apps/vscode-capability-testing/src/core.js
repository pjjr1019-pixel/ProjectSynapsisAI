import { readdir, readFile } from "node:fs/promises";
import * as path from "node:path";
const walkJsonFiles = async (root) => {
    const entries = await readdir(root, { withFileTypes: true });
    const files = [];
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
export const discoverCapabilityCards = async (cardsRoot) => {
    const files = await walkJsonFiles(cardsRoot);
    const cards = [];
    for (const filePath of files) {
        const raw = await readFile(filePath, "utf8").catch(() => null);
        if (!raw) {
            continue;
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            continue;
        }
        if (typeof parsed !== "object" || parsed === null) {
            continue;
        }
        const record = parsed;
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
export const buildCapabilityCliArgs = (input) => {
    if (input.command === "rerun-failed") {
        return ["run", "capability:rerun-failed", "--", "--json"];
    }
    if (!input.cardId) {
        return ["run", "capability:run:all", "--", "--json"];
    }
    return ["run", "capability:run", "--", "--card-id", input.cardId, "--json"];
};
const extractJsonObject = (raw) => {
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
export const parseCapabilityCliSummary = (rawOutput) => {
    const parsed = JSON.parse(extractJsonObject(rawOutput));
    if (typeof parsed.runId !== "string" ||
        typeof parsed.totals !== "object" ||
        parsed.totals === null ||
        !Array.isArray(parsed.cardResults)) {
        throw new Error("Capability CLI summary shape is invalid.");
    }
    return {
        runId: parsed.runId,
        totals: {
            total: Number(parsed.totals.total ?? 0),
            passed: Number(parsed.totals.passed ?? 0),
            failed: Number(parsed.totals.failed ?? 0)
        },
        cardResults: parsed.cardResults
            .filter((entry) => typeof entry === "object" &&
            entry !== null &&
            typeof entry.cardId === "string" &&
            typeof entry.status === "string" &&
            typeof entry.artifactDir === "string")
            .map((entry) => ({
            cardId: entry.cardId,
            status: entry.status === "passed" ? "passed" : "failed",
            artifactDir: entry.artifactDir
        }))
    };
};
export const resolveCardArtifactPath = (summary, cardId) => summary.cardResults.find((entry) => entry.cardId === cardId)?.artifactDir ?? null;
