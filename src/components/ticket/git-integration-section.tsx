"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import type { IssueDetail } from "@/lib/git/provider";
import { getStateBadgeClass, getLabelTextColor, formatMilestone } from "./issue-detail-helpers";

type GitProvider = "GITHUB" | "GITLAB" | "CODECOMMIT";

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
  { value: "GITLAB", label: "GitLab" },
  { value: "CODECOMMIT", label: "CodeCommit" }
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
  }, [ticketId]);

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
    toast.success("이슈 연결이 해제됐습니다.");
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
              const detail = issueDetails[link.id];
              return (
                <li key={link.id} className="space-y-1.5 rounded-md border p-3 text-sm">
                  {/* 헤더 행: 링크 + state 배지 + 연결 해제 버튼 */}
                  <div className="flex items-center justify-between gap-3">
                    <a href={link.issueUrl} target="_blank" rel="noreferrer" className="hover:underline font-medium">
                      [{link.provider}] {link.repoFullName} #{link.issueNumber}
                    </a>
                    <div className="flex items-center gap-2 shrink-0">
                      {detail !== undefined && detail !== null && (
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${getStateBadgeClass(detail.state)}`}>
                          {detail.state}
                        </span>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void unlinkIssue(link.id)}
                      >
                        연결 해제
                      </Button>
                    </div>
                  </div>

                  {/* 상세 정보 영역 */}
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
        )}
      </div>
    </section>
  );
}
