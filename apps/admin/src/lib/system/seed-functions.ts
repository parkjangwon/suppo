import {
  AuditAction,
  AuthorType,
  AbsenceType,
  AgentRole,
  AuthProvider,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { hash } from "bcryptjs";

function toAuditJsonValue(value: unknown) {
  return (value ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull;
}

// ─── Categories ────────────────────────────────────────────────────────────────

const defaultCategories = [
  { name: "기능 문의", sortOrder: 1 },
  { name: "버그 신고", sortOrder: 2 },
  { name: "계정 문제", sortOrder: 3 },
  { name: "결제 문의", sortOrder: 4 },
  { name: "기타", sortOrder: 5 },
];

export async function seedDefaultCategories(
  prisma: PrismaClient
): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  for (const category of defaultCategories) {
    const cat = await prisma.category.upsert({
      where: { name: category.name },
      update: { sortOrder: category.sortOrder },
      create: category,
    });
    ids[category.name] = cat.id;
  }
  return ids;
}

// ─── Admin ─────────────────────────────────────────────────────────────────────

export async function seedInitialAdmin(
  prisma: PrismaClient
): Promise<string> {
  const email = process.env.INITIAL_ADMIN_EMAIL ?? "admin@suppo.io";
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? "admin1234";
  const passwordHash = await hash(password, 10);

  const admin = await prisma.agent.upsert({
    where: { email },
    update: {
      name: "관리자",
      role: AgentRole.ADMIN,
      isActive: true,
      maxTickets: 50,
      authProvider: AuthProvider.CREDENTIALS,
      passwordHash,
    },
    create: {
      name: "관리자",
      email,
      role: AgentRole.ADMIN,
      isActive: true,
      maxTickets: 50,
      authProvider: AuthProvider.CREDENTIALS,
      passwordHash,
    },
  });
  return admin.id;
}

// ─── Sample Agents ─────────────────────────────────────────────────────────────

export async function seedSampleAgents(
  prisma: PrismaClient
): Promise<Record<string, string>> {
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? "admin1234";
  const passwordHash = await hash(password, 10);

  const agents = [
    { key: "sujin", name: "이수진", email: "agent1@suppo.io", maxTickets: 15, phone: "010-1234-5678" },
    { key: "dohyun", name: "박도현", email: "agent2@suppo.io", maxTickets: 10, phone: "010-2345-6789" },
    { key: "minseo", name: "최민서", email: "agent3@suppo.io", maxTickets: 8, phone: "010-3456-7890" },
  ];

  const ids: Record<string, string> = {};
  for (const agent of agents) {
    const a = await prisma.agent.upsert({
      where: { email: agent.email },
      update: { name: agent.name, role: AgentRole.AGENT, isActive: true, maxTickets: agent.maxTickets, phone: agent.phone, authProvider: AuthProvider.CREDENTIALS, passwordHash },
      create: { name: agent.name, email: agent.email, role: AgentRole.AGENT, isActive: true, maxTickets: agent.maxTickets, phone: agent.phone, authProvider: AuthProvider.CREDENTIALS, passwordHash },
    });
    ids[agent.key] = a.id;
  }
  return ids;
}

// ─── More Agents ───────────────────────────────────────────────────────────────

export async function seedMoreAgents(
  prisma: PrismaClient
): Promise<Record<string, string>> {
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? "admin1234";
  const passwordHash = await hash(password, 10);

  const agents = [
    { key: "jihun", name: "김지훈", email: "agent4@suppo.io", maxTickets: 12, phone: "010-4567-8901" },
    { key: "minji", name: "이민지", email: "agent5@suppo.io", maxTickets: 10, phone: "010-5678-9012" },
    { key: "hyunwoo", name: "강현우", email: "agent6@suppo.io", maxTickets: 10, phone: "010-6789-0123" },
  ];

  const ids: Record<string, string> = {};
  for (const agent of agents) {
    const a = await prisma.agent.upsert({
      where: { email: agent.email },
      update: { name: agent.name, role: AgentRole.AGENT, isActive: true, maxTickets: agent.maxTickets, phone: agent.phone, authProvider: AuthProvider.CREDENTIALS, passwordHash },
      create: { name: agent.name, email: agent.email, role: AgentRole.AGENT, isActive: true, maxTickets: agent.maxTickets, phone: agent.phone, authProvider: AuthProvider.CREDENTIALS, passwordHash },
    });
    ids[agent.key] = a.id;
  }
  return ids;
}

// ─── Teams ─────────────────────────────────────────────────────────────────────

export async function seedTeams(
  prisma: PrismaClient,
  agentIds: Record<string, string>,
  categoryIds: Record<string, string>
): Promise<Record<string, string>> {
  const teamDefs = [
    {
      key: "support",
      name: "기술 지원팀",
      description: "기술 문의 및 버그 처리 전담팀",
      members: [
        { key: "sujin", isLeader: true },
        { key: "dohyun", isLeader: false },
        { key: "minji", isLeader: false },
      ],
    },
    {
      key: "sales",
      name: "영업팀",
      description: "계약 및 영업 관련 문의 처리",
      members: [{ key: "jihun", isLeader: true }],
    },
    {
      key: "cs",
      name: "고객 성공팀",
      description: "고객 온보딩 및 계정 관리",
      members: [{ key: "minseo", isLeader: true }],
    },
    {
      key: "product",
      name: "제품팀",
      description: "기능 요청 및 제품 개선 처리",
      members: [{ key: "hyunwoo", isLeader: true }],
    },
  ];

  const ids: Record<string, string> = {};
  for (const team of teamDefs) {
    const t = await prisma.team.upsert({
      where: { name: team.name },
      update: { description: team.description },
      create: { name: team.name, description: team.description },
    });
    ids[team.key] = t.id;

    for (const member of team.members) {
      const agentId = agentIds[member.key];
      if (agentId) {
        await prisma.teamMember.upsert({
          where: { teamId_agentId: { teamId: t.id, agentId } },
          update: { isLeader: member.isLeader },
          create: { teamId: t.id, agentId, isLeader: member.isLeader },
        });
      }
    }
  }

  // Agent specializations (AgentCategory)
  const specializations: { agentKey: string; categoryNames: string[] }[] = [
    { agentKey: "sujin", categoryNames: ["버그 신고", "기능 문의"] },
    { agentKey: "dohyun", categoryNames: ["버그 신고", "계정 문제"] },
    { agentKey: "minseo", categoryNames: ["계정 문제", "결제 문의"] },
    { agentKey: "jihun", categoryNames: ["결제 문의", "기타"] },
    { agentKey: "minji", categoryNames: ["버그 신고", "기능 문의"] },
    { agentKey: "hyunwoo", categoryNames: ["기능 문의", "기타"] },
  ];

  for (const spec of specializations) {
    const agentId = agentIds[spec.agentKey];
    if (!agentId) continue;
    for (const catName of spec.categoryNames) {
      const categoryId = categoryIds[catName];
      if (!categoryId) continue;
      await prisma.agentCategory.upsert({
        where: { agentId_categoryId: { agentId, categoryId } },
        update: {},
        create: { agentId, categoryId },
      });
    }
  }

  return ids;
}

// ─── SLA Policies ──────────────────────────────────────────────────────────────

export async function seedSLAPolicies(prisma: PrismaClient): Promise<void> {
  const policies = [
    { name: "긴급 SLA", priority: "URGENT" as const, firstResponseHours: 1, resolutionHours: 4 },
    { name: "높음 SLA", priority: "HIGH" as const, firstResponseHours: 4, resolutionHours: 24 },
    { name: "보통 SLA", priority: "MEDIUM" as const, firstResponseHours: 8, resolutionHours: 72 },
    { name: "낮음 SLA", priority: "LOW" as const, firstResponseHours: 24, resolutionHours: 168 },
  ];

  for (const p of policies) {
    const existing = await prisma.sLAPolicy.findFirst({ where: { priority: p.priority, isActive: true } });
    if (!existing) {
      await prisma.sLAPolicy.create({
        data: { name: p.name, priority: p.priority, firstResponseHours: p.firstResponseHours, resolutionHours: p.resolutionHours },
      });
    }
  }
}

// ─── Business Calendar ─────────────────────────────────────────────────────────

export async function seedBusinessCalendar(prisma: PrismaClient): Promise<void> {
  const calendar = await prisma.businessCalendar.upsert({
    where: { id: "default-calendar" },
    update: {},
    create: {
      id: "default-calendar",
      name: "기본 업무 달력",
      timezone: "Asia/Seoul",
      workStartHour: 9,
      workEndHour: 18,
      workDays: "[1,2,3,4,5]",
    },
  });

  const holidays = [
    { name: "삼일절", date: new Date("2026-03-01"), isRecurring: true },
    { name: "어린이날", date: new Date("2026-05-05"), isRecurring: true },
    { name: "현충일", date: new Date("2026-06-06"), isRecurring: true },
    { name: "광복절", date: new Date("2026-08-15"), isRecurring: true },
    { name: "개천절", date: new Date("2026-10-03"), isRecurring: true },
    { name: "한글날", date: new Date("2026-10-09"), isRecurring: true },
    { name: "성탄절", date: new Date("2026-12-25"), isRecurring: true },
    { name: "신정", date: new Date("2026-01-01"), isRecurring: true },
    { name: "설날 연휴", date: new Date("2026-02-16"), isRecurring: false },
    { name: "설날", date: new Date("2026-02-17"), isRecurring: false },
    { name: "설날 다음날", date: new Date("2026-02-18"), isRecurring: false },
    { name: "추석 연휴", date: new Date("2026-09-24"), isRecurring: false },
    { name: "추석", date: new Date("2026-09-25"), isRecurring: false },
    { name: "추석 다음날", date: new Date("2026-09-26"), isRecurring: false },
  ];

  for (const holiday of holidays) {
    const existing = await prisma.holiday.findFirst({
      where: { calendarId: calendar.id, name: holiday.name, date: holiday.date },
    });
    if (!existing) {
      await prisma.holiday.create({
        data: { calendarId: calendar.id, name: holiday.name, date: holiday.date, isRecurring: holiday.isRecurring },
      });
    }
  }
}

// ─── Request Types ─────────────────────────────────────────────────────────────

export async function seedRequestTypes(
  prisma: PrismaClient,
  teamIds: Record<string, string>,
  categoryIds: Record<string, string>
): Promise<Record<string, string>> {
  // Reset category links to allow fresh assignment
  await prisma.requestType.updateMany({ data: { categoryId: null } });

  const requestTypeDefs = [
    {
      key: "bug",
      name: "버그 신고",
      description: "제품의 버그나 오류를 신고합니다",
      defaultPriority: "HIGH" as const,
      defaultTeamKey: "support",
      categoryName: "버그 신고",
      channel: "WEB" as const,
      sortOrder: 1,
    },
    {
      key: "feature",
      name: "기능 요청",
      description: "새로운 기능을 제안합니다",
      defaultPriority: "MEDIUM" as const,
      defaultTeamKey: "product",
      categoryName: "기능 문의",
      channel: "WEB" as const,
      sortOrder: 2,
    },
    {
      key: "account",
      name: "계정/로그인 문의",
      description: "계정 접속 및 권한 관련 문의",
      defaultPriority: "HIGH" as const,
      defaultTeamKey: "support",
      categoryName: "계정 문제",
      channel: "WEB" as const,
      sortOrder: 3,
    },
    {
      key: "payment",
      name: "결제/환불 문의",
      description: "결제, 청구, 환불 관련 문의",
      defaultPriority: "MEDIUM" as const,
      defaultTeamKey: "sales",
      categoryName: "결제 문의",
      channel: "WEB" as const,
      sortOrder: 4,
    },
    {
      key: "general",
      name: "일반 문의",
      description: "일반적인 질문이나 문의",
      defaultPriority: "LOW" as const,
      defaultTeamKey: null,
      categoryName: null,
      channel: "WEB" as const,
      sortOrder: 5,
    },
    {
      key: "contract",
      name: "계약/영업 문의",
      description: "계약 및 영업 관련 문의",
      defaultPriority: "MEDIUM" as const,
      defaultTeamKey: "sales",
      categoryName: null,
      channel: "WEB" as const,
      sortOrder: 6,
    },
    {
      key: "incident",
      name: "장애 신고",
      description: "서비스 장애 및 긴급 상황 신고",
      defaultPriority: "URGENT" as const,
      defaultTeamKey: "support",
      categoryName: null,
      channel: "WEB" as const,
      sortOrder: 7,
    },
  ];

  const ids: Record<string, string> = {};
  for (const rt of requestTypeDefs) {
    const defaultTeamId = rt.defaultTeamKey ? teamIds[rt.defaultTeamKey] : undefined;
    const categoryId = rt.categoryName ? categoryIds[rt.categoryName] : undefined;

    const result = await prisma.requestType.upsert({
      where: { name: rt.name },
      update: {
        description: rt.description,
        defaultPriority: rt.defaultPriority,
        defaultTeamId: defaultTeamId ?? null,
        categoryId: categoryId ?? null,
        channel: rt.channel,
        sortOrder: rt.sortOrder,
        isActive: true,
      },
      create: {
        name: rt.name,
        description: rt.description,
        defaultPriority: rt.defaultPriority,
        defaultTeamId: defaultTeamId ?? null,
        categoryId: categoryId ?? null,
        channel: rt.channel,
        sortOrder: rt.sortOrder,
        isActive: true,
      },
    });
    ids[rt.key] = result.id;
  }
  return ids;
}

// ─── Customers ─────────────────────────────────────────────────────────────────

export async function seedCustomers(
  prisma: PrismaClient
): Promise<string[]> {
  const customers = [
    { email: "minjun.kim@startup-a.com", name: "김민준", phone: "010-1111-2222", memo: "VIP 고객. 프리미엄 플랜 사용 중. (스타트업A)" },
    { email: "sy.park@naver-corp.com", name: "박서윤", phone: "010-2222-3333", memo: null },
    { email: "doyun.lee@techvision.co.kr", name: "이도윤", phone: "010-3333-4444", memo: "기술팀 팀장. (테크비전)" },
    { email: "jia.choi@samsung.com", name: "최지아", phone: "010-4444-5555", memo: "Enterprise 계약 고객. (삼성전자)" },
    { email: "woojin.jeong@lg.com", name: "정우진", phone: "010-5555-6666", memo: null },
    { email: "eunseo.kang@sk.com", name: "강은서", phone: "010-6666-7777", memo: "보안 이슈에 민감한 고객. (SK텔레콤)" },
    { email: "hyunjun.jo@hyundai.com", name: "조현준", phone: "010-7777-8888", memo: null },
    { email: "seoyoung.yoon@kakaobank.com", name: "윤서영", phone: "010-8888-9999", memo: "API 연동 문의 많음. (카카오뱅크)" },
    { email: "juwon.lim@nhn.com", name: "임주원", phone: "010-9999-0000", memo: null },
    { email: "jimin.han@coupang.com", name: "한지민", phone: "010-1234-0000", memo: "대용량 데이터 처리 요구. (쿠팡)" },
    { email: "minseong.oh@baemin.com", name: "오민성", phone: "010-2345-0001", memo: null },
    { email: "jihyun.seo@toss.im", name: "서지현", phone: "010-3456-0002", memo: "응답 속도에 민감함. (토스)" },
    { email: "areum.kwon@ncloud.com", name: "권아름", phone: "010-4567-0003", memo: null },
    { email: "junse.hwang@startup-b.io", name: "황준서", phone: "010-5678-0004", memo: "빠른 성장 중인 스타트업. (스타트업B)" },
    { email: "yujin.song@freelancer.kr", name: "송유진", phone: null, memo: "프리랜서 개발자." },
  ];

  const ids: string[] = [];
  for (const c of customers) {
    const customer = await prisma.customer.upsert({
      where: { email: c.email },
      update: { name: c.name, phone: c.phone, memo: c.memo },
      create: { email: c.email, name: c.name, phone: c.phone, memo: c.memo },
    });
    ids.push(customer.id);
  }
  return ids;
}

// ─── Tickets ───────────────────────────────────────────────────────────────────

type AgentMap = Record<string, string>;
type TicketSeedResult = { allIds: string[]; resolvedIds: { id: string; ticketNumber: string; email: string }[] };

export async function seedTickets(
  prisma: PrismaClient,
  opts: {
    agentIds: AgentMap;
    categoryIds: Record<string, string>;
    customerIds: string[];
    requestTypeIds: Record<string, string>;
    teamIds: Record<string, string>;
    adminId: string;
  }
): Promise<TicketSeedResult> {
  const { agentIds, categoryIds, customerIds, requestTypeIds, teamIds } = opts;

  const now = new Date("2026-03-21T10:00:00.000Z");
  const d = (offsetDays: number, h = 0) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + offsetDays);
    dt.setHours(h, 0, 0, 0);
    return dt;
  };

  type TicketDef = {
    number: string;
    customerName: string;
    customerEmail: string;
    customerOrganization?: string;
    customerId?: string;
    subject: string;
    description: string;
    status: "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";
    priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
    assigneeKey?: string;
    categoryName?: string;
    requestTypeKey?: string;
    teamKey?: string;
    tags?: string[];
    source?: "WEB" | "EMAIL" | "API";
    createdAtOffset: number;
    firstResponseOffset?: number;
    resolvedAtOffset?: number;
    closedAtOffset?: number;
  };

  const ticketDefs: TicketDef[] = [
    {
      number: "TK-2026-0001",
      customerName: "최지아", customerEmail: "jia.choi@samsung.com", customerOrganization: "삼성전자",
      customerId: customerIds[3],
      subject: "로그인 서버 간헐적 다운 장애",
      description: "안녕하세요. 오늘 오전 9시부터 로그인 서버가 간헐적으로 응답하지 않습니다. 저희 팀 전체가 로그인을 못하고 있어 업무가 중단된 상황입니다. 빠른 조치 부탁드립니다.",
      status: "OPEN", priority: "URGENT",
      assigneeKey: "sujin", categoryName: "버그 신고", requestTypeKey: "incident", teamKey: "support",
      tags: ["장애", "긴급", "로그인"],
      createdAtOffset: 0,
    },
    {
      number: "TK-2026-0002",
      customerName: "윤서영", customerEmail: "seoyoung.yoon@kakaobank.com", customerOrganization: "카카오뱅크",
      customerId: customerIds[7],
      subject: "결제 프로세스 중 오류 코드 500 발생",
      description: "결제 진행 시 '서버 내부 오류(500)'가 발생합니다. 결제 페이지에서 카드 정보 입력 후 확인 버튼 클릭 시 발생하며, 약 30% 확률로 재현됩니다. 브라우저 콘솔 로그를 첨부합니다.",
      status: "IN_PROGRESS", priority: "HIGH",
      assigneeKey: "dohyun", categoryName: "버그 신고", requestTypeKey: "bug", teamKey: "support",
      tags: ["결제", "서버오류"],
      createdAtOffset: -1, firstResponseOffset: -1,
    },
    {
      number: "TK-2026-0003",
      customerName: "임주원", customerEmail: "juwon.lim@nhn.com", customerOrganization: "NHN",
      customerId: customerIds[8],
      subject: "10MB 이상 파일 업로드 실패",
      description: "파일 업로드 기능에서 10MB 이상의 파일 업로드 시 'Upload failed' 오류가 발생합니다. 10MB 미만 파일은 정상 작동합니다. 재현율 100%입니다.",
      status: "IN_PROGRESS", priority: "HIGH",
      assigneeKey: "sujin", categoryName: "버그 신고", requestTypeKey: "bug", teamKey: "support",
      tags: ["파일업로드", "버그"],
      createdAtOffset: -2, firstResponseOffset: -2,
    },
    {
      number: "TK-2026-0004",
      customerName: "송유진", customerEmail: "yujin.song@freelancer.kr",
      subject: "비밀번호 재설정 이메일이 오지 않습니다",
      description: "비밀번호 재설정을 시도했는데 이메일이 수신되지 않습니다. 스팸함도 확인했으나 없습니다. 혹시 다른 방법으로 재설정할 수 있나요?",
      status: "WAITING", priority: "MEDIUM",
      assigneeKey: "minseo", categoryName: "계정 문제", requestTypeKey: "account", teamKey: "cs",
      tags: ["계정", "비밀번호"],
      createdAtOffset: -3, firstResponseOffset: -3,
    },
    {
      number: "TK-2026-0005",
      customerName: "황준서", customerEmail: "junse.hwang@startup-b.io", customerOrganization: "스타트업B",
      customerId: customerIds[13],
      subject: "2FA 인증 코드가 수신되지 않음",
      description: "2단계 인증(2FA)을 활성화했는데 SMS 인증 코드가 오지 않습니다. 여러 번 재전송 요청을 했지만 수신되지 않습니다. 계정에 접속을 못하고 있습니다.",
      status: "OPEN", priority: "HIGH",
      assigneeKey: "minji", categoryName: "계정 문제", requestTypeKey: "account", teamKey: "support",
      tags: ["2FA", "계정", "인증"],
      createdAtOffset: 0,
    },
    {
      number: "TK-2026-0006",
      customerName: "김민준", customerEmail: "minjun.kim@startup-a.com", customerOrganization: "스타트업A",
      customerId: customerIds[0],
      subject: "API 응답 지연 - P95 500ms 초과",
      description: "지난 2시간 동안 API 응답 시간이 급격히 증가했습니다. P95 기준 500ms를 넘어서고 있으며, 일부 요청은 타임아웃이 발생합니다. /api/v2/users 엔드포인트에서 주로 발생합니다.",
      status: "IN_PROGRESS", priority: "URGENT",
      assigneeKey: "dohyun", categoryName: "버그 신고", requestTypeKey: "incident", teamKey: "support",
      tags: ["API", "성능", "긴급"],
      source: "API",
      createdAtOffset: 0, firstResponseOffset: 0,
    },
    {
      number: "TK-2026-0007",
      customerName: "박서윤", customerEmail: "sy.park@naver-corp.com",
      subject: "서비스 이용 가능 시간 문의",
      description: "고객 지원 서비스는 몇 시부터 몇 시까지 운영되나요? 주말에도 지원이 가능한지 알고 싶습니다.",
      status: "RESOLVED", priority: "LOW",
      assigneeKey: "minseo", categoryName: "기타", requestTypeKey: "general",
      tags: [],
      createdAtOffset: -7, firstResponseOffset: -7, resolvedAtOffset: -6,
    },
    {
      number: "TK-2026-0008",
      customerName: "이도윤", customerEmail: "doyun.lee@techvision.co.kr", customerOrganization: "테크비전",
      customerId: customerIds[2],
      subject: "과금 오류로 인한 환불 요청",
      description: "3월 청구서를 확인하니 서비스를 사용하지 않은 날짜에도 요금이 청구되어 있습니다. 2026년 3월 5일~10일 기간의 요금 환불을 요청합니다.",
      status: "CLOSED", priority: "MEDIUM",
      assigneeKey: "jihun", categoryName: "결제 문의", requestTypeKey: "payment", teamKey: "sales",
      tags: ["환불", "과금"],
      createdAtOffset: -14, firstResponseOffset: -14, resolvedAtOffset: -10, closedAtOffset: -8,
    },
    {
      number: "TK-2026-0009",
      customerName: "강은서", customerEmail: "eunseo.kang@sk.com", customerOrganization: "SK텔레콤",
      customerId: customerIds[5],
      subject: "모바일 앱 지원 요청",
      description: "현재 웹 버전만 지원하시는 것 같은데, iOS/Android 모바일 앱도 출시 예정이 있나요? 출시 로드맵이 있다면 알고 싶습니다.",
      status: "OPEN", priority: "MEDIUM",
      categoryName: "기능 문의", requestTypeKey: "feature", teamKey: "product",
      tags: ["모바일", "기능요청"],
      createdAtOffset: -1,
    },
    {
      number: "TK-2026-0010",
      customerName: "조현준", customerEmail: "hyunjun.jo@hyundai.com", customerOrganization: "현대자동차",
      customerId: customerIds[6],
      subject: "대시보드 통계 필터 기능 개선 요청",
      description: "현재 대시보드에서 날짜 필터가 최대 30일까지만 지원됩니다. 분기/반기/연간 단위의 통계도 볼 수 있으면 좋겠습니다. 경영진 보고서 작성에 필요합니다.",
      status: "IN_PROGRESS", priority: "MEDIUM",
      assigneeKey: "hyunwoo", categoryName: "기능 문의", requestTypeKey: "feature", teamKey: "product",
      tags: ["대시보드", "통계", "기능요청"],
      createdAtOffset: -3, firstResponseOffset: -3,
    },
    {
      number: "TK-2026-0011",
      customerName: "한지민", customerEmail: "jimin.han@coupang.com", customerOrganization: "쿠팡",
      customerId: customerIds[9],
      subject: "CSV 데이터 내보내기 시 인코딩 오류",
      description: "데이터 내보내기 기능에서 CSV 파일 다운로드 시 한글이 깨져서 출력됩니다. Excel에서 열면 모두 물음표(???)로 표시됩니다. UTF-8 BOM 처리가 필요한 것 같습니다.",
      status: "OPEN", priority: "HIGH",
      assigneeKey: "sujin", categoryName: "버그 신고", requestTypeKey: "bug", teamKey: "support",
      tags: ["인코딩", "CSV", "버그"],
      createdAtOffset: -1,
    },
    {
      number: "TK-2026-0012",
      customerName: "오민성", customerEmail: "minseong.oh@baemin.com", customerOrganization: "배달의민족",
      customerId: customerIds[10],
      subject: "SSL 인증서 만료 경고 표시됨",
      description: "저희 서비스에 연동된 API 호출 시 'SSL Certificate Expired' 경고가 브라우저에 표시됩니다. 보안 팀에서 문제 제기가 들어왔습니다. 인증서 갱신이 필요한 것 같습니다.",
      status: "WAITING", priority: "HIGH",
      assigneeKey: "dohyun", categoryName: "버그 신고", requestTypeKey: "incident", teamKey: "support",
      tags: ["SSL", "보안"],
      createdAtOffset: -4, firstResponseOffset: -4,
    },
    {
      number: "TK-2026-0013",
      customerName: "서지현", customerEmail: "jihyun.seo@toss.im", customerOrganization: "토스",
      customerId: customerIds[11],
      subject: "팀원 관리자 권한 부여 방법 문의",
      description: "신규 팀원을 추가했는데 관리자 권한을 부여하는 방법을 모르겠습니다. 설정 메뉴에서 찾아봤지만 해당 옵션이 보이지 않습니다.",
      status: "RESOLVED", priority: "MEDIUM",
      assigneeKey: "minji", categoryName: "계정 문제", requestTypeKey: "account", teamKey: "cs",
      tags: ["권한", "계정"],
      createdAtOffset: -5, firstResponseOffset: -5, resolvedAtOffset: -4,
    },
    {
      number: "TK-2026-0014",
      customerName: "권아름", customerEmail: "areum.kwon@ncloud.com", customerOrganization: "네이버클라우드",
      customerId: customerIds[12],
      subject: "서비스 이용 가이드 문서 요청",
      description: "신규 직원 교육을 위한 서비스 이용 가이드 문서가 있으면 공유해주세요. PDF 형태나 링크로 주시면 됩니다.",
      status: "CLOSED", priority: "LOW",
      assigneeKey: "minseo", categoryName: "기타", requestTypeKey: "general", teamKey: "cs",
      tags: ["가이드", "문서"],
      createdAtOffset: -10, firstResponseOffset: -10, resolvedAtOffset: -7, closedAtOffset: -5,
    },
    {
      number: "TK-2026-0015",
      customerName: "정우진", customerEmail: "woojin.jeong@lg.com", customerOrganization: "LG전자",
      customerId: customerIds[4],
      subject: "이메일 알림 수신 설정 커스텀 요청",
      description: "현재 모든 이벤트에 대해 이메일 알림이 발송되는데, 특정 유형의 알림만 받을 수 있도록 설정 옵션 추가를 요청합니다.",
      status: "IN_PROGRESS", priority: "MEDIUM",
      assigneeKey: "hyunwoo", categoryName: "기능 문의", requestTypeKey: "feature", teamKey: "product",
      tags: ["알림", "기능요청"],
      createdAtOffset: -2, firstResponseOffset: -2,
    },
    {
      number: "TK-2026-0016",
      customerName: "김민준", customerEmail: "minjun.kim@startup-a.com", customerOrganization: "스타트업A",
      customerId: customerIds[0],
      subject: "데이터베이스 연결 오류 - 운영 서버",
      description: "운영 서버에서 갑자기 'Database connection failed' 오류가 발생하고 있습니다. 서비스 전체가 중단된 상태입니다. 즉각적인 조치가 필요합니다.",
      status: "OPEN", priority: "URGENT",
      assigneeKey: "sujin", categoryName: "버그 신고", requestTypeKey: "incident", teamKey: "support",
      tags: ["DB", "장애", "긴급"],
      createdAtOffset: 0,
    },
    {
      number: "TK-2026-0017",
      customerName: "최지아", customerEmail: "jia.choi@samsung.com", customerOrganization: "삼성전자",
      customerId: customerIds[3],
      subject: "엔터프라이즈 플랜 계약 갱신 문의",
      description: "현재 엔터프라이즈 플랜을 사용 중인데 계약 만료일이 4월 30일입니다. 갱신 조건과 가격 조정 가능 여부에 대해 상담 받고 싶습니다.",
      status: "RESOLVED", priority: "MEDIUM",
      assigneeKey: "jihun", categoryName: "결제 문의", requestTypeKey: "contract", teamKey: "sales",
      tags: ["계약", "엔터프라이즈"],
      createdAtOffset: -8, firstResponseOffset: -8, resolvedAtOffset: -5,
    },
    {
      number: "TK-2026-0018",
      customerName: "송유진", customerEmail: "yujin.song@freelancer.kr",
      subject: "UI 언어를 영어로 변경하는 방법",
      description: "서비스 UI 언어를 한국어에서 영어로 변경하고 싶은데 방법을 모르겠습니다. 설정 어디에서 변경할 수 있나요?",
      status: "OPEN", priority: "LOW",
      categoryName: "기타", requestTypeKey: "general",
      tags: ["UI", "언어설정"],
      createdAtOffset: -1,
    },
    {
      number: "TK-2026-0019",
      customerName: "강은서", customerEmail: "eunseo.kang@sk.com", customerOrganization: "SK텔레콤",
      customerId: customerIds[5],
      subject: "XSS 보안 취약점 발견 신고",
      description: "저희 보안 감사 팀에서 서비스 내 XSS 취약점을 발견했습니다. 특정 입력 필드에서 스크립트 인젝션이 가능한 상태입니다. 보안 팀에서 직접 연락드려도 될까요?",
      status: "IN_PROGRESS", priority: "HIGH",
      assigneeKey: "dohyun", categoryName: "버그 신고", requestTypeKey: "incident", teamKey: "support",
      tags: ["보안", "XSS", "취약점"],
      createdAtOffset: -2, firstResponseOffset: -2,
    },
    {
      number: "TK-2026-0020",
      customerName: "임주원", customerEmail: "juwon.lim@nhn.com", customerOrganization: "NHN",
      customerId: customerIds[8],
      subject: "서브 계정 생성 권한 요청",
      description: "현재 메인 계정 하나를 팀원 5명이 공유해서 사용하고 있습니다. 각 팀원별 서브 계정을 생성할 수 있도록 권한을 추가해 주실 수 있나요?",
      status: "WAITING", priority: "MEDIUM",
      assigneeKey: "minji", categoryName: "계정 문제", requestTypeKey: "account", teamKey: "cs",
      tags: ["계정", "서브계정"],
      createdAtOffset: -3, firstResponseOffset: -3,
    },
    {
      number: "TK-2026-0021",
      customerName: "오민성", customerEmail: "minseong.oh@baemin.com", customerOrganization: "배달의민족",
      customerId: customerIds[10],
      subject: "API 서버 응답 지연 해결 완료 확인",
      description: "지난주에 신고드렸던 API 응답 지연 문제가 오늘도 재발했습니다. 임시 조치 이후 완전한 해결이 되지 않은 것 같습니다.",
      status: "RESOLVED", priority: "HIGH",
      assigneeKey: "sujin", categoryName: "버그 신고", requestTypeKey: "bug", teamKey: "support",
      tags: ["API", "성능"],
      createdAtOffset: -12, firstResponseOffset: -12, resolvedAtOffset: -7,
    },
    {
      number: "TK-2026-0022",
      customerName: "이도윤", customerEmail: "doyun.lee@techvision.co.kr", customerOrganization: "테크비전",
      customerId: customerIds[2],
      subject: "3월 청구 오류 환불 처리 완료 확인",
      description: "지난번 신고드린 3월 청구 오류에 대한 환불 처리가 완료되었나요? 아직 카드사에서 환불 확인이 안 되고 있습니다.",
      status: "CLOSED", priority: "MEDIUM",
      assigneeKey: "minseo", categoryName: "결제 문의", requestTypeKey: "payment", teamKey: "sales",
      tags: ["환불", "청구"],
      createdAtOffset: -15, firstResponseOffset: -15, resolvedAtOffset: -12, closedAtOffset: -10,
    },
    {
      number: "TK-2026-0023",
      customerName: "황준서", customerEmail: "junse.hwang@startup-b.io", customerOrganization: "스타트업B",
      customerId: customerIds[13],
      subject: "Slack 연동 기능 추가 요청",
      description: "Slack과의 연동 기능이 추가되면 매우 유용할 것 같습니다. 티켓 상태 변경 시 Slack 채널로 알림을 보내주는 기능을 요청드립니다.",
      status: "OPEN", priority: "LOW",
      categoryName: "기능 문의", requestTypeKey: "feature", teamKey: "product",
      tags: ["Slack", "연동", "기능요청"],
      createdAtOffset: -1,
    },
    {
      number: "TK-2026-0024",
      customerName: "한지민", customerEmail: "jimin.han@coupang.com", customerOrganization: "쿠팡",
      customerId: customerIds[9],
      subject: "대량 데이터 처리 중 메모리 오류 발생",
      description: "10만 건 이상의 데이터를 일괄 처리할 때 'OutOfMemoryError'가 발생합니다. 데이터 마이그레이션 작업이 불가능한 상황입니다. 긴급히 처리 부탁드립니다.",
      status: "IN_PROGRESS", priority: "URGENT",
      assigneeKey: "dohyun", categoryName: "버그 신고", requestTypeKey: "incident", teamKey: "support",
      tags: ["메모리", "대용량", "긴급"],
      createdAtOffset: -1, firstResponseOffset: -1,
    },
    {
      number: "TK-2026-0025",
      customerName: "서지현", customerEmail: "jihyun.seo@toss.im", customerOrganization: "토스",
      customerId: customerIds[11],
      subject: "계정 잠금 해제 요청",
      description: "비밀번호를 5회 이상 잘못 입력하여 계정이 잠겼습니다. 계정 잠금을 해제해 주시고, 비밀번호 재설정 링크를 이메일로 보내주세요.",
      status: "RESOLVED", priority: "MEDIUM",
      assigneeKey: "minji", categoryName: "계정 문제", requestTypeKey: "account", teamKey: "cs",
      tags: ["계정", "잠금"],
      createdAtOffset: -6, firstResponseOffset: -6, resolvedAtOffset: -5,
    },
  ];

  const allIds: string[] = [];
  const resolvedIds: { id: string; ticketNumber: string; email: string }[] = [];

  for (const t of ticketDefs) {
    const existing = await prisma.ticket.findUnique({ where: { ticketNumber: t.number } });
    if (existing) {
      allIds.push(existing.id);
      if (t.status === "RESOLVED" || t.status === "CLOSED") {
        resolvedIds.push({ id: existing.id, ticketNumber: existing.ticketNumber, email: existing.customerEmail });
      }
      continue;
    }

    const assigneeId = t.assigneeKey ? agentIds[t.assigneeKey] : null;
    const categoryId = t.categoryName ? categoryIds[t.categoryName] : null;
    const requestTypeId = t.requestTypeKey ? requestTypeIds[t.requestTypeKey] : null;
    const teamId = t.teamKey ? teamIds[t.teamKey] : null;

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: t.number,
        customerName: t.customerName,
        customerEmail: t.customerEmail,
        customerOrganization: t.customerOrganization ?? null,
        customerId: t.customerId ?? null,
        subject: t.subject,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assigneeId: assigneeId ?? null,
        categoryId: categoryId ?? null,
        requestTypeId: requestTypeId ?? null,
        teamId: teamId ?? null,
        source: t.source ?? "WEB",
        tags: JSON.stringify(t.tags ?? []),
        createdAt: d(t.createdAtOffset, 9),
        firstResponseAt: t.firstResponseOffset != null ? d(t.firstResponseOffset, 10) : null,
        resolvedAt: t.resolvedAtOffset != null ? d(t.resolvedAtOffset, 15) : null,
        closedAt: t.closedAtOffset != null ? d(t.closedAtOffset, 11) : null,
      },
    });

    allIds.push(ticket.id);
    if (t.status === "RESOLVED" || t.status === "CLOSED") {
      resolvedIds.push({ id: ticket.id, ticketNumber: ticket.ticketNumber, email: ticket.customerEmail });
    }

    // Create activity: CREATED
    await prisma.ticketActivity.create({
      data: {
        ticketId: ticket.id,
        actorType: "CUSTOMER",
        action: "CREATED",
        newValue: t.number,
        createdAt: d(t.createdAtOffset, 9),
      },
    });

    // Create activity: ASSIGNED (if has assignee)
    if (assigneeId) {
      await prisma.ticketActivity.create({
        data: {
          ticketId: ticket.id,
          actorType: "AGENT",
          actorId: assigneeId,
          action: "ASSIGNED",
          newValue: assigneeId,
          createdAt: d(t.createdAtOffset, 9),
        },
      });
    }

    // Create initial agent comment for non-OPEN tickets
    if (t.firstResponseOffset != null && assigneeId) {
      await prisma.comment.create({
        data: {
          ticketId: ticket.id,
          authorType: "AGENT",
          authorId: assigneeId,
          authorName: getAgentName(t.assigneeKey!),
          authorEmail: getAgentEmail(t.assigneeKey!),
          content: getFirstResponseComment(t.status, t.requestTypeKey),
          isInternal: false,
          createdAt: d(t.firstResponseOffset, 10),
        },
      });
    }

    // Create customer follow-up comment for WAITING tickets
    if (t.status === "WAITING") {
      await prisma.comment.create({
        data: {
          ticketId: ticket.id,
          authorType: "CUSTOMER",
          authorName: t.customerName,
          authorEmail: t.customerEmail,
          content: "추가 정보를 제공해 드렸습니다. 확인 부탁드립니다.",
          isInternal: false,
          createdAt: d((t.firstResponseOffset ?? t.createdAtOffset) + 1, 14),
        },
      });
    }

    // Create resolution comment for RESOLVED/CLOSED tickets
    if ((t.status === "RESOLVED" || t.status === "CLOSED") && assigneeId && t.resolvedAtOffset != null) {
      await prisma.comment.create({
        data: {
          ticketId: ticket.id,
          authorType: "AGENT",
          authorId: assigneeId,
          authorName: getAgentName(t.assigneeKey!),
          authorEmail: getAgentEmail(t.assigneeKey!),
          content: "안녕하세요. 문의하신 사항이 해결되었습니다. 추가 문의사항이 있으시면 언제든지 연락해 주세요. 감사합니다.",
          isInternal: false,
          createdAt: d(t.resolvedAtOffset, 15),
        },
      });

      await prisma.ticketActivity.create({
        data: {
          ticketId: ticket.id,
          actorType: "AGENT",
          actorId: assigneeId,
          action: "STATUS_CHANGED",
          oldValue: "IN_PROGRESS",
          newValue: "RESOLVED",
          createdAt: d(t.resolvedAtOffset, 15),
        },
      });
    }
  }

  return { allIds, resolvedIds };
}

function getAgentName(key: string): string {
  const names: Record<string, string> = {
    sujin: "이수진",
    dohyun: "박도현",
    minseo: "최민서",
    jihun: "김지훈",
    minji: "이민지",
    hyunwoo: "강현우",
  };
  return names[key] ?? "상담원";
}

function getAgentEmail(key: string): string {
  const emails: Record<string, string> = {
    sujin: "agent1@suppo.io",
    dohyun: "agent2@suppo.io",
    minseo: "agent3@suppo.io",
    jihun: "agent4@suppo.io",
    minji: "agent5@suppo.io",
    hyunwoo: "agent6@suppo.io",
  };
  return emails[key] ?? "agent@suppo.io";
}

function getFirstResponseComment(status: string, requestTypeKey?: string): string {
  if (requestTypeKey === "incident") {
    return "안녕하세요. 접수하신 장애 신고를 확인했습니다. 현재 담당 엔지니어가 즉시 확인 중이며, 빠른 시간 내에 조치하겠습니다. 진행 상황은 이 티켓을 통해 업데이트해 드리겠습니다.";
  }
  if (requestTypeKey === "bug") {
    return "안녕하세요. 문의하신 버그를 접수했습니다. 재현 환경을 확인 중이며, 추가적인 정보가 필요한 경우 연락드리겠습니다.";
  }
  if (requestTypeKey === "account") {
    return "안녕하세요. 계정 관련 문의를 접수했습니다. 보안 확인 절차 후 처리해 드리겠습니다. 잠시만 기다려 주세요.";
  }
  if (requestTypeKey === "payment") {
    return "안녕하세요. 결제 관련 문의를 접수했습니다. 청구 내역을 확인 후 처리해 드리겠습니다.";
  }
  return "안녕하세요. 문의 주셔서 감사합니다. 접수된 내용을 검토하고 있으며, 빠른 시간 내에 답변드리겠습니다.";
}

// ─── Response Templates ────────────────────────────────────────────────────────

export async function seedResponseTemplates(
  prisma: PrismaClient,
  opts: {
    categoryIds: Record<string, string>;
    requestTypeIds: Record<string, string>;
    adminId: string;
  }
): Promise<void> {
  const { categoryIds, requestTypeIds, adminId } = opts;

  const templates = [
    {
      title: "초기 접수 확인 인사",
      content: `안녕하세요, {{customer.name}}님.

{{company.name}} 고객 지원팀입니다.

문의해 주신 내용(티켓 번호: {{ticket.number}})을 접수했습니다. 담당자가 검토 후 빠른 시간 내에 답변드리겠습니다.

감사합니다.
{{agent.name}} 드림`,
      categoryId: null,
      requestTypeKey: null,
      isRecommended: true,
      sortOrder: 1,
    },
    {
      title: "버그 재현 정보 요청",
      content: `안녕하세요, {{customer.name}}님.

문의하신 버그 내용을 확인했습니다. 정확한 원인 분석을 위해 아래 정보를 추가로 제공해 주시면 감사하겠습니다.

1. 버그가 발생하는 정확한 단계 (재현 방법)
2. 사용 중인 브라우저 및 버전
3. 발생 시점 및 빈도 (항상 발생 / 간헐적 발생)
4. 오류 메시지 또는 스크린샷
5. 사용 중인 운영체제

빠른 처리를 위해 협조해 주셔서 감사합니다.`,
      categoryName: "버그 신고",
      requestTypeKey: "bug",
      isRecommended: true,
      sortOrder: 2,
    },
    {
      title: "버그 수정 완료 안내",
      content: `안녕하세요, {{customer.name}}님.

문의하신 버그({{ticket.number}})가 수정 완료되었습니다.

수정 내용: [수정 내용을 간략히 입력하세요]
배포 일시: [배포 일시 입력]

서비스를 다시 이용해 보시고, 동일한 문제가 발생하면 언제든지 연락 주세요.

이용해 주셔서 감사합니다.
{{agent.name}} 드림`,
      categoryName: "버그 신고",
      requestTypeKey: "bug",
      isRecommended: false,
      sortOrder: 3,
    },
    {
      title: "기능 요청 검토 안내",
      content: `안녕하세요, {{customer.name}}님.

소중한 기능 제안({{ticket.number}}) 감사합니다.

제안해 주신 기능을 제품 팀에서 검토할 예정입니다. 개발 로드맵에 반영 여부는 내부 검토 후 별도로 안내드리겠습니다.

더 나은 서비스를 만들기 위한 의견을 주셔서 감사합니다.
{{agent.name}} 드림`,
      categoryName: "기능 문의",
      requestTypeKey: "feature",
      isRecommended: true,
      sortOrder: 4,
    },
    {
      title: "기능 개발 반영 확정 안내",
      content: `안녕하세요, {{customer.name}}님.

제안해 주신 기능이 다음 개발 사이클에 반영되기로 결정되었습니다.

예상 출시 일정: [출시 일정 입력]

출시 후 별도로 안내드리겠습니다. 좋은 제안 감사합니다!
{{agent.name}} 드림`,
      categoryName: "기능 문의",
      requestTypeKey: "feature",
      isRecommended: false,
      sortOrder: 5,
    },
    {
      title: "비밀번호 재설정 안내",
      content: `안녕하세요, {{customer.name}}님.

비밀번호 재설정 방법을 안내드립니다.

1. 로그인 페이지에서 "비밀번호 찾기" 클릭
2. 가입 시 사용한 이메일 주소 입력
3. 발송된 재설정 링크 클릭 (유효시간: 30분)
4. 새 비밀번호 입력 및 확인

이메일이 수신되지 않는 경우, 스팸함을 확인하거나 이 티켓에 회신해 주세요.

감사합니다.`,
      categoryName: "계정 문제",
      requestTypeKey: "account",
      isRecommended: true,
      sortOrder: 6,
    },
    {
      title: "계정 잠금 해제 안내",
      content: `안녕하세요, {{customer.name}}님.

계정 잠금이 해제되었습니다. 보안을 위해 비밀번호 변경을 권장드립니다.

계정 이메일: {{customer.email}}
잠금 해제 일시: [현재 일시]

로그인 후 설정 > 보안 메뉴에서 비밀번호를 변경해 주세요.

감사합니다.`,
      categoryName: "계정 문제",
      requestTypeKey: "account",
      isRecommended: false,
      sortOrder: 7,
    },
    {
      title: "환불 처리 안내",
      content: `안녕하세요, {{customer.name}}님.

환불 요청이 처리되었습니다.

환불 금액: [금액 입력]
처리 일자: [처리 일자 입력]
예상 입금일: 영업일 기준 3~5일 이내

카드사 정책에 따라 실제 입금까지 다소 시간이 걸릴 수 있습니다.

추가 문의사항이 있으시면 언제든지 연락 주세요.
{{agent.name}} 드림`,
      categoryName: "결제 문의",
      requestTypeKey: "payment",
      isRecommended: true,
      sortOrder: 8,
    },
    {
      title: "청구 오류 확인 요청",
      content: `안녕하세요, {{customer.name}}님.

청구 관련 문의를 접수했습니다. 정확한 확인을 위해 아래 정보를 제공해 주시면 감사하겠습니다.

1. 오류가 발생한 청구 기간
2. 청구서 번호 또는 거래 ID
3. 예상 청구 금액과 실제 청구 금액의 차이

영수증이나 청구서 사본을 첨부해 주시면 더욱 빠른 처리가 가능합니다.

감사합니다.`,
      categoryName: "결제 문의",
      requestTypeKey: "payment",
      isRecommended: false,
      sortOrder: 9,
    },
    {
      title: "장애 인지 및 대응 중 안내",
      content: `안녕하세요, {{customer.name}}님.

신고하신 장애({{ticket.number}})를 확인했습니다.

현재 상황: 담당 엔지니어가 즉시 원인 분석을 시작했습니다.
예상 복구 시간: [예상 시간 입력]

진행 상황은 이 티켓을 통해 30분 간격으로 업데이트해 드리겠습니다. 불편을 드려 죄송합니다.

{{agent.name}} 드림`,
      categoryName: null,
      requestTypeKey: "incident",
      isRecommended: true,
      sortOrder: 10,
    },
    {
      title: "장애 해결 완료 안내",
      content: `안녕하세요, {{customer.name}}님.

신고하신 장애가 해결되었습니다.

장애 원인: [원인 입력]
해결 조치: [조치 내용 입력]
복구 완료 시각: [복구 시각 입력]

서비스 이용에 불편을 드려 진심으로 사과드립니다. 재발 방지를 위한 조치도 함께 진행하겠습니다.

이용해 주셔서 감사합니다.
{{agent.name}} 드림`,
      categoryName: null,
      requestTypeKey: "incident",
      isRecommended: false,
      sortOrder: 11,
    },
    {
      title: "문의 해결 완료 종결 안내",
      content: `안녕하세요, {{customer.name}}님.

문의하신 내용({{ticket.number}})이 해결되었습니다.

추가적으로 도움이 필요하신 경우 언제든지 새로운 티켓을 생성하거나 이 티켓에 회신해 주세요.

항상 저희 서비스를 이용해 주셔서 감사합니다.
{{agent.name}} 드림`,
      categoryName: null,
      requestTypeKey: null,
      isRecommended: true,
      sortOrder: 12,
    },
  ];

  for (const tmpl of templates) {
    const categoryId = tmpl.categoryName ? categoryIds[tmpl.categoryName] : null;
    const requestTypeId = tmpl.requestTypeKey ? requestTypeIds[tmpl.requestTypeKey] : null;

    const existing = await prisma.responseTemplate.findFirst({ where: { title: tmpl.title } });
    if (!existing) {
      await prisma.responseTemplate.create({
        data: {
          title: tmpl.title,
          content: tmpl.content,
          categoryId: categoryId ?? null,
          requestTypeId: requestTypeId ?? null,
          createdById: adminId,
          isShared: true,
          isRecommended: tmpl.isRecommended,
          sortOrder: tmpl.sortOrder,
          variables: [
            { name: "customer.name", description: "고객 이름" },
            { name: "customer.email", description: "고객 이메일" },
            { name: "ticket.number", description: "티켓 번호" },
            { name: "agent.name", description: "담당자 이름" },
            { name: "company.name", description: "회사명" },
          ],
        },
      });
    }
  }
}

// ─── Knowledge Base ────────────────────────────────────────────────────────────

export async function seedKnowledgeBase(
  prisma: PrismaClient,
  authorId: string
): Promise<void> {
  const categories = [
    { key: "getting-started", name: "시작하기", slug: "getting-started", description: "서비스를 처음 시작하는 분들을 위한 가이드", sortOrder: 1 },
    { key: "account", name: "계정 관리", slug: "account-management", description: "계정, 보안, 권한 관련 안내", sortOrder: 2 },
    { key: "billing", name: "결제 및 청구", slug: "billing", description: "결제 수단, 청구서, 환불 안내", sortOrder: 3 },
    { key: "api", name: "API 및 개발자", slug: "api-developer", description: "API 연동 및 개발자 가이드", sortOrder: 4 },
  ];

  const catIds: Record<string, string> = {};
  for (const cat of categories) {
    const c = await prisma.knowledgeCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, sortOrder: cat.sortOrder },
      create: { name: cat.name, slug: cat.slug, description: cat.description, sortOrder: cat.sortOrder, isActive: true },
    });
    catIds[cat.key] = c.id;
  }

  const articles = [
    {
      title: "서비스 시작 가이드 (Getting Started)",
      slug: "getting-started-guide",
      categoryKey: "getting-started",
      excerpt: "Suppo 서비스를 처음 시작하는 방법을 단계별로 안내합니다.",
      content: `# 서비스 시작 가이드

## 1. 계정 생성

1. 홈페이지에서 **회원가입** 버튼 클릭
2. 이름, 이메일, 비밀번호 입력
3. 이메일 인증 완료

## 2. 첫 번째 티켓 생성

로그인 후 상단 메뉴에서 **새 문의 작성**을 클릭하여 첫 번째 지원 요청을 생성하세요.

- 제목: 문의 내용을 간략히 요약
- 카테고리: 해당되는 문의 유형 선택
- 내용: 자세한 내용 입력
- 첨부파일: 관련 파일이 있다면 첨부

## 3. 티켓 상태 확인

**내 티켓** 메뉴에서 제출한 티켓의 처리 상태를 실시간으로 확인할 수 있습니다.

- **접수됨**: 티켓 생성 완료
- **처리 중**: 담당자가 검토 중
- **답변 대기**: 추가 정보 요청
- **해결됨**: 문제 해결 완료

## 4. 추가 도움말

더 자세한 내용은 이 지식 베이스의 다른 문서를 참고하거나, 고객 지원팀에 문의해 주세요.`,
      isPublished: true,
      isPublic: true,
      viewCount: 1234,
      tags: ["시작", "가이드", "기초"],
    },
    {
      title: "팀원 초대 및 권한 관리",
      slug: "team-member-invite",
      categoryKey: "getting-started",
      excerpt: "새로운 팀원을 초대하고 권한을 설정하는 방법을 안내합니다.",
      content: `# 팀원 초대 및 권한 관리

## 팀원 초대하기

1. **관리자 설정** → **팀원 관리** 메뉴 이동
2. **팀원 초대** 버튼 클릭
3. 초대할 팀원의 이메일 주소 입력
4. 권한 레벨 선택 후 **초대 발송**

초대받은 팀원은 이메일의 링크를 클릭하여 계정을 활성화할 수 있습니다.

## 권한 레벨

| 권한 | 설명 |
|------|------|
| **관리자** | 모든 설정 변경 가능 |
| **상담원** | 티켓 처리 가능 |
| **조회자** | 티켓 조회만 가능 |

## 권한 변경

기존 팀원의 권한은 **팀원 목록**에서 해당 팀원의 권한 드롭다운을 변경하여 수정할 수 있습니다.`,
      isPublished: true,
      isPublic: true,
      viewCount: 756,
      tags: ["팀원", "초대", "권한"],
    },
    {
      title: "비밀번호 변경 방법",
      slug: "change-password",
      categoryKey: "account",
      excerpt: "계정 비밀번호를 변경하거나 잊어버린 경우 재설정하는 방법을 안내합니다.",
      content: `# 비밀번호 변경 방법

## 로그인 상태에서 변경

1. 우측 상단 프로필 아이콘 클릭
2. **계정 설정** 선택
3. **보안** 탭 이동
4. **비밀번호 변경** 클릭
5. 현재 비밀번호 및 새 비밀번호 입력

## 비밀번호를 잊어버린 경우

1. 로그인 페이지에서 **비밀번호를 잊으셨나요?** 클릭
2. 가입 시 사용한 이메일 주소 입력
3. 이메일로 발송된 재설정 링크 클릭
4. 새 비밀번호 설정 (링크 유효시간: 30분)

## 안전한 비밀번호 설정

- 최소 8자 이상
- 영문 대소문자, 숫자, 특수문자 조합 권장
- 타 서비스와 동일한 비밀번호 사용 자제`,
      isPublished: true,
      isPublic: true,
      viewCount: 2341,
      tags: ["비밀번호", "계정", "보안"],
    },
    {
      title: "2단계 인증(2FA) 설정 방법",
      slug: "setup-2fa",
      categoryKey: "account",
      excerpt: "계정 보안을 강화하는 2단계 인증(2FA) 설정 방법을 안내합니다.",
      content: `# 2단계 인증(2FA) 설정 방법

2단계 인증(2FA)을 활성화하면 비밀번호 유출 시에도 계정을 보호할 수 있습니다.

## 설정 방법

1. **계정 설정** → **보안** 탭 이동
2. **2단계 인증** 섹션에서 **활성화** 클릭
3. 인증 방법 선택:
   - **SMS**: 등록된 휴대폰으로 코드 수신
   - **인증 앱**: Google Authenticator, Authy 등 사용

### 인증 앱 설정 방법

1. 스마트폰에 인증 앱 설치 (Google Authenticator 권장)
2. 화면에 표시된 QR 코드 스캔
3. 앱에 표시된 6자리 코드 입력하여 확인
4. 백업 코드 저장 (분실 시 필요)

## 2FA 비활성화

2FA를 비활성화하려면 **보안** 탭에서 **비활성화** 버튼을 클릭하고 인증 코드를 입력하세요.

> ⚠️ 보안을 위해 2FA 활성화를 강력히 권장합니다.`,
      isPublished: true,
      isPublic: true,
      viewCount: 1102,
      tags: ["2FA", "보안", "인증"],
    },
    {
      title: "결제 수단 등록 및 변경",
      slug: "payment-method",
      categoryKey: "billing",
      excerpt: "신용카드 등 결제 수단을 등록하거나 변경하는 방법을 안내합니다.",
      content: `# 결제 수단 등록 및 변경

## 결제 수단 등록

1. **계정 설정** → **결제 정보** 이동
2. **결제 수단 추가** 클릭
3. 카드 정보 입력 (카드 번호, 유효기간, CVC)
4. **저장** 클릭

지원 결제 수단: 비자(Visa), 마스터카드(Mastercard), 아메리칸 익스프레스, 국내 신용카드

## 결제 수단 변경

1. **결제 정보** 페이지에서 변경할 카드 옆 **편집** 클릭
2. 새 카드 정보 입력
3. **기본 결제 수단으로 설정** 체크 후 저장

## 자동 갱신 설정

구독 만료 전 자동 갱신을 원하시면 **자동 갱신** 옵션을 활성화하세요.`,
      isPublished: true,
      isPublic: true,
      viewCount: 876,
      tags: ["결제", "카드", "청구"],
    },
    {
      title: "영수증 및 청구서 발급 방법",
      slug: "invoice-receipt",
      categoryKey: "billing",
      excerpt: "결제 영수증과 세금계산서를 발급받는 방법을 안내합니다.",
      content: `# 영수증 및 청구서 발급 방법

## 영수증 다운로드

1. **계정 설정** → **결제 내역** 이동
2. 해당 결제 내역에서 **영수증 다운로드** 클릭
3. PDF 형태로 저장

## 세금계산서 발급

사업자 고객의 경우 세금계산서 발급이 가능합니다.

1. **결제 정보** → **사업자 정보** 섹션 이동
2. 사업자등록번호, 상호명, 대표자명 입력
3. 매월 10일 전월 이용분에 대한 세금계산서 자동 발행

## 정기 청구서 수신

청구서를 이메일로 받으시려면:
1. **알림 설정** → **이메일 알림** 이동
2. **청구서 발행 시 이메일 수신** 활성화`,
      isPublished: true,
      isPublic: true,
      viewCount: 543,
      tags: ["영수증", "청구서", "세금계산서"],
    },
    {
      title: "환불 정책 안내",
      slug: "refund-policy",
      categoryKey: "billing",
      excerpt: "서비스 환불 정책과 환불 신청 방법을 안내합니다.",
      content: `# 환불 정책 안내

## 환불 가능 조건

- 결제일로부터 **7일 이내** 미사용 시 전액 환불
- 서비스 장애로 인한 서비스 불가 시 해당 기간 비례 환불
- 연간 플랜의 경우 남은 기간에 대해 비례 환불

## 환불 불가 조건

- 7일 초과 후 단순 변심
- 이미 사용된 서비스 이용량

## 환불 신청 방법

1. 고객 지원팀에 **환불 요청 티켓** 생성
2. 주문 번호 및 환불 사유 기재
3. 영업일 기준 1~2일 내 처리 완료

## 환불 소요 시간

카드사에 따라 다르나 일반적으로 영업일 기준 **3~5일** 소요됩니다.`,
      isPublished: true,
      isPublic: true,
      viewCount: 987,
      tags: ["환불", "정책", "결제"],
    },
    {
      title: "API 키 발급 및 관리",
      slug: "api-key-management",
      categoryKey: "api",
      excerpt: "API 연동을 위한 API 키 발급과 안전한 관리 방법을 안내합니다.",
      content: `# API 키 발급 및 관리

## API 키 발급

1. **계정 설정** → **개발자** 탭 이동
2. **API 키 생성** 클릭
3. API 키 이름 입력 (용도 구분을 위해 명확하게 작성)
4. 권한 범위 선택 (읽기 전용 / 읽기+쓰기)
5. **생성** 클릭 후 키 복사 (최초 1회만 표시)

> ⚠️ API 키는 생성 시 한 번만 표시됩니다. 반드시 안전한 곳에 저장하세요.

## API 키 사용

HTTP 요청 헤더에 API 키를 포함:

\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

## 보안 주의사항

- API 키를 코드에 직접 하드코딩하지 마세요
- 환경변수나 비밀 관리 서비스 사용 권장
- 정기적으로 API 키 교체 권장
- 미사용 API 키는 즉시 삭제

## API 키 삭제

**개발자** 탭에서 삭제할 키 옆 **삭제** 버튼 클릭. 즉시 해당 키로의 접근이 차단됩니다.`,
      isPublished: true,
      isPublic: true,
      viewCount: 2156,
      tags: ["API", "개발자", "인증"],
    },
    {
      title: "웹훅(Webhook) 설정 방법",
      slug: "webhook-setup",
      categoryKey: "api",
      excerpt: "이벤트 발생 시 자동으로 알림을 받을 수 있는 웹훅 설정 방법을 안내합니다.",
      content: `# 웹훅(Webhook) 설정 방법

웹훅을 사용하면 티켓 생성, 상태 변경 등 이벤트 발생 시 지정한 URL로 자동 알림을 받을 수 있습니다.

## 웹훅 추가

1. **계정 설정** → **개발자** → **웹훅** 탭 이동
2. **웹훅 추가** 클릭
3. 수신할 URL 입력 (HTTPS 필수)
4. 구독할 이벤트 선택:
   - \`ticket.created\` - 새 티켓 생성
   - \`ticket.updated\` - 티켓 상태 변경
   - \`ticket.resolved\` - 티켓 해결
   - \`comment.created\` - 새 댓글 추가
5. **저장** 클릭

## 웹훅 페이로드

\`\`\`json
{
  "event": "ticket.created",
  "timestamp": "2026-03-21T10:00:00Z",
  "data": {
    "ticketId": "...",
    "ticketNumber": "TK-2026-0001",
    "subject": "문의 제목",
    "status": "OPEN"
  }
}
\`\`\`

## 웹훅 검증

보안을 위해 요청 헤더의 \`X-Suppo-Signature\`를 검증하세요.`,
      isPublished: true,
      isPublic: false,
      viewCount: 634,
      tags: ["웹훅", "API", "개발자"],
    },
    {
      title: "데이터 내보내기 방법",
      slug: "data-export",
      categoryKey: "getting-started",
      excerpt: "티켓 데이터와 통계를 CSV, Excel 형식으로 내보내는 방법을 안내합니다.",
      content: `# 데이터 내보내기 방법

## 티켓 데이터 내보내기

1. **티켓 목록** 페이지에서 원하는 필터 설정
2. 우측 상단 **내보내기** 버튼 클릭
3. 파일 형식 선택 (CSV / Excel)
4. 내보낼 기간 설정
5. **다운로드** 클릭

## 내보내기 포함 데이터

| 항목 | 설명 |
|------|------|
| 티켓 번호 | 고유 식별 번호 |
| 제목 | 문의 제목 |
| 상태 | 현재 처리 상태 |
| 우선순위 | 긴급/높음/보통/낮음 |
| 담당자 | 배정된 상담원 |
| 생성일시 | 티켓 생성 시각 |
| 해결일시 | 문제 해결 시각 |

## 주의사항

- 대용량 데이터는 처리 시간이 걸릴 수 있습니다
- 한글 포함 CSV 파일은 Excel에서 열 때 UTF-8로 열기 필요
- 내보내기 이력은 **보고서** 메뉴에서 확인 가능`,
      isPublished: true,
      isPublic: true,
      viewCount: 445,
      tags: ["데이터", "내보내기", "Excel"],
    },
  ];

  const publishedAt = new Date("2026-01-15T09:00:00.000Z");

  for (const article of articles) {
    const existing = await prisma.knowledgeArticle.findUnique({ where: { slug: article.slug } });
    if (!existing) {
      await prisma.knowledgeArticle.create({
        data: {
          title: article.title,
          slug: article.slug,
          content: article.content,
          excerpt: article.excerpt,
          categoryId: catIds[article.categoryKey],
          authorId: authorId,
          isPublished: article.isPublished,
          isPublic: article.isPublic,
          publishedAt: article.isPublished ? publishedAt : null,
          viewCount: article.viewCount,
          tags: article.tags,
        },
      });
    }
  }
}

// ─── Agent Absences ────────────────────────────────────────────────────────────

export async function seedAgentAbsences(
  prisma: PrismaClient,
  agentIds: Record<string, string>,
  adminId: string
): Promise<void> {
  const absences = [
    {
      agentKey: "sujin",
      title: "연차 휴가",
      description: "개인 연차",
      type: AbsenceType.VACATION,
      startDate: new Date("2026-03-25"),
      endDate: new Date("2026-03-27"),
    },
    {
      agentKey: "dohyun",
      title: "외부 교육",
      description: "AWS 클라우드 교육 과정 참석",
      type: AbsenceType.TRAINING,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-04-02"),
    },
    {
      agentKey: "minseo",
      title: "병가",
      description: null,
      type: AbsenceType.SICK_LEAVE,
      startDate: new Date("2026-03-22"),
      endDate: new Date("2026-03-22"),
    },
    {
      agentKey: "jihun",
      title: "부산 고객사 출장",
      description: "현대자동차 계약 갱신 미팅",
      type: AbsenceType.BUSINESS_TRIP,
      startDate: new Date("2026-03-28"),
      endDate: new Date("2026-03-31"),
    },
    {
      agentKey: "hyunwoo",
      title: "연차 휴가",
      description: "봄 여행",
      type: AbsenceType.VACATION,
      startDate: new Date("2026-04-07"),
      endDate: new Date("2026-04-11"),
    },
    {
      agentKey: "minji",
      title: "재택근무",
      description: "아파트 공사 기간 재택 승인",
      type: AbsenceType.REMOTE_WORK,
      startDate: new Date("2026-03-24"),
      endDate: new Date("2026-03-28"),
    },
  ];

  for (const absence of absences) {
    const agentId = agentIds[absence.agentKey];
    if (!agentId) continue;

    const existing = await prisma.agentAbsence.findFirst({
      where: { agentId, startDate: absence.startDate, title: absence.title },
    });
    if (!existing) {
      await prisma.agentAbsence.create({
        data: {
          agentId,
          title: absence.title,
          description: absence.description,
          type: absence.type,
          startDate: absence.startDate,
          endDate: absence.endDate,
          isAllDay: true,
          createdById: adminId,
        },
      });
    }
  }
}

// ─── Audit Logs ────────────────────────────────────────────────────────────────

export async function seedAuditLogs(
  prisma: PrismaClient,
  agentIds: Record<string, string>,
  adminId: string
): Promise<void> {
  const now = new Date("2026-03-21T10:00:00.000Z");
  const d = (offsetDays: number, h = 9) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + offsetDays);
    dt.setHours(h, Math.floor(Math.random() * 60), 0, 0);
    return dt;
  };

  const logs = [
    {
      actorId: adminId, actorName: "관리자", actorEmail: "admin@suppo.io",
      action: AuditAction.LOGIN, resourceType: "Session", description: "관리자 로그인",
      createdAt: d(0, 9), ipAddress: "192.168.1.100",
    },
    {
      actorId: adminId, actorName: "관리자", actorEmail: "admin@suppo.io",
      action: AuditAction.CREATE, resourceType: "Agent", description: "새 상담원 계정 생성: 이민지",
      newValue: { name: "이민지", email: "agent5@suppo.io", role: "AGENT" },
      createdAt: d(-1, 10),
    },
    {
      actorId: adminId, actorName: "관리자", actorEmail: "admin@suppo.io",
      action: AuditAction.CREATE, resourceType: "Agent", description: "새 상담원 계정 생성: 강현우",
      newValue: { name: "강현우", email: "agent6@suppo.io", role: "AGENT" },
      createdAt: d(-1, 10),
    },
    {
      actorId: adminId, actorName: "관리자", actorEmail: "admin@suppo.io",
      action: AuditAction.SETTINGS_CHANGE, resourceType: "SystemSettings", description: "SLA 정책 업데이트: 긴급 SLA 첫 응답 시간 변경",
      oldValue: { firstResponseHours: 2 }, newValue: { firstResponseHours: 1 },
      createdAt: d(-3, 14),
    },
    {
      actorId: adminId, actorName: "관리자", actorEmail: "admin@suppo.io",
      action: AuditAction.CREATE, resourceType: "Team", description: "새 팀 생성: 제품팀",
      newValue: { name: "제품팀", description: "기능 요청 및 제품 개선 처리" },
      createdAt: d(-5, 11),
    },
    {
      actorId: agentIds.sujin ?? adminId, actorName: "이수진", actorEmail: "agent1@suppo.io",
      action: AuditAction.ASSIGN, resourceType: "Ticket", resourceId: "TK-2026-0001",
      description: "티켓 TK-2026-0001 자신에게 할당",
      createdAt: d(0, 9),
    },
    {
      actorId: agentIds.dohyun ?? adminId, actorName: "박도현", actorEmail: "agent2@suppo.io",
      action: AuditAction.STATUS_CHANGE, resourceType: "Ticket", resourceId: "TK-2026-0002",
      description: "티켓 상태 변경: OPEN → IN_PROGRESS",
      oldValue: { status: "OPEN" }, newValue: { status: "IN_PROGRESS" },
      createdAt: d(-1, 10),
    },
    {
      actorId: agentIds.minseo ?? adminId, actorName: "최민서", actorEmail: "agent3@suppo.io",
      action: AuditAction.STATUS_CHANGE, resourceType: "Ticket", resourceId: "TK-2026-0007",
      description: "티켓 상태 변경: IN_PROGRESS → RESOLVED",
      oldValue: { status: "IN_PROGRESS" }, newValue: { status: "RESOLVED" },
      createdAt: d(-6, 15),
    },
    {
      actorId: adminId, actorName: "관리자", actorEmail: "admin@suppo.io",
      action: AuditAction.UPDATE, resourceType: "ResponseTemplate", description: "응답 템플릿 수정: 초기 접수 확인 인사",
      createdAt: d(-7, 16),
    },
    {
      actorId: adminId, actorName: "관리자", actorEmail: "admin@suppo.io",
      action: AuditAction.CREATE, resourceType: "KnowledgeArticle", description: "지식 베이스 아티클 등록: 서비스 시작 가이드",
      createdAt: d(-15, 10),
    },
    {
      actorId: agentIds.jihun ?? adminId, actorName: "김지훈", actorEmail: "agent4@suppo.io",
      action: AuditAction.LOGIN, resourceType: "Session", description: "상담원 로그인",
      createdAt: d(0, 8), ipAddress: "10.0.0.55",
    },
    {
      actorId: adminId, actorName: "관리자", actorEmail: "admin@suppo.io",
      action: AuditAction.DEACTIVATE, resourceType: "Agent", description: "상담원 비활성화 (퇴사 처리)",
      createdAt: d(-20, 11),
    },
    {
      actorId: adminId, actorName: "관리자", actorEmail: "admin@suppo.io",
      action: AuditAction.SETTINGS_CHANGE, resourceType: "SystemBranding", description: "시스템 브랜딩 설정 변경: 회사명 업데이트",
      oldValue: { companyName: "Helpdesk" }, newValue: { companyName: "Suppo" },
      createdAt: d(-30, 14),
    },
    {
      actorId: agentIds.sujin ?? adminId, actorName: "이수진", actorEmail: "agent1@suppo.io",
      action: AuditAction.TRANSFER, resourceType: "Ticket", resourceId: "TK-2026-0012",
      description: "티켓 TK-2026-0012 담당자 이관: 이수진 → 박도현",
      createdAt: d(-4, 11),
    },
    {
      actorId: adminId, actorName: "관리자", actorEmail: "admin@suppo.io",
      action: AuditAction.EXPORT, resourceType: "Report", description: "월간 운영 보고서 Excel 내보내기",
      createdAt: d(-10, 9), metadata: { format: "EXCEL", period: "2026-02" },
    },
    {
      actorId: agentIds.hyunwoo ?? adminId, actorName: "강현우", actorEmail: "agent6@suppo.io",
      action: AuditAction.LOGIN, resourceType: "Session", description: "상담원 로그인",
      createdAt: d(-2, 9), ipAddress: "172.16.0.23",
    },
    {
      actorId: adminId, actorName: "관리자", actorEmail: "admin@suppo.io",
      action: AuditAction.CREATE, resourceType: "RequestType", description: "문의 유형 생성: 장애 신고",
      newValue: { name: "장애 신고", defaultPriority: "URGENT" },
      createdAt: d(-25, 15),
    },
    {
      actorId: adminId, actorName: "관리자", actorEmail: "admin@suppo.io",
      action: AuditAction.PASSWORD_RESET, resourceType: "Agent", description: "상담원 비밀번호 초기화: 최민서",
      createdAt: d(-12, 13),
    },
    {
      actorId: agentIds.minji ?? adminId, actorName: "이민지", actorEmail: "agent5@suppo.io",
      action: AuditAction.USE, resourceType: "ResponseTemplate", description: "응답 템플릿 사용: 계정 잠금 해제 안내",
      createdAt: d(-6, 15),
    },
    {
      actorId: agentIds.dohyun ?? adminId, actorName: "박도현", actorEmail: "agent2@suppo.io",
      action: AuditAction.PRIORITY_CHANGE, resourceType: "Ticket", resourceId: "TK-2026-0019",
      description: "티켓 우선순위 변경: MEDIUM → HIGH",
      oldValue: { priority: "MEDIUM" }, newValue: { priority: "HIGH" },
      createdAt: d(-2, 11),
    },
  ];

  for (const log of logs) {
    await prisma.auditLog.create({
      data: {
        actorId: log.actorId,
        actorType: AuthorType.AGENT,
        actorName: log.actorName,
        actorEmail: log.actorEmail,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId ?? null,
        description: log.description,
        oldValue: toAuditJsonValue(log.oldValue),
        newValue: toAuditJsonValue(log.newValue),
        metadata: toAuditJsonValue(log.metadata),
        ipAddress: log.ipAddress ?? null,
        createdAt: log.createdAt,
      },
    });
  }
}

// ─── CSAT ──────────────────────────────────────────────────────────────────────

export async function seedCSAT(
  prisma: PrismaClient,
  resolvedTickets: { id: string; ticketNumber: string; email: string }[]
): Promise<void> {
  const responses = [
    { rating: 5, comment: "매우 빠르고 친절하게 해결해 주셨습니다. 감사합니다!" },
    { rating: 4, comment: "처리가 빨랐습니다. 다음에도 잘 부탁드립니다." },
    { rating: 5, comment: "문제를 정확하게 파악하고 신속하게 해결해 주셨어요." },
    { rating: 3, comment: "해결은 됐지만 시간이 조금 걸렸습니다." },
    { rating: 5, comment: "상담원이 매우 전문적이었습니다. 훌륭한 서비스!" },
  ];

  for (let i = 0; i < Math.min(resolvedTickets.length, responses.length); i++) {
    const ticket = resolvedTickets[i];
    const response = responses[i];

    const existing = await prisma.customerSatisfaction.findUnique({ where: { ticketId: ticket.id } });
    if (!existing) {
      await prisma.customerSatisfaction.create({
        data: {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          customerEmail: ticket.email,
          rating: response.rating,
          comment: response.comment,
        },
      });
    }
  }
}
