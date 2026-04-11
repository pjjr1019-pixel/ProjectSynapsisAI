import { appendFile, mkdir, writeFile, readFile } from "node:fs/promises";
import * as path from "node:path";
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
export const createArtifactRunRoot = async (artifactsRoot, runId) => {
    const runRoot = path.join(artifactsRoot, "runs", runId);
    await mkdir(runRoot, { recursive: true });
    return runRoot;
};
export const createCardArtifactRoot = async (runRoot, cardId) => {
    const cardRoot = path.join(runRoot, cardId.replace(/[^a-zA-Z0-9._-]+/g, "_"));
    await mkdir(cardRoot, { recursive: true });
    return cardRoot;
};
export const writeCardArtifacts = async (input) => {
    await mkdir(input.artifactDir, { recursive: true });
    await writeFile(path.join(input.artifactDir, "test-card.snapshot.json"), json(input.cardSnapshot), "utf8");
    if (input.execution) {
        await writeFile(path.join(input.artifactDir, "model-request.json"), json(input.execution.request), "utf8");
        await writeFile(path.join(input.artifactDir, "model-response.raw.txt"), `${input.execution.rawResponseText}\n`, "utf8");
        await writeFile(path.join(input.artifactDir, "model-response.structured.json"), json(input.execution.output), "utf8");
    }
    if (input.verifier) {
        await writeFile(path.join(input.artifactDir, "verifier-result.json"), json(input.verifier), "utf8");
    }
    if (input.gap) {
        await writeFile(path.join(input.artifactDir, "gap-classification.json"), json(input.gap), "utf8");
    }
    if (input.remediation) {
        await writeFile(path.join(input.artifactDir, "remediation-plan.json"), json(input.remediation), "utf8");
    }
    if (input.sandbox) {
        await writeFile(path.join(input.artifactDir, "sandbox-result.json"), json(input.sandbox), "utf8");
    }
    if (input.rerunVerifier) {
        await writeFile(path.join(input.artifactDir, "rerun-verifier-result.json"), json(input.rerunVerifier), "utf8");
    }
    await writeFile(path.join(input.artifactDir, "final-status.json"), json({
        status: input.status,
        writtenAt: new Date().toISOString()
    }), "utf8");
};
const sanitizeCycleForSummary = (cycle) => ({
    cardId: cycle.cardId,
    status: cycle.status,
    startedAt: cycle.startedAt,
    completedAt: cycle.completedAt,
    artifactDir: cycle.artifactDir,
    verifier: cycle.verifier
        ? {
            passed: cycle.verifier.passed,
            score: cycle.verifier.score,
            reasons: cycle.verifier.reasons
        }
        : null,
    gap: cycle.gap,
    remediation: cycle.remediation
        ? {
            remediation_type: cycle.remediation.remediation_type,
            risk_level: cycle.remediation.risk_level,
            approval_requirement: cycle.remediation.approval_requirement
        }
        : null,
    sandbox: cycle.sandbox
        ? {
            applied: cycle.sandbox.applied,
            promoted: cycle.sandbox.promoted,
            diffSummary: cycle.sandbox.diffSummary,
            rerunPassed: cycle.sandbox.rerunResult?.passed ?? null
        }
        : null
});
export const writeRunSummaryArtifacts = async (artifactsRoot, runSummary) => {
    await mkdir(artifactsRoot, { recursive: true });
    await mkdir(path.join(artifactsRoot, "runs", runSummary.runId), { recursive: true });
    const summaryOutput = {
        ...runSummary,
        cardResults: runSummary.cardResults.map((cycle) => sanitizeCycleForSummary(cycle))
    };
    await writeFile(path.join(artifactsRoot, "latest-summary.json"), json(summaryOutput), "utf8");
    await writeFile(path.join(artifactsRoot, "runs", runSummary.runId, "summary.json"), json(summaryOutput), "utf8");
    await appendFile(path.join(artifactsRoot, "history.jsonl"), `${JSON.stringify(summaryOutput)}\n`, "utf8");
};
export const readLatestFailedCardIds = async (artifactsRoot) => {
    const summaryPath = path.join(artifactsRoot, "latest-summary.json");
    const raw = await readFile(summaryPath, "utf8").catch(() => null);
    if (!raw) {
        return null;
    }
    const parsed = JSON.parse(raw);
    const runId = typeof parsed.runId === "string" ? parsed.runId : "unknown";
    const cardIds = parsed.cardResults
        ?.filter((entry) => entry.status === "failed" && typeof entry.cardId === "string")
        .map((entry) => entry.cardId) ?? [];
    return {
        runId,
        cardIds
    };
};
