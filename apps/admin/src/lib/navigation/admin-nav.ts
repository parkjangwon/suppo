import type { BackofficeRole } from "@crinity/shared/auth/config";

export type AdminNavItemKey =
  | "dashboard"
  | "analytics"
  | "knowledge"
  | "tickets"
  | "agents"
  | "calendar"
  | "teams"
  | "customers"
  | "request-types"
  | "saml"
  | "git"
  | "email"
  | "branding"
  | "operations"
  | "business-hours"
  | "llm"
  | "system"
  | "templates"
  | "audit-logs";

type AdminNavSectionKey = "main" | "settings" | "tools" | "logs";

export interface AdminNavItem {
  key: AdminNavItemKey;
  href: string;
  label: string;
}

export interface AdminNavSection {
  key: AdminNavSectionKey;
  title: string | null;
  items: AdminNavItem[];
}

const NAV_ITEMS: Array<
  AdminNavItem & {
    section: AdminNavSectionKey;
    adminOnly?: boolean;
    hiddenForRoles?: BackofficeRole[];
  }
> = [
  { key: "dashboard", href: "/admin/dashboard", label: "대시보드", section: "main" },
  { key: "analytics", href: "/admin/analytics", label: "분석 및 리포트", section: "main" },
  { key: "knowledge", href: "/admin/knowledge", label: "지식", section: "main" },
  { key: "tickets", href: "/admin/tickets", label: "티켓 목록", section: "main" },
  { key: "agents", href: "/admin/agents", label: "상담원 관리", section: "main", hiddenForRoles: ["VIEWER"] },
  { key: "calendar", href: "/admin/calendar", label: "일정 관리", section: "main", hiddenForRoles: ["VIEWER"] },
  { key: "teams", href: "/admin/teams", label: "팀 관리", section: "main", adminOnly: true },
  { key: "customers", href: "/admin/customers", label: "고객 관리", section: "main", adminOnly: true },
  { key: "request-types", href: "/admin/settings/request-types", label: "문의 유형", section: "settings", adminOnly: true },
  { key: "saml", href: "/admin/settings/saml", label: "SAML SSO", section: "settings", adminOnly: true },
  { key: "git", href: "/admin/settings/git", label: "Git 연동", section: "settings", adminOnly: true },
  { key: "email", href: "/admin/settings/email", label: "이메일 연동", section: "settings", adminOnly: true },
  { key: "branding", href: "/admin/settings/branding", label: "브랜딩", section: "settings", adminOnly: true },
  { key: "business-hours", href: "/admin/settings/business-hours", label: "영업시간", section: "settings", adminOnly: true },
  { key: "operations", href: "/admin/settings/operations", label: "운영 정책", section: "settings", adminOnly: true },
  { key: "llm", href: "/admin/settings/llm", label: "AI 연동", section: "settings", adminOnly: true },
  { key: "system", href: "/admin/settings/system", label: "시스템", section: "settings", adminOnly: true },
  { key: "templates", href: "/admin/templates", label: "응답 템플릿", section: "tools", hiddenForRoles: ["VIEWER"] },
  { key: "audit-logs", href: "/admin/audit-logs", label: "감사 로그", section: "logs", adminOnly: true },
];

const SECTION_TITLES: Record<AdminNavSectionKey, string | null> = {
  main: null,
  settings: "설정",
  tools: "도구",
  logs: "로그",
};

export function getAdminNavSections(roleInput: boolean | BackofficeRole | undefined): AdminNavSection[] {
  const role: BackofficeRole =
    typeof roleInput === "boolean" ? (roleInput ? "ADMIN" : "AGENT") : roleInput ?? "AGENT";
  const isAdmin = role === "ADMIN";
  const sections: AdminNavSection[] = [];

  for (const sectionKey of ["main", "settings", "tools", "logs"] as const) {
    const items = NAV_ITEMS.filter(
      (item) =>
        item.section === sectionKey &&
        (!item.adminOnly || isAdmin) &&
        !(item.hiddenForRoles?.includes(role))
    ).map(({ key, href, label }) => ({ key, href, label }));

    if (items.length > 0) {
      sections.push({
        key: sectionKey,
        title: SECTION_TITLES[sectionKey],
        items,
      });
    }
  }

  return sections;
}
