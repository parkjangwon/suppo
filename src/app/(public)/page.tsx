"use client";

import Link from "next/link";
import { useBranding } from "@/lib/branding/context";
import { ArrowRight, FileText, Search } from "lucide-react";

export default function PublicHomePage() {
  const branding = useBranding();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-white" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
              style={{ color: branding.primaryColor }}
            >
              {branding.homepageTitle}
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed">
              {branding.homepageSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/ticket/new"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-medium text-white rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5"
                style={{ backgroundColor: branding.primaryColor }}
              >
                <FileText className="h-5 w-5" />
                티켓 작성
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/ticket/lookup"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-medium rounded-xl border-2 transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{ 
                  borderColor: branding.secondaryColor,
                  color: branding.secondaryColor 
                }}
              >
                <Search className="h-5 w-5" />
                티켓 조회
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureCard 
              icon={<FileText className="h-6 w-6" />}
              title="간편한 문의"
              description="몇 가지 정볼만 입력하면 빠르게 문의를 등록할 수 있습니다."
              color={branding.primaryColor}
            />
            <FeatureCard 
              icon={<Search className="h-6 w-6" />}
              title="실시간 조회"
              description="티켓 번호로 언제 어디서나 문의 상태를 확인하세요."
              color={branding.secondaryColor}
            />
            <FeatureCard 
              icon={<ArrowRight className="h-6 w-6" />}
              title="빠른 답변"
              description="전문 상담원이 신속하게 답변해 드립니다."
              color={branding.primaryColor}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description, 
  color 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  color: string;
}) {
  return (
    <div className="text-center p-6 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center text-white mx-auto mb-4"
        style={{ backgroundColor: color }}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  );
}
