import type { BackofficeRole } from "@crinity/shared/auth/config";
import type { AdminCopy } from "@crinity/shared/i18n/admin-copy";
import { copyText } from "@/lib/i18n/admin-copy-utils";

export type AdminNavItemKey =
  | "dashboard"
  | "analytics"
  | "knowledge"
  | "chats"
  | "chat-settings"
  | "integration-settings"
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

const NAV_ITEMS: Array<{
  key: AdminNavItemKey;
  href: string;
  section: AdminNavSectionKey;
  adminOnly?: boolean;
  hiddenForRoles?: BackofficeRole[];
}> = [
  { key: "dashboard", href: "/admin/dashboard", section: "main" },
  { key: "analytics", href: "/admin/analytics", section: "main" },
  { key: "knowledge", href: "/admin/knowledge", section: "main" },
  { key: "chats", href: "/admin/chats", section: "main" },
  { key: "tickets", href: "/admin/tickets", section: "main" },
  { key: "agents", href: "/admin/agents", section: "main", hiddenForRoles: ["VIEWER"] },
  { key: "calendar", href: "/admin/calendar", section: "main", hiddenForRoles: ["VIEWER"] },
  { key: "teams", href: "/admin/teams", section: "main", adminOnly: true },
  { key: "customers", href: "/admin/customers", section: "main", adminOnly: true },
  { key: "request-types", href: "/admin/settings/request-types", section: "settings", adminOnly: true },
  { key: "saml", href: "/admin/settings/saml", section: "settings", adminOnly: true },
  { key: "git", href: "/admin/settings/git", section: "settings", adminOnly: true },
  { key: "email", href: "/admin/settings/email", section: "settings", adminOnly: true },
  { key: "integration-settings", href: "/admin/settings/integrations", section: "settings", adminOnly: true },
  { key: "chat-settings", href: "/admin/settings/chat", section: "settings", adminOnly: true },
  { key: "branding", href: "/admin/settings/branding", section: "settings", adminOnly: true },
  { key: "business-hours", href: "/admin/settings/business-hours", section: "settings", adminOnly: true },
  { key: "operations", href: "/admin/settings/operations", section: "settings", adminOnly: true },
  { key: "llm", href: "/admin/settings/llm", section: "settings", adminOnly: true },
  { key: "system", href: "/admin/settings/system", section: "settings", adminOnly: true },
  { key: "templates", href: "/admin/templates", section: "tools", hiddenForRoles: ["VIEWER"] },
  { key: "audit-logs", href: "/admin/audit-logs", section: "logs", adminOnly: true },
];

function getNavLabel(key: AdminNavItemKey, copy?: AdminCopy): string {
  if (!copy) {
    const fallbacks: Record<AdminNavItemKey, string> = {
      dashboard: "대시보드",
      analytics: "분석 및 리포트",
      knowledge: "지식",
      chats: "실시간 채팅",
      tickets: "티켓 목록",
      agents: "상담원 관리",
      calendar: "일정 관리",
      teams: "팀 관리",
      customers: "고객 관리",
      "request-types": "문의 유형",
      saml: "SAML SSO",
      git: "Git 연동",
      email: "이메일 연동",
      "integration-settings": "연동 설정",
      "chat-settings": "채팅 설정",
      branding: "브랜딩",
      "business-hours": "영업시간",
      operations: "업무 규칙",
      llm: "AI 연동",
      system: "시스템",
      templates: "응답 템플릿",
      "audit-logs": "감사 로그",
    };
    return fallbacks[key];
  }

  const map: Record<AdminNavItemKey, string> = {
    dashboard: copy.navDashboard,
    analytics: copyText(copy, "navAnalytics", "분석 및 리포트"),
    knowledge: copy.navKnowledge,
    chats: copyText(copy, "navChats", "실시간 채팅"),
    tickets: copy.navTickets,
    agents: copy.navAgents,
    calendar: copy.navCalendar,
    teams: copy.navTeams,
    customers: copy.navCustomers,
    "request-types": copy.settingsRequestTypes,
    saml: copy.settingsSAML,
    git: copy.settingsGit,
    email: copy.settingsEmail,
    "integration-settings": copyText(copy, "settingsIntegrations", "연동 설정"),
    "chat-settings": copyText(copy, "settingsChatSettings", "채팅 설정"),
    branding: copy.settingsBranding,
    "business-hours": copy.settingsBusinessHours,
    operations: copy.settingsOperations,
    llm: copy.settingsLLM,
    system: copy.settingsSystem,
    templates: copy.navTemplates,
    "audit-logs": copy.navAuditLogs,
  };

  return map[key];
}

function getSectionTitle(key: AdminNavSectionKey, copy?: AdminCopy): string | null {
  if (key === "main") return null;

  if (!copy) {
    const fallbacks: Record<Exclude<AdminNavSectionKey, "main">, string> = {
      settings: "설정",
      tools: "도구",
      logs: "로그",
    };
    return fallbacks[key];
  }

  const map: Record<Exclude<AdminNavSectionKey, "main">, string> = {
    settings: copyText(copy, "sectionSettings", "설정"),
    tools: copyText(copy, "sectionTools", "도구"),
    logs: copyText(copy, "sectionLogs", "로그"),
  };

  return map[key];
}

export function getAdminNavSections(
  roleInput: boolean | BackofficeRole | undefined,
  copy?: AdminCopy
): AdminNavSection[] {
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
    ).map(({ key, href }) => ({ key, href, label: getNavLabel(key, copy) }));

    if (items.length > 0) {
      sections.push({
        key: sectionKey,
        title: getSectionTitle(sectionKey, copy),
        items,
      });
    }
  }

  return sections;
}
