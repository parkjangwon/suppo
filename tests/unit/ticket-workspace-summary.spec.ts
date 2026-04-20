import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminCopyProvider } from "@suppo/shared/i18n/admin-context";
import { getAdminCopy } from "@suppo/shared/i18n/admin-copy";

import { TicketWorkspaceSummary } from "@/components/admin/ticket-workspace-summary";

describe("TicketWorkspaceSummary", () => {
  it("shows the ticket handling summary and a read-only notice", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        AdminCopyProvider,
        { value: getAdminCopy("ko") },
        React.createElement(TicketWorkspaceSummary, {
          statusLabel: "진행중",
          priorityLabel: "긴급",
          assigneeName: "김상담",
          requestTypeName: "제품 문의",
          canEdit: false,
        })
      )
    );

    expect(markup).toContain("처리 요약");
    expect(markup).toContain("현재 상태");
    expect(markup).toContain("우선순위");
    expect(markup).toContain("담당자");
    expect(markup).toContain("문의 유형");
    expect(markup).toContain("읽기 전용 모드");
    expect(markup).toContain("담당자이거나 관리자일 때 응답과 내부 메모를 남길 수 있습니다.");
  });

  it("encourages immediate action when the current user can edit", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        AdminCopyProvider,
        { value: getAdminCopy("ko") },
        React.createElement(TicketWorkspaceSummary, {
          statusLabel: "열림",
          priorityLabel: "보통",
          assigneeName: "미할당",
          requestTypeName: "-",
          canEdit: true,
        })
      )
    );

    expect(markup).toContain("응답 작성과 내부 메모 등록을 바로 진행할 수 있습니다.");
    expect(markup).not.toContain("읽기 전용 모드");
  });
});
