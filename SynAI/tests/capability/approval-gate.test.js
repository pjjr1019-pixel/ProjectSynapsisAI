import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { createGovernedPromotionHashInput, hashGovernanceCommand, issueApprovalToken } from "@governance-execution";
import { applyRemediationSandbox } from "../../packages/Awareness-Reasoning/src/capability-eval/approval/gate";
const passingVerifier = {
    passed: true,
    score: 1,
    reasons: [],
    evidence: [],
    observed_output: null,
    expected_output_summary: ""
};
const plan = {
    remediation_type: "test-card-clarification",
    rationale: "Add context",
    concrete_file_targets: [],
    proposed_patch_summary: "merge card fields",
    risk_level: "low",
    approval_requirement: "none",
    follow_up_tests_to_rerun: ["windows.test"],
    auto_patch: {
        kind: "card-json-merge",
        target: "packages/Capability-Catalog/cards/windows/test.json",
        merge: {
            enabled: true
        }
    }
};
const retrievalPlan = {
    remediation_type: "retrieval-adjustment",
    rationale: "Add retrieval hints",
    concrete_file_targets: [],
    proposed_patch_summary: "merge retrieval hints",
    risk_level: "medium",
    approval_requirement: "operator-approval",
    follow_up_tests_to_rerun: ["windows.test"],
    auto_patch: {
        kind: "retrieval-hint-merge",
        target: "packages/Capability-Catalog/retrieval/index-hints.json",
        merge: {
            cards: {
                "windows.test": {
                    queryAugments: ["ram", "process"]
                }
            }
        }
    }
};
describe("approval gate sandbox flow", () => {
    it("applies low-risk patch in sandbox without promoting", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "capability-gate-"));
        const artifactsRoot = path.join(workspaceRoot, ".runtime", "capability-eval");
        const targetPath = path.join(workspaceRoot, "packages", "Capability-Catalog", "cards", "windows", "test.json");
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, `${JSON.stringify({ id: "windows.test", enabled: false }, null, 2)}\n`, "utf8");
        try {
            const result = await applyRemediationSandbox({
                mode: "sandbox-apply",
                autoRemediate: true,
                runId: "run-1",
                cardId: "windows.test",
                cardFilePath: targetPath,
                workspaceRoot,
                artifactsRoot,
                remediation: plan,
                rerunWithCardFile: async () => passingVerifier
            });
            expect(result.applied).toBe(true);
            expect(result.promoted).toBe(false);
            expect(result.rerunResult?.passed).toBe(true);
            expect(result.appliedFiles.length).toBe(1);
            expect(result.diffSummary).toContain("Changed");
        }
        finally {
            await rm(workspaceRoot, { recursive: true, force: true });
        }
    });
    it("blocks governed promotion when token is missing", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "capability-gate-"));
        const artifactsRoot = path.join(workspaceRoot, ".runtime", "capability-eval");
        const targetPath = path.join(workspaceRoot, "packages", "Capability-Catalog", "cards", "windows", "test.json");
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, `${JSON.stringify({ id: "windows.test", enabled: false }, null, 2)}\n`, "utf8");
        try {
            const result = await applyRemediationSandbox({
                mode: "governed-promotion",
                autoRemediate: true,
                runId: "run-2",
                cardId: "windows.test",
                cardFilePath: targetPath,
                workspaceRoot,
                artifactsRoot,
                remediation: plan,
                approvedBy: "qa-operator",
                rerunWithCardFile: async () => passingVerifier
            });
            expect(result.promoted).toBe(false);
            expect(result.promotionSummary).toContain("blocked");
        }
        finally {
            await rm(workspaceRoot, { recursive: true, force: true });
        }
    });
    it("promotes patch only with valid signed token and passing rerun", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "capability-gate-"));
        const artifactsRoot = path.join(workspaceRoot, ".runtime", "capability-eval");
        const targetPath = path.join(workspaceRoot, "packages", "Capability-Catalog", "cards", "windows", "test.json");
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, `${JSON.stringify({ id: "windows.test", enabled: false }, null, 2)}\n`, "utf8");
        try {
            const commandHash = hashGovernanceCommand(createGovernedPromotionHashInput("windows.test", "packages/Capability-Catalog/cards/windows/test.json"));
            const token = issueApprovalToken(commandHash, "qa-operator", 10 * 60 * 1000);
            const result = await applyRemediationSandbox({
                mode: "governed-promotion",
                autoRemediate: true,
                runId: "run-3",
                cardId: "windows.test",
                cardFilePath: targetPath,
                workspaceRoot,
                artifactsRoot,
                remediation: plan,
                approvedBy: "qa-operator",
                approvalToken: token,
                rerunWithCardFile: async () => passingVerifier
            });
            const promotedRaw = await readFile(targetPath, "utf8");
            expect(result.promoted).toBe(true);
            expect(promotedRaw).toContain("\"enabled\": true");
            expect(result.promotionSummary).toContain("Promoted sandbox patch");
        }
        finally {
            await rm(workspaceRoot, { recursive: true, force: true });
        }
    });
    it("applies retrieval hint patch in sandbox under governance checks", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "capability-gate-"));
        const artifactsRoot = path.join(workspaceRoot, ".runtime", "capability-eval");
        const cardPath = path.join(workspaceRoot, "packages", "Capability-Catalog", "cards", "windows", "test.json");
        const hintsPath = path.join(workspaceRoot, "packages", "Capability-Catalog", "retrieval", "index-hints.json");
        await mkdir(path.dirname(cardPath), { recursive: true });
        await mkdir(path.dirname(hintsPath), { recursive: true });
        await writeFile(cardPath, `${JSON.stringify({ id: "windows.test", enabled: false }, null, 2)}\n`, "utf8");
        await writeFile(hintsPath, `${JSON.stringify({ version: 1, cards: {} }, null, 2)}\n`, "utf8");
        try {
            const result = await applyRemediationSandbox({
                mode: "sandbox-apply",
                autoRemediate: true,
                runId: "run-4",
                cardId: "windows.test",
                cardFilePath: cardPath,
                workspaceRoot,
                artifactsRoot,
                remediation: retrievalPlan,
                rerunWithCardFile: async () => passingVerifier
            });
            expect(result.applied).toBe(true);
            expect(result.appliedFiles[0]).toContain("index-hints.json");
            expect(result.rerunResult?.passed).toBe(true);
        }
        finally {
            await rm(workspaceRoot, { recursive: true, force: true });
        }
    });
});
