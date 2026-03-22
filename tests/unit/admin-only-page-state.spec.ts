import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";

describe("AdminOnlyPageState", () => {
  it("explains why the page is restricted and offers a dashboard link", () => {
    const markup = renderToStaticMarkup(
      React.createElement(AdminOnlyPageState, {
        title: "팀 관리",
        description: "팀 구성과 배정 정책은 관리자만 변경할 수 있습니다.",
      })
    );

    expect(markup).toContain("관리자 전용 페이지");
    expect(markup).toContain("팀 관리");
    expect(markup).toContain("팀 구성과 배정 정책은 관리자만 변경할 수 있습니다.");
    expect(markup).toContain("/admin/dashboard");
    expect(markup).toContain("대시보드로 돌아가기");
  });
});
