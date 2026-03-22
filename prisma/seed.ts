import { PrismaClient } from "@prisma/client";
import {
  seedDefaultCategories,
  seedInitialAdmin,
  seedSampleAgents,
  seedMoreAgents,
  seedTeams,
  seedSLAPolicies,
  seedBusinessCalendar,
  seedRequestTypes,
  seedCustomers,
  seedTickets,
  seedResponseTemplates,
  seedKnowledgeBase,
  seedAgentAbsences,
  seedAuditLogs,
  seedCSAT,
} from "@/lib/system/seed-functions";

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    // LibSQL (sqld) — 어댑터를 통해 연결
    const { PrismaLibSql } = require("@prisma/adapter-libsql");
    return new PrismaClient({
      adapter: new PrismaLibSql({ url, authToken: process.env.DATABASE_AUTH_TOKEN }),
    });
  }
  return new PrismaClient();
}

const prisma = createClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // 1. Categories
  const categoryIds = await seedDefaultCategories(prisma);
  console.log(`✓ Categories (${Object.keys(categoryIds).length})`);

  // 2. Admin
  const adminId = await seedInitialAdmin(prisma);
  console.log("✓ Admin account");

  // 3. Sample agents (기존 3명)
  const baseAgentIds = await seedSampleAgents(prisma);
  console.log(`✓ Sample agents (${Object.keys(baseAgentIds).length})`);

  // 4. More agents (추가 3명)
  const moreAgentIds = await seedMoreAgents(prisma);
  console.log(`✓ More agents (${Object.keys(moreAgentIds).length})`);

  const agentIds = { ...baseAgentIds, ...moreAgentIds };

  // 5. Teams + team members + agent specializations
  const teamIds = await seedTeams(prisma, agentIds, categoryIds);
  console.log(`✓ Teams (${Object.keys(teamIds).length})`);

  // 6. SLA policies
  await seedSLAPolicies(prisma);
  console.log("✓ SLA policies");

  // 7. Business calendar + holidays
  await seedBusinessCalendar(prisma);
  console.log("✓ Business calendar & holidays");

  // 8. Request types
  const requestTypeIds = await seedRequestTypes(prisma, teamIds, categoryIds);
  console.log(`✓ Request types (${Object.keys(requestTypeIds).length})`);

  // 9. Customers
  const customerIds = await seedCustomers(prisma);
  console.log(`✓ Customers (${customerIds.length})`);

  // 10. Tickets (with comments & activities)
  const { allIds: ticketIds, resolvedIds } = await seedTickets(prisma, {
    agentIds,
    categoryIds,
    customerIds,
    requestTypeIds,
    teamIds,
    adminId,
  });
  console.log(`✓ Tickets (${ticketIds.length}) with comments & activities`);

  // 11. Response templates
  await seedResponseTemplates(prisma, {
    categoryIds,
    requestTypeIds,
    adminId,
  });
  console.log("✓ Response templates");

  // 12. Knowledge base (categories + articles)
  await seedKnowledgeBase(prisma, adminId);
  console.log("✓ Knowledge base");

  // 13. Agent absences (일정)
  await seedAgentAbsences(prisma, agentIds, adminId);
  console.log("✓ Agent absences");

  // 14. Audit logs
  await seedAuditLogs(prisma, agentIds, adminId);
  console.log("✓ Audit logs");

  // 15. CSAT surveys
  await seedCSAT(prisma, resolvedIds);
  console.log("✓ CSAT surveys");

  console.log("\n✅ Seed completed successfully!");
}

main()
  .catch(async (error) => {
    console.error("❌ Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
