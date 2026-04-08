import { checkOllamaHealth } from "../../packages/local-ai/src/health";

describe("local-ai-health smoke", () => {
  it("reports connected when Ollama responds", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ models: [{ name: "llama3.2" }] })
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
    const result = await checkOllamaHealth(false);
    expect(result.status).toBe("disconnected");
  });
});
