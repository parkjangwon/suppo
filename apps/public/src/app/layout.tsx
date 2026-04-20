import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { getPublicCopy } from "@suppo/shared/i18n/public-copy";
import { getPublicAppUrl } from "@suppo/shared/utils/app-urls";

import "./globals.css";

const baseUrl = getPublicAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Suppo Helpdesk - 고객 지원 센터",
    template: "%s | Suppo Helpdesk"
  },
  description: "고객 티켓 관리와 지식베이스를 한 곳에서. 5분 만에 설정하고 바로 시작하세요.",
  keywords: ["helpdesk", "customer support", "티켓 관리", "고객 지원", "지식베이스"],
  authors: [{ name: "Suppo" }],
  creator: "Suppo",
  publisher: "Suppo",
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
    siteName: "Suppo Helpdesk",
    title: "Suppo Helpdesk - 고객 지원 센터",
    description: "고객 티켓 관리와 지식베이스를 한 곳에서. 5분 만에 설정하고 바로 시작하세요.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Suppo Helpdesk"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Suppo Helpdesk - 고객 지원 센터",
    description: "고객 티켓 관리와 지식베이스를 한 곳에서.",
    images: ["/og-image.png"]
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION
  }
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = (await cookies()).get("suppo-locale")?.value;
  const copy = getPublicCopy(locale);

  return (
    <html lang={copy.locale} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
