import { appendFile, mkdir } from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  ApprovalLedgerApi,
  ExecutionHandlerResult,
  ExecutionRequest,
  ExecutionResult,
  GovernanceCommand,
  GovernanceCommandBusApi,
  GovernanceDecision,
  PolicyRule
} from "../contracts";
import { createApprovalLedger } from "../approvals/ledger";
import { hashGovernanceCommand } from "./hash";
import { evaluateGovernancePolicy } from "../policy/engine";

const json = (value: unknown): string => `${JSON.stringify(value)}\n`;

const cloneGovernanceCommand = (command: GovernanceCommand): GovernanceCommand =>
  JSON.parse(JSON.stringify(command)) as GovernanceCommand;

const toResultStatus = (
  commandStatus: GovernanceCommand["status"]
): ExecutionResult["status"] => {
  if (commandStatus === "executed") {
    return "executed";
  }
  if (commandStatus === "simulated") {
    return "simulated";
  }
  if (commandStatus === "denied") {
    return "denied";
  }
  if (commandStatus === "blocked") {
    return "blocked";
  }
  return "failed";
};

const buildSummary = (
  status: ExecutionResult["status"],
  decision: GovernanceDecision,
  validationReason: string | null
): string => {
  switch (status) {
    case "executed":
      return "Command executed by governance command bus.";
    case "simulated":
      return "Command simulated by governance command bus.";
    case "denied":
      return `Command denied by policy (${decision.matchedRuleId ?? "no-rule"}).`;
    case "blocked":
      return validationReason
        ? `Command blocked: ${validationReason}`
        : "Command blocked: approval required.";
    default:
      return "Command failed during execution.";
  }
};

export interface GovernanceCommandBusOptions {
  policyRules?: PolicyRule[];
  approvalLedger?: ApprovalLedgerApi;
  executeRequest?: (
    request: ExecutionRequest,
    commandId: string,
    commandHash: string,
    decision: GovernanceDecision
  ) => Promise<ExecutionHandlerResult>;
  auditLogPath?: string;
  now?: () => Date;
}

const defaultExecuteRequest = async (): Promise<ExecutionHandlerResult> => ({
  simulated: true,
  summary: "No execution handler registered. Returning simulation only."
});

export const createGovernanceCommandBus = (
  options: GovernanceCommandBusOptions = {}
): GovernanceCommandBusApi => {
  const policyRules = options.policyRules;
  const approvalLedger = options.approvalLedger ?? createApprovalLedger();
  const executeRequest = options.executeRequest ?? defaultExecuteRequest;
  const now = options.now ?? (() => new Date());

  const queue: string[] = [];
  const commands = new Map<string, GovernanceCommand>();

  const appendAudit = async (event: string, command: GovernanceCommand): Promise<void> => {
    if (!options.auditLogPath) {
      return;
    }
    await mkdir(path.dirname(options.auditLogPath), { recursive: true });
    await appendFile(
      options.auditLogPath,
      json({
        event,
        timestamp: now().toISOString(),
        commandId: command.commandId,
        commandHash: command.commandHash,
        status: command.status,
        commandName: command.request.commandName,
        decision: command.decision,
        result: command.result
      }),
      "utf8"
    );
  };

  const enqueueGovernanceCommand = (request: ExecutionRequest): GovernanceCommand => {
    const createdAt = now().toISOString();
    const commandId = randomUUID();
    const commandHash = hashGovernanceCommand(request);
    const command: GovernanceCommand = {
      commandId,
      commandHash,
      request,
      status: "queued",
      createdAt,
      updatedAt: createdAt,
      decision: null,
      result: null
    };
    queue.push(commandId);
    commands.set(commandId, command);
    void appendAudit("enqueue", command);
    return cloneGovernanceCommand(command);
  };

  const processNextGovernanceCommand = async (): Promise<ExecutionResult | null> => {
    const commandId = queue.shift();
    if (!commandId) {
      return null;
    }
    const command = commands.get(commandId);
    if (!command) {
      return null;
    }

    command.status = "processing";
    command.updatedAt = now().toISOString();
    await appendAudit("processing", command);

    const decision = evaluateGovernancePolicy(command.request, policyRules);
    command.decision = decision;

    const startedAt = now().toISOString();

    let validationReason: string | null = null;
    if (decision.outcome === "require-approval" && !command.request.dryRun) {
      const validation = approvalLedger.validateApprovalToken(
        command.request.approvalToken,
        command.commandHash,
        now()
      );
      if (!validation.valid) {
        validationReason = validation.reason;
      } else if (validation.reason && !validation.reason.toLowerCase().includes("not issued")) {
        validationReason = validation.reason;
      }
    }

    if (decision.outcome === "deny") {
      command.status = "denied";
      command.updatedAt = now().toISOString();
      command.result = {
        commandId,
        commandHash: command.commandHash,
        commandName: command.request.commandName,
        status: "denied",
        startedAt,
        completedAt: command.updatedAt,
        summary: buildSummary("denied", decision, null),
        governance: decision
      };
      await appendAudit("completed", command);
      return command.result;
    }

    if (validationReason) {
      command.status = "blocked";
      command.updatedAt = now().toISOString();
      command.result = {
        commandId,
        commandHash: command.commandHash,
        commandName: command.request.commandName,
        status: "blocked",
        startedAt,
        completedAt: command.updatedAt,
        summary: buildSummary("blocked", decision, validationReason),
        governance: decision
      };
      await appendAudit("completed", command);
      return command.result;
    }

    try {
      const handler = command.request.handler;
      const execution = handler
        ? await handler(command.request, {
            commandId,
            commandHash: command.commandHash,
            decision
          })
        : await executeRequest(command.request, commandId, command.commandHash, decision);
      const status =
        execution.status ??
        (command.request.dryRun || execution.simulated ? "simulated" : "executed");
      command.status = status;
      command.updatedAt = now().toISOString();
      command.result = {
        commandId,
        commandHash: command.commandHash,
        commandName: command.request.commandName,
        status,
        startedAt,
        completedAt: command.updatedAt,
        summary: execution.summary ?? buildSummary(status, decision, null),
        governance: decision,
        output: execution.output,
        verification: execution.verification ?? null
      };
      await appendAudit("completed", command);
      return command.result;
    } catch (error) {
      command.status = "failed";
      command.updatedAt = now().toISOString();
      command.result = {
        commandId,
        commandHash: command.commandHash,
        commandName: command.request.commandName,
        status: toResultStatus(command.status),
        startedAt,
        completedAt: command.updatedAt,
        summary: buildSummary("failed", decision, null),
        governance: decision,
        error: error instanceof Error ? error.message : String(error)
      };
      await appendAudit("completed", command);
      return command.result;
    }
  };

  const getGovernanceCommandStatus = (commandId: string): GovernanceCommand | null => {
    const command = commands.get(commandId);
    return command ? cloneGovernanceCommand(command) : null;
  };

  return {
    enqueueGovernanceCommand,
    processNextGovernanceCommand,
    getGovernanceCommandStatus
  };
};

const defaultGovernanceCommandBus = createGovernanceCommandBus();

export const enqueueGovernanceCommand = (request: ExecutionRequest): GovernanceCommand =>
  defaultGovernanceCommandBus.enqueueGovernanceCommand(request);

export const processNextGovernanceCommand = (): Promise<ExecutionResult | null> =>
  defaultGovernanceCommandBus.processNextGovernanceCommand();

export const getGovernanceCommandStatus = (commandId: string): GovernanceCommand | null =>
  defaultGovernanceCommandBus.getGovernanceCommandStatus(commandId);
