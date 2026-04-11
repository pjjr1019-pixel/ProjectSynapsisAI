import { describe, it, expect } from 'vitest';
import { AgentTaskSchema, TaskStepSchema, SkillSpecSchema, SkillInputSchema, SkillResultSchema, ExecutionContextSchema, ObservationSnapshotSchema, VerificationReportSchema, PolicyDecisionSchema, AuditEventSchema, RuntimeJobSchema, RuntimeCheckpointSchema, RuntimeTaskResultSchema, } from '@synai-agent/contracts/agent-runtime.contracts';
const isoNow = () => {
    return new Date().toISOString();
};
describe('Agent contract schemas', () => {
    it('validates AgentTask', () => {
        const data = {
            id: 'task-1',
            createdAt: isoNow(),
            updatedAt: isoNow(),
            status: 'pending',
            title: 'Test Task',
            steps: ['step-1'],
        };
        expect(() => AgentTaskSchema.parse(data)).not.toThrow();
    });
    it('validates TaskStep', () => {
        const data = {
            id: 'step-1',
            taskId: 'task-1',
            createdAt: isoNow(),
            updatedAt: isoNow(),
            status: 'pending',
            name: 'Step 1',
            skill: 'skill-1',
            input: {},
        };
        expect(() => TaskStepSchema.parse(data)).not.toThrow();
    });
    it('validates SkillSpec', () => {
        const data = {
            id: 'skill-1',
            name: 'Test Skill',
            description: 'desc',
            inputSchema: SkillInputSchema,
            resultSchema: SkillResultSchema,
        };
        expect(() => SkillSpecSchema.parse(data)).not.toThrow();
    });
    it('validates SkillInput', () => {
        expect(() => SkillInputSchema.parse({})).not.toThrow();
    });
    it('validates SkillResult', () => {
        expect(() => SkillResultSchema.parse({ success: true })).not.toThrow();
    });
    it('validates ExecutionContext', () => {
        const data = {
            id: 'ctx-1',
            startedAt: isoNow(),
            agentId: 'agent-1',
        };
        expect(() => ExecutionContextSchema.parse(data)).not.toThrow();
    });
    it('validates ObservationSnapshot', () => {
        const data = {
            id: 'snap-1',
            takenAt: isoNow(),
            contextId: 'ctx-1',
            data: { foo: 'bar' },
        };
        expect(() => ObservationSnapshotSchema.parse(data)).not.toThrow();
    });
    it('validates VerificationReport', () => {
        const data = {
            id: 'vr-1',
            createdAt: isoNow(),
            stepId: 'step-1',
            status: 'passed',
            issues: [],
        };
        expect(() => VerificationReportSchema.parse(data)).not.toThrow();
    });
    it('validates PolicyDecision', () => {
        const data = {
            id: 'pd-1',
            decidedAt: isoNow(),
            contextId: 'ctx-1',
            type: 'allow',
            reason: 'ok',
        };
        expect(() => PolicyDecisionSchema.parse(data)).not.toThrow();
    });
    it('validates AuditEvent', () => {
        const data = {
            id: 'ae-1',
            occurredAt: isoNow(),
            actorId: 'user-1',
            taskId: 'task-1',
            stage: 'task',
            event: 'received',
        };
        expect(() => AuditEventSchema.parse(data)).not.toThrow();
    });
    it('validates RuntimeJob', () => {
        const data = {
            id: 'job-1',
            createdAt: isoNow(),
            status: 'queued',
            taskId: 'task-1',
        };
        expect(() => RuntimeJobSchema.parse(data)).not.toThrow();
    });
    it('validates RuntimeCheckpoint', () => {
        const data = {
            id: 'cp-1',
            jobId: 'job-1',
            createdAt: isoNow(),
            state: {},
            continuation: {
                mode: 'reconstructed',
                resumable: false,
                sourceCheckpointId: 'cp-1',
                limitation: 'Terminal checkpoint can only be recovered.',
            },
        };
        expect(() => RuntimeCheckpointSchema.parse(data)).not.toThrow();
    });
    it('validates RuntimeTaskResult continuation metadata', () => {
        const data = {
            id: 'task-1',
            status: 'blocked',
            clarificationNeeded: [],
            policyDecision: {
                id: 'pd-1',
                decidedAt: isoNow(),
                contextId: 'ctx-1',
                type: 'block',
                reason: 'Blocked for testing.',
            },
            continuation: {
                mode: 'reconstructed',
                resumable: false,
                sourceCheckpointId: 'cp-1',
                limitation: 'Result is reconstructive only.',
            },
        };
        expect(() => RuntimeTaskResultSchema.parse(data)).not.toThrow();
    });
});
