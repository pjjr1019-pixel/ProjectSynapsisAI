import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

const aliases = {
  "@contracts": resolve(__dirname, "packages/contracts/src/index.ts"),
  "@memory": resolve(__dirname, "packages/memory/src/index.ts"),
  "@local-ai": resolve(__dirname, "packages/local-ai/src/index.ts"),
  "@web-search": resolve(__dirname, "packages/web-search/src/index.ts"),
  "@desktop": resolve(__dirname, "apps/desktop/src")
};

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
        input: resolve(__dirname, "apps/desktop/index.html")
      }
    }
  }
});
