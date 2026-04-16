"use client";

import { createContext, useContext, ReactNode } from "react";

export interface SystemBranding {
  companyName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  homepageTitle: string;
  homepageSubtitle: string;
  adminPanelTitle: string;
  appTitle: string;
  welcomeMessage: string;
  footerText: string;
  footerPhone?: string;
  footerEmail?: string;
  footerHomepage?: string;
  footerAddress?: string;
  showPoweredBy: boolean;
  knowledgeEnabled: boolean;
  customCss?: string;
}

const defaultBranding: SystemBranding = {
  companyName: "Crinity",
  logoUrl: undefined,
  faviconUrl: undefined,
  primaryColor: "#0f172a",
  secondaryColor: "#3b82f6",
  homepageTitle: "Crinity Helpdesk",
  homepageSubtitle: "민원 티켓을 생성하고 상태를 바로 조회할 수 있습니다.",
  adminPanelTitle: "Crinity Admin",
  appTitle: "고객 지원 센터",
  welcomeMessage: "무엇을 도와드릴까요?",
  footerText: "© 2026 Crinity. All rights reserved.",
  showPoweredBy: true,
  knowledgeEnabled: true,
  customCss: undefined,
};

const BrandingContext = createContext<SystemBranding>(defaultBranding);

export function BrandingProvider({
  children,
  branding
}: {
  children: ReactNode;
  branding?: Partial<SystemBranding>;
}) {
  const value = { ...defaultBranding, ...branding };
  
  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
