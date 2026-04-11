import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type {
  ApprovalLedgerApi,
  ApprovalToken,
  ApprovalValidationResult
} from "../contracts";

const DEFAULT_TOKEN_TTL_MS = 10 * 60 * 1000;
const DEFAULT_SECRET = "synai-local-governance-secret";

const toMs = (value: Date): number => value.getTime();

const buildSignaturePayload = (
  tokenId: string,
  commandHash: string,
  approver: string,
  issuedAt: string,
  expiresAt: string
): string => `${tokenId}|${commandHash}|${approver}|${issuedAt}|${expiresAt}`;

const signTokenPayload = (secret: string, payload: string): string =>
  createHmac("sha256", secret).update(payload).digest("hex");

const safeHexEquals = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
};

const normalizeSecret = (secret?: string): string => {
  const candidate = secret?.trim() || process.env.SYNAI_APPROVAL_SECRET?.trim() || DEFAULT_SECRET;
  return candidate.length > 0 ? candidate : DEFAULT_SECRET;
};

export interface ApprovalLedgerOptions {
  signingSecret?: string;
  now?: () => Date;
}

export const createApprovalLedger = (
  options: ApprovalLedgerOptions = {}
): ApprovalLedgerApi => {
  const signingSecret = normalizeSecret(options.signingSecret);
  const now = options.now ?? (() => new Date());
  const revokedTokenIds = new Set<string>();
  const issuedTokenIds = new Set<string>();

  const issueApprovalToken = (
    commandHash: string,
    approver: string,
    ttlMs = DEFAULT_TOKEN_TTL_MS
  ): ApprovalToken => {
    const trimmedApprover = approver.trim();
    if (!trimmedApprover) {
      throw new Error("approver is required when issuing an approval token.");
    }
    const nowValue = now();
    const issuedAt = nowValue.toISOString();
    const expiresAt = new Date(toMs(nowValue) + Math.max(1, Math.floor(ttlMs))).toISOString();
    const tokenId = randomUUID();
    const payload = buildSignaturePayload(tokenId, commandHash, trimmedApprover, issuedAt, expiresAt);
    const signature = signTokenPayload(signingSecret, payload);
    issuedTokenIds.add(tokenId);

    return {
      tokenId,
      commandHash,
      approver: trimmedApprover,
      issuedAt,
      expiresAt,
      signature
    };
  };

  const validateApprovalToken = (
    token: ApprovalToken | null | undefined,
    commandHash: string,
    at = now()
  ): ApprovalValidationResult => {
    if (!token) {
      return {
        valid: false,
        reason: "Approval token missing."
      };
    }
    if (token.commandHash !== commandHash) {
      return {
        valid: false,
        reason: "Approval token command hash mismatch."
      };
    }
    if (revokedTokenIds.has(token.tokenId)) {
      return {
        valid: false,
        reason: "Approval token has been revoked."
      };
    }
    if (Number.isNaN(Date.parse(token.issuedAt)) || Number.isNaN(Date.parse(token.expiresAt))) {
      return {
        valid: false,
        reason: "Approval token timestamps are invalid."
      };
    }
    if (Date.parse(token.expiresAt) <= at.getTime()) {
      return {
        valid: false,
        reason: "Approval token has expired."
      };
    }

    const payload = buildSignaturePayload(
      token.tokenId,
      token.commandHash,
      token.approver,
      token.issuedAt,
      token.expiresAt
    );
    const expectedSignature = signTokenPayload(signingSecret, payload);
    if (!safeHexEquals(expectedSignature, token.signature)) {
      return {
        valid: false,
        reason: "Approval token signature mismatch."
      };
    }

    if (!issuedTokenIds.has(token.tokenId)) {
      // Signature verification is authoritative, but surfacing unknown-id helps audit drift.
      return {
        valid: true,
        reason: "Token signature is valid but token was not issued in this process."
      };
    }

    return {
      valid: true,
      reason: null
    };
  };

  const revokeApprovalToken = (tokenId: string): boolean => {
    const trimmed = tokenId.trim();
    if (!trimmed) {
      return false;
    }
    revokedTokenIds.add(trimmed);
    return true;
  };

  return {
    issueApprovalToken,
    validateApprovalToken,
    revokeApprovalToken
  };
};

const defaultApprovalLedger = createApprovalLedger();

export const issueApprovalToken = (
  commandHash: string,
  approver: string,
  ttlMs?: number
): ApprovalToken => defaultApprovalLedger.issueApprovalToken(commandHash, approver, ttlMs);

export const validateApprovalToken = (
  token: ApprovalToken | null | undefined,
  commandHash: string,
  now?: Date
): ApprovalValidationResult => defaultApprovalLedger.validateApprovalToken(token, commandHash, now);

export const revokeApprovalToken = (tokenId: string): boolean =>
  defaultApprovalLedger.revokeApprovalToken(tokenId);

export const parseApprovalTokenInput = (value: string): ApprovalToken => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Approval token value is empty.");
  }

  let rawJson = trimmed;
  if (trimmed.startsWith("base64:")) {
    const encoded = trimmed.slice("base64:".length);
    rawJson = Buffer.from(encoded, "base64").toString("utf8");
  }

  const parsed = JSON.parse(rawJson) as Partial<ApprovalToken>;
  if (
    typeof parsed.tokenId !== "string" ||
    typeof parsed.commandHash !== "string" ||
    typeof parsed.approver !== "string" ||
    typeof parsed.issuedAt !== "string" ||
    typeof parsed.expiresAt !== "string" ||
    typeof parsed.signature !== "string"
  ) {
    throw new Error("Approval token payload is invalid.");
  }

  return {
    tokenId: parsed.tokenId,
    commandHash: parsed.commandHash,
    approver: parsed.approver,
    issuedAt: parsed.issuedAt,
    expiresAt: parsed.expiresAt,
    signature: parsed.signature
  };
};
