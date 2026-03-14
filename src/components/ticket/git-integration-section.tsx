"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

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
            {linkedIssues.map((link) => (
              <li key={link.id} className="flex items-center justify-between gap-3">
                <a href={link.issueUrl} target="_blank" rel="noreferrer" className="hover:underline">
                  [{link.provider}] {link.repoFullName} #{link.issueNumber}
                </a>
                <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-700">연결됨</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
