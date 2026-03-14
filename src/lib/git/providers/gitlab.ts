import {
  type CreateIssueInput,
  type GitIssueProvider,
  type GitIssueSummary,
  type SearchIssuesInput,
  resolveLimit,
  validateRepoFullName
} from "@/lib/git/provider";

const GITLAB_API_BASE = process.env.GITLAB_API_BASE?.trim() || "https://gitlab.com/api/v4";

interface GitLabIssueResponse {
  id: number;
  iid: number;
  title: string;
  state: string;
  web_url: string;
}

export class GitLabProvider implements GitIssueProvider {
  readonly provider = "GITLAB" as const;

  constructor(private readonly token: string) {}

  async searchIssues(input: SearchIssuesInput): Promise<GitIssueSummary[]> {
    const repoFullName = validateRepoFullName(input.repoFullName);
    const limit = resolveLimit(input.limit);
    const projectPath = encodeURIComponent(repoFullName);

    const url = new URL(`${GITLAB_API_BASE}/projects/${projectPath}/issues`);
    url.searchParams.set("scope", "all");
    url.searchParams.set("state", "all");
    url.searchParams.set("per_page", String(limit));

    const query = input.query?.trim();
    if (query) {
      url.searchParams.set("search", query);
    }

    const response = await fetch(url, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`GitLab search failed with status ${response.status}`);
    }

    const data = (await response.json()) as GitLabIssueResponse[];

    return data.map((issue) => ({
      id: String(issue.id),
      number: issue.iid,
      title: issue.title,
      state: issue.state,
      url: issue.web_url
    }));
  }

  async createIssue(input: CreateIssueInput): Promise<GitIssueSummary> {
    const repoFullName = validateRepoFullName(input.repoFullName);
    const projectPath = encodeURIComponent(repoFullName);

    const response = await fetch(`${GITLAB_API_BASE}/projects/${projectPath}/issues`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        title: input.title,
        description: input.body
      })
    });

    if (!response.ok) {
      throw new Error(`GitLab issue creation failed with status ${response.status}`);
    }

    const data = (await response.json()) as GitLabIssueResponse;

    return {
      id: String(data.id),
      number: data.iid,
      title: data.title,
      state: data.state,
      url: data.web_url
    };
  }

  private getHeaders() {
    return {
      Accept: "application/json",
      Authorization: `Bearer ${this.token}`,
      "PRIVATE-TOKEN": this.token,
      "Content-Type": "application/json"
    };
  }
}
