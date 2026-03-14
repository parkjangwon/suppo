"use client";

import * as React from "react";
import Link from "next/link";
import { useBranding } from "@/lib/branding/context";
import { Phone, Mail, Globe, MapPin } from "lucide-react";
import { formatPhoneNumber } from "@/lib/utils/phone-format";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const branding = useBranding();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <header 
        className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50"
        style={{ borderColor: `${branding.primaryColor}20` }}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.companyName}
                className="h-8 w-auto"
              />
            ) : (
              <div 
                className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: branding.primaryColor }}
              >
                {branding.companyName.charAt(0)}
              </div>
            )}
            <span
              className="font-bold text-xl"
              style={{ color: branding.primaryColor }}
            >
              {branding.companyName}
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <NavLink href="/ticket/new">티켓 작성</NavLink>
            <NavLink href="/ticket/lookup">티켓 조회</NavLink>
          </nav>
        </div>
      </header>
      
      <main className="flex-1">
        {children}
      </main>
      
      <footer className="bg-slate-900 text-slate-300">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                {branding.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt={branding.companyName}
                    className="h-8 w-auto brightness-0 invert"
                  />
                ) : (
                  <div 
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: branding.secondaryColor }}
                  >
                    {branding.companyName.charAt(0)}
                  </div>
                )}
                <span className="font-bold text-xl text-white">
                  {branding.companyName}
                </span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                {branding.welcomeMessage}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">고객 지원</h4>
              <ul className="space-y-3">
                {branding.footerPhone && (
                  <li>
                    <a 
                      href={`tel:${branding.footerPhone.replace(/-/g, '')}`}
                      className="flex items-center gap-2 text-sm hover:text-white transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      {formatPhoneNumber(branding.footerPhone)}
                    </a>
                  </li>
                )}
                {branding.footerEmail && (
                  <li>
                    <a 
                      href={`mailto:${branding.footerEmail}`}
                      className="flex items-center gap-2 text-sm hover:text-white transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      {branding.footerEmail}
                    </a>
                  </li>
                )}
                {branding.footerHomepage && (
                  <li>
                    <a 
                      href={branding.footerHomepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm hover:text-white transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                      홈페이지
                    </a>
                  </li>
                )}
                {branding.footerAddress && (
                  <li className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {branding.footerAddress}
                  </li>
                )}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">바로가기</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="text-sm hover:text-white transition-colors">
                    홈
                  </Link>
                </li>
                <li>
                  <Link href="/ticket/new" className="text-sm hover:text-white transition-colors">
                    티켓 작성
                  </Link>
                </li>
                <li>
                  <Link href="/ticket/lookup" className="text-sm hover:text-white transition-colors">
                    티켓 조회
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500">
              {branding.footerText}
            </p>
            {branding.showPoweredBy && (
              <p className="text-xs text-slate-600">
                Powered by <span className="text-slate-500">Crinity</span>
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
    >
      {children}
    </Link>
  );
}
