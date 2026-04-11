import { createGovernanceCommandBus } from "../commands/bus";
import type {
  GovernanceCommandBusApi,
  GovernedActionProposal,
  RiskClass
} from "../contracts";
import {
  buildWindowsActionPreview,
  findWindowsActionDefinitionById,
  listWindowsActionDefinitions as listWindowsActionCatalog,
  suggestWindowsActionFromPrompt as suggestWindowsActionFromCatalog,
  type WindowsActionDefinition
} from "./windows-action-catalog";

export type { WindowsActionDefinition, WindowsActionId } from "./windows-action-catalog";

const toActionProposal = (action: WindowsActionDefinition): GovernedActionProposal => ({
  id: action.id,
  action: action.title,
  commandPreview: action.commandPreview,
  riskClass: action.riskClass,
  approvalRequired: action.approvalRequired,
  preconditions: [...action.preconditions],
  title: action.title,
  description: action.description,
  kind: action.kind,
  scope: action.scope,
  targetKind: action.targetKind,
  targetPlaceholder: action.targetPlaceholder,
  defaultTarget: action.defaultTarget,
  aliases: [...action.aliases]
});

export const listWindowsActionDefinitions = (): WindowsActionDefinition[] => listWindowsActionCatalog();

export const suggestWindowsActionFromPrompt = (prompt: string): GovernedActionProposal | null => {
  const action = suggestWindowsActionFromCatalog(prompt);
  return action ? toActionProposal(action) : null;
};

export interface ExecuteWindowsActionInput {
  action: GovernedActionProposal;
  executionEnabled: boolean;
  approvalTokenProvided: boolean;
  approvedBy?: string;
  commandBus?: GovernanceCommandBusApi;
}

export interface ExecuteWindowsActionResult {
  executed: boolean;
  commandPreview: string;
  reason: string;
  governanceCommandId: string | null;
  riskClass: RiskClass;
}

const summarizeExecution = (status: "executed" | "simulated" | "blocked" | "denied" | "failed"): string => {
  switch (status) {
    case "executed":
      return "Command executed by governance command bus.";
    case "simulated":
      return "Command simulated by governance command bus.";
    case "blocked":
      return "Command blocked by governance.";
    case "denied":
      return "Command denied by policy.";
    default:
      return "Command failed during execution.";
  }
};

export const executeWindowsAction = async (
  input: ExecuteWindowsActionInput
): Promise<ExecuteWindowsActionResult> => {
  const catalogEntry = findWindowsActionDefinitionById(input.action.id);
  const commandPreview = catalogEntry
    ? buildWindowsActionPreview(catalogEntry, {
        target: catalogEntry.defaultTarget,
        destinationTarget: null
      })
    : input.action.commandPreview;

  if (!input.executionEnabled) {
    return {
      executed: false,
      commandPreview,
      reason: "Execution disabled by policy. Windows action layer remains proposal-only.",
      governanceCommandId: null,
      riskClass: input.action.riskClass
    };
  }

  const commandBus = input.commandBus ?? createGovernanceCommandBus();
  const queued = commandBus.enqueueGovernanceCommand({
    commandName: `windows-action.${input.action.id}`,
    command: commandPreview,
    riskClass: input.action.riskClass,
    destructive: input.action.riskClass === "high" || input.action.riskClass === "critical",
    approvedBy: input.approvedBy ?? null,
    approvalToken: null,
    handler: async () => ({
      simulated: true,
      summary: "Windows execution is intentionally stubbed. Action remains simulated until a governed executor is attached."
    })
  });
  const result = await commandBus.processNextGovernanceCommand();

  return {
    executed: result?.status === "executed",
    commandPreview,
    reason:
      result?.summary ??
      (input.action.approvalRequired && !input.approvalTokenProvided
        ? "Approval token missing for high-risk action."
        : summarizeExecution(result?.status ?? "failed")),
    governanceCommandId: queued.commandId,
    riskClass: input.action.riskClass
  };
};
