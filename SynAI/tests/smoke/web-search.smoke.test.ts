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
    global.fetch = vi.fn(async () => ({
      ok: true,
      text: async () => `<?xml version="1.0" encoding="UTF-8"?>
<rss>
  <channel>
    <item>
      <title><![CDATA[Latest headline - Example News]]></title>
      <link>https://example.com/story</link>
      <description><![CDATA[Fresh summary for the story.]]></description>
      <pubDate>Wed, 08 Apr 2026 01:00:00 GMT</pubDate>
      <source url="https://example.com">Example News</source>
    </item>
  </channel>
</rss>`
    })) as typeof fetch;

    const result = await resolveRecentWebContext("latest iran news", true);

    expect(result.status).toBe("used");
    expect(result.results[0]?.title).toBe("Latest headline");
    expect(result.results[0]?.source).toBe("Example News");
    expect(result.results[0]?.url).toBe("https://example.com/story");
  });
});
