export type GitProvider = "GITHUB" | "GITLAB" | "CODECOMMIT";

export interface GitIssueSummary {
  id: string;
  number: number;
  title: string;
  state: string;
  url: string;
}

export interface SearchIssuesInput {
  repoFullName: string;
  query?: string;
  limit?: number;
}

export interface CreateIssueInput {
  repoFullName: string;
  title: string;
  body?: string;
}

export interface IssueDetail {
  state: string;  // 'open' | 'closed' | 'locked' etc, UI handles fallback
  assignees: { login: string; avatarUrl: string }[];
  labels: { name: string; color: string }[];  // color: 6-char hex (no #)
  milestone: {
    title: string;
    dueOn: string | null;
    openIssues: number;
    closedIssues: number;
  } | null;
  hasPR: boolean;
  updatedAt: string;  // ISO 8601
}

export interface GitIssueProvider {
  readonly provider: GitProvider;
  searchIssues(input: SearchIssuesInput): Promise<GitIssueSummary[]>;
  createIssue(input: CreateIssueInput): Promise<GitIssueSummary>;
  getIssue?(repoFullName: string, issueNumber: number, signal?: AbortSignal): Promise<IssueDetail>;
}

export class GitProviderNotSupportedError extends Error {
  constructor(provider: GitProvider) {
    super(`${provider} is not supported for issue search/create`);
    this.name = "GitProviderNotSupportedError";
  }
}

export function parseProvider(provider: string): GitProvider {
  const normalized = provider.toUpperCase();

  if (normalized === "GITHUB" || normalized === "GITLAB" || normalized === "CODECOMMIT") {
    return normalized;
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

export function validateRepoFullName(repoFullName: string): string {
  const value = repoFullName.trim();

  if (!value || !value.includes("/")) {
    throw new Error("repoFullName must be in owner/repo format");
  }

  return value;
}

export function resolveLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) {
    return 20;
  }

  return Math.min(Math.max(limit, 1), 100);
}
