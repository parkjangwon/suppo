import {
  type CreateIssueInput,
  type GitIssueProvider,
  type GitIssueSummary,
  type SearchIssuesInput,
  resolveLimit,
  validateRepoFullName
} from "@/lib/git/provider";

const GITHUB_API_BASE = "https://api.github.com";

interface GitHubSearchResponse {
  items: Array<{
    id: number;
    number: number;
    title: string;
    state: string;
    html_url: string;
    pull_request?: unknown;
  }>;
}

interface GitHubIssueResponse {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
}

export class GitHubProvider implements GitIssueProvider {
  readonly provider = "GITHUB" as const;

  constructor(private readonly token: string) {}

  async searchIssues(input: SearchIssuesInput): Promise<GitIssueSummary[]> {
    const repoFullName = validateRepoFullName(input.repoFullName);
    const query = input.query?.trim();
    const limit = resolveLimit(input.limit);
    const q = [
      `repo:${repoFullName}`,
      "is:issue",
      query ? `${query} in:title,body` : null
    ]
      .filter(Boolean)
      .join(" ");

    const url = new URL(`${GITHUB_API_BASE}/search/issues`);
    url.searchParams.set("q", q);
    url.searchParams.set("per_page", String(limit));

    const response = await fetch(url, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`GitHub search failed with status ${response.status}`);
    }

    const data = (await response.json()) as GitHubSearchResponse;

    return data.items
      .filter((item) => !item.pull_request)
      .map((item) => ({
        id: String(item.id),
        number: item.number,
        title: item.title,
        state: item.state,
        url: item.html_url
      }));
  }

  async createIssue(input: CreateIssueInput): Promise<GitIssueSummary> {
    const repoFullName = validateRepoFullName(input.repoFullName);

    const response = await fetch(`${GITHUB_API_BASE}/repos/${repoFullName}/issues`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        title: input.title,
        body: input.body
      })
    });

    if (!response.ok) {
      throw new Error(`GitHub issue creation failed with status ${response.status}`);
    }

    const data = (await response.json()) as GitHubIssueResponse;

    return {
      id: String(data.id),
      number: data.number,
      title: data.title,
      state: data.state,
      url: data.html_url
    };
  }

  private getHeaders() {
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json"
    };
  }
}
