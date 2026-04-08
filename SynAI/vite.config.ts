import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@contracts": resolve(__dirname, "packages/contracts/src/index.ts"),
      "@memory": resolve(__dirname, "packages/memory/src/index.ts"),
      "@awareness": resolve(__dirname, "packages/awareness/src/index.ts"),
      "@local-ai": resolve(__dirname, "packages/local-ai/src/index.ts"),
      "@web-search": resolve(__dirname, "packages/web-search/src/index.ts"),
      "@desktop": resolve(__dirname, "apps/desktop/src")
    }
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
