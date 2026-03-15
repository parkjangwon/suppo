"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogOut, Users, FileText, LayoutDashboard, Inbox, Users2, GitBranch, Mail, Palette, ClipboardList, Shield, Brain, Calendar } from "lucide-react";
import { useBranding } from "@/lib/branding/context";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const branding = useBranding();
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link 
            href="/admin/dashboard" 
            className="font-bold text-lg tracking-tight hover:text-primary transition-colors"
          >
            {branding.adminPanelTitle}
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavLink href="/admin/dashboard">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span>대시보드</span>
            </div>
          </NavLink>
          <NavLink href="/admin/tickets">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              <span>티켓 목록</span>
            </div>
          </NavLink>
          <NavLink href="/admin/teams">
            <div className="flex items-center gap-2">
              <Users2 className="h-4 w-4" />
              <span>팀 관리</span>
            </div>
          </NavLink>
          <NavLink href="/admin/agents">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>상담원 관리</span>
            </div>
          </NavLink>
          <NavLink href="/admin/calendar">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>일정 관리</span>
            </div>
          </NavLink>
          <NavLink href="/admin/customers">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>고객 관리</span>
            </div>
          </NavLink>

          <div className="pt-4 mt-4 border-t border-border">
            <p className="px-3 text-xs font-semibold text-muted-foreground mb-2">설정</p>
            <NavLink href="/admin/settings/request-types">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                <span>문의 유형</span>
              </div>
            </NavLink>
            <NavLink href="/admin/settings/saml">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>SAML SSO</span>
              </div>
            </NavLink>
            <NavLink href="/admin/settings/git">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <span>Git 연동</span>
              </div>
            </NavLink>
            <NavLink href="/admin/settings/email">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>이메일 연동</span>
              </div>
            </NavLink>
            <NavLink href="/admin/settings/branding">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span>브랜딩</span>
              </div>
            </NavLink>
            <NavLink href="/admin/settings/llm">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span>AI 연동</span>
              </div>
            </NavLink>
          </div>

          <div className="pt-4 mt-4 border-t border-border">
            <p className="px-3 text-xs font-semibold text-muted-foreground mb-2">로그</p>
            <NavLink href="/admin/audit-logs">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>감사 로그</span>
              </div>
            </NavLink>
          </div>
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                A
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Admin</span>
                <span className="text-xs text-muted-foreground">관리자</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: "/admin/login" })}
                title="로그아웃"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 md:hidden">
          <span className="font-bold text-lg tracking-tight">{branding.adminPanelTitle}</span>
          <button className="p-2 text-muted-foreground hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="12" y2="12"/>
              <line x1="4" x2="20" y1="6" y2="6"/>
              <line x1="4" x2="20" y1="18" y2="18"/>
            </svg>
          </button>
        </header>
        <main className="flex-1 p-6 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);
  
  return (
    <Link 
      href={href} 
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
