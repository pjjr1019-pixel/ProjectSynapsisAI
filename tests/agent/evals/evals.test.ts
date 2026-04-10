import { buildNoopRuntimeEvalCases, runAgentRuntimeEvalSuite } from '../../../src/agent/evals';

describe('runAgentRuntimeEvalSuite', () => {
  it('runs the built-in eval cases against the runtime', async () => {
    const report = await runAgentRuntimeEvalSuite(buildNoopRuntimeEvalCases());

    expect(report.totals.total).toBe(2);
    expect(report.totals.passed).toBe(2);
    expect(report.cases.every((entry) => entry.status === 'passed')).toBe(true);
  });
});
