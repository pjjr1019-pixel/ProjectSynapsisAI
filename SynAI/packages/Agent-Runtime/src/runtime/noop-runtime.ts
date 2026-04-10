import type {
  AgentRuntimeRunResult,
  AgentTask,
  RuntimeTaskResult,
} from '../contracts';
import { createAgentRuntimeService, type AgentRuntimeOptions } from './runtime-manager';

export type AgentTaskInput = AgentTask;
export type AgentTaskResult = RuntimeTaskResult;
export type PolicyBlock = { reason: string; code: string };

export async function runAgentTask(
  taskInput: AgentTask,
  options: AgentRuntimeOptions = {},
): Promise<AgentRuntimeRunResult> {
  return createAgentRuntimeService(options).runTask(taskInput);
}

export const runNoopAgentTask = runAgentTask;
