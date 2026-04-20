import { createPrismaClient } from "../src/client";
import {
  getBootstrapExecutionPlan,
  normalizeAutoBootstrapMode,
  normalizeSeedProfile,
} from "../src/bootstrap-policy";
import {
  getBootstrapSentinelCounts,
  runBootstrapSeed,
  runDemoSeed,
} from "../src/seeding";

async function main() {
  const prisma = createPrismaClient();

  try {
    const autoBootstrap = normalizeAutoBootstrapMode(process.env.AUTO_BOOTSTRAP);
    const seedProfile = normalizeSeedProfile(process.env.SEED_PROFILE);
    const counts = await getBootstrapSentinelCounts(prisma);
    const plan = getBootstrapExecutionPlan({
      counts,
      autoBootstrap,
      seedProfile,
    });

    console.log(
      `[bootstrap] auto=${autoBootstrap} seed=${seedProfile} empty=${plan.databaseEmpty}`,
    );

    if (plan.runDemoSeed) {
      await runDemoSeed(prisma);
      return;
    }

    if (plan.runBootstrap) {
      await runBootstrapSeed(prisma);
      return;
    }

    if (seedProfile === "demo" && !plan.databaseEmpty) {
      console.log(
        "[bootstrap] Skipping demo seed because the database is not empty. Use `pnpm --filter=@suppo/db seed` for an explicit refill.",
      );
      return;
    }

    console.log("[bootstrap] No bootstrap action needed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Bootstrap failed:", error);
  process.exitCode = 1;
});
