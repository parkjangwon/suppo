import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LLMSettingsForm } from "@/components/admin/llm-settings-form";

export const metadata: Metadata = {
  title: "AI 연동 | Crinity",
};

export default async function LLMSettingsPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">AI 연동</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ollama 또는 Gemini 연동과 분석 프롬프트를 관리합니다.
        </p>
      </div>

      <LLMSettingsForm />
    </div>
  );
}
