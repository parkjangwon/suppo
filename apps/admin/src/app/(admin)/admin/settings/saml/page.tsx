import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { Card, CardContent, CardHeader, CardTitle } from "@suppo/ui/components/ui/card";
import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";
import { SAMLProviderForm } from "@/components/admin/saml-provider-form";
import { getAdminCopy } from "@suppo/shared/i18n/admin-copy";
import { createSamlMetadataBaseUrl } from "@suppo/shared/utils/app-urls";
import { copyText } from "@/lib/i18n/admin-copy-utils";

export const metadata: Metadata = {
  title: "SAML SSO 설정 | Suppo",
};

export default async function SAMLSettingsPage() {
  const copy = getAdminCopy((await cookies()).get("suppo-admin-locale")?.value);
  const t = (key: string, ko: string, en?: string) =>
    copyText(copy, key, copy.locale === "en" ? (en ?? ko) : ko);
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <AdminOnlyPageState
        title={copy.settingsSAML}
        description={t("samlAdminOnlyDesc", "조직 인증 설정은 관리자만 변경할 수 있습니다.", "Only admins can change organization authentication settings.")}
      />
    );
  }

  const providers = await prisma.sAMLProvider.findMany({
    orderBy: { createdAt: "desc" },
  });

  const baseUrl = createSamlMetadataBaseUrl();

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">{copy.settingsSAML}</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{copy.settingsSAML}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            {t("samlPageDescription", "기업 고객을 위한 SAML 2.0 Single Sign-On을 설정합니다. 각 도메인별로 별도의 IdP를 구성할 수 있습니다.", "Configure SAML 2.0 single sign-on for enterprise customers. You can configure a separate IdP for each domain.")}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-2">{t("samlGuideTitle", "설정 가이드", "Setup guide")}</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>{t("samlGuideStep1", "새 SAML Provider를 추가하고 회사 도메인을 입력하세요", "Add a new SAML provider and enter the company domain.")}</li>
              <li>{t("samlGuideStep2", "SP Entity ID와 ACS URL을 IdP 관리자에게 제공하세요", "Provide the SP Entity ID and ACS URL to the IdP administrator.")}</li>
              <li>{t("samlGuideStep3", "IdP에서 제공하는 메타데이터 정보를 입력하세요", "Enter the metadata values provided by the IdP.")}</li>
              <li>{t("samlGuideStep4", "연동 테스트를 진행하세요", "Run an integration test.")}</li>
            </ol>
          </div>
          <SAMLProviderForm providers={providers} baseUrl={baseUrl} />
        </CardContent>
      </Card>
    </div>
  );
}
