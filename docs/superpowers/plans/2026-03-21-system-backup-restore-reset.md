# System Backup / Restore / Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 설정에 전체 데이터 백업(ZIP 다운로드), 복구(ZIP 업로드 → 전체 덮어쓰기), 선택적 초기화 기능을 추가한다.

**Architecture:** 세 개의 API 라우트(`/api/admin/system/backup|restore|reset`) + 비즈니스 로직 라이브러리(`src/lib/system/`) + `/admin/settings/system` 설정 페이지. ZIP 처리는 `jszip`, 첨부파일은 로컬 파일시스템 직접 조작. 복구 시 모든 테이블을 FK-안전 순서로 삭제 후 재삽입.

**Tech Stack:** Next.js 15 App Router, Prisma (SQLite), jszip, shadcn/ui (Card, Dialog, Checkbox, Button), sonner toast, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-21-system-backup-restore-reset-design.md`

---

## File Map

### 새로 생성
| 파일 | 역할 |
|------|------|
| `src/lib/system/seed-functions.ts` | 카테고리별 시드 함수 (reset에서 재사용, `@/` alias 사용) |
| `src/lib/system/backup.ts` | 전체 DB 읽기 + ZIP 생성 |
| `src/lib/system/restore.ts` | ZIP 파싱 + DB 전체 교체 + 첨부파일 교체 |
| `src/lib/system/reset.ts` | 선택 카테고리 삭제 + 시드 재실행 |
| `src/app/api/admin/system/backup/route.ts` | GET → ZIP 스트리밍 다운로드 |
| `src/app/api/admin/system/restore/route.ts` | POST multipart → restoreFromZip 호출 |
| `src/app/api/admin/system/reset/route.ts` | POST JSON → resetCategories 호출 |
| `src/app/(admin)/admin/settings/system/page.tsx` | 설정 페이지 (서버 컴포넌트, auth 체크) |
| `src/components/admin/system-management.tsx` | 백업/복구/초기화 UI (클라이언트 컴포넌트) |

### 수정
| 파일 | 변경 내용 |
|------|-----------|
| `prisma/seed.ts` | `src/lib/system/seed-functions.ts` 임포트하여 사용 |
| `src/components/app/admin-shell.tsx` | 설정 섹션에 "시스템" nav 항목 추가 |

---

## Task 1: jszip 설치

**Files:**
- Modify: `package.json` (pnpm install)

- [ ] **Step 1: 패키지 설치**

```bash
cd /path/to/project && pnpm add jszip && pnpm add -D @types/jszip
```

Expected: `node_modules/jszip` 생성, `package.json`에 `jszip` 추가됨.

- [ ] **Step 2: 설치 확인**

```bash
node -e "require('jszip'); console.log('jszip ok')"
```

Expected: `jszip ok`

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add jszip for backup/restore ZIP handling"
```

---

## Task 2: seed 함수 추출

**Files:**
- Create: `src/lib/system/seed-functions.ts` (prisma/seed.ts 에서 임포트 가능하도록 `@/` alias 사용)
- Modify: `prisma/seed.ts`

현재 `prisma/seed.ts`의 로직을 분리하여 reset API에서 재사용 가능하게 한다.

- [ ] **Step 1: `src/lib/system/seed-functions.ts` 생성**

```typescript
import { AgentRole, AuthProvider, PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const defaultCategories = [
  { name: "기능 문의", sortOrder: 1 },
  { name: "버그 신고", sortOrder: 2 },
  { name: "계정 문제", sortOrder: 3 },
  { name: "결제 문의", sortOrder: 4 },
  { name: "기타", sortOrder: 5 },
];

export async function seedInitialAdmin(prisma: PrismaClient) {
  const email = process.env.INITIAL_ADMIN_EMAIL ?? "admin@crinity.io";
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? "admin123";
  const passwordHash = await hash(password, 10);

  await prisma.agent.upsert({
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
}

export async function seedDefaultCategories(prisma: PrismaClient) {
  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { sortOrder: category.sortOrder },
      create: category,
    });
  }
}

export async function seedSampleAgents(prisma: PrismaClient) {
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? "admin123";
  const passwordHash = await hash(password, 10);

  const sampleAgents = [
    { name: "이수진", email: "agent1@crinity.io", maxTickets: 15 },
    { name: "박도현", email: "agent2@crinity.io", maxTickets: 10 },
    { name: "최민서", email: "agent3@crinity.io", maxTickets: 8 },
  ];

  for (const agent of sampleAgents) {
    await prisma.agent.upsert({
      where: { email: agent.email },
      update: {
        name: agent.name,
        role: AgentRole.AGENT,
        isActive: true,
        maxTickets: agent.maxTickets,
        authProvider: AuthProvider.CREDENTIALS,
        passwordHash,
      },
      create: {
        name: agent.name,
        email: agent.email,
        role: AgentRole.AGENT,
        isActive: true,
        maxTickets: agent.maxTickets,
        authProvider: AuthProvider.CREDENTIALS,
        passwordHash,
      },
    });
  }
}
```

- [ ] **Step 2: `prisma/seed.ts` 업데이트**

```typescript
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
```

- [ ] **Step 3: 시드 동작 확인**

```bash
pnpm prisma db seed
```

Expected: 오류 없이 완료.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts src/lib/system/seed-functions.ts
git commit -m "refactor: extract seed logic into seed-functions.ts for reuse"
```

---

## Task 3: 백업 라이브러리

**Files:**
- Create: `src/lib/system/backup.ts`

전체 DB 데이터를 읽어 ZIP 버퍼로 반환한다. 첨부파일 디렉토리도 포함.

- [ ] **Step 1: `src/lib/system/backup.ts` 생성**

```typescript
import JSZip from "jszip";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/client";

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");

/** BigInt를 문자열로 직렬화 (SQLite에서 BigInt 필드가 있을 경우 대비) */
function bigIntReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  return value;
}

/** 디렉토리를 JSZip 폴더에 재귀적으로 추가 */
async function addDirToZip(
  zipFolder: JSZip,
  dirPath: string,
  basePath: string
): Promise<void> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const sub = zipFolder.folder(entry.name)!;
        await addDirToZip(sub, fullPath, basePath);
      } else {
        const content = await fs.readFile(fullPath);
        zipFolder.file(entry.name, content);
      }
    }
  } catch {
    // uploads 디렉토리가 없으면 건너뜀
  }
}

/** 전체 DB + 첨부파일을 ZIP 버퍼로 반환 */
export async function createBackupZip(): Promise<Buffer> {
  // 단일 트랜잭션으로 일관된 스냅샷 확보
  const allData = await prisma.$transaction(async (tx) => ({
    category: await tx.category.findMany(),
    agent: await tx.agent.findMany(),
    agentAbsence: await tx.agentAbsence.findMany(),
    agentCategory: await tx.agentCategory.findMany(),
    customer: await tx.customer.findMany(),
    team: await tx.team.findMany(),
    teamMember: await tx.teamMember.findMany(),
    notificationSetting: await tx.notificationSetting.findMany(),
    ticket: await tx.ticket.findMany(),
    comment: await tx.comment.findMany(),
    attachment: await tx.attachment.findMany(),
    ticketActivity: await tx.ticketActivity.findMany(),
    ticketTransfer: await tx.ticketTransfer.findMany(),
    ticketMerge: await tx.ticketMerge.findMany(),
    ticketPresence: await tx.ticketPresence.findMany(),
    ticketCommentLock: await tx.ticketCommentLock.findMany(),
    customerSatisfaction: await tx.customerSatisfaction.findMany(),
    gitLink: await tx.gitLink.findMany(),
    gitEvent: await tx.gitEvent.findMany(),
    gitOperationQueue: await tx.gitOperationQueue.findMany(),
    timeEntry: await tx.timeEntry.findMany(),
    customFieldValue: await tx.customFieldValue.findMany(),
    sLAClock: await tx.sLAClock.findMany(),
    emailDelivery: await tx.emailDelivery.findMany(),
    emailThreadMapping: await tx.emailThreadMapping.findMany(),
    requestType: await tx.requestType.findMany(),
    responseTemplate: await tx.responseTemplate.findMany(),
    customFieldDefinition: await tx.customFieldDefinition.findMany(),
    sLAPolicy: await tx.sLAPolicy.findMany(),
    automationRule: await tx.automationRule.findMany(),
    savedFilter: await tx.savedFilter.findMany(),
    emailSettings: await tx.emailSettings.findMany(),
    lLMSettings: await tx.lLMSettings.findMany(),
    systemBranding: await tx.systemBranding.findMany(),
    sAMLProvider: await tx.sAMLProvider.findMany(),
    gitProviderCredential: await tx.gitProviderCredential.findMany(),
    businessCalendar: await tx.businessCalendar.findMany(),
    holiday: await tx.holiday.findMany(),
    knowledgeCategory: await tx.knowledgeCategory.findMany(),
    knowledgeArticle: await tx.knowledgeArticle.findMany(),
    knowledgeArticleFeedback: await tx.knowledgeArticleFeedback.findMany(),
    auditLog: await tx.auditLog.findMany(),
    reportSchedule: await tx.reportSchedule.findMany(),
    generatedReport: await tx.generatedReport.findMany(),
  }));

  // 스키마 버전 (최신 마이그레이션 이름)
  const migrations = await prisma.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name FROM _prisma_migrations
    WHERE finished_at IS NOT NULL
    ORDER BY finished_at DESC
    LIMIT 1
  `;

  const zip = new JSZip();

  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        version: "1.0",
        schemaVersion: migrations[0]?.migration_name ?? "unknown",
        createdAt: new Date().toISOString(),
        tables: Object.keys(allData),
      },
      null,
      2
    )
  );

  const dataFolder = zip.folder("data")!;
  for (const [table, rows] of Object.entries(allData)) {
    dataFolder.file(
      `${table}.json`,
      JSON.stringify(rows, bigIntReplacer, 2)
    );
  }

  const attachmentsFolder = zip.folder("attachments")!;
  await addDirToZip(attachmentsFolder, UPLOAD_DIR, UPLOAD_DIR);

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
pnpm tsc --noEmit 2>&1 | head -30
```

Expected: 오류 없음 (또는 기존 오류만).

- [ ] **Step 3: Commit**

```bash
git add src/lib/system/backup.ts
git commit -m "feat: add backup library for full DB + attachments ZIP export"
```

---

## Task 4: 복구 라이브러리

**Files:**
- Create: `src/lib/system/restore.ts`

ZIP 버퍼를 받아 DB를 전체 교체하고 첨부파일 디렉토리를 원자적으로 교체한다.

- [ ] **Step 1: `src/lib/system/restore.ts` 생성**

```typescript
import JSZip from "jszip";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/client";

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");

/** JSON 문자열의 ISO 날짜를 Date 객체로 변환 */
function dateReviver(_key: string, value: unknown): unknown {
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
  ) {
    return new Date(value);
  }
  return value;
}

interface RestoreResult {
  schemaVersionMatch: boolean;
  backupSchemaVersion: string;
}

/** ZIP 버퍼로부터 DB + 첨부파일 전체 복구 */
export async function restoreFromZip(zipBuffer: Buffer): Promise<RestoreResult> {
  const zip = await JSZip.loadAsync(zipBuffer);

  // manifest 검증
  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) throw new Error("유효하지 않은 백업 파일: manifest.json 없음");
  const manifest = JSON.parse(await manifestFile.async("text"));
  if (manifest.version !== "1.0")
    throw new Error(`지원하지 않는 백업 버전: ${manifest.version}`);

  // 현재 스키마 버전
  const migrations = await prisma.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name FROM _prisma_migrations
    WHERE finished_at IS NOT NULL
    ORDER BY finished_at DESC
    LIMIT 1
  `;
  const currentSchema = migrations[0]?.migration_name ?? "unknown";
  const schemaVersionMatch = manifest.schemaVersion === currentSchema;

  // data/ 폴더의 모든 JSON 파일 파싱
  const data: Record<string, unknown[]> = {};
  const dataFolder = zip.folder("data");
  if (dataFolder) {
    for (const [relativePath, file] of Object.entries(zip.files)) {
      if (
        relativePath.startsWith("data/") &&
        relativePath.endsWith(".json") &&
        !file.dir
      ) {
        const tableName = path.basename(relativePath, ".json");
        const content = await file.async("text");
        data[tableName] = JSON.parse(content, dateReviver) as unknown[];
      }
    }
  }

  const get = <T = unknown>(table: string): T[] =>
    (data[table] as T[]) ?? [];

  // FK-안전 순서로 전체 삭제 후 재삽입
  await prisma.$transaction(
    async (tx) => {
      // ── 삭제: 자식 먼저 ──────────────────────────────────────
      await tx.knowledgeArticleFeedback.deleteMany();
      await tx.knowledgeArticle.deleteMany();
      await tx.knowledgeCategory.deleteMany();
      await tx.generatedReport.deleteMany();
      await tx.reportSchedule.deleteMany();
      await tx.auditLog.deleteMany();
      await tx.customerSatisfaction.deleteMany();
      await tx.ticketMerge.deleteMany();
      await tx.ticketTransfer.deleteMany();
      await tx.ticketActivity.deleteMany();
      await tx.ticketPresence.deleteMany();
      await tx.ticketCommentLock.deleteMany();
      await tx.timeEntry.deleteMany();
      await tx.gitOperationQueue.deleteMany();
      await tx.gitEvent.deleteMany();
      await tx.gitLink.deleteMany();
      await tx.emailDelivery.deleteMany();
      await tx.emailThreadMapping.deleteMany();
      await tx.comment.deleteMany();
      await tx.attachment.deleteMany();
      await tx.customFieldValue.deleteMany();
      await tx.sLAClock.deleteMany();
      await tx.ticket.deleteMany();
      await tx.savedFilter.deleteMany();
      await tx.agentAbsence.deleteMany();
      await tx.agentCategory.deleteMany();
      await tx.notificationSetting.deleteMany();
      await tx.teamMember.deleteMany();
      await tx.team.deleteMany();
      await tx.agent.deleteMany();
      await tx.customer.deleteMany();
      await tx.automationRule.deleteMany();
      await tx.sLAPolicy.deleteMany();
      await tx.holiday.deleteMany();
      await tx.businessCalendar.deleteMany();
      await tx.customFieldDefinition.deleteMany();
      await tx.responseTemplate.deleteMany();
      await tx.requestType.deleteMany();
      await tx.gitProviderCredential.deleteMany();
      await tx.sAMLProvider.deleteMany();
      await tx.systemBranding.deleteMany();
      await tx.lLMSettings.deleteMany();
      await tx.emailSettings.deleteMany();
      await tx.category.deleteMany();

      // ── 삽입: 부모 먼저 (삭제 역순) ─────────────────────────
      const cm = <T>(rows: T[]) =>
        rows.length ? { data: rows as never } : null;

      if (get("category").length)
        await tx.category.createMany({ data: get("category") as never });
      if (get("emailSettings").length)
        await tx.emailSettings.createMany({ data: get("emailSettings") as never });
      if (get("lLMSettings").length)
        await tx.lLMSettings.createMany({ data: get("lLMSettings") as never });
      if (get("systemBranding").length)
        await tx.systemBranding.createMany({ data: get("systemBranding") as never });
      if (get("sAMLProvider").length)
        await tx.sAMLProvider.createMany({ data: get("sAMLProvider") as never });
      if (get("gitProviderCredential").length)
        await tx.gitProviderCredential.createMany({ data: get("gitProviderCredential") as never });
      if (get("requestType").length)
        await tx.requestType.createMany({ data: get("requestType") as never });
      if (get("responseTemplate").length)
        await tx.responseTemplate.createMany({ data: get("responseTemplate") as never });
      if (get("customFieldDefinition").length)
        await tx.customFieldDefinition.createMany({ data: get("customFieldDefinition") as never });
      if (get("businessCalendar").length)
        await tx.businessCalendar.createMany({ data: get("businessCalendar") as never });
      if (get("holiday").length)
        await tx.holiday.createMany({ data: get("holiday") as never });
      if (get("sLAPolicy").length)
        await tx.sLAPolicy.createMany({ data: get("sLAPolicy") as never });
      if (get("automationRule").length)
        await tx.automationRule.createMany({ data: get("automationRule") as never });
      if (get("customer").length)
        await tx.customer.createMany({ data: get("customer") as never });
      if (get("agent").length)
        await tx.agent.createMany({ data: get("agent") as never });
      if (get("team").length)
        await tx.team.createMany({ data: get("team") as never });
      if (get("teamMember").length)
        await tx.teamMember.createMany({ data: get("teamMember") as never });
      if (get("notificationSetting").length)
        await tx.notificationSetting.createMany({ data: get("notificationSetting") as never });
      if (get("agentCategory").length)
        await tx.agentCategory.createMany({ data: get("agentCategory") as never });
      if (get("agentAbsence").length)
        await tx.agentAbsence.createMany({ data: get("agentAbsence") as never });
      if (get("savedFilter").length)
        await tx.savedFilter.createMany({ data: get("savedFilter") as never });
      if (get("ticket").length)
        await tx.ticket.createMany({ data: get("ticket") as never });
      if (get("sLAClock").length)
        await tx.sLAClock.createMany({ data: get("sLAClock") as never });
      if (get("customFieldValue").length)
        await tx.customFieldValue.createMany({ data: get("customFieldValue") as never });
      if (get("attachment").length)
        await tx.attachment.createMany({ data: get("attachment") as never });
      if (get("comment").length)
        await tx.comment.createMany({ data: get("comment") as never });
      if (get("emailThreadMapping").length)
        await tx.emailThreadMapping.createMany({ data: get("emailThreadMapping") as never });
      if (get("emailDelivery").length)
        await tx.emailDelivery.createMany({ data: get("emailDelivery") as never });
      if (get("gitLink").length)
        await tx.gitLink.createMany({ data: get("gitLink") as never });
      if (get("gitEvent").length)
        await tx.gitEvent.createMany({ data: get("gitEvent") as never });
      if (get("gitOperationQueue").length)
        await tx.gitOperationQueue.createMany({ data: get("gitOperationQueue") as never });
      if (get("timeEntry").length)
        await tx.timeEntry.createMany({ data: get("timeEntry") as never });
      if (get("ticketCommentLock").length)
        await tx.ticketCommentLock.createMany({ data: get("ticketCommentLock") as never });
      if (get("ticketPresence").length)
        await tx.ticketPresence.createMany({ data: get("ticketPresence") as never });
      if (get("ticketActivity").length)
        await tx.ticketActivity.createMany({ data: get("ticketActivity") as never });
      if (get("ticketTransfer").length)
        await tx.ticketTransfer.createMany({ data: get("ticketTransfer") as never });
      if (get("ticketMerge").length)
        await tx.ticketMerge.createMany({ data: get("ticketMerge") as never });
      if (get("customerSatisfaction").length)
        await tx.customerSatisfaction.createMany({ data: get("customerSatisfaction") as never });
      if (get("auditLog").length)
        await tx.auditLog.createMany({ data: get("auditLog") as never });
      if (get("reportSchedule").length)
        await tx.reportSchedule.createMany({ data: get("reportSchedule") as never });
      if (get("generatedReport").length)
        await tx.generatedReport.createMany({ data: get("generatedReport") as never });
      if (get("knowledgeCategory").length)
        await tx.knowledgeCategory.createMany({ data: get("knowledgeCategory") as never });
      if (get("knowledgeArticle").length)
        await tx.knowledgeArticle.createMany({ data: get("knowledgeArticle") as never });
      if (get("knowledgeArticleFeedback").length)
        await tx.knowledgeArticleFeedback.createMany({ data: get("knowledgeArticleFeedback") as never });

      void cm; // unused helper suppression
    },
    { timeout: 60000 }
  );

  // 첨부파일 원자적 교체
  const tmpDir = `${UPLOAD_DIR}_restore_tmp`;
  const backupDir = `${UPLOAD_DIR}_backup_tmp`;

  // 기존 temp 디렉토리 정리
  await fs.rm(tmpDir, { recursive: true, force: true });
  await fs.rm(backupDir, { recursive: true, force: true });
  await fs.mkdir(tmpDir, { recursive: true });

  // ZIP의 attachments/ → tmpDir 추출
  for (const [relativePath, file] of Object.entries(zip.files)) {
    if (relativePath.startsWith("attachments/") && !file.dir) {
      const relPath = relativePath.replace(/^attachments\//, "");
      const destPath = path.join(tmpDir, relPath);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      const content = await file.async("nodebuffer");
      await fs.writeFile(destPath, content);
    }
  }

  // 원자적 교체: current → backup → tmp → current
  try {
    await fs.rename(UPLOAD_DIR, backupDir).catch(() => {});
    await fs.rename(tmpDir, UPLOAD_DIR);
    await fs.rm(backupDir, { recursive: true, force: true });
  } catch (err) {
    // 롤백 시도
    await fs.rename(backupDir, UPLOAD_DIR).catch(() => {});
    await fs.rm(tmpDir, { recursive: true, force: true });
    throw err;
  }

  return { schemaVersionMatch, backupSchemaVersion: manifest.schemaVersion };
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
pnpm tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/system/restore.ts
git commit -m "feat: add restore library for full DB + attachments restore from ZIP"
```

---

## Task 5: 초기화 라이브러리

**Files:**
- Create: `src/lib/system/reset.ts`

선택된 카테고리만 FK-안전 순서로 삭제하고 시드를 재실행한다.

- [ ] **Step 1: `src/lib/system/reset.ts` 생성**

```typescript
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import {
  seedInitialAdmin,
  seedDefaultCategories,
} from "@/lib/system/seed-functions";

export type ResetCategory =
  | "tickets"
  | "agents"
  | "settings"
  | "knowledge"
  | "audit_logs";

/** FK 제약 규칙: key 선택 시 value도 반드시 포함되어야 함 */
export const RESET_DEPENDENCIES: Record<ResetCategory, ResetCategory[]> = {
  agents: ["tickets", "knowledge", "settings"],
  settings: ["tickets"],
  tickets: [],
  knowledge: [],
  audit_logs: [],
};

/** 카테고리 선택 유효성 검사 */
export function validateResetCategories(categories: ResetCategory[]): string | null {
  const set = new Set(categories);
  for (const [cat, deps] of Object.entries(RESET_DEPENDENCIES) as [
    ResetCategory,
    ResetCategory[]
  ][]) {
    if (set.has(cat)) {
      for (const dep of deps) {
        if (!set.has(dep)) {
          return `'${cat}' 초기화 시 '${dep}'도 함께 선택해야 합니다.`;
        }
      }
    }
  }
  return null;
}

/** 선택된 카테고리를 초기화하고 필요한 시드를 재실행 */
export async function resetCategories(
  categories: ResetCategory[]
): Promise<void> {
  const set = new Set(categories);

  await prisma.$transaction(
    async (tx) => {
      // ── knowledge ───────────────────────────────────────────
      if (set.has("knowledge")) {
        await tx.knowledgeArticleFeedback.deleteMany();
        await tx.knowledgeArticle.deleteMany();
        await tx.knowledgeCategory.deleteMany();
      }

      // ── audit_logs ──────────────────────────────────────────
      if (set.has("audit_logs")) {
        await tx.generatedReport.deleteMany();
        await tx.reportSchedule.deleteMany();
        await tx.auditLog.deleteMany();
      }

      // ── tickets ─────────────────────────────────────────────
      if (set.has("tickets")) {
        await tx.customerSatisfaction.deleteMany();
        await tx.ticketMerge.deleteMany();
        await tx.ticketTransfer.deleteMany();
        await tx.ticketActivity.deleteMany();
        await tx.ticketPresence.deleteMany();
        await tx.ticketCommentLock.deleteMany();
        await tx.timeEntry.deleteMany();
        await tx.gitOperationQueue.deleteMany();
        await tx.gitEvent.deleteMany();
        await tx.gitLink.deleteMany();
        await tx.emailDelivery.deleteMany();
        await tx.emailThreadMapping.deleteMany();
        await tx.comment.deleteMany();
        await tx.attachment.deleteMany();
        await tx.customFieldValue.deleteMany();
        await tx.sLAClock.deleteMany();
        await tx.ticket.deleteMany();
        await tx.customer.deleteMany();
      }

      // ── agents ──────────────────────────────────────────────
      // (tickets 먼저 삭제 필요 — FK dependency에서 강제됨)
      if (set.has("agents")) {
        await tx.savedFilter.deleteMany();
        await tx.agentAbsence.deleteMany();
        await tx.agentCategory.deleteMany();
        await tx.teamMember.deleteMany();
        await tx.team.deleteMany();
        // 전체 삭제 (초기 admin은 이후 seedInitialAdmin에서 재생성)
        await tx.agent.deleteMany();
      }

      // ── settings ────────────────────────────────────────────
      if (set.has("settings")) {
        await tx.notificationSetting.deleteMany(); // global key-value store
        await tx.automationRule.deleteMany();
        await tx.sLAPolicy.deleteMany();
        await tx.holiday.deleteMany();
        await tx.businessCalendar.deleteMany();
        await tx.customFieldDefinition.deleteMany();
        await tx.responseTemplate.deleteMany();
        await tx.requestType.deleteMany();
        await tx.gitProviderCredential.deleteMany();
        await tx.sAMLProvider.deleteMany();
        await tx.systemBranding.deleteMany();
        await tx.lLMSettings.deleteMany();
        await tx.emailSettings.deleteMany();
        await tx.category.deleteMany();
      }
    },
    { timeout: 30000 }
  );

  // 트랜잭션 밖에서 시드 재실행 (upsert 사용)
  const prismaClient = prisma as unknown as PrismaClient;
  if (set.has("settings")) {
    await seedDefaultCategories(prismaClient);
  }
  if (set.has("agents")) {
    await seedInitialAdmin(prismaClient);
  }
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
pnpm tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/system/reset.ts
git commit -m "feat: add reset library for selective category data deletion"
```

---

## Task 6: API 라우트 3개

**Files:**
- Create: `src/app/api/admin/system/backup/route.ts`
- Create: `src/app/api/admin/system/restore/route.ts`
- Create: `src/app/api/admin/system/reset/route.ts`

- [ ] **Step 1: `src/app/api/admin/system/backup/route.ts` 생성**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createBackupZip } from "@/lib/system/backup";
import { prisma } from "@/lib/db/client";

export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const zipBuffer = await createBackupZip();
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id!,
        actorEmail: session.user.email!,
        actorName: session.user.name ?? "",
        actorType: "AGENT",
        action: "EXPORT",
        resourceType: "SYSTEM",
        description: "전체 데이터 백업 다운로드",
      },
    });

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="backup-${timestamp}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Backup failed:", error);
    return NextResponse.json({ error: "백업 생성 실패" }, { status: 500 });
  }
}
```

- [ ] **Step 2: `src/app/api/admin/system/restore/route.ts` 생성**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { restoreFromZip } from "@/lib/system/restore";
import { prisma } from "@/lib/db/client";

const MAX_SIZE = 600 * 1024 * 1024; // 600 MB

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
      return NextResponse.json(
        { error: "파일이 너무 큽니다 (최대 600MB)" },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "파일이 없습니다" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const zipBuffer = Buffer.from(arrayBuffer);

    const result = await restoreFromZip(zipBuffer);

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id!,
        actorEmail: session.user.email!,
        actorName: session.user.name ?? "",
        actorType: "AGENT",
        action: "SETTINGS_CHANGE",
        resourceType: "SYSTEM",
        description: `전체 데이터 복구 완료 (백업 스키마: ${result.backupSchemaVersion})`,
      },
    });

    return NextResponse.json({
      success: true,
      schemaVersionMatch: result.schemaVersionMatch,
    });
  } catch (error) {
    console.error("Restore failed:", error);
    const message =
      error instanceof Error ? error.message : "복구 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: `src/app/api/admin/system/reset/route.ts` 생성**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  resetCategories,
  validateResetCategories,
  type ResetCategory,
} from "@/lib/system/reset";
import { prisma } from "@/lib/db/client";

const VALID_CATEGORIES = new Set([
  "tickets",
  "agents",
  "settings",
  "knowledge",
  "audit_logs",
]);

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const categories: ResetCategory[] = (body.categories ?? []).filter(
      (c: string) => VALID_CATEGORIES.has(c)
    );

    if (categories.length === 0) {
      return NextResponse.json(
        { error: "초기화할 항목을 하나 이상 선택하세요" },
        { status: 400 }
      );
    }

    const validationError = validateResetCategories(categories);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await resetCategories(categories);

    // audit log는 초기화 후 새로 기록
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id!,
        actorEmail: session.user.email!,
        actorName: session.user.name ?? "",
        actorType: "AGENT",
        action: "SETTINGS_CHANGE",
        resourceType: "SYSTEM",
        description: `시스템 초기화: ${categories.join(", ")}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset failed:", error);
    const message =
      error instanceof Error ? error.message : "초기화 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 4: TypeScript 컴파일 확인**

```bash
pnpm tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/system/
git commit -m "feat: add backup, restore, reset API routes"
```

---

## Task 7: UI 컴포넌트

**Files:**
- Create: `src/components/admin/system-management.tsx`

백업 / 복구 / 초기화 3개 카드를 가진 클라이언트 컴포넌트.

- [ ] **Step 1: `src/components/admin/system-management.tsx` 생성**

```typescript
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Upload, RotateCcw, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ResetCategory = "tickets" | "agents" | "settings" | "knowledge" | "audit_logs";

const CATEGORY_LABELS: Record<ResetCategory, string> = {
  tickets: "티켓 및 고객 데이터",
  agents: "상담원 계정",
  settings: "설정",
  knowledge: "지식 베이스",
  audit_logs: "감사 로그",
};

/** agents 선택 시 tickets/knowledge/settings 강제, settings 선택 시 tickets 강제 */
function enforceDependencies(
  prev: Set<ResetCategory>,
  toggled: ResetCategory,
  checked: boolean
): Set<ResetCategory> {
  const next = new Set(prev);
  if (checked) {
    next.add(toggled);
    if (toggled === "agents") {
      next.add("tickets");
      next.add("knowledge");
      next.add("settings");
    }
    if (toggled === "settings") {
      next.add("tickets");
    }
  } else {
    next.delete(toggled);
    // 의존성 역방향 해제
    if (toggled === "tickets") {
      next.delete("agents");
      next.delete("settings");
    }
    if (toggled === "settings") {
      next.delete("agents");
    }
    if (toggled === "knowledge") {
      next.delete("agents");
    }
  }
  return next;
}

export function SystemManagement() {
  // ── 백업 ────────────────────────────────────────────────────
  const [backupLoading, setBackupLoading] = useState(false);

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await fetch("/api/admin/system/backup");
      if (!res.ok) throw new Error("백업 실패");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename =
        res.headers
          .get("content-disposition")
          ?.match(/filename="(.+)"/)?.[1] ?? "backup.zip";
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("백업 파일이 다운로드되었습니다.");
    } catch (err) {
      toast.error("백업 실패: " + (err instanceof Error ? err.message : "오류"));
    } finally {
      setBackupLoading(false);
    }
  };

  // ── 복구 ────────────────────────────────────────────────────
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  const handleRestore = async () => {
    if (!restoreFile) return;
    setRestoreLoading(true);
    setRestoreDialogOpen(false);
    try {
      const formData = new FormData();
      formData.append("file", restoreFile);
      const res = await fetch("/api/admin/system/restore", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "복구 실패");
      if (!json.schemaVersionMatch) {
        toast.warning("스키마 버전이 다릅니다. 복구는 완료되었지만 일부 데이터에 문제가 있을 수 있습니다.");
      } else {
        toast.success("복구가 완료되었습니다. 로그인 화면으로 이동합니다.");
      }
      setTimeout(() => {
        window.location.href = "/admin/login";
      }, 2000);
    } catch (err) {
      toast.error("복구 실패: " + (err instanceof Error ? err.message : "오류"));
    } finally {
      setRestoreLoading(false);
    }
  };

  // ── 초기화 ──────────────────────────────────────────────────
  const [selectedCategories, setSelectedCategories] = useState<Set<ResetCategory>>(
    new Set()
  );
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const allSelected =
    selectedCategories.size ===
    (Object.keys(CATEGORY_LABELS) as ResetCategory[]).length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(
        new Set(Object.keys(CATEGORY_LABELS) as ResetCategory[])
      );
    }
  };

  const toggleCategory = (cat: ResetCategory, checked: boolean) => {
    setSelectedCategories((prev) => enforceDependencies(prev, cat, checked));
  };

  const handleReset = async () => {
    setResetLoading(true);
    setResetDialogOpen(false);
    setConfirmText("");
    try {
      const res = await fetch("/api/admin/system/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: [...selectedCategories] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "초기화 실패");
      toast.success("초기화가 완료되었습니다.");
      setSelectedCategories(new Set());
      window.location.reload();
    } catch (err) {
      toast.error("초기화 실패: " + (err instanceof Error ? err.message : "오류"));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 백업 카드 ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            데이터 백업
          </CardTitle>
          <CardDescription>
            현재 모든 데이터와 첨부파일을 ZIP 파일로 다운로드합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleBackup} disabled={backupLoading}>
            {backupLoading ? "백업 생성 중..." : "백업 다운로드"}
          </Button>
        </CardContent>
      </Card>

      {/* ── 복구 카드 ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            데이터 복구
          </CardTitle>
          <CardDescription>
            백업 파일을 업로드하면 현재 모든 데이터가 교체됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              복구 시 현재 데이터가 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDescription>
          </Alert>
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept=".zip"
              onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)}
              className="max-w-xs"
            />
            <Button
              variant="destructive"
              disabled={!restoreFile || restoreLoading}
              onClick={() => setRestoreDialogOpen(true)}
            >
              {restoreLoading ? "복구 중..." : "복구 시작"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── 초기화 카드 ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            시스템 초기화
          </CardTitle>
          <CardDescription>
            선택한 항목을 초기 설치 상태로 되돌립니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              선택한 데이터가 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={(checked) => {
                  if (checked !== "indeterminate") toggleAll();
                }}
              />
              <Label htmlFor="select-all" className="font-medium">
                모두 선택
              </Label>
            </div>
            <div className="ml-6 space-y-2">
              {(Object.entries(CATEGORY_LABELS) as [ResetCategory, string][]).map(
                ([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={`cat-${key}`}
                      checked={selectedCategories.has(key)}
                      onCheckedChange={(checked) => {
                        if (checked !== "indeterminate")
                          toggleCategory(key, !!checked);
                      }}
                    />
                    <Label htmlFor={`cat-${key}`}>{label}</Label>
                  </div>
                )
              )}
            </div>
            {selectedCategories.has("settings") && !selectedCategories.has("tickets") && (
              <p className="text-sm text-muted-foreground ml-6">
                * '설정' 초기화는 '티켓 및 고객 데이터'도 함께 초기화합니다.
              </p>
            )}
          </div>

          <Button
            variant="destructive"
            disabled={selectedCategories.size === 0 || resetLoading}
            onClick={() => setResetDialogOpen(true)}
          >
            {resetLoading ? "초기화 중..." : "초기화"}
          </Button>
        </CardContent>
      </Card>

      {/* ── 복구 확인 다이얼로그 ──────────────────────────── */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>데이터 복구 확인</DialogTitle>
            <DialogDescription>
              현재 모든 데이터가 백업 파일의 데이터로 교체됩니다. 이 작업은
              되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleRestore}>
              복구 시작
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 초기화 확인 다이얼로그 ───────────────────────── */}
      <Dialog open={resetDialogOpen} onOpenChange={(open) => {
        setResetDialogOpen(open);
        if (!open) setConfirmText("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              선택한 데이터가 영구 삭제됩니다
            </DialogTitle>
            <DialogDescription>
              계속하려면 아래에 <strong>초기화</strong>를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="초기화"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetDialogOpen(false);
                setConfirmText("");
              }}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== "초기화"}
              onClick={handleReset}
            >
              초기화 실행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
pnpm tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/system-management.tsx
git commit -m "feat: add SystemManagement UI component with backup/restore/reset"
```

---

## Task 8: 설정 페이지 + 사이드바

**Files:**
- Create: `src/app/(admin)/admin/settings/system/page.tsx`
- Modify: `src/components/app/admin-shell.tsx`

- [ ] **Step 1: `src/app/(admin)/admin/settings/system/page.tsx` 생성**

```typescript
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SystemManagement } from "@/components/admin/system-management";

export const metadata: Metadata = {
  title: "시스템 관리 | Crinity",
};

export default async function SystemSettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">시스템 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          데이터 백업, 복구, 시스템 초기화를 관리합니다.
        </p>
      </div>
      <SystemManagement />
    </div>
  );
}
```

- [ ] **Step 2: `src/components/app/admin-shell.tsx` — 사이드바에 시스템 항목 추가**

`import` 상단에 `Settings` 아이콘 추가 (이미 있을 수도 있음 — 없으면 추가):

```typescript
import { Settings } from "lucide-react"; // 없으면 추가
```

설정 섹션의 AI 연동 NavLink 바로 아래에 추가:

```tsx
<NavLink href="/admin/settings/system">
  <div className="flex items-center gap-2">
    <Settings className="h-4 w-4" />
    <span>시스템</span>
  </div>
</NavLink>
```

정확한 삽입 위치: `href="/admin/settings/llm"` NavLink 블록이 끝나는 `</NavLink>` 바로 다음.

- [ ] **Step 3: 앱 빌드 확인**

```bash
pnpm build 2>&1 | tail -20
```

Expected: Build succeeded (오류 없음).

- [ ] **Step 4: Commit**

```bash
git add src/app/(admin)/admin/settings/system/ src/components/app/admin-shell.tsx
git commit -m "feat: add system settings page and sidebar nav entry"
```

---

## Task 9: 수동 통합 테스트

dev 서버를 실행하고 3개 기능을 순서대로 검증한다.

- [ ] **Step 1: dev 서버 시작**

```bash
pnpm dev
```

- [ ] **Step 2: 백업 테스트**
  1. `http://localhost:3000/admin/settings/system` 접속
  2. **백업 다운로드** 버튼 클릭
  3. ZIP 파일이 다운로드됨 확인
  4. ZIP 내부 구조 확인: `manifest.json`, `data/*.json`, `attachments/` 존재

```bash
# ZIP 내용 확인
unzip -l ~/Downloads/backup-*.zip | head -30
```

- [ ] **Step 3: 초기화 테스트**
  1. 티켓 및 고객 데이터 체크박스 선택
  2. 초기화 버튼 클릭
  3. 확인 다이얼로그에서 `초기화` 입력
  4. 초기화 실행 버튼 클릭
  5. 성공 토스트 확인 + 페이지 리로드 후 티켓 데이터 없어짐 확인

- [ ] **Step 4: 복구 테스트**
  1. Step 2에서 다운로드한 ZIP 파일 선택
  2. **복구 시작** 버튼 클릭
  3. 확인 다이얼로그에서 복구 시작 클릭
  4. 성공 후 로그인 페이지로 리다이렉트 확인
  5. 재로그인 후 티켓 데이터 복구됨 확인

- [ ] **Step 5: FK 의존성 UI 테스트**
  1. `설정` 체크박스만 선택 → `티켓 및 고객 데이터`도 자동 선택됨 확인
  2. `상담원 계정` 선택 → 나머지 3개도 자동 선택됨 확인

- [ ] **Step 6: 최종 Commit**

```bash
git add -A
git commit -m "feat: complete system backup/restore/reset feature"
```
