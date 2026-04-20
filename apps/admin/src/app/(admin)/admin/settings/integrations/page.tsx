import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";
import { ApiKeyManager } from "@/components/admin/api-key-manager";
import { IntegrationGuideCard } from "@/components/admin/integration-guide-card";
import { WebhookEndpointManager } from "@/components/admin/webhook-endpoint-manager";
import { getAdminCopy } from "@suppo/shared/i18n/admin-copy";
import { copyText } from "@/lib/i18n/admin-copy-utils";

export default async function IntegrationSettingsPage() {
  const copy = getAdminCopy((await cookies()).get("suppo-admin-locale")?.value) as unknown as Record<string, string>;
  const locale = copy.locale === "en" ? "en" : "ko";
  const t = (key: string, ko: string, en?: string) =>
    copyText(copy as never, key, locale === "en" ? (en ?? ko) : ko);
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <AdminOnlyPageState
        title={copy.settingsIntegrations}
        description={t("integrationsAdminOnlyDesc", "외부 API 키와 Webhook 설정은 관리자만 변경할 수 있습니다.", "Only admins can change external API keys and webhook settings.")}
      />
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{copy.settingsIntegrations}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("integrationsPageDescription", "공개 API 키와 outbound webhook을 설정하고 외부 시스템 연동을 관리합니다.", "Configure public API keys and outbound webhooks, and manage external system integrations.")}
        </p>
      </div>

      <IntegrationGuideCard />

      <div className="grid gap-4 xl:grid-cols-2">
        <ApiKeyManager />
        <WebhookEndpointManager />
      </div>
    </div>
  );
}
