import {
  type CreateIssueInput,
  GitProviderNotSupportedError,
  type GitIssueProvider,
  type GitIssueSummary,
  type SearchIssuesInput
} from "@/lib/git/provider";

export class CodeCommitProvider implements GitIssueProvider {
  readonly provider = "CODECOMMIT" as const;

  async searchIssues(input: SearchIssuesInput): Promise<GitIssueSummary[]> {
    void input;
    throw new GitProviderNotSupportedError(this.provider);
  }

  async createIssue(input: CreateIssueInput): Promise<GitIssueSummary> {
    void input;
    throw new GitProviderNotSupportedError(this.provider);
  }
}
