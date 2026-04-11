import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { createSynAiAliasEntries } from "./config/aliases";
const aliasEntries = createSynAiAliasEntries(__dirname);
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
    plugins: [react()],
    resolve: {
        alias: aliasEntries,
        extensions: tsFirstExtensions
    },
    test: {
        globals: true,
        setupFiles: ["tests/setup.ts"],
        environment: "node",
        testTimeout: 10000,
        hookTimeout: 10000,
        environmentMatchGlobs: [
            ["tests/smoke/app-start.smoke.test.tsx", "jsdom"],
            ["tests/smoke/local-chat-ui.smoke.test.tsx", "jsdom"]
        ]
    }
});
