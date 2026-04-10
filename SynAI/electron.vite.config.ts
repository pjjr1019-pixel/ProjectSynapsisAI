import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

const aliases = [
  { find: /^@synai-agent\/contracts\/agent-runtime\.contracts$/, replacement: resolve(__dirname, "packages/Agent-Runtime/src/contracts/agent-runtime.contracts.ts") },
  { find: /^@synai-agent\/(.+)$/, replacement: resolve(__dirname, "packages/Agent-Runtime/src/$1") },
  { find: /^@synai-agent$/, replacement: resolve(__dirname, "packages/Agent-Runtime/src/index.ts") },
  { find: /^@agent-runtime\/(.+)$/, replacement: resolve(__dirname, "packages/Agent-Runtime/src/$1") },
  { find: /^@agent-runtime$/, replacement: resolve(__dirname, "packages/Agent-Runtime/src/index.ts") },
  { find: /^@capability-catalog\/(.+)$/, replacement: resolve(__dirname, "packages/Capability-Catalog/$1") },
  { find: /^@capability-catalog$/, replacement: resolve(__dirname, "packages/Capability-Catalog/index.ts") },
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
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: aliases
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, "apps/desktop/electron/main.ts"),
        output: {
          entryFileNames: "[name].cjs",
          format: "cjs"
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: aliases
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, "apps/desktop/electron/preload.ts"),
        output: {
          entryFileNames: "[name].cjs",
          format: "cjs"
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, "apps/desktop"),
    plugins: [react()],
    resolve: {
      alias: aliases
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, "apps/desktop/index.html"),
        output: {
          // Rec #15: split vendor + lazy tab chunks so the initial bundle is smaller
          manualChunks: {
            vendor: ["react", "react-dom"]
          }
        }
      }
    }
  }
});
