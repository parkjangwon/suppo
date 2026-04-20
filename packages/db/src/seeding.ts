import type { PrismaClient } from "@prisma/client";

import type { BootstrapSentinelCounts } from "./bootstrap-policy";
import {
  seedAgentAbsences,
  seedAuditLogs,
  seedBusinessCalendar,
  seedCSAT,
  seedCustomers,
  seedDefaultCategories,
  seedInitialAdmin,
  seedKnowledgeBase,
  seedMoreAgents,
  seedRequestTypes,
  seedResponseTemplates,
  seedSampleAgents,
  seedSLAPolicies,
  seedTeams,
  seedTickets,
} from "../../../apps/admin/src/lib/system/seed-functions";

const DEFAULT_BRANDING_ID = "default";

export async function getBootstrapSentinelCounts(
  prisma: PrismaClient,
): Promise<BootstrapSentinelCounts> {
  const [agents, categories, requestTypes, businessCalendars, branding] =
    await Promise.all([
      prisma.agent.count(),
      prisma.category.count(),
      prisma.requestType.count(),
      prisma.businessCalendar.count(),
      prisma.systemBranding.count(),
    ]);

  return {
    agents,
    categories,
    requestTypes,
    businessCalendars,
    branding,
  };
}

export async function ensureDefaultSystemBranding(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.systemBranding.upsert({
    where: { id: DEFAULT_BRANDING_ID },
    update: {},
    create: {
      id: DEFAULT_BRANDING_ID,
      companyName: "Suppo",
      primaryColor: "#0f172a",
      secondaryColor: "#3b82f6",
      homepageTitle: "Suppo",
      homepageSubtitle: "민원 티켓을 생성하고 상태를 바로 조회할 수 있습니다.",
      adminPanelTitle: "Suppo Admin",
      appTitle: "고객 지원 센터",
      welcomeMessage: "무엇을 도와드릴까요?",
      footerText: "© 2026 parkjangwon. All rights reserved.",
      showPoweredBy: true,
      knowledgeEnabled: true,
    },
  });
}

export async function runBootstrapSeed(prisma: PrismaClient): Promise<void> {
  console.log("🌱 Applying bootstrap data...\n");

  const categoryIds = await seedDefaultCategories(prisma);
  console.log(`✓ Categories (${Object.keys(categoryIds).length})`);

  await seedInitialAdmin(prisma);
  console.log("✓ Initial admin");

  await seedSLAPolicies(prisma);
  console.log("✓ SLA policies");

  await seedBusinessCalendar(prisma);
  console.log("✓ Business calendar");

  await ensureDefaultSystemBranding(prisma);
  console.log("✓ System branding");

  const requestTypeIds = await seedRequestTypes(prisma, {}, categoryIds);
  console.log(`✓ Request types (${Object.keys(requestTypeIds).length})`);

  console.log("\n✅ Bootstrap completed successfully!");
}

export async function runDemoSeed(prisma: PrismaClient): Promise<void> {
  console.log("🌱 Seeding demo data...\n");

  const categoryIds = await seedDefaultCategories(prisma);
  console.log(`✓ Categories (${Object.keys(categoryIds).length})`);

  const adminId = await seedInitialAdmin(prisma);
  console.log("✓ Admin account");

  const baseAgentIds = await seedSampleAgents(prisma);
  console.log(`✓ Sample agents (${Object.keys(baseAgentIds).length})`);

  const moreAgentIds = await seedMoreAgents(prisma);
  console.log(`✓ More agents (${Object.keys(moreAgentIds).length})`);

  const agentIds = { ...baseAgentIds, ...moreAgentIds };

  const teamIds = await seedTeams(prisma, agentIds, categoryIds);
  console.log(`✓ Teams (${Object.keys(teamIds).length})`);

  await seedSLAPolicies(prisma);
  console.log("✓ SLA policies");

  await seedBusinessCalendar(prisma);
  console.log("✓ Business calendar & holidays");

  await ensureDefaultSystemBranding(prisma);
  console.log("✓ System branding");

  const requestTypeIds = await seedRequestTypes(prisma, teamIds, categoryIds);
  console.log(`✓ Request types (${Object.keys(requestTypeIds).length})`);

  const customerIds = await seedCustomers(prisma);
  console.log(`✓ Customers (${customerIds.length})`);

  const { allIds: ticketIds, resolvedIds } = await seedTickets(prisma, {
    agentIds,
    categoryIds,
    customerIds,
    requestTypeIds,
    teamIds,
    adminId,
  });
  console.log(`✓ Tickets (${ticketIds.length}) with comments & activities`);

  await seedResponseTemplates(prisma, {
    categoryIds,
    requestTypeIds,
    adminId,
  });
  console.log("✓ Response templates");

  await seedKnowledgeBase(prisma, adminId);
  console.log("✓ Knowledge base");

  await seedAgentAbsences(prisma, agentIds, adminId);
  console.log("✓ Agent absences");

  await seedAuditLogs(prisma, agentIds, adminId);
  console.log("✓ Audit logs");

  await seedCSAT(prisma, resolvedIds);
  console.log("✓ CSAT surveys");

  console.log("\n✅ Demo seed completed successfully!");
}
