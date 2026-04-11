import { createActionRequest, createRuntimeId, createTaskPlan, nowIso } from '../core';
const getTaskMetadata = (task) => task.metadata ?? {};
const getStringMetadata = (task, key) => {
    const value = getTaskMetadata(task)[key];
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
};
const getBooleanMetadata = (task, key) => getTaskMetadata(task)[key] === true;
const getOperationRecord = (value) => value && typeof value === 'object' ? value : {};
const createPlanStep = (input) => ({
    id: createRuntimeId('step'),
    taskId: input.taskId,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    status: 'pending',
    name: input.name,
    skill: input.skill,
    input: input.input,
    metadata: {
        phase: input.phase,
        ...(input.metadata ?? {}),
    },
});
const resolveSkillOperation = (task) => {
    const skillId = getStringMetadata(task, 'skillId') ??
        (getBooleanMetadata(task, 'policyBlock') || getBooleanMetadata(task, 'policyEscalate')
            ? 'mock_open_app'
            : 'echo_text');
    const inputText = getStringMetadata(task, 'inputText') ?? task.description ?? task.title;
    const expectedEcho = getStringMetadata(task, 'expectedEcho') ?? inputText;
    return {
        kind: 'skill',
        actionId: skillId,
        input: {
            text: inputText,
            metadata: {
                taskId: task.id,
                expectedEcho,
            },
        },
        title: `Execute ${skillId}`,
        expectedEcho,
        risk: skillId === 'mock_open_app' ? 'high' : 'low',
        sideEffect: 'none',
        dryRun: true,
    };
};
const resolveDesktopActionOperation = (task) => {
    const desktopAction = getTaskMetadata(task)['desktopAction'];
    const record = desktopAction && typeof desktopAction === 'object' ? desktopAction : {};
    const proposalId = typeof record.proposalId === 'string' ? record.proposalId : null;
    const target = typeof record.target === 'string' ? record.target : null;
    const risk = record.riskClass;
    const dryRun = record.dryRun !== false;
    const clarificationNeeded = [
        proposalId ? null : 'Provide desktopAction.proposalId.',
        target ? null : 'Provide desktopAction.target.',
    ].filter((value) => Boolean(value));
    return {
        kind: 'desktop-action',
        actionId: proposalId ?? 'desktop-action',
        input: record,
        title: proposalId ? `Execute ${proposalId}` : 'Execute desktop action',
        expectedEcho: null,
        risk: risk === 'none' || risk === 'low' || risk === 'medium' || risk === 'high' || risk === 'critical'
            ? risk
            : 'medium',
        sideEffect: 'system',
        dryRun,
        clarificationNeeded,
    };
};
const resolveWorkflowOperation = (task) => {
    const workflowPrompt = getStringMetadata(task, 'workflowPrompt');
    const metadata = getTaskMetadata(task);
    const dryRun = metadata['dryRun'] !== false;
    return {
        kind: 'workflow',
        actionId: 'workflow.execute',
        input: {
            prompt: workflowPrompt,
            plan: metadata['workflowPlan'],
            approvedBy: metadata['approvedBy'],
            approvalToken: metadata['approvalToken'],
            dryRun,
        },
        title: workflowPrompt ? `Execute workflow: ${workflowPrompt}` : 'Execute workflow',
        expectedEcho: null,
        risk: 'medium',
        sideEffect: 'system',
        dryRun,
        clarificationNeeded: workflowPrompt ? [] : ['Provide workflowPrompt metadata.'],
    };
};
export const planAgentTask = (task) => {
    const createdAt = nowIso();
    const metadata = getTaskMetadata(task);
    const operation = metadata['desktopAction'] !== undefined
        ? resolveDesktopActionOperation(task)
        : metadata['workflowPrompt'] !== undefined || metadata['workflowPlan'] !== undefined
            ? resolveWorkflowOperation(task)
            : resolveSkillOperation(task);
    const beforeStep = createPlanStep({
        taskId: task.id,
        name: 'Capture pre-execution observation',
        skill: 'capture_observation',
        input: {
            taskId: task.id,
            title: task.title,
        },
        phase: 'observe-before',
        createdAt,
    });
    const executionStep = createPlanStep({
        taskId: task.id,
        name: operation.title,
        skill: operation.actionId,
        input: operation.input,
        phase: 'execute',
        createdAt,
    });
    const afterStep = createPlanStep({
        taskId: task.id,
        name: 'Capture post-execution observation',
        skill: 'capture_observation',
        input: {
            taskId: task.id,
            actionId: operation.actionId,
        },
        phase: 'observe-after',
        createdAt,
    });
    const verifyStep = createPlanStep({
        taskId: task.id,
        name: 'Verify execution result',
        skill: 'verify_execution',
        input: {
            taskId: task.id,
            actionId: operation.actionId,
            expectedEcho: operation.expectedEcho,
        },
        phase: 'verify',
        createdAt,
    });
    const steps = [beforeStep, executionStep, afterStep, verifyStep];
    const operationRecord = getOperationRecord(operation.input);
    const approvalToken = (metadata['approvalToken'] && typeof metadata['approvalToken'] === 'object'
        ? metadata['approvalToken']
        : undefined) ??
        (operationRecord['approvalToken'] && typeof operationRecord['approvalToken'] === 'object'
            ? operationRecord['approvalToken']
            : undefined);
    const approvedBy = getStringMetadata(task, 'approvedBy') ??
        (typeof operationRecord['approvedBy'] === 'string' ? operationRecord['approvedBy'] : null);
    const actionRequest = createActionRequest({
        taskId: task.id,
        stepId: executionStep.id,
        kind: operation.kind,
        actionId: operation.actionId,
        title: operation.title,
        description: task.description,
        input: operation.input,
        dryRun: operation.dryRun,
        risk: operation.risk,
        sideEffect: operation.sideEffect,
        commandPreview: operation.kind === 'skill'
            ? `skill:${operation.actionId}`
            : operation.kind === 'workflow'
                ? `workflow:${String(operation.input['prompt'] ?? operation.actionId)}`
                : `desktop-action:${operation.actionId}`,
        approvalBinding: approvalToken
            ? {
                bindingHash: '',
                tokenId: typeof approvalToken['tokenId'] === 'string'
                    ? String(approvalToken['tokenId'])
                    : undefined,
                approvedBy: approvedBy ?? undefined,
                metadata: {
                    approvalToken,
                },
            }
            : undefined,
        metadata: {
            taskTitle: task.title,
        },
    });
    const plan = createTaskPlan({
        taskId: task.id,
        summary: `Planned ${steps.length} runtime steps for ${task.title}.`,
        status: operation.kind !== 'skill' && 'clarificationNeeded' in operation && operation.clarificationNeeded.length > 0
            ? 'clarification_needed'
            : 'planned',
        steps,
        clarificationNeeded: operation.kind !== 'skill' && 'clarificationNeeded' in operation ? operation.clarificationNeeded : [],
        metadata: {
            actionRequestId: actionRequest.id,
            actionKind: operation.kind,
        },
    });
    return {
        plan,
        steps,
        executionStep,
        actionRequest,
        expectedEcho: operation.expectedEcho,
    };
};
