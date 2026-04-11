import { checkOllamaHealth } from "../../packages/Awareness-Reasoning/src/local-ai/health";
import { __resetOllamaRuntimeForTests, __setOllamaRuntimeHooksForTests } from "../../packages/Awareness-Reasoning/src/local-ai/ollama";
describe("local-ai-health smoke", () => {
    afterEach(() => {
        __resetOllamaRuntimeForTests();
        vi.unstubAllGlobals();
    });
    it("reports connected when Ollama responds", async () => {
        const fetchMock = vi.fn(async () => ({
            ok: true,
            json: async () => ({ models: [{ name: "phi4-mini:latest" }] })
        }));
        vi.stubGlobal("fetch", fetchMock);
        const result = await checkOllamaHealth(false);
        expect(result.status).toBe("connected");
    });
    it("reports disconnected when Ollama is unreachable", async () => {
        const fetchMock = vi.fn(async () => {
            throw new Error("fetch failed");
        });
        vi.stubGlobal("fetch", fetchMock);
        __setOllamaRuntimeHooksForTests({
            findExecutable: () => null
        });
        const result = await checkOllamaHealth(false);
        expect(result.status).toBe("disconnected");
    });
    it("recovers by starting Ollama when the first probe fails", async () => {
        let serveStarted = false;
        const fetchMock = vi.fn(async () => {
            if (!serveStarted) {
                throw new Error("fetch failed");
            }
            return {
                ok: true,
                json: async () => ({ models: [{ name: "phi4-mini:latest" }] })
            };
        });
        vi.stubGlobal("fetch", fetchMock);
        __setOllamaRuntimeHooksForTests({
            findExecutable: () => "C:\\Ollama\\ollama.exe",
            spawnServe: () => {
                serveStarted = true;
            },
            sleep: async () => { }
        });
        const result = await checkOllamaHealth(false, { model: "phi4-mini:latest" });
        expect(result.status).toBe("connected");
    });
});
