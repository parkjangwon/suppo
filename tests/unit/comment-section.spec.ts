import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-comment-lock", () => ({
  useCommentLock: () => ({
    lock: null,
    isLockedByMe: false,
    isLocked: false,
    acquireLock: vi.fn(),
    releaseLock: vi.fn(),
  }),
}));

vi.mock("@/components/ticket/attachment-upload", () => ({
  AttachmentUpload: () => React.createElement("div", null, "attachment-upload"),
}));

vi.mock("@/components/admin/template-selector", () => ({
  TemplateSelector: () => React.createElement("div", null, "template-selector"),
}));

vi.mock("@/components/admin/knowledge-assistant", () => ({
  KnowledgeAssistant: () => React.createElement("div", null, "knowledge-assistant"),
}));

vi.mock("@/components/admin/comment-thread", () => ({
  CommentThread: () => React.createElement("div", null, "comment-thread"),
}));

import { CommentSection } from "@/components/admin/comment-section";

describe("CommentSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a taller default reply textarea", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CommentSection, {
        ticketId: "ticket-1",
        comments: [],
        canEdit: true,
        currentAgentId: "agent-1",
        isAdmin: true,
        ticketAssigneeId: "agent-1",
      })
    );

    expect(markup).toContain('aria-label="응답 작성"');
    expect(markup).toContain('rows="6"');
  });
});
