import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { queryGovernanceAuditEntries } from "@governance-execution";
describe("governance audit query", () => {
    it("includes root agent runtime audit entries in the governance audit surface", async () => {
        const runtimeRoot = await mkdtemp(path.join(tmpdir(), "governance-audit-"));
        const agentRuntimeRoot = path.join(runtimeRoot, "agent-runtime");
        const jobsDir = path.join(agentRuntimeRoot, "jobs");
        const checkpointsDir = path.join(agentRuntimeRoot, "checkpoints", "job-1");
        const auditDir = path.join(agentRuntimeRoot, "audit");
        await mkdir(jobsDir, { recursive: true });
        await mkdir(checkpointsDir, { recursive: true });
        await mkdir(auditDir, { recursive: true });
        try {
            await writeFile(path.join(jobsDir, "job-1.json"), JSON.stringify({
                id: "job-1",
                createdAt: "2026-04-10T10:00:00.000Z",
                status: "denied",
                taskId: "task-1"
            }, null, 2), "utf8");
            await writeFile(path.join(checkpointsDir, "ckpt-1.json"), JSON.stringify({
                id: "ckpt-1",
                jobId: "job-1",
                createdAt: "2026-04-10T10:01:00.000Z",
                summary: "Approval token has expired.",
                state: {
                    task: {
                        title: "Run governed desktop action"
                    },
                    policyDecision: {
                        bindingHash: "fnv1a-12345678"
                    },
                    result: {
                        status: "denied"
                    }
                }
            }, null, 2), "utf8");
            await writeFile(path.join(auditDir, "job-1.json"), JSON.stringify([
                {
                    id: "audit-1",
                    occurredAt: "2026-04-10T10:02:00.000Z",
                    actorId: "synai-agent-runtime",
                    taskId: "task-1",
                    stage: "result",
                    event: "denied",
                    jobId: "job-1",
                    stepId: "step-1",
                    details: {
                        summary: "Approval token has expired.",
                        bindingHash: "fnv1a-12345678"
                    }
                }
            ], null, 2), "utf8");
            const entries = await queryGovernanceAuditEntries(runtimeRoot, { sources: ["agent-runtime"] }, { agentRuntimeRoot });
            expect(entries).toHaveLength(1);
            expect(entries[0]).toMatchObject({
                source: "agent-runtime",
                commandName: "Run governed desktop action",
                status: "denied",
                summary: "Approval token has expired.",
                commandId: "job-1",
                commandHash: "fnv1a-12345678",
                details: {
                    latestCheckpointId: "ckpt-1",
                    terminalStatus: "denied"
                }
            });
        }
        finally {
            await rm(runtimeRoot, { recursive: true, force: true });
        }
    });
});
