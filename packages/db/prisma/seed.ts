import { createPrismaClient } from "../src/client";
import { runDemoSeed } from "../src/seeding";

const prisma = createPrismaClient();

async function main() {
  await runDemoSeed(prisma);
}

main()
  .catch(async (error) => {
    console.error("❌ Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
