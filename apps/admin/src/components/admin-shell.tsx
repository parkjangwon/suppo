"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@crinity/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@crinity/ui/components/ui/dialog";
import { cn } from "@crinity/shared/utils";
import { getBackofficeRoleLabel, type BackofficeRole } from "@crinity/shared/auth/config";
import {
  BarChart3,
  BookOpen,
  Brain,
  Calendar,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Check,
  Clock,
  ClipboardList,
  FileCode,
  FileText,
  GitBranch,
  Globe,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Palette,
  Settings,
  Shield,
  Users,
  Users2,
  Workflow,
  X,
} from "lucide-react";
import { useBranding } from "@crinity/shared/branding/context";
import { useAdminCopy } from "@crinity/shared/i18n/admin-context";
import { type AdminNavItemKey, getAdminNavSections } from "@/lib/navigation/admin-nav";
import { copyText } from "@/lib/i18n/admin-copy-utils";

const NAV_ICONS: Record<AdminNavItemKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  analytics: BarChart3,
  knowledge: BookOpen,
  chats: MessageCircle,
  "chat-settings": MessageCircle,
  "integration-settings": Workflow,
  tickets: Inbox,
  agents: Users,
  calendar: Calendar,
  teams: Users2,
  customers: Users,
  "request-types": ClipboardList,
  saml: Shield,
  git: GitBranch,
  email: Mail,
  branding: Palette,
  "business-hours": Clock,
  operations: Workflow,
  llm: Brain,
  system: Settings,
  templates: FileCode,
  "audit-logs": FileText,
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const branding = useBranding();
  const copy = useAdminCopy();
  const { data: session, status } = useSession();
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);
  const [currentLocale, setCurrentLocale] = React.useState<"ko" | "en">(copy.locale);
  const isLoginPage = pathname === "/admin/login";
  const isPasswordChangePage = pathname === "/admin/change-password";

  const handleLocaleChange = async (newLocale: "ko" | "en") => {
    setCurrentLocale(newLocale);
    await fetch("/api/admin/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: newLocale }),
    });
    window.location.reload();
  };

  if (isLoginPage || isPasswordChangePage) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {children}
      </div>
    );
  }

  const isLoading = status === "loading";
  const userName = session?.user?.name;
  const userRole = session?.user?.role as BackofficeRole | undefined;
  const navSections = getAdminNavSections(userRole, copy);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="relative hidden h-screen sticky top-0 md:flex md:w-56 xl:w-60 shrink-0 flex-col border-r border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(249,250,251,0.98)_62%,rgba(244,246,248,0.98)_100%)]">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-[3px]"
          style={{ background: `linear-gradient(180deg, ${branding.primaryColor}55 0%, ${branding.primaryColor}12 100%)` }}
        />
        <SidebarBrand adminPanelTitle={branding.adminPanelTitle} />
        <SidebarNavigation sections={navSections} pathname={pathname} className="flex-1 overflow-y-auto px-3 py-4" />
        <div className="border-t border-border/70 bg-background/70 px-3 py-3 backdrop-blur">
          <SidebarLocaleSwitch
            currentLocale={currentLocale}
            onToggle={() => handleLocaleChange(currentLocale === "ko" ? "en" : "ko")}
          />
          <SidebarUserSummary
            isLoading={isLoading}
            userName={userName}
            userRole={userRole}
            className="mt-3"
          />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 md:hidden">
          <span className="font-bold text-lg tracking-tight">{branding.adminPanelTitle}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label={copyText(copy, "commonOpenMenu", "메뉴 열기")}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>
        <main className="flex-1 p-6 overflow-auto bg-background">
          {children}
        </main>
      </div>

      <Dialog open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
        <DialogContent
          showCloseButton={false}
          className="left-0 top-0 h-screen max-w-[85vw] w-[21rem] translate-x-0 translate-y-0 rounded-none border-r p-0"
        >
          <DialogHeader className="flex-row items-center justify-between border-b px-4 py-4">
            <DialogTitle className="text-base font-semibold">
              {branding.adminPanelTitle}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileNavOpen(false)}
              aria-label={copyText(copy, "commonCloseMenu", "메뉴 닫기")}
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>
          <SidebarNavigation
            sections={navSections}
            pathname={pathname}
            onNavigate={() => setIsMobileNavOpen(false)}
            className="flex-1 overflow-y-auto px-3 py-4"
          />
          <div className="border-t border-border/70 bg-background/90 px-4 py-4">
            <SidebarLocaleSwitch
              currentLocale={currentLocale}
              onToggle={() => handleLocaleChange(currentLocale === "ko" ? "en" : "ko")}
            />
            <SidebarUserSummary
              isLoading={isLoading}
              userName={userName}
              userRole={userRole}
              className="mt-3"
              onSignOut={() => {
                setIsMobileNavOpen(false);
                void signOut({ callbackUrl: "/admin/login" });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SidebarBrand({ adminPanelTitle }: { adminPanelTitle: string }) {
  return (
    <div className="border-b border-border/70 px-4 py-4">
      <Link
        href="/admin/dashboard"
        className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:text-primary"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/10">
          {adminPanelTitle.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold tracking-tight text-foreground">
            {adminPanelTitle}
          </div>
          <div className="text-[11px] font-medium text-muted-foreground">Console</div>
        </div>
      </Link>
    </div>
  );
}

function SidebarNavigation({
  sections,
  pathname,
  onNavigate,
  className,
}: {
  sections: ReturnType<typeof getAdminNavSections>;
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const storageKey = "crinity-admin-nav-collapsed";
  const [collapsedSections, setCollapsedSections] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      setCollapsedSections(parsed);
    } catch {
      // Ignore malformed localStorage values.
    }
  }, []);

  React.useEffect(() => {
    const activeSection = sections.find((section) =>
      section.items.some((item) => pathname.startsWith(item.href))
    );
    if (!activeSection?.title) {
      return;
    }

    setCollapsedSections((prev) => {
      if (!prev[activeSection.key]) {
        return prev;
      }

      const next = { ...prev, [activeSection.key]: false };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Ignore localStorage write failures.
      }
      return next;
    });
  }, [pathname, sections]);

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections((prev) => {
      const next = {
        ...prev,
        [sectionKey]: !prev[sectionKey],
      };

      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Ignore localStorage write failures.
      }

      return next;
    });
  };

  return (
    <nav className={cn("space-y-2", className)}>
      {sections.map((section, index) => (
        <div
          key={section.key}
          className={cn(
            "rounded-[1.1rem] border border-border/60 bg-background/75 p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_rgba(15,23,42,0.03)] backdrop-blur",
            index === 0 && "bg-transparent border-transparent shadow-none p-0"
          )}
        >
          {section.title ? (
            <button
              type="button"
              onClick={() => toggleSection(section.key)}
              className="mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left transition-colors hover:bg-accent/40"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/85">
                {section.title}
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-border/70 to-transparent" />
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {section.items.length}
              </span>
              {collapsedSections[section.key] ? (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          ) : null}
          <div className={cn("space-y-1", section.title && collapsedSections[section.key] && "hidden")}>
            {section.items.map((item) => (
              <NavLink
                key={item.key}
                href={item.href}
                icon={NAV_ICONS[item.key]}
                isActive={pathname.startsWith(item.href)}
                onNavigate={onNavigate}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarLocaleSwitch({
  currentLocale,
  onToggle,
}: {
  currentLocale: "ko" | "en";
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-2xl border border-border/60 bg-background px-3 py-2 text-left shadow-sm transition-colors hover:border-primary/20 hover:bg-accent/50"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground">
        <Globe className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Language
        </div>
        <div className="text-sm font-medium text-foreground">
          {currentLocale === "ko" ? "한국어 → English" : "English → 한국어"}
        </div>
      </div>
      <Check className="h-4 w-4 text-primary" />
    </button>
  );
}

function SidebarUserSummary({
  isLoading,
  userName,
  userRole,
  className,
  onSignOut,
}: {
  isLoading: boolean;
  userName?: string | null;
  userRole?: string;
  className?: string;
  onSignOut?: () => void;
}) {
  const copy = useAdminCopy();

  return (
    <div className={cn("rounded-2xl border border-border/60 bg-background px-3 py-2.5 shadow-sm", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            {isLoading ? "⋯" : userName?.[0] || "?"}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">
              {isLoading ? copy.commonLoading : userName || copyText(copy, "commonUnknown", "알 수 없음")}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {userRole ? getBackofficeRoleLabel(userRole as BackofficeRole) : copy.agentsRoleAgent}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onSignOut ?? (() => signOut({ callbackUrl: "/admin/login" }))}
          title={copyText(copy, "commonLogout", "로그아웃")}
          disabled={isLoading}
          className="h-9 w-9 shrink-0 rounded-xl border-border/60 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function NavLink({
  href,
  children,
  icon: Icon,
  isActive,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
        isActive
          ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(241,245,249,0.96)_100%)] text-accent-foreground shadow-sm ring-1 ring-border/60"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "absolute left-1.5 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full transition-all",
          isActive ? "bg-primary/75 shadow-[0_0_0_1px_rgba(15,23,42,0.06)]" : "bg-transparent"
        )}
      />
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          isActive
            ? "bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
            : "bg-muted/60 text-muted-foreground group-hover:bg-background group-hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <span className="min-w-0 flex-1 truncate leading-tight tracking-[-0.01em]">{children}</span>
      {isActive ? <span className="h-2 w-2 rounded-full bg-primary/70" /> : null}
    </Link>
  );
}
