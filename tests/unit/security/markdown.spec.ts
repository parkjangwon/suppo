import { describe, expect, it } from "vitest";

import { renderSafeMarkdown } from "@crinity/shared/security/markdown";

describe("renderSafeMarkdown", () => {
  it("renders basic markdown formatting", () => {
    const html = renderSafeMarkdown("# 제목\n**강조**와 `코드`");

    expect(html).toContain("<h1>제목</h1>");
    expect(html).toContain("<strong>강조</strong>");
    expect(html).toContain("<code>코드</code>");
  });

  it("escapes unsafe html content", () => {
    const html = renderSafeMarkdown(`<img src=x onerror=alert(1)><script>alert(1)</script>`);

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
