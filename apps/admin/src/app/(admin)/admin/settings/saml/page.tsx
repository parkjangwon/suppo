import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { Card, CardContent, CardHeader, CardTitle } from "@crinity/ui/components/ui/card";
import { SAMLProviderForm } from "@/components/admin/saml-provider-form";

export const metadata: Metadata = {
  title: "SAML SSO 설정 | Crinity",
};

export default async function SAMLSettingsPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  const providers = await prisma.sAMLProvider.findMany({
    orderBy: { createdAt: "desc" },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">SAML SSO 설정</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>엔터프라이즈 SAML 인증 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            기업 고객을 위한 SAML 2.0 Single Sign-On을 설정합니다.
            각 도메인별로 별도의 IdP를 구성할 수 있습니다.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-2">설정 가이드</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>새 SAML Provider를 추가하고 회사 도메인을 입력하세요</li>
              <li>SP Entity ID와 ACS URL을 IdP 관리자에게 제공하세요</li>
              <li>IdP에서 제공하는 메타데이터 정보를 입력하세요</li>
              <li>연동 테스트를 진행하세요</li>
            </ol>
          </div>
          <SAMLProviderForm providers={providers} baseUrl={baseUrl} />
        </CardContent>
      </Card>
    </div>
  );
}
