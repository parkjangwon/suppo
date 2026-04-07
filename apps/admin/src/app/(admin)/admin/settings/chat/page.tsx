import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";
import { ChatWidgetProfileManager } from "@/components/admin/chat-widget-profile-manager";
import { ChatWidgetSettingsManager } from "@/components/admin/chat-widget-settings-manager";
import { getAdminCopy } from "@crinity/shared/i18n/admin-copy";

export default async function ChatSettingsPage() {
  const copy = getAdminCopy((await cookies()).get("crinity-admin-locale")?.value) as unknown as Record<string, string>;
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <AdminOnlyPageState
        title={copy.settingsChatSettings}
        description="채팅 위젯과 프로필 설정은 관리자만 변경할 수 있습니다."
      />
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{copy.settingsChatSettings}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          플로팅 채팅 버튼, 위젯 문구, SLA 목표, 브랜드별 widgetKey 프로필을 관리합니다.
        </p>
      </div>

      <ChatWidgetSettingsManager />
      <ChatWidgetProfileManager />
    </div>
  );
}
