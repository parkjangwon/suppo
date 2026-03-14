export interface CandidateAgent {
  id: string;
  name: string;
  maxTickets: number;
  currentTickets: number;
  loadRatio: number;
  lastAssignedAt: Date | null;
}

export function pickAssignee(candidates: CandidateAgent[], categoryId?: string): CandidateAgent | null {
  void categoryId;

  const available = candidates.filter((candidate) => candidate.loadRatio < 1);
  if (available.length === 0) {
    return null;
  }

  return available.toSorted((a, b) => {
    if (a.loadRatio !== b.loadRatio) {
      return a.loadRatio - b.loadRatio;
    }

    const aTime = a.lastAssignedAt?.getTime() ?? 0;
    const bTime = b.lastAssignedAt?.getTime() ?? 0;
    return aTime - bTime;
  })[0];
}
