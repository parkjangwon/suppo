import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminCopyProvider } from "@suppo/shared/i18n/admin-context";
import { getAdminCopy } from "@suppo/shared/i18n/admin-copy";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href }, children),
}));

import { RequestTypeList } from "@/components/admin/request-type-list";
import { TemplateList } from "@/components/admin/template-list";

const copy = getAdminCopy("ko");

describe("admin list pagination controls", () => {
  it("renders request type search and page controls", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        AdminCopyProvider,
        { value: copy },
        React.createElement(RequestTypeList, {
          requestTypes: [
            {
              id: "request-type-1",
              name: "환불 문의",
              description: "환불 관련 문의",
              channel: "WEB",
              defaultPriority: "MEDIUM",
              defaultTeamId: null,
              defaultTeam: null,
              autoAssignEnabled: true,
              isActive: true,
              sortOrder: 0,
              _count: { tickets: 2 },
            },
          ],
          teams: [],
          page: 2,
          totalPages: 3,
          totalCount: 61,
          pageSize: 30,
          search: "환불",
        } as React.ComponentProps<typeof RequestTypeList>)
      )
    );

    expect(markup).toContain("문의 유형 검색");
    expect(markup).toContain("총 61건 중 31-60");
  });

  it("renders template search and page controls", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        AdminCopyProvider,
        { value: copy },
        React.createElement(TemplateList, {
          templates: [
            {
              id: "template-1",
              title: "환불 안내",
              content: "환불 안내 내용입니다.",
              variables: [],
              isShared: true,
              isRecommended: false,
              sortOrder: 0,
              category: null,
              categoryId: null,
              requestTypeId: null,
              createdBy: { id: "agent-1", name: "관리자" },
              createdById: "agent-1",
              createdAt: new Date("2026-01-01T00:00:00.000Z"),
              updatedAt: new Date("2026-01-01T00:00:00.000Z"),
            },
          ],
          categories: [],
          requestTypes: [],
          currentUserId: "agent-1",
          isAdmin: true,
          page: 2,
          totalPages: 4,
          totalCount: 95,
          pageSize: 30,
          search: "환불",
        } as React.ComponentProps<typeof TemplateList>)
      )
    );

    expect(markup).toContain("템플릿 검색");
    expect(markup).toContain("총 95건 중 31-60");
  });
});
