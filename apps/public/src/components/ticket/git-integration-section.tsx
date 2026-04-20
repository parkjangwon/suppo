"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@suppo/ui/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import type { IssueDetail, IssueFullDetail, GitProvider } from "@suppo/shared/git/provider";
import {
  getStateBadgeClass,
  getLabelTextColor,
  formatMilestone,
  getPRStateBadgeClass,
  getReviewDecisionText
} from "./issue-detail-helpers";

type GitIssue = {
  id: string;
  number: number;
  title: string;
  state: string;
  url: string;
};

type GitLink = {
  id: string;
  provider: GitProvider;
  repoFullName: string;
  issueNumber: number;
  issueUrl: string;
  createdAt: Date;
  issueDetail?: IssueDetail | null;  // undefined=로딩중, null=실패
};

interface GitIntegrationSectionProps {
  ticketId: string;
  ticketNumber: string;
  ticketSubject: string;
  ticketDescription: string;
  initialLinks: GitLink[];
}

const providerOptions: { value: GitProvider; label: string }[] = [
  { value: "GITHUB", label: "GitHub" },
  { value: "GITLAB", label: "GitLab" }
];

export function GitIntegrationSection({
  ticketId,
  ticketNumber,
  ticketSubject,
  ticketDescription,
  initialLinks
}: GitIntegrationSectionProps) {
  const [provider, setProvider] = useState<GitProvider>("GITHUB");
  const [repoFullName, setRepoFullName] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GitIssue[]>([]);
  const [linkedIssues, setLinkedIssues] = useState(initialLinks);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [issueDetails, setIssueDetails] = useState<Record<string, IssueDetail | null | undefined>>({});
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailFetchTrigger, setDetailFetchTrigger] = useState(0);
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [fullDetails, setFullDetails] = useState<Record<string, IssueFullDetail | null | undefined>>({});

  useEffect(() => {
    if (linkedIssues.length === 0) return;

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
        // 전체 실패 시 모든 이슈를 null로
        const details: Record<string, null> = {};
        for (const link of linkedIssues) {
          details[link.id] = null;
        }
        setIssueDetails(details);
      })
      .finally(() => setIsLoadingDetails(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, detailFetchTrigger]);

  const disabledActions = useMemo(() => !repoFullName.trim(), [repoFullName]);

  const linkIssue = async (issue: GitIssue) => {
    const response = await fetch("/api/git/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ticketId,
        provider,
        repoFullName: repoFullName.trim(),
        issueNumber: issue.number,
        issueUrl: issue.url
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error || "이슈 연결에 실패했습니다.");
    }

    const payload = (await response.json()) as { link: GitLink };
    setLinkedIssues((prev) => [payload.link, ...prev]);
    setDetailFetchTrigger((n) => n + 1);
  };

  const unlinkIssue = async (linkId: string) => {
    const response = await fetch(`/api/git/links?id=${linkId}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      toast.error(payload.error || "연결 해제에 실패했습니다.");
      return;
    }
    setLinkedIssues((prev) => prev.filter((l) => l.id !== linkId));
    setIssueDetails((prev) => {
      const next = { ...prev };
      delete next[linkId];
      return next;
    });
    setFullDetails((prev) => {
      const next = { ...prev };
      delete next[linkId];
      return next;
    });
    setExpandedIssues((prev) => {
      const next = new Set(prev);
      next.delete(linkId);
      return next;
    });
    toast.success("이슈 연결이 해제됐습니다.");
  };

  const toggleExpand = async (link: (typeof linkedIssues)[number]) => {
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

  const handleSearch = async () => {
    if (disabledActions) return;

    setError("");
    setIsSearching(true);

    try {
      const params = new URLSearchParams({
        provider,
        repo: repoFullName.trim(),
        q: query
      });

      const response = await fetch(`/api/git/issues/search?${params.toString()}`);
      const payload = (await response.json()) as { issues?: GitIssue[]; error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "이슈 검색에 실패했습니다.");
      }

      setSearchResults(payload.issues ?? []);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "이슈 검색에 실패했습니다.";
      setError(message);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreate = async () => {
    if (disabledActions) return;

    setError("");
    setIsCreating(true);

    try {
      const response = await fetch("/api/git/issues/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider,
          repoFullName: repoFullName.trim(),
          ticketId,
          title: `[${ticketNumber}] ${ticketSubject}`,
          description: [`원본 티켓: ${ticketNumber}`, "", ticketDescription].join("\n")
        })
      });

      const payload = (await response.json()) as { issue?: GitIssue; error?: string };

      if (!response.ok || !payload.issue) {
        throw new Error(payload.error || "이슈 생성에 실패했습니다.");
      }

      await linkIssue(payload.issue);
      setSearchResults((prev) => [payload.issue as GitIssue, ...prev]);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "이슈 생성에 실패했습니다.";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className="mt-8 space-y-4 border-t pt-8">
      <h3 className="text-lg font-medium">Git 연동</h3>

      <div className="grid gap-3 md:grid-cols-3">
        <select
          value={provider}
          onChange={(event) => setProvider(event.target.value as GitProvider)}
          className="rounded-md border p-2"
        >
          {providerOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={repoFullName}
          onChange={(event) => setRepoFullName(event.target.value)}
          placeholder="owner/repo"
          className="rounded-md border p-2 md:col-span-2"
        />
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="이슈 검색어"
          className="rounded-md border p-2"
        />
        <Button type="button" onClick={handleSearch} disabled={isSearching || disabledActions}>
          {isSearching ? "검색 중..." : "이슈 검색"}
        </Button>
        <Button type="button" onClick={handleCreate} disabled={isCreating || disabledActions}>
          {isCreating ? "생성 중..." : "새 이슈 생성"}
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {searchResults.length > 0 ? (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">이슈 검색 결과</p>
          <ul className="space-y-2 text-sm">
            {searchResults.map((issue) => (
              <li key={`${issue.id}-${issue.number}`} className="flex items-center justify-between gap-3">
                <a href={issue.url} target="_blank" rel="noreferrer" className="hover:underline">
                  #{issue.number} {issue.title}
                </a>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{issue.state}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void linkIssue(issue)}
                  >
                    연결
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">연결된 이슈</p>
        {linkedIssues.length === 0 ? (
          <p className="text-sm text-slate-500">아직 연결된 이슈가 없습니다.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {linkedIssues.map((link) => {
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
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          void unlinkIssue(link.id);
                        }}
                      >
                        연결 해제
                      </Button>
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
        )}
      </div>
    </section>
  );
}
