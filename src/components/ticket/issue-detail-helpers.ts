// src/components/ticket/issue-detail-helpers.ts

export function getStateBadgeClass(state: string): string {
  if (state === "open" || state === "opened") return "bg-green-100 text-green-700";
  if (state === "closed") return "bg-purple-100 text-purple-700";
  return "bg-slate-100 text-slate-700";
}

/** hexColor: 6자리 hex (# 없음, 대소문자 무관) */
export function getLabelTextColor(hexColor: string): string {
  const hex = hexColor.replace(/^#/, "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 128 ? "#000000" : "#ffffff";
}

export function formatMilestone(milestone: {
  title: string;
  dueOn: string | null;
  openIssues: number;
  closedIssues: number;
}): string {
  const total = milestone.openIssues + milestone.closedIssues;
  if (total === 0) return milestone.title;
  return `${milestone.title} (${milestone.closedIssues}/${total} 완료)`;
}
