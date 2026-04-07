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
  const isAdmin = session?.user?.role === "ADMIN";
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
      <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col h-screen sticky top-0">
        <SidebarBrand adminPanelTitle={branding.adminPanelTitle} />
        <SidebarNavigation sections={navSections} pathname={pathname} />
        <div className="flex-1 flex flex-col">
          <SidebarUserSummary
            isLoading={isLoading}
            userName={userName}
            userRole={userRole}
          />
          <div className="px-4 pb-4 border-t">
            <button
              onClick={() => handleLocaleChange(currentLocale === "ko" ? "en" : "ko")}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
            >
              <Globe className="h-4 w-4" />
              <span className="ml-2">{currentLocale === "ko" ? "English" : "한국어"}</span>
              <Check className="h-4 w-4 ml-auto" />
            </button>
          </div>
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
          className="left-0 top-0 h-screen max-w-[85vw] w-80 translate-x-0 translate-y-0 rounded-none border-r p-0"
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
            className="flex-1 overflow-y-auto px-4 py-4"
          />
          <SidebarUserSummary
            isLoading={isLoading}
            userName={userName}
            userRole={userRole}
            className="border-t px-4 py-4"
            onSignOut={() => {
              setIsMobileNavOpen(false);
              void signOut({ callbackUrl: "/admin/login" });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SidebarBrand({ adminPanelTitle }: { adminPanelTitle: string }) {
  return (
    <div className="h-16 flex items-center px-6 border-b border-border">
      <Link
        href="/admin/dashboard"
        className="font-bold text-lg tracking-tight hover:text-primary transition-colors"
      >
        {adminPanelTitle}
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
  return (
    <nav className={cn("space-y-1", className)}>
      {sections.map((section, index) => (
        <div
          key={section.key}
          className={cn(index > 0 && "pt-4 mt-4 border-t border-border")}
        >
          {section.title ? (
            <p className="px-3 text-xs font-semibold text-muted-foreground mb-2">
              {section.title}
            </p>
          ) : null}
          {section.items.map((item) => (
            <NavLink
              key={item.key}
              href={item.href}
              isActive={pathname.startsWith(item.href)}
              onNavigate={onNavigate}
            >
              <div className="flex items-center gap-2">
                {React.createElement(NAV_ICONS[item.key], { className: "h-4 w-4" })}
                <span>{item.label}</span>
              </div>
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
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
    <div className={cn("p-4 border-t border-border", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {isLoading ? "⋯" : userName?.[0] || "?"}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-medium truncate">
              {isLoading ? copy.commonLoading : userName || copyText(copy, "commonUnknown", "알 수 없음")}
            </span>
            <span className="text-xs text-muted-foreground">
              {userRole ? getBackofficeRoleLabel(userRole as BackofficeRole) : copy.agentsRoleAgent}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSignOut ?? (() => signOut({ callbackUrl: "/admin/login" }))}
          title={copyText(copy, "commonLogout", "로그아웃")}
          disabled={isLoading}
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
  isActive,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "block px-3 py-2 text-sm font-medium rounded-md transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      {children}
    </Link>
  );
}
