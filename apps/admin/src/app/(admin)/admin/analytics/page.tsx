import { AnalyticsContent } from "./analytics-content";
import { getAnalysisEnabled } from "@/lib/settings/get-analysis-enabled";

export default async function AnalyticsPage() {
  const analysisEnabled = await getAnalysisEnabled();
  return <AnalyticsContent analysisEnabled={analysisEnabled} />;
}
