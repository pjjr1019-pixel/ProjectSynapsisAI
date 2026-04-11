import { resolve } from "node:path";

export interface SynAiAliasEntry {
  find: RegExp;
  replacement: string;
}

const runtimeRoot = (baseDir: string): string => resolve(baseDir, "packages/Agent-Runtime/src");
const governanceRoot = (baseDir: string): string => resolve(baseDir, "packages/Governance-Execution/src");
const awarenessRoot = (baseDir: string): string => resolve(baseDir, "packages/Awareness-Reasoning/src");
const capabilityCatalogRoot = (baseDir: string): string => resolve(baseDir, "packages/Capability-Catalog");
const desktopRoot = (baseDir: string): string => resolve(baseDir, "apps/desktop/src");

const runtimeAliasEntries = (baseDir: string): SynAiAliasEntry[] => [
  // Canonical runtime surface first, then the compatibility-only mirror.
  { find: /^@agent-runtime\/contracts\/agent-runtime\.contracts$/, replacement: resolve(runtimeRoot(baseDir), "contracts/agent-runtime.contracts.ts") },
  { find: /^@agent-runtime\/(.+)$/, replacement: `${runtimeRoot(baseDir)}/$1` },
  { find: /^@agent-runtime$/, replacement: resolve(runtimeRoot(baseDir), "index.ts") },
  { find: /^@synai-agent\/contracts\/agent-runtime\.contracts$/, replacement: resolve(runtimeRoot(baseDir), "contracts/agent-runtime.contracts.ts") },
  { find: /^@synai-agent\/(.+)$/, replacement: `${runtimeRoot(baseDir)}/$1` },
  { find: /^@synai-agent$/, replacement: resolve(runtimeRoot(baseDir), "index.ts") }
];

export const createSynAiAliasEntries = (baseDir: string): SynAiAliasEntry[] => [
  ...runtimeAliasEntries(baseDir),
  { find: /^@capability-catalog\/(.+)$/, replacement: `${capabilityCatalogRoot(baseDir)}/$1` },
  { find: /^@capability-catalog$/, replacement: resolve(capabilityCatalogRoot(baseDir), "index.ts") },
  { find: /^@contracts\/(.+)$/, replacement: `${awarenessRoot(baseDir)}/contracts/$1` },
  { find: /^@contracts$/, replacement: resolve(awarenessRoot(baseDir), "contracts/index.ts") },
  { find: /^@memory\/(.+)$/, replacement: `${awarenessRoot(baseDir)}/memory/$1` },
  { find: /^@memory$/, replacement: resolve(awarenessRoot(baseDir), "memory/index.ts") },
  { find: /^@awareness\/(.+)$/, replacement: `${awarenessRoot(baseDir)}/$1` },
  { find: /^@awareness$/, replacement: resolve(awarenessRoot(baseDir), "index.ts") },
  { find: /^@local-ai\/(.+)$/, replacement: `${awarenessRoot(baseDir)}/local-ai/$1` },
  { find: /^@local-ai$/, replacement: resolve(awarenessRoot(baseDir), "local-ai/index.ts") },
  { find: /^@web-search\/(.+)$/, replacement: `${awarenessRoot(baseDir)}/web-search/$1` },
  { find: /^@web-search$/, replacement: resolve(awarenessRoot(baseDir), "web-search/index.ts") },
  { find: /^@governance-execution\/(.+)$/, replacement: `${governanceRoot(baseDir)}/$1` },
  { find: /^@governance-execution$/, replacement: resolve(governanceRoot(baseDir), "index.ts") },
  { find: /^@desktop\/(.+)$/, replacement: `${desktopRoot(baseDir)}/$1` },
  { find: /^@desktop$/, replacement: desktopRoot(baseDir) }
];
