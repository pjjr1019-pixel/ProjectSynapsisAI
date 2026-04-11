export const AGENT_RUNTIME_ACTOR_ID = 'synai-agent-runtime';
export const nowIso = () => new Date().toISOString();
const createRandomSuffix = () => {
    const randomUuid = globalThis.crypto?.randomUUID?.();
    if (typeof randomUuid === 'string' && randomUuid.length > 0) {
        return randomUuid;
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};
export const createRuntimeId = (prefix) => `${prefix}-${createRandomSuffix()}`;
export const cloneValue = (value) => {
    if (typeof globalThis.structuredClone === 'function') {
        return globalThis.structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
};
export const stableStringify = (value) => {
    const normalize = (input) => {
        if (Array.isArray(input)) {
            return input.map((entry) => normalize(entry));
        }
        if (input && typeof input === 'object') {
            return Object.keys(input)
                .sort()
                .reduce((accumulator, key) => {
                accumulator[key] = normalize(input[key]);
                return accumulator;
            }, {});
        }
        return input;
    };
    return JSON.stringify(normalize(value));
};
export const createBindingHash = (value) => {
    const input = stableStringify(value);
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
};
export const createAgentTask = (task) => {
    const createdAt = task.createdAt ?? nowIso();
    const updatedAt = task.updatedAt ?? createdAt;
    return {
        id: task.id,
        createdAt,
        updatedAt,
        status: task.status ?? 'pending',
        title: task.title,
        description: task.description,
        steps: task.steps ?? [],
        metadata: task.metadata,
    };
};
export const createExecutionContext = (input) => ({
    id: input.id ?? createRuntimeId('ctx'),
    startedAt: input.startedAt ?? nowIso(),
    agentId: input.agentId ?? AGENT_RUNTIME_ACTOR_ID,
    taskId: input.taskId,
    jobId: input.jobId,
    userId: input.userId,
    environment: input.environment,
    metadata: input.metadata,
});
export const createTaskPlan = (input) => ({
    id: input.id ?? createRuntimeId('plan'),
    taskId: input.taskId,
    createdAt: input.createdAt ?? nowIso(),
    status: input.status ?? 'planned',
    summary: input.summary,
    steps: input.steps ?? [],
    clarificationNeeded: input.clarificationNeeded ?? [],
    metadata: input.metadata,
});
export const createActionRequest = (input) => {
    const bindingHash = input.bindingHash ??
        createBindingHash({
            kind: input.kind,
            actionId: input.actionId,
            input: input.input,
            dryRun: input.dryRun,
        });
    return {
        id: input.id ?? createRuntimeId('action-request'),
        createdAt: input.createdAt ?? nowIso(),
        taskId: input.taskId,
        jobId: input.jobId,
        stepId: input.stepId,
        kind: input.kind,
        actionId: input.actionId,
        title: input.title,
        description: input.description,
        input: input.input,
        dryRun: input.dryRun,
        risk: input.risk,
        sideEffect: input.sideEffect,
        commandPreview: input.commandPreview,
        bindingHash,
        approvalBinding: input.approvalBinding
            ? {
                ...input.approvalBinding,
                bindingHash: input.approvalBinding.bindingHash || bindingHash,
            }
            : undefined,
        metadata: input.metadata,
    };
};
export const createActionProposal = (input) => ({
    id: input.id ?? createRuntimeId('action-proposal'),
    createdAt: input.createdAt ?? nowIso(),
    requestId: input.requestId,
    taskId: input.taskId,
    jobId: input.jobId,
    stepId: input.stepId,
    adapterId: input.adapterId,
    actionId: input.actionId,
    title: input.title,
    summary: input.summary,
    preview: input.preview,
    normalizedInput: input.normalizedInput,
    risk: input.risk,
    sideEffect: input.sideEffect,
    approvalRequired: input.approvalRequired,
    dryRun: input.dryRun,
    capabilityStatus: input.capabilityStatus,
    bindingHash: input.bindingHash,
    approvalBinding: input.approvalBinding,
    metadata: input.metadata,
});
export const createRollbackRecord = (input) => ({
    ...input,
    metadata: input.metadata ? cloneValue(input.metadata) : undefined,
});
export const createCompensationRecord = (input) => ({
    id: input.id ?? createRuntimeId('compensation'),
    createdAt: input.createdAt ?? nowIso(),
    status: input.status,
    summary: input.summary,
    details: input.details,
    metadata: input.metadata,
});
export const createActionResult = (input) => ({
    id: input.id ?? createRuntimeId('action-result'),
    createdAt: input.createdAt ?? nowIso(),
    requestId: input.requestId,
    proposalId: input.proposalId,
    status: input.status,
    summary: input.summary,
    commandId: input.commandId,
    commandHash: input.commandHash,
    output: input.output,
    rollback: input.rollback ? createRollbackRecord(input.rollback) : undefined,
    compensation: input.compensation?.map((entry) => createCompensationRecord(entry)),
    error: input.error,
    metadata: input.metadata,
});
export const createExecutionAttempt = (input) => ({
    id: input.id ?? createRuntimeId('attempt'),
    createdAt: input.createdAt ?? nowIso(),
    updatedAt: input.updatedAt ?? nowIso(),
    jobId: input.jobId,
    stepId: input.stepId,
    status: input.status,
    request: cloneValue(input.request),
    proposal: input.proposal ? cloneValue(input.proposal) : undefined,
    actionResult: input.actionResult ? cloneValue(input.actionResult) : undefined,
    retryCount: input.retryCount ?? 0,
    summary: input.summary,
    error: input.error,
    metadata: input.metadata,
});
export const createObservationEvidence = (input) => ({
    id: input.id ?? createRuntimeId('evidence'),
    capturedAt: input.capturedAt ?? nowIso(),
    label: input.label,
    summary: input.summary,
    source: input.source,
    provenance: cloneValue(input.provenance),
    data: input.data,
    metadata: input.metadata,
});
export const createObservationSnapshot = (input) => ({
    id: input.id ?? createRuntimeId('obs'),
    takenAt: input.takenAt ?? nowIso(),
    contextId: input.contextId,
    taskId: input.taskId,
    jobId: input.jobId,
    stepId: input.stepId,
    data: input.data,
    evidence: input.evidence ?? [],
    beforeData: input.beforeData,
    afterData: input.afterData,
    comparison: input.comparison,
    metadata: input.metadata,
});
export const createRuntimeJob = (input) => ({
    id: input.id ?? createRuntimeId('job'),
    createdAt: input.createdAt ?? nowIso(),
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    status: input.status ?? 'queued',
    taskId: input.taskId,
    planId: input.planId,
    activeStepId: input.activeStepId,
    stepIds: input.stepIds ?? [],
    completedStepIds: input.completedStepIds ?? [],
    attemptIds: input.attemptIds ?? [],
    checkpointIds: input.checkpointIds ?? [],
    auditEventIds: input.auditEventIds ?? [],
    result: input.result,
    error: input.error,
    resumeCount: input.resumeCount ?? 0,
    recoverable: input.recoverable ?? true,
    cancellable: input.cancellable ?? true,
    metadata: input.metadata,
});
export const createRuntimeCheckpoint = (input) => ({
    id: input.id ?? createRuntimeId('ckpt'),
    jobId: input.jobId,
    createdAt: input.createdAt ?? nowIso(),
    phase: input.phase,
    summary: input.summary,
    activeStepId: input.activeStepId,
    completedStepIds: input.completedStepIds ?? [],
    state: input.state,
    continuation: input.continuation,
    metadata: input.metadata,
});
export const createRuntimeProgressEvent = (input) => ({
    id: input.id ?? createRuntimeId('progress'),
    occurredAt: input.occurredAt ?? nowIso(),
    taskId: input.taskId,
    jobId: input.jobId,
    status: input.status,
    currentStepId: input.currentStepId,
    currentStepIndex: input.currentStepIndex,
    stepCount: input.stepCount,
    completedStepIds: input.completedStepIds ?? [],
    checkpointId: input.checkpointId,
    summary: input.summary,
    metadata: input.metadata,
});
export const createAuditTrailEvent = (event) => cloneValue(event);
export const attachStepToTask = (task, step) => ({
    ...task,
    updatedAt: step.updatedAt,
    status: step.status === 'completed' ? 'completed' : task.status,
    steps: task.steps.includes(step.id) ? task.steps : [...task.steps, step.id],
});
