import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { createSynAiAliasEntries } from "./config/aliases";

const aliases = createSynAiAliasEntries(__dirname);
const tsFirstExtensions = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json"
];

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: aliases,
      extensions: tsFirstExtensions
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
      alias: aliases,
      extensions: tsFirstExtensions
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
      alias: aliases,
      extensions: tsFirstExtensions
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
