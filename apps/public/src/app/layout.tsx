import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { getPublicCopy } from "@crinity/shared/i18n/public-copy";

import "./globals.css";

const baseUrl = process.env.PUBLIC_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Crinity Helpdesk - 고객 지원 센터",
    template: "%s | Crinity Helpdesk"
  },
  description: "고객 티켓 관리, 지식베이스, 실시간 채팅을 한 곳에서. 5분 만에 설정하고 바로 시작하세요.",
  keywords: ["helpdesk", "customer support", "티켓 관리", "고객 지원", "지식베이스"],
  authors: [{ name: "Crinity" }],
  creator: "Crinity",
  publisher: "Crinity",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    alternateLocale: "en_US",
    url: baseUrl,
    siteName: "Crinity Helpdesk",
    title: "Crinity Helpdesk - 고객 지원 센터",
    description: "고객 티켓 관리, 지식베이스, 실시간 채팅을 한 곳에서. 5분 만에 설정하고 바로 시작하세요.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Crinity Helpdesk"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Crinity Helpdesk - 고객 지원 센터",
    description: "고객 티켓 관리, 지식베이스, 실시간 채팅을 한 곳에서.",
    images: ["/og-image.png"]
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION
  }
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = (await cookies()).get("crinity-locale")?.value;
  const copy = getPublicCopy(locale);

  return (
    <html lang={copy.locale} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
