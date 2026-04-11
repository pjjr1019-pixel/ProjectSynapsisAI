import { createActionProposal, createActionResult, createExecutionAttempt, nowIso, } from '../core';
const toExecutionAttemptStatus = (status) => {
    switch (status) {
        case 'executed':
            return 'executed';
        case 'simulated':
            return 'simulated';
        case 'blocked':
            return 'blocked';
        case 'denied':
            return 'denied';
        case 'escalated':
            return 'escalated';
        case 'cancelled':
            return 'cancelled';
        case 'skipped':
            return 'skipped';
        default:
            return 'failed';
    }
};
const toSkillResult = (actionResult) => ({
    success: actionResult.status === 'executed' || actionResult.status === 'simulated',
    output: actionResult.output,
    error: actionResult.error,
    metadata: {
        commandId: actionResult.commandId ?? null,
        commandHash: actionResult.commandHash ?? null,
        actionResultStatus: actionResult.status,
    },
});
export const createUnsupportedActionProposal = (request) => createActionProposal({
    requestId: request.id,
    taskId: request.taskId,
    jobId: request.jobId,
    stepId: request.stepId,
    adapterId: 'missing-adapter',
    actionId: request.actionId,
    title: request.title,
    summary: `No adapter is available for ${request.kind}:${request.actionId}.`,
    preview: request.commandPreview ?? `${request.kind}:${request.actionId}`,
    normalizedInput: request.input,
    risk: request.risk,
    sideEffect: request.sideEffect,
    approvalRequired: false,
    dryRun: request.dryRun,
    capabilityStatus: 'blocked',
    bindingHash: request.bindingHash,
    approvalBinding: request.approvalBinding,
    metadata: request.metadata,
});
const buildBlockedActionResult = (request, proposal, reason) => createActionResult({
    requestId: request.id,
    proposalId: proposal.id,
    status: 'blocked',
    summary: reason,
    commandHash: proposal.bindingHash,
    error: {
        message: reason,
        code: 'adapter-blocked',
    },
    metadata: {
        adapterId: proposal.adapterId,
    },
});
export const resolveActionAdapter = (request, adapters) => adapters.find((adapter) => adapter.supports(request)) ?? null;
export const createSkillActionAdapter = (registry) => ({
    id: 'skill-registry',
    supports(request) {
        return request.kind === 'skill' && Boolean(registry.get(request.actionId));
    },
    async propose(request) {
        const skill = registry.get(request.actionId);
        if (!skill) {
            return createUnsupportedActionProposal(request);
        }
        let normalizedInput = request.input;
        try {
            normalizedInput = skill.inputSchema.parse(request.input);
        }
        catch {
            normalizedInput = request.input;
        }
        return createActionProposal({
            requestId: request.id,
            taskId: request.taskId,
            jobId: request.jobId,
            stepId: request.stepId,
            adapterId: 'skill-registry',
            actionId: skill.id,
            title: request.title,
            summary: `Prepared skill ${skill.id}.`,
            preview: request.commandPreview ?? `skill:${skill.id}`,
            normalizedInput,
            risk: request.risk,
            sideEffect: request.sideEffect,
            approvalRequired: false,
            dryRun: request.dryRun,
            capabilityStatus: 'supported',
            bindingHash: request.bindingHash,
            approvalBinding: request.approvalBinding,
            metadata: {
                ...(request.metadata ?? {}),
                skillName: skill.name,
            },
        });
    },
    async execute(proposal, context) {
        const skill = registry.get(proposal.actionId);
        if (!skill) {
            return createActionResult({
                requestId: proposal.requestId,
                proposalId: proposal.id,
                status: 'blocked',
                summary: `Skill ${proposal.actionId} is not registered.`,
                commandHash: proposal.bindingHash,
                error: {
                    message: `Unknown skill: ${proposal.actionId}`,
                    code: 'unknown-skill',
                },
            });
        }
        try {
            const input = skill.inputSchema.parse(proposal.normalizedInput ?? {});
            const result = skill.resultSchema.parse(await skill.execute(input, context));
            return createActionResult({
                requestId: proposal.requestId,
                proposalId: proposal.id,
                status: 'executed',
                summary: result.success
                    ? `Skill ${skill.id} executed successfully.`
                    : `Skill ${skill.id} reported failure.`,
                commandHash: proposal.bindingHash,
                output: result.output,
                error: result.error,
                metadata: result.metadata,
            });
        }
        catch (error) {
            return createActionResult({
                requestId: proposal.requestId,
                proposalId: proposal.id,
                status: 'failed',
                summary: `Skill ${skill.id} failed during execution.`,
                commandHash: proposal.bindingHash,
                error: {
                    message: error instanceof Error ? error.message : String(error),
                    code: 'skill-execution-failed',
                },
            });
        }
    },
});
export const createDefaultActionAdapters = (registry) => [
    createSkillActionAdapter(registry),
];
export const createActionRequestForStep = (input) => ({
    id: `action-request-${input.step.id}`,
    createdAt: input.step.createdAt,
    taskId: input.taskId,
    jobId: input.jobId,
    stepId: input.step.id,
    kind: input.kind,
    actionId: input.actionId,
    title: input.title,
    description: input.description,
    input: input.executionInput,
    dryRun: input.dryRun ?? true,
    risk: input.risk,
    sideEffect: input.sideEffect,
    commandPreview: input.commandPreview,
    bindingHash: '',
    approvalBinding: input.approvalBinding,
    metadata: input.metadata,
});
export const prepareActionProposal = async (input) => {
    const adapter = resolveActionAdapter(input.request, input.adapters);
    const proposal = adapter
        ? await adapter.propose(input.request, input.context)
        : createUnsupportedActionProposal(input.request);
    return {
        adapter,
        proposal,
    };
};
export const executeActionProposal = async (input) => {
    const actionResult = input.proposal.capabilityStatus === 'blocked'
        ? buildBlockedActionResult(input.request, input.proposal, input.proposal.summary)
        : input.adapter
            ? await input.adapter.execute(input.proposal, input.context)
            : buildBlockedActionResult(input.request, input.proposal, input.proposal.summary);
    const attempt = createExecutionAttempt({
        jobId: input.context.jobId ?? input.request.jobId ?? input.request.taskId,
        stepId: input.request.stepId,
        status: toExecutionAttemptStatus(actionResult.status),
        request: input.request,
        proposal: input.proposal,
        actionResult,
        summary: actionResult.summary,
        metadata: {
            adapterId: input.proposal.adapterId,
        },
    });
    return {
        adapterId: input.proposal.adapterId,
        skillId: input.proposal.actionId,
        input: input.proposal.normalizedInput ?? input.request.input,
        result: toSkillResult(actionResult),
        executedAt: nowIso(),
        proposal: input.proposal,
        actionResult,
        attempt,
    };
};
export const executeActionRequest = async (input) => {
    const prepared = await prepareActionProposal(input);
    return executeActionProposal({
        request: input.request,
        proposal: prepared.proposal,
        adapter: prepared.adapter,
        context: input.context,
    });
};
export const executePlannedStep = async (step, registry, context, adapters = createDefaultActionAdapters(registry)) => {
    const request = {
        id: createActionRequestId(step.id),
        createdAt: step.updatedAt,
        taskId: step.taskId,
        jobId: context.jobId,
        stepId: step.id,
        kind: 'skill',
        actionId: step.skill,
        title: step.name,
        description: `Execute ${step.skill}`,
        input: step.input,
        dryRun: true,
        risk: 'low',
        sideEffect: 'none',
        commandPreview: `skill:${step.skill}`,
        bindingHash: `step-${step.id}`,
        metadata: step.metadata,
    };
    return executeActionRequest({
        request,
        adapters,
        context,
    });
};
const createActionRequestId = (stepId) => `action-request-${stepId}`;
