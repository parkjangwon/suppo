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
} from "@suppo/shared/git/provider";

function computeReviewDecision(
  reviews: Array<{ user: { login: string }; state: string }>,
  requestedReviewerCount: number
): LinkedPR['reviewDecision'] {
  // 리뷰어별 최신 상태 추출 (DISMISSED 제외)
  const latestByReviewer = new Map<string, string>();
  for (const review of reviews) {
    if (review.state !== 'DISMISSED') {
      latestByReviewer.set(review.user.login, review.state);
    }
  }
  const states = [...latestByReviewer.values()];
  if (states.some(s => s === 'CHANGES_REQUESTED')) return 'changes_requested';
  if (states.length > 0 && states.every(s => s === 'APPROVED')) return 'approved';
  if (requestedReviewerCount > 0) return 'review_required';
  return null;
}

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

  async getIssue(repoFullName: string, issueNumber: number, signal?: AbortSignal): Promise<IssueDetail> {
    const repo = validateRepoFullName(repoFullName);
    const url = `${GITHUB_API_BASE}/repos/${repo}/issues/${issueNumber}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
      signal
    });

    if (!response.ok) {
      throw new Error(`GitHub getIssue failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      state: string;
      assignees: Array<{ login: string; avatar_url: string }>;
      labels: Array<{ name: string; color: string }>;
      milestone: {
        title: string;
        due_on: string | null;
        open_issues: number;
        closed_issues: number;
      } | null;
      pull_request?: unknown;
      updated_at: string;
    };

    return {
      state: data.state,
      assignees: data.assignees.map((a) => ({ login: a.login, avatarUrl: a.avatar_url })),
      labels: data.labels,
      milestone: data.milestone
        ? {
            title: data.milestone.title,
            dueOn: data.milestone.due_on,
            openIssues: data.milestone.open_issues,
            closedIssues: data.milestone.closed_issues
          }
        : null,
      hasPR: data.pull_request !== undefined && data.pull_request !== null,
      updatedAt: data.updated_at
    };
  }

  async getIssueFullDetail(
    repoFullName: string,
    issueNumber: number,
    signal?: AbortSignal
  ): Promise<IssueFullDetail> {
    const repo = validateRepoFullName(repoFullName);
    const base = `${GITHUB_API_BASE}/repos/${repo}`;

    // Round 1: 병렬 fetch
    const [issueRes, commentsRes, timelineRes] = await Promise.all([
      fetch(`${base}/issues/${issueNumber}`, { headers: this.getHeaders(), signal }),
      fetch(`${base}/issues/${issueNumber}/comments?per_page=3`, { headers: this.getHeaders(), signal }),
      fetch(`${base}/issues/${issueNumber}/timeline`, {
        headers: {
          ...this.getHeaders(),
          Accept: "application/vnd.github.mockingbird-preview+json"
        },
        signal
      })
    ]);

    if (!issueRes.ok) {
      throw new Error(`GitHub getIssueFullDetail issue failed: ${issueRes.status}`);
    }

    type IssueResponse = {
      state: string;
      assignees: Array<{ login: string; avatar_url: string }>;
      labels: Array<{ name: string; color: string }>;
      milestone: {
        title: string;
        due_on: string | null;
        open_issues: number;
        closed_issues: number;
      } | null;
      pull_request?: unknown;
      updated_at: string;
      comments: number;
    };
    type CommentResponse = Array<{
      id: number;
      user: { login: string; avatar_url: string };
      body: string;
      created_at: string;
    }>;
    type TimelineEvent = {
      event: string;
      source?: {
        type: string;
        issue?: { number: number; pull_request?: unknown };
      };
    };

    const issueData = (await issueRes.json()) as IssueResponse;
    const commentsData: CommentResponse = commentsRes.ok ? (await commentsRes.json()) as CommentResponse : [];
    const timelineData: TimelineEvent[] = timelineRes.ok ? (await timelineRes.json()) as TimelineEvent[] : [];

    // timeline에서 PR 번호 추출
    const prNumbers = [
      ...new Set(
        timelineData
          .filter(
            e =>
              e.event === "cross_referenced" &&
              e.source?.type === "issue" &&
              e.source.issue?.pull_request !== undefined
          )
          .map(e => e.source!.issue!.number)
      )
    ];

    // Round 2: PR 상세 병렬 fetch
    const linkedPRs: LinkedPR[] = [];
    if (prNumbers.length > 0) {
      const prResults = await Promise.allSettled(
        prNumbers.map(prNumber =>
          Promise.all([
            fetch(`${base}/pulls/${prNumber}`, { headers: this.getHeaders(), signal }),
            fetch(`${base}/pulls/${prNumber}/reviews`, { headers: this.getHeaders(), signal })
          ])
        )
      );

      for (const result of prResults) {
        if (result.status === "rejected") continue;
        const [prRes, reviewsRes] = result.value;
        if (!prRes.ok) continue;

        type PRResponse = {
          number: number;
          title: string;
          state: string;
          merged_at: string | null;
          head: { ref: string };
          base: { ref: string };
          draft: boolean;
          html_url: string;
          requested_reviewers: Array<{ login: string }>;
        };
        type ReviewResponse = Array<{ user: { login: string }; state: string }>;

        const prData = (await prRes.json()) as PRResponse;
        const reviewsData: ReviewResponse = reviewsRes.ok ? (await reviewsRes.json()) as ReviewResponse : [];

        const prState: LinkedPR['state'] =
          prData.state === "closed" && prData.merged_at ? "merged" :
          prData.state === "closed" ? "closed" : "open";

        linkedPRs.push({
          number: prData.number,
          title: prData.title,
          state: prState,
          headBranch: prData.head.ref,
          baseBranch: prData.base.ref,
          reviewDecision: computeReviewDecision(reviewsData, prData.requested_reviewers.length),
          isDraft: prData.draft,
          url: prData.html_url
        });
      }
    }

    const comments: IssueComment[] = commentsData.map(c => ({
      id: c.id,
      author: { login: c.user.login, avatarUrl: c.user.avatar_url },
      body: c.body,
      createdAt: c.created_at
    }));

    return {
      state: issueData.state,
      assignees: issueData.assignees.map(a => ({ login: a.login, avatarUrl: a.avatar_url })),
      labels: issueData.labels.map(l => ({ name: l.name, color: l.color })),
      milestone: issueData.milestone
        ? {
            title: issueData.milestone.title,
            dueOn: issueData.milestone.due_on,
            openIssues: issueData.milestone.open_issues,
            closedIssues: issueData.milestone.closed_issues
          }
        : null,
      hasPR: issueData.pull_request !== undefined && issueData.pull_request !== null,
      updatedAt: issueData.updated_at,
      comments,
      commentCount: issueData.comments,
      linkedPRs
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
