import { runCapabilityCli } from "../packages/Awareness-Reasoning/src/capability-eval/cli";

const main = async (): Promise<void> => {
  const exitCode = await runCapabilityCli(process.argv.slice(2));
  process.exitCode = exitCode;
};

void main();

