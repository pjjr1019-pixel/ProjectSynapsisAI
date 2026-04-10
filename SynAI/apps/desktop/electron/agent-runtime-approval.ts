import type { ApprovalToken } from "@contracts";
import { validateApprovalToken } from "@governance-execution";
import type { ApprovalValidator } from "@agent-runtime/policy";

const toApprovalToken = (value: unknown): ApprovalToken | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  return typeof record.tokenId === "string" &&
    typeof record.commandHash === "string" &&
    typeof record.approver === "string" &&
    typeof record.issuedAt === "string" &&
    typeof record.expiresAt === "string" &&
    typeof record.signature === "string"
    ? {
        tokenId: record.tokenId,
        commandHash: record.commandHash,
        approver: record.approver,
        issuedAt: record.issuedAt,
        expiresAt: record.expiresAt,
        signature: record.signature
      }
    : null;
};

const resolveApprovalValidationCode = (reason: string | null, token: ApprovalToken | null): string => {
  if (!token) {
    return "APPROVAL_TOKEN_INVALID_PAYLOAD";
  }
  if (!reason) {
    return "APPROVAL_TOKEN_VALID";
  }
  if (reason.includes("expired")) {
    return "APPROVAL_TOKEN_EXPIRED";
  }
  if (reason.includes("signature")) {
    return "APPROVAL_TOKEN_SIGNATURE_MISMATCH";
  }
  if (reason.includes("hash mismatch")) {
    return "APPROVAL_TOKEN_COMMAND_HASH_MISMATCH";
  }
  if (reason.includes("revoked")) {
    return "APPROVAL_TOKEN_REVOKED";
  }
  if (reason.includes("missing")) {
    return "APPROVAL_TOKEN_MISSING";
  }

  return "APPROVAL_TOKEN_INVALID";
};

export const createAgentRuntimeApprovalValidator = (): ApprovalValidator => (input) => {
  const token = toApprovalToken(input.approvalBinding?.metadata?.["approvalToken"]);
  const validation = validateApprovalToken(token, input.bindingHash);

  return {
    valid: validation.valid,
    reason: validation.reason,
    code: resolveApprovalValidationCode(validation.reason, token),
    metadata: {
      tokenId: token?.tokenId ?? input.approvalBinding?.tokenId ?? null
    }
  };
};
