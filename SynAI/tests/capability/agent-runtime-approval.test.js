import { describe, expect, it } from "vitest";
import { createAgentTask } from "@agent-runtime/core";
import { issueApprovalToken } from "@governance-execution";
import { createAgentRuntimeApprovalValidator } from "../../apps/desktop/electron/agent-runtime-approval";
const buildStep = () => ({
    id: "step-1",
    taskId: "task-1",
    createdAt: "2026-04-10T10:00:00.000Z",
    updatedAt: "2026-04-10T10:00:00.000Z",
    status: "pending",
    name: "Execute governed action",
    skill: "desktop-action",
    input: {}
});
describe("agent runtime approval validator", () => {
    it("accepts a valid signed approval token for the exact binding hash", async () => {
        const bindingHash = "fnv1a-abcdef01";
        const token = issueApprovalToken(bindingHash, "operator", 60_000);
        const validator = createAgentRuntimeApprovalValidator();
        const result = await validator({
            bindingHash,
            approvalBinding: {
                bindingHash,
                tokenId: token.tokenId,
                metadata: {
                    approvalToken: token
                }
            },
            task: createAgentTask({
                id: "task-1",
                title: "Run a governed action"
            }),
            step: buildStep()
        });
        expect(result.valid).toBe(true);
        expect(result.code).toBe("APPROVAL_TOKEN_VALID");
    });
    it("rejects expired approval tokens through the runtime bridge validator", async () => {
        const bindingHash = "fnv1a-expired01";
        const token = issueApprovalToken(bindingHash, "operator", 1);
        const validator = createAgentRuntimeApprovalValidator();
        await new Promise((resolve) => setTimeout(resolve, 10));
        const result = await validator({
            bindingHash,
            approvalBinding: {
                bindingHash,
                tokenId: token.tokenId,
                metadata: {
                    approvalToken: token
                }
            },
            task: createAgentTask({
                id: "task-expired",
                title: "Run a governed action"
            }),
            step: buildStep()
        });
        expect(result.valid).toBe(false);
        expect(result.code).toBe("APPROVAL_TOKEN_EXPIRED");
    });
    it("rejects signature mismatches through the runtime bridge validator", async () => {
        const bindingHash = "fnv1a-signature01";
        const token = issueApprovalToken(bindingHash, "operator", 60_000);
        const validator = createAgentRuntimeApprovalValidator();
        const result = await validator({
            bindingHash,
            approvalBinding: {
                bindingHash,
                tokenId: token.tokenId,
                metadata: {
                    approvalToken: {
                        ...token,
                        signature: `${token.signature.slice(0, -2)}ff`
                    }
                }
            },
            task: createAgentTask({
                id: "task-signature",
                title: "Run a governed action"
            }),
            step: buildStep()
        });
        expect(result.valid).toBe(false);
        expect(result.code).toBe("APPROVAL_TOKEN_SIGNATURE_MISMATCH");
    });
});
