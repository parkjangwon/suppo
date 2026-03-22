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
import {
  BarChart3,
  BookOpen,
  Brain,
  Calendar,
  ClipboardList,
  FileCode,
  FileText,
  GitBranch,
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
  X,
} from "lucide-react";
import { useBranding } from "@crinity/shared/branding/context";
import { type AdminNavItemKey, getAdminNavSections } from "@/lib/navigation/admin-nav";

const NAV_ICONS: Record<AdminNavItemKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  analytics: BarChart3,
  knowledge: BookOpen,
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
  llm: Brain,
  system: Settings,
  templates: FileCode,
  "audit-logs": FileText,
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const branding = useBranding();
  const { data: session, status } = useSession();
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);
  const isAdmin = session?.user?.role === "ADMIN";
  const isLoginPage = pathname === "/admin/login";
  const isPasswordChangePage = pathname === "/admin/change-password";

  if (isLoginPage || isPasswordChangePage) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {children}
      </div>
    );
  }

  const isLoading = status === "loading";
  const userName = session?.user?.name;
  const userRole = session?.user?.role;
  const navSections = getAdminNavSections(isAdmin);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col h-screen sticky top-0">
        <SidebarBrand adminPanelTitle={branding.adminPanelTitle} />
        <SidebarNavigation sections={navSections} pathname={pathname} />
        <SidebarUserSummary
          isLoading={isLoading}
          userName={userName}
          userRole={userRole}
        />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 md:hidden">
          <span className="font-bold text-lg tracking-tight">{branding.adminPanelTitle}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="메뉴 열기"
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
              aria-label="메뉴 닫기"
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
  return (
    <div className={cn("p-4 border-t border-border", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {isLoading ? "⋯" : userName?.[0] || "?"}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-medium truncate">
              {isLoading ? "로딩 중..." : userName || "알 수 없음"}
            </span>
            <span className="text-xs text-muted-foreground">
              {userRole === "ADMIN" ? "관리자" : "상담원"}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSignOut ?? (() => signOut({ callbackUrl: "/admin/login" }))}
          title="로그아웃"
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
