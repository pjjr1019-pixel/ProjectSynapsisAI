import { appendFile, mkdir, readFile } from "node:fs/promises";
import * as path from "node:path";

export interface GovernanceReplayEnvelope {
  requestId: string;
  conversationId: string;
  capturedAt: string;
  sourceRoute: string | null;
  sourceFailureSignature: string | null;
  recoveredIntent: string | null;
  resolvedPrompt: string | null;
  recommendedExecutor: string;
  decision: string;
  actionType: string | null;
  approvalState: {
    required: boolean;
    pending: boolean;
    reason: string | null;
    approver: string | null;
    tokenId: string | null;
    expiresAt: string | null;
  };
  machineAwarenessBefore: unknown;
  fileAwarenessBefore: unknown;
  screenAwarenessBefore: unknown;
  webContextBefore: unknown;
  workflowPlan: unknown;
  workflowRequest: unknown;
  desktopProposal: unknown;
  desktopRequest: unknown;
  executionResult: unknown;
  verification: unknown;
  gap: unknown;
  remediation: unknown;
  artifacts: Record<string, unknown>;
}

const normalize = (value: string | null | undefined): string =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const replayEnvelopePath = (runtimeRoot: string): string =>
  path.join(runtimeRoot, "governance", "replay-envelopes.jsonl");

export const appendGovernanceReplayEnvelope = async (
  runtimeRoot: string,
  envelope: GovernanceReplayEnvelope
): Promise<void> => {
  const filePath = replayEnvelopePath(runtimeRoot);
  await mkdir(path.dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(envelope)}\n`, "utf8");
};

export const listGovernanceReplayEnvelopes = async (runtimeRoot: string): Promise<GovernanceReplayEnvelope[]> => {
  const filePath = replayEnvelopePath(runtimeRoot);
  try {
    const raw = await readFile(filePath, "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as GovernanceReplayEnvelope);
  } catch {
    return [];
  }
};

export const findLatestGovernanceReplayEnvelope = async (
  runtimeRoot: string,
  predicate: {
    sourceFailureSignature?: string | null;
    recoveredIntent?: string | null;
    resolvedPrompt?: string | null;
    sourceRoute?: string | null;
  }
): Promise<GovernanceReplayEnvelope | null> => {
  const signature = normalize(predicate.sourceFailureSignature);
  const recoveredIntent = normalize(predicate.recoveredIntent);
  const resolvedPrompt = normalize(predicate.resolvedPrompt);
  const sourceRoute = normalize(predicate.sourceRoute);

  const envelopes = await listGovernanceReplayEnvelopes(runtimeRoot);
  for (let index = envelopes.length - 1; index >= 0; index -= 1) {
    const envelope = envelopes[index];
    if (
      (signature && normalize(envelope.sourceFailureSignature).includes(signature)) ||
      (recoveredIntent && normalize(envelope.recoveredIntent).includes(recoveredIntent)) ||
      (resolvedPrompt && normalize(envelope.resolvedPrompt).includes(resolvedPrompt)) ||
      (sourceRoute && normalize(envelope.sourceRoute).includes(sourceRoute))
    ) {
      return envelope;
    }
  }

  return null;
};
