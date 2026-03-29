import { redirect } from "next/navigation";

import { prisma } from "@crinity/db";

import { auth } from "@/auth";
import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";
import { ApiKeyManager } from "@/components/admin/api-key-manager";
import { IntegrationGuideCard } from "@/components/admin/integration-guide-card";
import { WebhookEndpointManager } from "@/components/admin/webhook-endpoint-manager";

export default async function IntegrationSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <AdminOnlyPageState
        title="연동 설정"
        description="외부 API 키와 Webhook 설정은 관리자만 변경할 수 있습니다."
      />
    );
  }

  await prisma.chatWidgetSettings.findUnique({ where: { id: "default" } }).catch(() => null);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">연동 설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          공개 API 키와 outbound webhook을 설정하고 외부 시스템 연동을 관리합니다.
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
