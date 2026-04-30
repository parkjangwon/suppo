# SQLite → PostgreSQL Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SQLite/libSQL 스택을 완전히 제거하고 개발·운영 모두 PostgreSQL로 전환하면서, SQLite 우회 코드(JSON string, julianday 등)를 PostgreSQL 네이티브 방식으로 정리한다.

**Architecture:** Prisma를 그대로 유지하되 provider를 `postgresql`로 변경. libSQL 어댑터 코드를 제거하고 `client.ts`/`raw.ts`를 단순화. 모든 기존 마이그레이션을 삭제하고 PostgreSQL 용 초기 마이그레이션을 새로 생성.

**Tech Stack:** Prisma 6, PostgreSQL 17, pnpm monorepo, Next.js (App Router), Docker Compose

---

## 변경 파일 목록

| 파일 | 작업 |
|---|---|
| `docker-compose.dev.yml` | **신규** — 로컬 개발용 PostgreSQL 컨테이너 |
| `.env` / `.env.example` | DATABASE_URL 형식 변경, DATABASE_AUTH_TOKEN 제거 |
| `packages/db/prisma/schema.prisma` | provider 변경, tags→String[], workDays→Int[] |
| `packages/db/prisma/migrations/` | 전체 삭제 후 PostgreSQL 초기 마이그레이션 생성 |
| `packages/db/src/client.ts` | libSQL 어댑터 로직 전면 제거 |
| `packages/db/src/raw.ts` | libSQL 클라이언트 제거 → prisma.$queryRawUnsafe 래퍼 |
| `packages/db/src/resolve-database-url.ts` | **삭제** |
| `packages/db/package.json` | @libsql/client, @prisma/adapter-libsql 제거 |
| `packages/db/prisma/migrate.ts` | **삭제** (libSQL 전용 마이그레이션 러너) |
| `apps/admin/src/lib/llm/service.ts` | formatTags: JSON.parse → 직접 배열 처리 |
| `apps/admin/src/lib/system/seed-functions.ts` | tags JSON.stringify → 배열, workDays 문자열 → 배열 |
| `apps/admin/src/app/api/admin/settings/business-hours/route.ts` | workDays JSON.parse/stringify 제거 |
| `apps/admin/src/lib/sla/engine.ts` | workDays JSON.parse 제거 |
| `apps/public/src/app/api/tickets/route.ts` | tags JSON.stringify → 배열 직접 전달 |
| `apps/admin/src/lib/db/queries/admin-analytics/filters.ts` | formatDateForSQLite 이름 변경 |
| `apps/admin/src/lib/db/queries/admin-analytics/agents.ts` | SQLite SQL → PostgreSQL |
| `apps/admin/src/lib/db/queries/admin-analytics/csat.ts` | SQLite SQL → PostgreSQL |
| `apps/admin/src/lib/db/queries/admin-analytics/customer-insights.ts` | SQLite SQL → PostgreSQL |
| `apps/admin/src/lib/db/queries/admin-analytics/repeat-inquiries.ts` | SQLite SQL → PostgreSQL |
| `apps/admin/src/lib/db/queries/admin-analytics/vip-customers.ts` | SQLite SQL → PostgreSQL |
| `docker/docker-compose.yml` | sqld → postgres 서비스 교체 |
| `docker/Dockerfile` | migrator CMD, builder DATABASE_URL 기본값 수정 |
| `docker/.env.example` | DATABASE_URL, POSTGRES_PASSWORD, DATABASE_AUTH_TOKEN 제거 |

---

## Task 1: 로컬 개발 PostgreSQL 환경 구성

**Files:**
- Create: `docker-compose.dev.yml`
- Modify: `.env`
- Modify: `.env.example`

- [ ] **Step 1: docker-compose.dev.yml 생성**

```yaml
# docker-compose.dev.yml
services:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: suppo
      POSTGRES_USER: suppo
      POSTGRES_PASSWORD: suppo_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 2: .env DATABASE_URL 업데이트**

`.env` 파일에서:
```
# 변경 전
DATABASE_URL=file:./packages/db/dev.db
DATABASE_AUTH_TOKEN=

# 변경 후
DATABASE_URL=postgresql://suppo:suppo_dev@localhost:5432/suppo
```
`DATABASE_AUTH_TOKEN=` 줄은 삭제.

- [ ] **Step 3: .env.example 업데이트**

```
# 변경 전
# Database (필수) - workspace SQLite 데이터베이스 파일 경로
DATABASE_URL=file:./packages/db/dev.db
...
# Optional - LibSQL HTTP auth token
DATABASE_AUTH_TOKEN=

# 변경 후
# Database (필수) - PostgreSQL 연결 문자열
DATABASE_URL=postgresql://suppo:suppo_dev@localhost:5432/suppo
```
`DATABASE_AUTH_TOKEN` 줄과 주석 삭제.

- [ ] **Step 4: PostgreSQL 컨테이너 시작 및 확인**

```bash
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
# postgres 서비스가 healthy 상태인지 확인
docker exec -it $(docker compose -f docker-compose.dev.yml ps -q postgres) psql -U suppo -d suppo -c '\l'
```

Expected: `suppo` 데이터베이스 목록 출력.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.dev.yml .env.example
git commit -m "chore: add postgresql dev compose, update env examples"
```

---

## Task 2: Prisma 스키마 PostgreSQL 전환 + 마이그레이션 재생성

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Delete: `packages/db/prisma/migrations/` (전체 내용)
- Generate: `packages/db/prisma/migrations/XXXXXXXX_initial_postgresql/`

- [ ] **Step 1: schema.prisma provider 변경**

```prisma
// 변경 전
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// 변경 후
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- [ ] **Step 2: Ticket.tags 타입 변경**

```prisma
// 변경 전 (Ticket model)
tags                 String?            @default("[]")

// 변경 후
tags                 String[]           @default([])
```

- [ ] **Step 3: BusinessCalendar.workDays 타입 변경**

```prisma
// 변경 전 (BusinessCalendar model)
workDays      String?  @default("[1,2,3,4,5]")

// 변경 후
workDays      Int[]    @default([1,2,3,4,5])
```

- [ ] **Step 4: 기존 마이그레이션 삭제**

```bash
rm -rf packages/db/prisma/migrations/
```

- [ ] **Step 5: Prisma Client 재생성 및 PostgreSQL 초기 마이그레이션 생성**

DATABASE_URL이 postgresql:// 를 가리키는지 확인 후 실행:

```bash
cd packages/db
pnpm exec prisma migrate dev --schema=./prisma/schema.prisma --name initial_postgresql
```

Expected: `migrations/XXXXXXXX_initial_postgresql/migration.sql` 생성, `migration_lock.toml`이 `provider = "postgresql"`로 업데이트됨.

- [ ] **Step 6: migration_lock.toml 확인**

```bash
cat packages/db/prisma/migrations/migration_lock.toml
```

Expected: `provider = "postgresql"`

- [ ] **Step 7: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/
git commit -m "feat: migrate schema from sqlite to postgresql, tags→String[], workDays→Int[]"
```

---

## Task 3: packages/db 라이브러리 정리 (libSQL 완전 제거)

**Files:**
- Modify: `packages/db/src/client.ts`
- Modify: `packages/db/src/raw.ts`
- Delete: `packages/db/src/resolve-database-url.ts`
- Delete: `packages/db/prisma/migrate.ts`
- Modify: `packages/db/package.json`

- [ ] **Step 1: client.ts 재작성 (libSQL 어댑터 제거)**

```typescript
// packages/db/src/client.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 2: raw.ts 재작성 (libSQL 클라이언트 → Prisma 래퍼)**

PostgreSQL에서는 `$queryRawUnsafe` 파라미터가 `$1, $2, $3...` 형식. 기존 `?` 플레이스홀더를 쓰는 모든 SQL은 Task 5에서 수정.

```typescript
// packages/db/src/raw.ts
import { prisma } from "./client";

export const db = {
  async execute<T = unknown>(query: { sql: string; args: unknown[] }): Promise<{ rows: T[] }> {
    const result = await prisma.$queryRawUnsafe<T[]>(query.sql, ...query.args);
    return { rows: result };
  },
};
```

- [ ] **Step 3: resolve-database-url.ts 삭제**

```bash
rm packages/db/src/resolve-database-url.ts
```

- [ ] **Step 4: prisma/migrate.ts 삭제**

```bash
rm packages/db/prisma/migrate.ts
```

- [ ] **Step 5: package.json 의존성 및 스크립트 정리**

```json
{
  "scripts": {
    "generate": "prisma generate --schema=./prisma/schema.prisma",
    "bootstrap": "tsx prisma/bootstrap.ts",
    "migrate:dev": "prisma migrate dev --schema=./prisma/schema.prisma",
    "migrate:deploy": "prisma migrate deploy --schema=./prisma/schema.prisma",
    "seed": "tsx prisma/seed.ts",
    "studio": "prisma studio --schema=./prisma/schema.prisma"
  },
  "dependencies": {
    "@prisma/client": "^6.19.3"
  },
  "devDependencies": {
    "prisma": "^6.19.3",
    "tsx": "^4.20.6",
    "typescript": "^5.8.3"
  }
}
```

제거 항목: `@libsql/client`, `@prisma/adapter-libsql`, `migrate:libsql` 스크립트.

- [ ] **Step 6: package.json exports에서 resolve-database-url 제거**

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./client": "./src/client.ts",
    "./raw": "./src/raw.ts"
  }
}
```

- [ ] **Step 7: pnpm install 실행**

```bash
cd /Users/pjw/dev/project/suppo
pnpm install
```

Expected: `@libsql/client`, `@prisma/adapter-libsql` 패키지가 `packages/db/node_modules`에서 제거됨.

- [ ] **Step 8: Commit**

```bash
git add packages/db/src/client.ts packages/db/src/raw.ts packages/db/package.json
git rm packages/db/src/resolve-database-url.ts packages/db/prisma/migrate.ts
git commit -m "refactor: remove libsql, simplify db client and raw query wrapper"
```

---

## Task 4: 앱 코드 JSON 우회 패턴 제거

SQLite는 배열 타입이 없어서 JSON 문자열로 저장했던 `tags`, `workDays` 필드를 PostgreSQL 네이티브 타입으로 정리한다.

**Files:**
- Modify: `apps/admin/src/lib/llm/service.ts`
- Modify: `apps/admin/src/lib/system/seed-functions.ts`
- Modify: `apps/admin/src/app/api/admin/settings/business-hours/route.ts`
- Modify: `apps/admin/src/lib/sla/engine.ts`
- Modify: `apps/public/src/app/api/tickets/route.ts`
- Modify: `apps/admin/src/lib/db/queries/admin-analytics/filters.ts`

- [ ] **Step 1: llm/service.ts — formatTags 시그니처 및 구현 변경**

```typescript
// 변경 전
function formatTags(tags: string | null): string {
  if (!tags) {
    return "없음";
  }
  try {
    const parsed = JSON.parse(tags) as unknown;
    if (Array.isArray(parsed) && parsed.every((tag) => typeof tag === "string")) {
      return parsed.length > 0 ? parsed.join(", ") : "없음";
    }
  } catch {
    // Ignore malformed legacy data and fall back to raw value.
  }
  return tags;
}

// 변경 후
function formatTags(tags: string[] | null): string {
  if (!tags || tags.length === 0) {
    return "없음";
  }
  return tags.join(", ");
}
```

- [ ] **Step 2: seed-functions.ts — tags와 workDays 수정**

```typescript
// 변경 전 (tags)
tags: JSON.stringify(t.tags ?? []),

// 변경 후
tags: t.tags ?? [],

// 변경 전 (workDays)
workDays: "[1,2,3,4,5]",

// 변경 후
workDays: [1, 2, 3, 4, 5],
```

- [ ] **Step 3: business-hours/route.ts — workDays JSON.parse/stringify 제거**

```typescript
// 변경 전 (GET 응답)
workDays: JSON.parse(calendar.workDays ?? "[1,2,3,4,5]") as number[],

// 변경 후
workDays: (calendar.workDays ?? [1, 2, 3, 4, 5]) as number[],

// 변경 전 (PUT upsert - create)
workDays: JSON.stringify(workDays ?? [1, 2, 3, 4, 5]),

// 변경 후
workDays: workDays ?? [1, 2, 3, 4, 5],

// 변경 전 (PUT upsert - update)
workDays: JSON.stringify(workDays ?? [1, 2, 3, 4, 5]),

// 변경 후
workDays: workDays ?? [1, 2, 3, 4, 5],
```

- [ ] **Step 4: sla/engine.ts — workDays JSON.parse 제거**

```typescript
// 변경 전
workDays: JSON.parse(calendar.workDays ?? "[1,2,3,4,5]") as number[],

// 변경 후
workDays: (calendar.workDays ?? [1, 2, 3, 4, 5]) as number[],
```

- [ ] **Step 5: public/src/app/api/tickets/route.ts — tags JSON.stringify 제거**

```typescript
// 변경 전
tags: JSON.stringify(tags),

// 변경 후
tags: tags,
```

- [ ] **Step 6: search/route.ts — tags 필터 수정 (contains → has)**

```typescript
// 변경 전
andClauses.push(...params.tags.map((tag) => ({ tags: { contains: tag } })));

// 변경 후
andClauses.push(...params.tags.map((tag) => ({ tags: { has: tag } })));
```

- [ ] **Step 7: filters.ts — formatDateForSQLite 이름 변경**

```typescript
// 변경 전
export function formatDateForSQLite(date: Date): string {
  return date.toISOString();
}

// 변경 후
export function formatDateForSQL(date: Date): string {
  return date.toISOString();
}
```

사용처도 함께 확인 (`grep -r "formatDateForSQLite"` 실행 후 없으면 내부에서만 쓰였으므로 패스).

- [ ] **Step 8: Commit**

```bash
git add apps/admin/src/lib/llm/service.ts \
        apps/admin/src/lib/system/seed-functions.ts \
        apps/admin/src/app/api/admin/settings/business-hours/route.ts \
        apps/admin/src/lib/sla/engine.ts \
        apps/public/src/app/api/tickets/route.ts \
        apps/admin/src/lib/db/queries/admin-analytics/filters.ts \
        apps/admin/src/app/api/tickets/search/route.ts
git commit -m "refactor: replace json string workarounds with native postgresql array types"
```

---

## Task 5: Raw SQL 쿼리 SQLite → PostgreSQL 문법 변환

**핵심 변경 규칙:**
- `julianday()` → `EXTRACT(EPOCH FROM (...)) / 60` (분) 또는 `/ 3600` (시간)
- `strftime('%Y-%m-%d', col)` → `TO_CHAR(col, 'YYYY-MM-DD')`
- `strftime('%Y-%m', col)` → `TO_CHAR(col, 'YYYY-MM')`
- `strftime('%Y-W%W', col)` → `TO_CHAR(col, 'IYYY-"W"IW')`
- 테이블명 쌍따옴표 인용: `Ticket` → `"Ticket"`, `CustomerSatisfaction` → `"CustomerSatisfaction"`
- camelCase 컬럼 쌍따옴표 인용: `assigneeId` → `"assigneeId"` 등
- 플레이스홀더: `?` → `$1, $2, $3...` (PostgreSQL positional params)
- IN 동적 리스트: `IN (?,?,?)` → `= ANY($1::text[])` (단일 배열 파라미터)

**Files:**
- Modify: `apps/admin/src/lib/db/queries/admin-analytics/agents.ts`
- Modify: `apps/admin/src/lib/db/queries/admin-analytics/csat.ts`
- Modify: `apps/admin/src/lib/db/queries/admin-analytics/customer-insights.ts`
- Modify: `apps/admin/src/lib/db/queries/admin-analytics/repeat-inquiries.ts`
- Modify: `apps/admin/src/lib/db/queries/admin-analytics/vip-customers.ts`

- [ ] **Step 1: agents.ts 재작성**

```typescript
// packages/db/raw.ts의 db.execute args는 이제 $1, $2, $3...
const stats = await db.execute<AgentTicketStats>({
  sql: `
    SELECT
      t."assigneeId" as "agentId",
      COUNT(*) as "ticketsHandled",
      AVG(
        CASE
          WHEN t."firstResponseAt" IS NOT NULL
          THEN EXTRACT(EPOCH FROM (t."firstResponseAt" - t."createdAt")) / 60
          ELSE NULL
        END
      ) as "avgFirstResponseMinutes",
      AVG(
        CASE
          WHEN t."resolvedAt" IS NOT NULL OR t."closedAt" IS NOT NULL
          THEN EXTRACT(EPOCH FROM (COALESCE(t."resolvedAt", t."closedAt") - t."createdAt")) / 60
          ELSE NULL
        END
      ) as "avgResolutionMinutes"
    FROM "Ticket" t
    WHERE t."assigneeId" = ANY($1::text[])
      AND t."createdAt" >= $2::timestamptz
      AND t."createdAt" <= $3::timestamptz
    GROUP BY t."assigneeId"
  `,
  args: [agentIds, fromISO, toISO],
});
```

`IN (${agentIds.map(() => '?').join(',')})` 패턴과 `agentIds.map(() => '?')` 동적 생성 코드 삭제.
`args: [...agentIds, fromISO, toISO]` → `args: [agentIds, fromISO, toISO]` (배열을 하나의 arg로).

`AgentTicketStats` 인터페이스의 `ticketsHandled: bigint` — PostgreSQL에서 `COUNT(*)`는 bigint 반환. 기존 `Number(stat.ticketsHandled)` 변환 코드 유지.

- [ ] **Step 2: csat.ts 재작성**

```typescript
let bucketExpression: string;
switch (granularity) {
  case "week":
    bucketExpression = `TO_CHAR("submittedAt", 'IYYY-"W"IW')`;
    break;
  case "month":
    bucketExpression = `TO_CHAR("submittedAt", 'YYYY-MM')`;
    break;
  case "day":
  default:
    bucketExpression = `TO_CHAR("submittedAt", 'YYYY-MM-DD')`;
    break;
}

const buckets = await db.execute<RawCSATBucket>({
  sql: `
    SELECT
      ${bucketExpression} as bucket,
      AVG(rating) as "avgRating",
      COUNT(*) as "responseCount",
      SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as "positiveCount"
    FROM "CustomerSatisfaction"
    WHERE "submittedAt" >= $1::timestamptz
      AND "submittedAt" <= $2::timestamptz
    GROUP BY ${bucketExpression}
    ORDER BY ${bucketExpression} ASC
  `,
  args: [fromISO, toISO],
});
```

- [ ] **Step 3: customer-insights.ts 재작성 (두 개의 raw 쿼리)**

```typescript
// responseTimeStats
db.execute<{ avgMinutes: number | null }>({
  sql: `
    SELECT AVG(EXTRACT(EPOCH FROM ("firstResponseAt" - "createdAt")) / 60) as "avgMinutes"
    FROM "Ticket"
    WHERE "customerId" = $1
      AND "firstResponseAt" IS NOT NULL
  `,
  args: [customerId],
}),

// resolutionTimeStats
db.execute<{ avgHours: number | null }>({
  sql: `
    SELECT AVG(EXTRACT(EPOCH FROM (COALESCE("resolvedAt", "closedAt") - "createdAt")) / 3600) as "avgHours"
    FROM "Ticket"
    WHERE "customerId" = $1
      AND ("resolvedAt" IS NOT NULL OR "closedAt" IS NOT NULL)
  `,
  args: [customerId],
}),
```

타입 캐스팅 제거:
```typescript
// 변경 전
const responseTimeRows = (responseTimeStats as { rows: Array<{ avgMinutes: number | null }> }).rows;

// 변경 후 (제네릭으로 타입 지정했으므로)
const responseTimeRows = responseTimeStats.rows;
```

- [ ] **Step 4: repeat-inquiries.ts 재작성**

```typescript
const rawData = await db.execute<RawRepeatInquiry>({
  sql: `
    SELECT
      t."customerId",
      t."customerEmail",
      t."customerName",
      COUNT(*) as "ticketCount",
      COUNT(DISTINCT t."categoryId") as "distinctCategories",
      MIN(t."createdAt") as "firstTicketAt",
      MAX(t."createdAt") as "lastTicketAt"
    FROM "Ticket" t
    WHERE t."createdAt" >= $1::timestamptz
      AND t."createdAt" <= $2::timestamptz
    GROUP BY t."customerId", t."customerEmail", t."customerName"
    HAVING COUNT(*) >= $3
    ORDER BY COUNT(*) DESC
  `,
  args: [fromISO, toISO, minTickets],
});
```

`RawRepeatInquiry` 인터페이스의 `firstTicketAt: string` → PostgreSQL에서 Date 객체로 반환되므로:
```typescript
interface RawRepeatInquiry {
  customerId: string | null;
  customerEmail: string;
  customerName: string;
  ticketCount: bigint;
  distinctCategories: bigint;
  firstTicketAt: Date;
  lastTicketAt: Date;
}
```

매핑 코드 수정:
```typescript
// 변경 전
firstTicketAt: new Date(row.firstTicketAt),
lastTicketAt: new Date(row.lastTicketAt),

// 변경 후
firstTicketAt: row.firstTicketAt,
lastTicketAt: row.lastTicketAt,
```

- [ ] **Step 5: vip-customers.ts 재작성**

`HAVING`에서 alias를 쓸 수 없으므로 표현식을 반복. `$1` 파라미터를 같은 쿼리에서 여러 번 참조 가능.

```typescript
const rawData = await db.execute<RawVIPData>({
  sql: `
    SELECT
      t."customerId",
      t."customerEmail",
      t."customerName",
      SUM(CASE WHEN t."createdAt" >= $1::timestamptz THEN 1 ELSE 0 END) as "recentTickets",
      COUNT(*) as "lifetimeTickets",
      SUM(CASE
        WHEN t."createdAt" >= $1::timestamptz
          AND t.priority IN ('URGENT', 'HIGH')
        THEN 1 ELSE 0 END) as "highPriorityTickets"
    FROM "Ticket" t
    WHERE t."createdAt" <= $2::timestamptz
    GROUP BY t."customerId", t."customerEmail", t."customerName"
    HAVING
      SUM(CASE WHEN t."createdAt" >= $1::timestamptz THEN 1 ELSE 0 END) >= $3
      OR COUNT(*) >= $4
      OR SUM(CASE WHEN t."createdAt" >= $1::timestamptz AND t.priority IN ('URGENT', 'HIGH') THEN 1 ELSE 0 END) >= $5
    ORDER BY "recentTickets" DESC, "lifetimeTickets" DESC
  `,
  args: [ninetyDaysISO, toISO, minRecentTickets, minLifetimeTickets, minHighPriorityTickets],
});
```

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/lib/db/queries/admin-analytics/
git commit -m "refactor: rewrite analytics raw sql from sqlite to postgresql syntax"
```

---

## Task 6: 운영 Docker 환경 업데이트

**Files:**
- Modify: `docker/docker-compose.yml`
- Modify: `docker/Dockerfile`
- Modify: `docker/.env.example`

- [ ] **Step 1: docker-compose.yml — sqld → postgres 교체**

```yaml
# 제거할 서비스: sqld (전체 블록 삭제)

# 추가할 서비스:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: suppo
      POSTGRES_USER: suppo
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - db_data:/var/lib/postgresql/data
    expose:
      - "5432"

# migrate 서비스 수정:
  migrate:
    build:
      context: ..
      dockerfile: docker/Dockerfile
      target: migrator
    restart: "no"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://suppo:${POSTGRES_PASSWORD}@postgres:5432/suppo
```

`postgres` 서비스에 healthcheck 추가:
```yaml
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U suppo -d suppo"]
      interval: 5s
      timeout: 5s
      retries: 10
```

`bootstrap`, `public`, `admin` 서비스의 `DATABASE_URL` 환경변수도 모두 교체:
```yaml
DATABASE_URL: postgresql://suppo:${POSTGRES_PASSWORD}@postgres:5432/suppo
```

`DATABASE_AUTH_TOKEN` 환경변수 참조 전체 삭제.

`volumes` 섹션 `db_data:` 유지 (이미 있음).

- [ ] **Step 2: Dockerfile migrator 타겟 수정**

```dockerfile
# 변경 전
CMD ["sh", "-lc", "cd /app/packages/db && ./node_modules/.bin/tsx prisma/migrate.ts"]

# 변경 후
CMD ["sh", "-lc", "cd /app/packages/db && ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma"]
```

builder 스테이지의 DATABASE_URL 기본값 수정:
```dockerfile
# 변경 전
ARG DATABASE_URL="file:./packages/db/dev.db"

# 변경 후
ARG DATABASE_URL="postgresql://localhost:5432/suppo"
```

- [ ] **Step 3: docker/.env.example 업데이트**

```
# 제거
DATABASE_AUTH_TOKEN=
# 해당 섹션 주석과 함께 삭제

# 추가 (필수 섹션에)
# [필수] PostgreSQL 비밀번호
POSTGRES_PASSWORD=change-me-in-production
```

`sqld` 관련 주석도 제거.

- [ ] **Step 4: Commit**

```bash
git add docker/docker-compose.yml docker/Dockerfile docker/.env.example
git commit -m "feat: replace sqld with postgresql in production docker setup"
```

---

## Task 7: 타입 검사 및 검증

- [ ] **Step 1: Prisma Client 재생성**

```bash
pnpm --filter=@suppo/db generate
```

Expected: `@prisma/client` 생성 성공, 에러 없음.

- [ ] **Step 2: TypeScript 전체 타입 검사**

```bash
pnpm tsc --noEmit 2>&1 | head -50
```

Expected: 에러 없음. 에러가 있으면 타입 불일치를 수정:
- `tags` 관련: `string | null` → `string[] | null` 시그니처 불일치 확인
- `workDays` 관련: `string | null` → `number[] | null` 시그니처 불일치 확인
- `Prisma.JsonValue` 타입 관련 에러는 해당 타입으로 수정

- [ ] **Step 3: 단위 테스트 실행**

```bash
pnpm test 2>&1 | tail -30
```

Expected: 테스트 통과. 실패 시 변경된 타입에 맞게 테스트 픽스처 수정.

- [ ] **Step 4: 로컬 앱 부트스트랩 확인**

```bash
# DB가 올라와 있는지 확인
docker compose -f docker-compose.dev.yml ps

# 마이그레이션 실행
pnpm --filter=@suppo/db migrate:deploy

# 초기 데이터 시딩
pnpm --filter=@suppo/db bootstrap
```

Expected: 마이그레이션 성공, 부트스트랩 성공.

- [ ] **Step 5: 앱 실행 및 UI 동작 확인**

```bash
pnpm dev
```

브라우저에서 확인:
- 티켓 목록 로드 (`http://localhost:3001/admin/tickets`)
- 티켓 검색 (tags 필터 포함)
- 분석 페이지 (`/admin/analytics`) — raw SQL 쿼리 동작 확인
- 업무 시간 설정 (`/admin/settings/business-hours`) — workDays 저장/로드 확인

- [ ] **Step 6: 최종 Commit**

```bash
git add -A
git commit -m "chore: verify postgresql migration complete, all types passing"
```

---

## 자기 검토 (Self-Review)

### Spec Coverage

| 요구사항 | 구현 태스크 |
|---|---|
| 개발·운영 모두 PostgreSQL | Task 1 (dev), Task 6 (prod) |
| Prisma schema 전환 | Task 2 |
| libSQL 코드 완전 제거 | Task 3 |
| tags, workDays JSON 우회 정리 | Task 4 |
| raw SQL SQLite 문법 제거 | Task 5 |
| 타입 검증 | Task 7 |

### 주의사항

1. **Task 2 Step 5 실행 전**: `.env`의 `DATABASE_URL`이 반드시 `postgresql://...`을 가리켜야 함. `file:...`이면 `prisma migrate dev`가 SQLite 마이그레이션을 생성함.

2. **vip-customers.ts의 HAVING**: `HAVING alias >= $N`은 PostgreSQL에서 허용되지 않음. 반드시 전체 표현식을 반복해야 함 (Task 5 Step 5 참조).

3. **repeat-inquiries.ts의 날짜 타입**: PostgreSQL은 `MIN(createdAt)`을 `string`이 아닌 `Date` 객체로 반환. 인터페이스와 매핑 코드 모두 수정 필요 (Task 5 Step 4 참조).

4. **agents.ts의 ANY 배열**: `= ANY($1::text[])` 패턴에서 `args: [agentIds, ...]` 형태로 배열 자체를 하나의 arg로 전달. 기존처럼 펼치면 안 됨.
