import {
  executeWindowsAction as executeGovernedWindowsAction,
  listWindowsActionDefinitions as listGovernedWindowsActionDefinitions,
  suggestWindowsActionFromPrompt as suggestGovernedWindowsActionFromPrompt,
  type ExecuteWindowsActionInput as GovernedExecuteWindowsActionInput,
  type ExecuteWindowsActionResult as GovernedExecuteWindowsActionResult,
  type WindowsActionDefinition as GovernedWindowsActionDefinition
} from "@governance-execution";
import type { CapabilityActionProposal, CapabilityRiskLevel } from "../types";

export type WindowsActionId = GovernedWindowsActionDefinition["id"];

export interface WindowsActionDefinition {
  id: WindowsActionId;
  title: string;
  commandPreview: string;
  riskLevel: CapabilityRiskLevel;
  approvalRequired: boolean;
  preconditions?: string[];
}

const toCapabilityAction = (
  action: Pick<GovernedWindowsActionDefinition, "id" | "action" | "commandPreview" | "riskClass" | "approvalRequired" | "preconditions">
): CapabilityActionProposal => ({
  id: action.id,
  action: action.action,
  commandPreview: action.commandPreview,
  riskLevel: action.riskClass,
  riskClass: action.riskClass,
  approvalRequired: action.approvalRequired,
  preconditions: action.preconditions
});

export const listWindowsActionDefinitions = (): WindowsActionDefinition[] =>
  listGovernedWindowsActionDefinitions().map((entry) => ({
    id: entry.id,
    title: entry.title,
    commandPreview: entry.commandPreview,
    riskLevel: entry.riskClass,
    approvalRequired: entry.approvalRequired,
    preconditions: entry.preconditions
  }));

export const suggestWindowsActionFromPrompt = (prompt: string): CapabilityActionProposal | null => {
  const proposal = suggestGovernedWindowsActionFromPrompt(prompt);
  return proposal ? toCapabilityAction(proposal) : null;
};

export interface ExecuteWindowsActionInput {
  action: CapabilityActionProposal;
  executionEnabled: boolean;
  approvalTokenProvided?: boolean;
  approvedBy?: string;
}

export interface ExecuteWindowsActionResult {
  executed: boolean;
  commandPreview: string;
  reason: string;
}

export const executeWindowsAction = async (
  input: ExecuteWindowsActionInput
): Promise<ExecuteWindowsActionResult> => {
  const governedInput: GovernedExecuteWindowsActionInput = {
    action: {
      id: input.action.id,
      action: input.action.action,
      commandPreview: input.action.commandPreview,
      riskClass: input.action.riskLevel,
      approvalRequired: input.action.approvalRequired,
      preconditions: input.action.preconditions
    },
    executionEnabled: input.executionEnabled,
    approvalTokenProvided: Boolean(input.approvalTokenProvided),
    approvedBy: input.approvedBy
  };
  const result: GovernedExecuteWindowsActionResult = await executeGovernedWindowsAction(governedInput);
  return {
    executed: result.executed,
    commandPreview: result.commandPreview,
    reason: result.reason
  };
};
