import { resolveRecentWebContext, shouldUseRecentWebSearch } from "../../packages/Awareness-Reasoning/src/web-search";
const originalFetch = global.fetch;
describe("web-search smoke", () => {
    afterEach(() => {
        global.fetch = originalFetch;
        vi.restoreAllMocks();
    });
    it("detects time-sensitive prompts", () => {
        expect(shouldUseRecentWebSearch("what's happening in iran right now")).toBe(true);
        expect(shouldUseRecentWebSearch("summarize my saved preferences")).toBe(false);
    });
    it("parses recent web results from rss", async () => {
        const fetchMock = vi.fn();
        fetchMock
            .mockResolvedValueOnce({
            ok: true,
            text: async () => `<?xml version="1.0" encoding="UTF-8"?>
<rss>
  <channel>
    <item>
      <title><![CDATA[Current AI headline - Example News]]></title>
      <link>https://example.com/story</link>
      <description><![CDATA[Fresh summary for the current state of AI.]]></description>
      <pubDate>Wed, 08 Apr 2026 01:00:00 GMT</pubDate>
      <source url="https://example.com">Example News</source>
    </item>
  </channel>
</rss>`
        })
            .mockResolvedValueOnce({
            ok: true,
            text: async () => `<!doctype html>
<html>
  <body>
    <article class="result">
      <a class="result__a" href="https://learn.microsoft.com/en-us/windows/ai/">Windows AI docs</a>
      <div class="result__snippet">Official documentation for Windows AI features.</div>
    </article>
  </body>
</html>`
        });
        global.fetch = fetchMock;
        const result = await resolveRecentWebContext("current state of ai", true);
        expect(result.status).toBe("used");
        expect(result.results[0]?.title).toContain("Current AI headline");
        expect(result.results[0]?.source).toBe("Example News");
        expect(result.results[0]?.sourceFamily).toBe("news");
        expect(result.results[0]?.url).toBe("https://example.com/story");
        expect(result.results.some((entry) => entry.sourceFamily === "official-doc")).toBe(true);
    });
});
