import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Business Calendar 생성
  const calendar = await prisma.businessCalendar.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "기본 업무 달력",
      timezone: "Asia/Seoul",
      workStartHour: 9,
      workEndHour: 18,
      workDays: [1, 2, 3, 4, 5],
    },
  });
  console.log("✓ Business calendar created");

  // 2. SLA Policies 생성
  const slaPolicies = await Promise.all([
    prisma.sLAPolicy.upsert({
      where: { id: "sla-urgent" },
      update: {},
      create: {
        id: "sla-urgent",
        name: "긴급 SLA",
        priority: "URGENT",
        firstResponseHours: 1,
        resolutionHours: 4,
      },
    }),
    prisma.sLAPolicy.upsert({
      where: { id: "sla-high" },
      update: {},
      create: {
        id: "sla-high",
        name: "높음 SLA",
        priority: "HIGH",
        firstResponseHours: 4,
        resolutionHours: 24,
      },
    }),
    prisma.sLAPolicy.upsert({
      where: { id: "sla-medium" },
      update: {},
      create: {
        id: "sla-medium",
        name: "보통 SLA",
        priority: "MEDIUM",
        firstResponseHours: 8,
        resolutionHours: 72,
      },
    }),
    prisma.sLAPolicy.upsert({
      where: { id: "sla-low" },
      update: {},
      create: {
        id: "sla-low",
        name: "낮음 SLA",
        priority: "LOW",
        firstResponseHours: 24,
        resolutionHours: 168,
      },
    }),
  ]);
  console.log("✓ SLA policies created");

  // 3. Teams 생성
  const supportTeam = await prisma.team.upsert({
    where: { id: "team-support" },
    update: {},
    create: {
      id: "team-support",
      name: "기술 지원팀",
      description: "기술 관련 문의 처리",
    },
  });

  const salesTeam = await prisma.team.upsert({
    where: { id: "team-sales" },
    update: {},
    create: {
      id: "team-sales",
      name: "영업팀",
      description: "영업 및 계약 관련 문의",
    },
  });
  console.log("✓ Teams created");

  // 4. Request Types 생성
  const requestTypes = await Promise.all([
    prisma.requestType.upsert({
      where: { id: "req-bug" },
      update: {},
      create: {
        id: "req-bug",
        name: "버그 신고",
        description: "제품의 버그나 오류를 신고합니다",
        defaultPriority: "HIGH",
        defaultTeamId: supportTeam.id,
        channel: "WEB",
        sortOrder: 1,
      },
    }),
    prisma.requestType.upsert({
      where: { id: "req-feature" },
      update: {},
      create: {
        id: "req-feature",
        name: "기능 요청",
        description: "새로운 기능을 제안합니다",
        defaultPriority: "MEDIUM",
        channel: "WEB",
        sortOrder: 2,
      },
    }),
    prisma.requestType.upsert({
      where: { id: "req-question" },
      update: {},
      create: {
        id: "req-question",
        name: "일반 문의",
        description: "일반적인 질문이나 문의",
        defaultPriority: "LOW",
        channel: "WEB",
        sortOrder: 3,
      },
    }),
    prisma.requestType.upsert({
      where: { id: "req-contract" },
      update: {},
      create: {
        id: "req-contract",
        name: "계약/영업 문의",
        description: "계약 및 영업 관련 문의",
        defaultPriority: "MEDIUM",
        defaultTeamId: salesTeam.id,
        channel: "WEB",
        sortOrder: 4,
      },
    }),
  ]);
  console.log("✓ Request types created");

  console.log("\n✅ Seed completed successfully!");
  console.log(`  - ${slaPolicies.length} SLA policies`);
  console.log(`  - 2 teams`);
  console.log(`  - ${requestTypes.length} request types`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
