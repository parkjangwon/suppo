import {
  type CreateIssueInput,
  type GitIssueProvider,
  type GitIssueSummary,
  type IssueComment,
  type IssueDetail,
  type IssueFullDetail,
  type LinkedPR,
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

  async getIssue(repoFullName: string, issueNumber: number, signal?: AbortSignal): Promise<IssueDetail> {
    const repoPath = validateRepoFullName(repoFullName);
    const projectPath = encodeURIComponent(repoPath);
    const url = `${GITLAB_API_BASE}/projects/${projectPath}/issues/${issueNumber}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
      signal
    });

    if (!response.ok) {
      throw new Error(`GitLab getIssue failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      state: string;
      assignees: Array<{ username: string; avatar_url: string }>;
      labels: string[];
      milestone: {
        title: string;
        due_date: string | null;
        open_issues_count: number;
        closed_issues_count: number;
      } | null;
      updated_at: string;
    };

    return {
      state: data.state,
      assignees: data.assignees.map((a) => ({ login: a.username, avatarUrl: a.avatar_url })),
      labels: data.labels.map((name) => ({ name, color: "000000" })),
      milestone: data.milestone
        ? {
            title: data.milestone.title,
            dueOn: data.milestone.due_date,
            openIssues: data.milestone.open_issues_count,
            closedIssues: data.milestone.closed_issues_count
          }
        : null,
      hasPR: false,
      updatedAt: data.updated_at
    };
  }

  async getIssueFullDetail(
    repoFullName: string,
    issueNumber: number,
    signal?: AbortSignal
  ): Promise<IssueFullDetail> {
    const repoPath = validateRepoFullName(repoFullName);
    const projectPath = encodeURIComponent(repoPath);
    const base = `${GITLAB_API_BASE}/projects/${projectPath}`;

    const [issueRes, notesRes, mrsRes] = await Promise.all([
      fetch(`${base}/issues/${issueNumber}`, { headers: this.getHeaders(), signal }),
      fetch(`${base}/issues/${issueNumber}/notes?per_page=3&sort=asc&order_by=created_at`, { headers: this.getHeaders(), signal }),
      fetch(`${base}/issues/${issueNumber}/related_merge_requests`, { headers: this.getHeaders(), signal })
    ]);

    if (!issueRes.ok) {
      throw new Error(`GitLab getIssueFullDetail issue failed: ${issueRes.status}`);
    }

    type GitLabIssueFullResponse = {
      state: string;
      assignees: Array<{ username: string; avatar_url: string }>;
      labels: string[];
      milestone: {
        title: string;
        due_date: string | null;
        open_issues_count: number;
        closed_issues_count: number;
      } | null;
      updated_at: string;
      user_notes_count: number;
    };
    type GitLabNote = {
      id: number;
      author: { username: string; avatar_url: string };
      body: string;
      created_at: string;
      system: boolean;
    };
    type GitLabMR = {
      iid: number;
      title: string;
      state: string;
      source_branch: string;
      target_branch: string;
      draft: boolean;
      web_url: string;
    };

    const issueData = (await issueRes.json()) as GitLabIssueFullResponse;

    let comments: IssueComment[] = [];
    if (notesRes.ok) {
      const notesData = (await notesRes.json()) as GitLabNote[];
      comments = notesData
        .filter(n => !n.system)
        .map(n => ({
          id: n.id,
          author: { login: n.author.username, avatarUrl: n.author.avatar_url },
          body: n.body,
          createdAt: n.created_at
        }));
    }

    let linkedPRs: LinkedPR[] = [];
    if (mrsRes.ok) {
      const mrsData = (await mrsRes.json()) as GitLabMR[];
      linkedPRs = mrsData.map(mr => {
        let state: LinkedPR['state'];
        if (mr.state === 'merged') state = 'merged';
        else if (mr.state === 'closed') state = 'closed';
        else state = 'open'; // 'opened' → 'open'

        return {
          number: mr.iid,
          title: mr.title,
          state,
          headBranch: mr.source_branch,
          baseBranch: mr.target_branch,
          reviewDecision: null, // GitLab 기본 API로는 판단 불가
          isDraft: mr.draft,
          url: mr.web_url
        };
      });
    }

    return {
      state: issueData.state,
      assignees: issueData.assignees.map(a => ({ login: a.username, avatarUrl: a.avatar_url })),
      labels: issueData.labels.map(name => ({ name, color: "000000" })),
      milestone: issueData.milestone
        ? {
            title: issueData.milestone.title,
            dueOn: issueData.milestone.due_date,
            openIssues: issueData.milestone.open_issues_count,
            closedIssues: issueData.milestone.closed_issues_count
          }
        : null,
      hasPR: linkedPRs.length > 0,
      updatedAt: issueData.updated_at,
      comments,
      commentCount: issueData.user_notes_count,
      linkedPRs
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
