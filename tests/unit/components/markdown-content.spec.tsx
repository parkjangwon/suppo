import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  MarkdownContent,
  normalizeMarkdownContent,
} from "@suppo/shared/components/markdown-content";

describe("MarkdownContent", () => {
  it("renders headings, emphasis, links, and tables with react-markdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownContent
        content={[
          "# 제목",
          "",
          "**강조**와 `코드`와 [문서](https://example.com)",
          "",
          "| 항목 | 내용 |",
          "| --- | --- |",
          "| 우선순위 | HIGH |",
        ].join("\n")}
      />,
    );

    expect(html).toContain("<h1");
    expect(html).toContain("제목");
    expect(html).toContain("<strong>강조</strong>");
    expect(html).toContain("<code>코드</code>");
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("우선순위");
  });

  it("normalizes AI style br tags into line breaks before parsing", () => {
    const normalized = normalizeMarkdownContent("첫 줄<br>둘째 줄<br />셋째 줄");

    expect(normalized).toBe("첫 줄\n둘째 줄\n셋째 줄");
  });

  it("does not render unsafe raw html", () => {
    const html = renderToStaticMarkup(
      <MarkdownContent content={`<script>alert(1)</script>\n\n<b>unsafe</b>`} />,
    );

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>unsafe</b>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;b&gt;unsafe&lt;/b&gt;");
  });
});
