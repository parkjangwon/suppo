// src/components/ticket/linked-issues-readonly.tsx
"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { IssueDetail, GitProvider } from "@/lib/git/provider";
import { getStateBadgeClass, getLabelTextColor, formatMilestone } from "./issue-detail-helpers";

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
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    if (initialLinks.length === 0) return;

    setIsLoadingDetails(true);
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
      })
      .finally(() => setIsLoadingDetails(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  if (initialLinks.length === 0) return null;

  return (
    <section className="mt-8 space-y-4 border-t pt-8">
      <h3 className="text-lg font-medium">연결된 이슈</h3>
      <ul className="space-y-2">
        {initialLinks.map((link) => {
          const detail = issueDetails[link.id];
          return (
            <li key={link.id} className="space-y-1.5 rounded-md border p-3 text-sm">
              <div className="flex items-center gap-3">
                <a href={link.issueUrl} target="_blank" rel="noreferrer" className="hover:underline font-medium">
                  [{link.provider}] {link.repoFullName} #{link.issueNumber}
                </a>
                {detail !== undefined && detail !== null && (
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${getStateBadgeClass(detail.state)}`}>
                    {detail.state}
                  </span>
                )}
              </div>

              {detail === undefined && isLoadingDetails && (
                <div className="space-y-1.5 pl-1">
                  <div className="h-3 w-48 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
                </div>
              )}
              {detail === null && (
                <p className="pl-1 text-xs text-slate-400">이슈 정보를 불러올 수 없습니다.</p>
              )}
              {detail && (
                <div className="space-y-1 pl-1 text-xs text-slate-600">
                  {detail.assignees.length > 0 && (
                    <p>담당자: {detail.assignees.map((a) => a.login).join(", ")}</p>
                  )}
                  {detail.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {detail.labels.map((label) => (
                        <span
                          key={label.name}
                          className="rounded px-1.5 py-0.5 text-xs"
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
                  {detail.milestone && (
                    <p>마일스톤: {formatMilestone(detail.milestone)}</p>
                  )}
                  {detail.hasPR && <p>PR 연결됨</p>}
                  <p className="text-slate-400">
                    {formatDistanceToNow(new Date(detail.updatedAt), { addSuffix: true, locale: ko })} 업데이트
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
