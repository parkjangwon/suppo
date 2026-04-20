export type AutoBootstrapMode = "if-empty" | "never";
export type SeedProfile = "none" | "demo";

export type BootstrapSentinelCounts = {
  agents: number;
  categories: number;
  requestTypes: number;
  businessCalendars: number;
  branding: number;
};

type BootstrapExecutionPlanInput = {
  counts: BootstrapSentinelCounts;
  autoBootstrap: AutoBootstrapMode;
  seedProfile: SeedProfile;
};

export function normalizeAutoBootstrapMode(
  value: string | undefined,
): AutoBootstrapMode {
  if (value === "never") {
    return value;
  }
  return "if-empty";
}

export function normalizeSeedProfile(
  value: string | undefined,
): SeedProfile {
  if (value === "demo") {
    return value;
  }
  return "none";
}

export function isBootstrapDatabaseEmpty(
  counts: BootstrapSentinelCounts,
): boolean {
  return Object.values(counts).every((count) => count === 0);
}

export function getBootstrapExecutionPlan({
  counts,
  autoBootstrap,
  seedProfile,
}: BootstrapExecutionPlanInput) {
  const databaseEmpty = isBootstrapDatabaseEmpty(counts);
  const runDemoSeed = seedProfile === "demo" && databaseEmpty;
  const runBootstrap =
    !runDemoSeed &&
    autoBootstrap === "if-empty" &&
    databaseEmpty;

  return {
    databaseEmpty,
    runBootstrap,
    runDemoSeed,
  };
}
