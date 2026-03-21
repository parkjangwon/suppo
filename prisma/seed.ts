import { PrismaClient } from "@prisma/client";
import {
  seedDefaultCategories,
  seedInitialAdmin,
  seedSampleAgents,
} from "../src/lib/system/seed-functions";

const prisma = new PrismaClient();

async function main() {
  await seedDefaultCategories(prisma);
  await seedInitialAdmin(prisma);
  await seedSampleAgents(prisma);
}

main()
  .catch(async (error) => {
    console.error("Seeding failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
