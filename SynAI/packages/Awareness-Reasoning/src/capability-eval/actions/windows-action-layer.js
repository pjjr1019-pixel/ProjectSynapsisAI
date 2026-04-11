import { executeWindowsAction as executeGovernedWindowsAction, listWindowsActionDefinitions as listGovernedWindowsActionDefinitions, suggestWindowsActionFromPrompt as suggestGovernedWindowsActionFromPrompt } from "@governance-execution";
const toCapabilityAction = (action) => ({
    id: action.id,
    action: action.action,
    commandPreview: action.commandPreview,
    riskLevel: action.riskClass,
    riskClass: action.riskClass,
    approvalRequired: action.approvalRequired,
    preconditions: action.preconditions
});
export const listWindowsActionDefinitions = () => listGovernedWindowsActionDefinitions().map((entry) => ({
    id: entry.id,
    title: entry.title,
    commandPreview: entry.commandPreview,
    riskLevel: entry.riskClass,
    approvalRequired: entry.approvalRequired,
    preconditions: entry.preconditions
}));
export const suggestWindowsActionFromPrompt = (prompt) => {
    const proposal = suggestGovernedWindowsActionFromPrompt(prompt);
    return proposal ? toCapabilityAction(proposal) : null;
};
export const executeWindowsAction = async (input) => {
    const governedInput = {
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
    const result = await executeGovernedWindowsAction(governedInput);
    return {
        executed: result.executed,
        commandPreview: result.commandPreview,
        reason: result.reason
    };
};
