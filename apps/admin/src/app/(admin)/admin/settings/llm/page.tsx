import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminOnlyPageState } from "@/components/admin/admin-only-page-state";
import { LLMSettingsForm } from "@/components/admin/llm-settings-form";
import { getAdminCopy } from "@suppo/shared/i18n/admin-copy";

export const metadata: Metadata = {
  title: "AI 연동 | Suppo",
};

export default async function LLMSettingsPage() {
  const copy = getAdminCopy((await cookies()).get("suppo-admin-locale")?.value);
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <AdminOnlyPageState
        title={copy.settingsLLM}
        description="LLM 제공자와 분석 정책 변경은 관리자만 수행할 수 있습니다."
      />
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{copy.settingsLLM}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ollama 또는 Gemini 연동과 분석 프롬프트를 관리합니다.
        </p>
      </div>

      <LLMSettingsForm />
    </div>
  );
}
