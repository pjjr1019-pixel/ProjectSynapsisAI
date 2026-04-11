import { createAgentRuntimeService } from './runtime-manager';
export async function runAgentTask(taskInput, options = {}) {
    return createAgentRuntimeService(options).runTask(taskInput);
}
export const runNoopAgentTask = runAgentTask;
