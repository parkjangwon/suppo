"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
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
          <NavLink href="/admin/dashboard">대시보드</NavLink>
          <NavLink href="/admin/tickets">티켓 목록</NavLink>
          <NavLink href="/admin/agents">상담원 관리</NavLink>
          <NavLink href="/admin/teams">팀 관리</NavLink>
          
          <div className="pt-4 mt-4 border-t border-border">
            <p className="px-3 text-xs font-semibold text-muted-foreground mb-2">설정</p>
            <NavLink href="/admin/settings/request-types">문의 유형</NavLink>
            <NavLink href="/admin/settings/saml">SAML SSO</NavLink>
            <NavLink href="/admin/settings/git">Git 연동</NavLink>
            <NavLink href="/admin/settings/branding">브랜딩</NavLink>
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
              <ThemeToggle />
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
