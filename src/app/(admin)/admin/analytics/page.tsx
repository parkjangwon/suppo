import { prisma } from "@/lib/db/client";
import { AnalyticsContent } from "./analytics-content";

export default async function AnalyticsPage() {
  const llmSettings = await prisma.lLMSettings.findFirst();
  const analysisEnabled = llmSettings?.analysisEnabled ?? false;
  return <AnalyticsContent analysisEnabled={analysisEnabled} />;
}
