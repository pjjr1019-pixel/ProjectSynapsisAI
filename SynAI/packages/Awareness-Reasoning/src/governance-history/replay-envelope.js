import { appendFile, mkdir, readFile } from "node:fs/promises";
import * as path from "node:path";
const normalize = (value) => String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const replayEnvelopePath = (runtimeRoot) => path.join(runtimeRoot, "governance", "replay-envelopes.jsonl");
export const appendGovernanceReplayEnvelope = async (runtimeRoot, envelope) => {
    const filePath = replayEnvelopePath(runtimeRoot);
    await mkdir(path.dirname(filePath), { recursive: true });
    await appendFile(filePath, `${JSON.stringify(envelope)}\n`, "utf8");
};
export const listGovernanceReplayEnvelopes = async (runtimeRoot) => {
    const filePath = replayEnvelopePath(runtimeRoot);
    try {
        const raw = await readFile(filePath, "utf8");
        return raw
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => JSON.parse(line));
    }
    catch {
        return [];
    }
};
export const findLatestGovernanceReplayEnvelope = async (runtimeRoot, predicate) => {
    const signature = normalize(predicate.sourceFailureSignature);
    const recoveredIntent = normalize(predicate.recoveredIntent);
    const resolvedPrompt = normalize(predicate.resolvedPrompt);
    const sourceRoute = normalize(predicate.sourceRoute);
    const envelopes = await listGovernanceReplayEnvelopes(runtimeRoot);
    for (let index = envelopes.length - 1; index >= 0; index -= 1) {
        const envelope = envelopes[index];
        if ((signature && normalize(envelope.sourceFailureSignature).includes(signature)) ||
            (recoveredIntent && normalize(envelope.recoveredIntent).includes(recoveredIntent)) ||
            (resolvedPrompt && normalize(envelope.resolvedPrompt).includes(resolvedPrompt)) ||
            (sourceRoute && normalize(envelope.sourceRoute).includes(sourceRoute))) {
            return envelope;
        }
    }
    return null;
};
