"use client";

import * as React from "react";
import Link from "next/link";
import { useBranding } from "@/lib/branding/context";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const branding = useBranding();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header 
        className="bg-white border-b border-slate-200 sticky top-0 z-10"
        style={{ 
          borderBottomColor: branding.primaryColor 
        }}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logoUrl ? (
              <img 
                src={branding.logoUrl} 
                alt={branding.companyName}
                className="h-8 w-auto"
              />
            ) : null}
            <span 
              className="font-bold text-xl"
              style={{ color: branding.primaryColor }}
            >
              {branding.companyName} {branding.appTitle}
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">홈</Link>
            <Link href="/ticket/new" className="text-sm font-medium text-slate-600 hover:text-slate-900">티켓 작성</Link>
            <Link href="/ticket/lookup" className="text-sm font-medium text-slate-600 hover:text-slate-900">티켓 조회</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {branding.footerPhone && (
              <div>
                <h4 className="font-medium text-slate-900 mb-2">전화</h4>
                <a 
                  href={`tel:${branding.footerPhone}`}
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  {branding.footerPhone}
                </a>
              </div>
            )}
            {branding.footerEmail && (
              <div>
                <h4 className="font-medium text-slate-900 mb-2">이메일</h4>
                <a 
                  href={`mailto:${branding.footerEmail}`}
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  {branding.footerEmail}
                </a>
              </div>
            )}
            {branding.footerHomepage && (
              <div>
                <h4 className="font-medium text-slate-900 mb-2">홈페이지</h4>
                <a 
                  href={branding.footerHomepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  {branding.footerHomepage.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            {branding.footerAddress && (
              <div>
                <h4 className="font-medium text-slate-900 mb-2">주소</h4>
                <p className="text-sm text-slate-600">
                  {branding.footerAddress}
                </p>
              </div>
            )}
          </div>
          
          <div className="border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
            {branding.footerText}
            {branding.showPoweredBy && (
              <span className="ml-2">Powered by Crinity</span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
