// src/components/ticket/linked-issues-readonly.tsx
"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { IssueDetail, IssueFullDetail, GitProvider } from "@suppo/shared/git/provider";
import {
  getStateBadgeClass,
  getLabelTextColor,
  formatMilestone,
  getPRStateBadgeClass,
  getReviewDecisionText
} from "./issue-detail-helpers";

type GitLink = {
  id: string;
  provider: GitProvider;
  repoFullName: string;
  issueNumber: number;
  issueUrl: string;
};

interface LinkedIssuesReadonlyProps {
  ticketId: string;
  initialLinks: GitLink[];
}

export function LinkedIssuesReadonly({ ticketId, initialLinks }: LinkedIssuesReadonlyProps) {
  const [issueDetails, setIssueDetails] = useState<Record<string, IssueDetail | null | undefined>>({});
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [fullDetails, setFullDetails] = useState<Record<string, IssueFullDetail | null | undefined>>({});

  useEffect(() => {
    if (initialLinks.length === 0) return;

    fetch(`/api/git/links?ticketId=${ticketId}`)
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data: { links: Array<{ id: string; issueDetail: IssueDetail | null }> }) => {
        const details: Record<string, IssueDetail | null> = {};
        for (const link of data.links) {
          details[link.id] = link.issueDetail;
        }
        setIssueDetails(details);
      })
      .catch(() => {
        const details: Record<string, null> = {};
        for (const link of initialLinks) {
          details[link.id] = null;
        }
        setIssueDetails(details);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const toggleExpand = async (link: GitLink) => {
    const isExpanding = !expandedIssues.has(link.id);

    setExpandedIssues((prev) => {
      const next = new Set(prev);
      if (isExpanding) next.add(link.id);
      else next.delete(link.id);
      return next;
    });

    if (isExpanding && fullDetails[link.id] === undefined) {
      const params = new URLSearchParams({ ticketId, linkId: link.id });
      try {
        const res = await fetch(`/api/git/issue-detail?${params.toString()}`);
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as { detail: IssueFullDetail };
        setFullDetails((prev) => ({ ...prev, [link.id]: data.detail }));
      } catch {
        setFullDetails((prev) => ({ ...prev, [link.id]: null }));
      }
    }
  };

  if (initialLinks.length === 0) return null;

  return (
    <section className="mt-8 space-y-4 border-t pt-8">
      <h3 className="text-lg font-medium">연결된 이슈</h3>
      <ul className="space-y-2">
        {initialLinks.map((link) => {
          const basicDetail = issueDetails[link.id];
          const fullDetail = fullDetails[link.id];
          const isExpanded = expandedIssues.has(link.id);
          const isLoadingFull = isExpanded && fullDetail === undefined;

          return (
            <li key={link.id} className="rounded-md border text-sm overflow-hidden">
              {/* 접힌 헤더 행 */}
              <div
                className="flex items-center justify-between gap-3 p-3 cursor-pointer select-none hover:bg-slate-50"
                onClick={() => void toggleExpand(link)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-400 text-xs shrink-0">{isExpanded ? "▼" : "▶"}</span>
                  <a
                    href={link.issueUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline font-medium truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    [{link.provider}] {link.repoFullName} #{link.issueNumber}
                  </a>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {basicDetail != null && (
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${getStateBadgeClass(basicDetail.state)}`}>
                      {basicDetail.state}
                    </span>
                  )}
                  {fullDetail != null && fullDetail.linkedPRs.length > 0 && (
                    <span className="bg-purple-100 text-purple-700 rounded px-2 py-0.5 text-xs font-medium">
                      PR {fullDetail.linkedPRs.length}
                    </span>
                  )}
                  {fullDetail != null && (
                    <span className="text-xs text-slate-500">💬 {fullDetail.commentCount}</span>
                  )}
                </div>
              </div>

              {/* 펼친 상세 영역 */}
              {isExpanded && (
                <div className="border-t p-3 space-y-3 bg-slate-50/50">
                  {isLoadingFull && (
                    <div className="space-y-2">
                      <div className="h-3 w-48 animate-pulse rounded bg-slate-200" />
                      <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
                      <div className="h-3 w-64 animate-pulse rounded bg-slate-200" />
                    </div>
                  )}
                  {fullDetail === null && (
                    <p className="text-xs text-slate-400">상세 정보를 불러올 수 없습니다.</p>
                  )}
                  {fullDetail && (
                    <div className="space-y-3 text-xs text-slate-600">
                      {/* 기본 정보 */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
                        {fullDetail.assignees.length > 0 && (
                          <span>담당자: {fullDetail.assignees.map((a) => a.login).join(", ")}</span>
                        )}
                        {fullDetail.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {fullDetail.labels.map((label) => (
                              <span
                                key={label.name}
                                className="rounded px-1.5 py-0.5"
                                style={{
                                  backgroundColor: `#${label.color}`,
                                  color: getLabelTextColor(label.color)
                                }}
                              >
                                {label.name}
                              </span>
                            ))}
                          </div>
                        )}
                        {fullDetail.milestone && (
                          <span>마일스톤: {formatMilestone(fullDetail.milestone)}</span>
                        )}
                        <span className="text-slate-400 ml-auto">
                          {formatDistanceToNow(new Date(fullDetail.updatedAt), { addSuffix: true, locale: ko })} 업데이트
                        </span>
                      </div>

                      {/* PR 섹션 */}
                      {fullDetail.linkedPRs.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">연결된 Pull Request</p>
                          {fullDetail.linkedPRs.map((pr) => {
                            const reviewText = getReviewDecisionText(pr.reviewDecision);
                            return (
                              <div key={pr.number} className="border rounded-md p-2 bg-white space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium shrink-0 ${getPRStateBadgeClass(pr.state)}`}>
                                      {pr.state}
                                    </span>
                                    <span className="font-medium truncate">
                                      #{pr.number} — {pr.title}
                                    </span>
                                    {pr.isDraft && <span className="text-slate-400 shrink-0">[Draft]</span>}
                                  </div>
                                  <a
                                    href={pr.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-indigo-600 hover:underline shrink-0"
                                  >
                                    GitHub →
                                  </a>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500">
                                  <code className="bg-slate-100 px-1 rounded">{pr.headBranch}</code>
                                  <span>→</span>
                                  <code className="bg-slate-100 px-1 rounded">{pr.baseBranch}</code>
                                  {reviewText && (
                                    <span
                                      className={
                                        pr.reviewDecision === "approved"
                                          ? "text-green-600"
                                          : pr.reviewDecision === "changes_requested"
                                          ? "text-red-600"
                                          : "text-slate-500"
                                      }
                                    >
                                      {reviewText}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 코멘트 섹션 */}
                      {fullDetail.comments.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">코멘트</p>
                          {fullDetail.comments.map((comment) => (
                            <div key={comment.id} className="border rounded-md p-2 bg-white space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium">{comment.author.login}</span>
                                <span className="text-slate-400">
                                  · {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ko })}
                                </span>
                              </div>
                              <p className="text-slate-600 line-clamp-3 whitespace-pre-wrap">{comment.body}</p>
                            </div>
                          ))}
                          {fullDetail.commentCount > fullDetail.comments.length && (
                            <a
                              href={link.issueUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:underline text-xs block text-right"
                            >
                              GitHub에서 전체 보기 ({fullDetail.commentCount}개) →
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
