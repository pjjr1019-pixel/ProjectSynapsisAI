import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const aliasEntries = [
  { find: /^@contracts\/(.+)$/, replacement: resolve(__dirname, "packages/Awareness-Reasoning/src/contracts/$1") },
  { find: /^@contracts$/, replacement: resolve(__dirname, "packages/Awareness-Reasoning/src/contracts/index.ts") },
  { find: /^@memory\/(.+)$/, replacement: resolve(__dirname, "packages/Awareness-Reasoning/src/memory/$1") },
  { find: /^@memory$/, replacement: resolve(__dirname, "packages/Awareness-Reasoning/src/memory/index.ts") },
  { find: /^@awareness\/(.+)$/, replacement: resolve(__dirname, "packages/Awareness-Reasoning/src/$1") },
  { find: /^@awareness$/, replacement: resolve(__dirname, "packages/Awareness-Reasoning/src/index.ts") },
  { find: /^@local-ai\/(.+)$/, replacement: resolve(__dirname, "packages/Awareness-Reasoning/src/local-ai/$1") },
  { find: /^@local-ai$/, replacement: resolve(__dirname, "packages/Awareness-Reasoning/src/local-ai/index.ts") },
  { find: /^@web-search\/(.+)$/, replacement: resolve(__dirname, "packages/Awareness-Reasoning/src/web-search/$1") },
  { find: /^@web-search$/, replacement: resolve(__dirname, "packages/Awareness-Reasoning/src/web-search/index.ts") },
  { find: /^@governance-execution\/(.+)$/, replacement: resolve(__dirname, "packages/Governance and exicution/src/$1") },
  { find: /^@governance-execution$/, replacement: resolve(__dirname, "packages/Governance and exicution/src/index.ts") },
  { find: /^@desktop\/(.+)$/, replacement: resolve(__dirname, "apps/desktop/src/$1") },
  { find: /^@desktop$/, replacement: resolve(__dirname, "apps/desktop/src") }
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: aliasEntries
  },
  test: {
    globals: true,
    setupFiles: ["tests/setup.ts"],
    environment: "node",
    environmentMatchGlobs: [
      ["tests/smoke/app-start.smoke.test.tsx", "jsdom"],
      ["tests/smoke/local-chat-ui.smoke.test.tsx", "jsdom"]
    ]
  }
});
