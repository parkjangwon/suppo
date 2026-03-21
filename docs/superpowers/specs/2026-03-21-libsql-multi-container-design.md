# LibSQL 전환 + 멀티 컨테이너 아키텍처 설계

**날짜:** 2026-03-21
**상태:** 승인됨 (v2 — 리뷰 반영)
**작성:** AI Agent (Brainstorming 세션)

---

## 1. 배경 및 목적

### 문제
- 현재 SQLite 파일 기반 DB는 단일 프로세스만 안전하게 접근 가능
- 사용자(Public)와 관리자(Admin) 서비스를 별도 컨테이너로 분리하면 동시 write 충돌 발생
- 운영 시 보안 격리(Admin은 내부망만 접근)와 스케일 분리(Public만 수평 확장)가 필요

### 목표
1. **보안 격리**: Admin 컨테이너는 VPN/내부망에서만 접근, Public은 인터넷에 노출
2. **스케일 분리**: Public 트래픽 증가 시 Public 컨테이너만 수평 확장
3. **개발 편의성 유지**: 로컬에서는 `pnpm dev` 그대로, 변경 없음
4. **운영 효율성**: docker-compose 단일 명령으로 전체 스택 기동

---

## 2. 핵심 아키텍처 결정

### 2-1. DB: SQLite → LibSQL(sqld) 전환

**선택:** LibSQL(sqld) 자체 호스팅

**이유:**
- SQLite 완전 호환 (스키마 변경 없음)
- 멀티 클라이언트 동시 접근 지원 (write 충돌 해결)
- Prisma 공식 드라이버 어댑터 제공 (`@prisma/adapter-libsql`)
- 로컬 dev에서는 embedded 파일 모드로 sqld 서버 불필요

**DB URL 전략:**

| 환경 | DATABASE_URL | sqld 서버 |
|------|-------------|-----------|
| 로컬 dev | `file:./prisma/dev.db` | 불필요 |
| 운영(docker) | `http://sqld:8889` | sqld 컨테이너 |

### 2-2. 앱 분리: 단일 레포 + 단일 Docker 이미지 방식

**선택:** 코드베이스 유지, Dockerfile 하나, `APP_TYPE` 환경변수로 분기

**이유:**
- 현재 route group 구조 `(admin)` / `(public)` 를 그대로 활용
- 단일 이미지라 빌드/배포 파이프라인 단순
- `docker-compose scale` 또는 `replicas`로 즉시 수평 확장 가능

**APP_TYPE별 허용 경로:**

| APP_TYPE | 허용 | 차단 시 동작 |
|----------|------|------------|
| `public` | `/(public)/*`, `/api/tickets/*`, `/api/knowledge/*`, `/api/survey/*`, `/api/internal/*`, `/api/auth/*`, `/api/webhooks/email` | `/admin/*` → `ADMIN_URL`로 리다이렉트 |
| `admin` | `/admin/*`, `/api/admin/*`, `/api/agents/*`, `/api/auth/*`, `/api/git/*`, `/api/ai/*`, `/api/webhooks/github` | public 전용 경로 → `PUBLIC_URL`로 리다이렉트 |
| 미설정 | 전체 허용 | (로컬 dev 모드) |

> **참고:**
> - `/api/auth/*` (NextAuth)는 **양쪽 모두 허용** — `AUTH_SECRET`이 공유되므로 어느 컨테이너에서도 세션 검증 가능
> - `webhooks/email` (외부 이메일 수신 → 티켓 생성) → public 컨테이너
> - `webhooks/github` (Git 이벤트 처리) → admin 컨테이너
> - `/api/internal/email-dispatch` (이메일 Outbox 처리) → public 컨테이너, 외부 크론이 호출

---

## 3. 운영 아키텍처 다이어그램

```
Internet
    │
    ▼
┌─────────────────────────────────────────┐
│               Nginx                     │
│  helpdesk.company.com → public:3000     │
│  admin.company.com    → admin:3000      │  ← VPN/내부망 only
└──────────────────┬──────────────────────┘
                   │
         ┌─────────┴──────────┐
         ▼                    ▼
┌──────────────┐     ┌──────────────┐
│    Public    │     │    Admin     │
│  Container   │     │  Container   │
│  :3000       │     │  :3000       │
│  APP_TYPE=   │     │  APP_TYPE=   │
│  public      │     │  admin       │
│  (N개 가능)  │     │  (1개 고정)  │
└──────┬───────┘     └──────┬───────┘
       └──────────┬──────────┘
                  ▼
       ┌─────────────────────┐
       │   sqld Container    │
       │   LibSQL Server     │
       │   :8889             │
       │   (외부 미노출)     │
       └──────────┬──────────┘
                  ▼
          [SQLite 볼륨 db_data]

[uploads 공유 볼륨] ← Public/Admin 양쪽 마운트
```

---

## 4. 구현 전 선행 작업 (Critical)

> **이 작업들은 LibSQL 전환 전에 반드시 완료해야 함**

### 4-1. `$queryRaw` 제거 (Critical)

**문제:** Prisma Driver Adapter는 `$queryRaw` / `$executeRaw`를 지원하지 않음.
현재 코드베이스에 13곳 존재:

| 파일 | 용도 | 대체 방법 |
|------|------|---------|
| `src/lib/system/backup.ts` | `_prisma_migrations` 읽기 | `fs.readdir('prisma/migrations/')` 로 파일시스템에서 직접 읽기 |
| `src/lib/system/restore.ts` | 동일 | 동일 |
| `src/lib/db/queries/admin-analytics/agents.ts` | 복잡한 집계 SQL | `libsql` 클라이언트 직접 사용 (`client.execute(sql)`) |
| `src/lib/db/queries/admin-analytics/csat.ts` | 동일 | 동일 |
| `src/lib/db/queries/admin-analytics/repeat-inquiries.ts` | 동일 | 동일 |
| `src/lib/db/queries/admin-analytics/customer-insights.ts` | 동일 | 동일 |
| `src/lib/db/queries/admin-analytics/vip-customers.ts` | 동일 | 동일 |
| `src/app/api/admin/analytics/overview/route.ts` | 동일 | 동일 |
| `src/app/api/admin/analytics/customers/route.ts` | 동일 | 동일 |

**대체 패턴 (analytics):**
```ts
// Before (prisma.$queryRaw — LibSQL 어댑터에서 동작 안 함)
const result = await prisma.$queryRaw<...>`SELECT ... FROM "Ticket" WHERE ...`;

// After (libsql 클라이언트 직접 사용)
import { db } from "@/lib/db/raw";   // libsql client 별도 export
const result = await db.execute({ sql: "SELECT ... FROM Ticket WHERE ...", args: [] });
```

**대체 패턴 (backup/restore — 마이그레이션 버전 조회):**
```ts
// Before
const migrations = await prisma.$queryRaw<{ migration_name: string }[]>`
  SELECT migration_name FROM _prisma_migrations
  WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1
`;

// After (파일시스템에서 직접 읽기)
import fs from "fs/promises";
import path from "path";
const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
const dirs = await fs.readdir(migrationsDir);
const latestMigration = dirs.filter(d => /^\d{14}_/.test(d)).sort().at(-1) ?? "unknown";
```

**`src/lib/db/raw.ts` 신규 파일 (libsql 클라이언트 직접 export):**
```ts
import { createClient } from "@libsql/client";

export const db = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
```

### 4-2. 인터랙티브 트랜잭션 확인

Prisma 6.x Driver Adapter는 **인터랙티브 트랜잭션 (`$transaction(async (tx) => {...})`)을 지원함**.
현재 코드베이스의 10곳 트랜잭션은 변경 불필요.

---

## 5. 코드 변경 상세

### 5-1. 패키지 설치

```bash
pnpm add @libsql/client @prisma/adapter-libsql
```

### 5-2. `prisma/schema.prisma`

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]  // 추가
}

datasource db {
  provider = "sqlite"   // 유지 (스키마 변경 없음)
  url      = env("DATABASE_URL")
}
```

### 5-3. `src/lib/db/client.ts` 교체

```ts
import { createClient } from "@libsql/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const libsql = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN, // Turso cloud 사용 시, sqld는 불필요
  });
  const adapter = new PrismaLibSQL(libsql);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development"
      ? ["query", "warn", "error"]
      : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

### 5-4. `.env` 변경 (로컬 dev)

```env
# 기존 sqlite:// → file:// 형식 (LibSQL embedded 파일 모드)
DATABASE_URL="file:./prisma/dev.db"
DATABASE_AUTH_TOKEN=   # 로컬에서는 비워둠
```

### 5-5. `src/middleware.ts` — APP_TYPE 분기 추가

**기존 matcher 확장:**
```ts
export const config = {
  // 기존: ["/admin/:path*"]
  // 변경: public 컨테이너에서 /admin 차단, admin 컨테이너에서 public 경로 차단하려면 확장 필요
  matcher: ["/admin/:path*", "/knowledge/:path*", "/tickets/:path*", "/survey/:path*"],
};
```

**미들웨어 상단에 APP_TYPE 분기 추가 (기존 auth 로직 앞):**
```ts
const APP_TYPE = process.env.APP_TYPE;
const PUBLIC_URL = process.env.PUBLIC_URL ?? "";
const ADMIN_URL = process.env.ADMIN_URL ?? "";

// Public 컨테이너: /admin/* 요청을 admin 컨테이너로 보냄
if (APP_TYPE === "public" && nextUrl.pathname.startsWith("/admin")) {
  return NextResponse.redirect(ADMIN_URL + nextUrl.pathname + nextUrl.search);
}

// Admin 컨테이너: public 전용 경로를 public 컨테이너로 보냄
const PUBLIC_ONLY = ["/knowledge", "/tickets", "/survey"];
if (APP_TYPE === "admin" && PUBLIC_ONLY.some(p => nextUrl.pathname.startsWith(p))) {
  return NextResponse.redirect(PUBLIC_URL + nextUrl.pathname + nextUrl.search);
}
// 이후 기존 auth 로직 유지...
```

> **Edge Runtime 주의:** 환경변수 확인 + URL 리다이렉트만 수행. Prisma 쿼리 절대 금지.

### 5-6. `next.config.ts` — standalone 출력 추가

```ts
const nextConfig = {
  output: "standalone",   // 추가
  // ... 기존 설정 유지
};
```

---

## 6. Dockerfile (단일)

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── 의존성 설치
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── 빌드
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# ── 마이그레이션 전용 스테이지 (운영 마이그레이션 시 사용)
FROM base AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY package.json ./
# 마이그레이션 실행: DATABASE_URL 환경변수 주입 후 deploy
CMD ["pnpm", "prisma", "migrate", "deploy"]

# ── 런타임 (최소 이미지)
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

**이미지 빌드 명령:**
```bash
# 앱 이미지
docker build --target runner -t crinity-helpdesk:latest .

# 마이그레이션 이미지 (별도 빌드)
docker build --target migrator -t crinity-migrate:latest .
```

---

## 7. docker-compose.yml

```yaml
services:
  sqld:
    image: ghcr.io/tursodatabase/libsql-server:latest
    restart: unless-stopped
    volumes:
      - db_data:/var/lib/sqld
    environment:
      SQLD_NODE: primary
      SQLD_HTTP_LISTEN_ADDR: "0.0.0.0:8889"
    expose:
      - "8889"   # 내부 네트워크 전용 — ports로 외부 노출 금지
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8889/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  public:
    image: crinity-helpdesk:latest
    restart: unless-stopped
    depends_on:
      sqld:
        condition: service_healthy
    environment:
      APP_TYPE: public
      DATABASE_URL: http://sqld:8889
      DATABASE_AUTH_TOKEN: ""
      PUBLIC_URL: ${PUBLIC_URL}
      ADMIN_URL: ${ADMIN_URL}
      AUTH_SECRET: ${AUTH_SECRET}
      TICKET_ACCESS_SECRET: ${TICKET_ACCESS_SECRET}
      GIT_TOKEN_ENCRYPTION_KEY: ${GIT_TOKEN_ENCRYPTION_KEY}
    volumes:
      - uploads:/app/public/uploads
    expose:
      - "3000"
    # 수평 확장: docker-compose up --scale public=3

  admin:
    image: crinity-helpdesk:latest
    restart: unless-stopped
    depends_on:
      sqld:
        condition: service_healthy
    environment:
      APP_TYPE: admin
      DATABASE_URL: http://sqld:8889
      DATABASE_AUTH_TOKEN: ""
      PUBLIC_URL: ${PUBLIC_URL}
      ADMIN_URL: ${ADMIN_URL}
      AUTH_SECRET: ${AUTH_SECRET}
      TICKET_ACCESS_SECRET: ${TICKET_ACCESS_SECRET}
      GIT_TOKEN_ENCRYPTION_KEY: ${GIT_TOKEN_ENCRYPTION_KEY}
      INITIAL_ADMIN_EMAIL: ${INITIAL_ADMIN_EMAIL}
      INITIAL_ADMIN_PASSWORD: ${INITIAL_ADMIN_PASSWORD}
    volumes:
      - uploads:/app/public/uploads
    expose:
      - "3000"

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - public
      - admin

volumes:
  db_data:
  uploads:
```

---

## 8. nginx.conf

```nginx
upstream public_app {
    server public:3000;
    # 수평 확장 시 docker-compose가 자동 라운드로빈 처리
}

upstream admin_app {
    server admin:3000;
}

server {
    listen 80;
    server_name helpdesk.company.com admin.company.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name helpdesk.company.com;

    ssl_certificate     /etc/nginx/certs/public.crt;
    ssl_certificate_key /etc/nginx/certs/public.key;

    location / {
        proxy_pass         http://public_app;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        client_max_body_size 600M;  # 백업 복구 파일 크기 대응
    }
}

server {
    listen 443 ssl;
    server_name admin.company.com;

    ssl_certificate     /etc/nginx/certs/admin.crt;
    ssl_certificate_key /etc/nginx/certs/admin.key;

    # 내부망/VPN IP만 허용 (예시)
    # allow 10.0.0.0/8;
    # deny all;

    location / {
        proxy_pass         http://admin_app;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        client_max_body_size 600M;
    }
}
```

---

## 9. .env.production 템플릿

```env
# 도메인
PUBLIC_URL=https://helpdesk.company.com
ADMIN_URL=https://admin.company.com

# 인증
AUTH_SECRET=<32자 이상 랜덤 문자열>
TICKET_ACCESS_SECRET=<32자 이상 랜덤 문자열>
GIT_TOKEN_ENCRYPTION_KEY=<32바이트 키>

# 초기 관리자
INITIAL_ADMIN_EMAIL=admin@company.com
INITIAL_ADMIN_PASSWORD=<초기 비밀번호>

# LibSQL (sqld 컨테이너 내부 주소 — 변경 불필요)
DATABASE_URL=http://sqld:8889
DATABASE_AUTH_TOKEN=
```

---

## 10. 배포 절차

### 최초 배포

```bash
# 1. 이미지 빌드
docker build --target runner  -t crinity-helpdesk:latest .
docker build --target migrator -t crinity-migrate:latest .

# 2. sqld 먼저 기동
docker compose up -d sqld

# 3. DB 마이그레이션 실행 (일회성)
docker run --rm \
  --network <project>_default \
  -e DATABASE_URL=http://sqld:8889 \
  crinity-migrate:latest

# 4. DB 초기 데이터 시드 (관리자 계정 생성)
docker compose run --rm admin \
  sh -c "DATABASE_URL=http://sqld:8889 pnpm prisma db seed"

# 5. 전체 스택 기동
docker compose up -d
```

### 업데이트 배포

```bash
docker build --target runner  -t crinity-helpdesk:latest .
docker build --target migrator -t crinity-migrate:latest .

# 마이그레이션 (스키마 변경이 없으면 생략 가능)
docker run --rm --network <project>_default \
  -e DATABASE_URL=http://sqld:8889 crinity-migrate:latest

# sqld는 재시작하지 않음 (데이터 보존)
docker compose up -d --no-deps public admin nginx
```

### 수평 확장 (Public만)

```bash
docker compose up -d --scale public=3
```

---

## 11. 기존 데이터 이전 (SQLite → sqld)

기존 `prisma/dev.db` 데이터를 sqld로 옮기려면 **백업/복구 기능 활용**:

1. 현재 앱 실행 중 → `/admin/settings/system` → 백업 ZIP 다운로드
2. sqld 기동 + 새 앱 배포 후 → 같은 페이지에서 복구 ZIP 업로드

백업/복구는 Prisma JSON 방식이므로 DB 드라이버와 무관하게 동작.

---

## 12. 백업/복구 호환성

현재 백업 시스템은 Prisma JSON export 방식 — **LibSQL 전환 후에도 호환됨**.
단, `$queryRaw`로 `_prisma_migrations`를 읽는 부분은 선행 작업(섹션 4-1)에서
파일시스템 읽기 방식으로 교체 필요.

---

## 13. 주의사항 요약

| 항목 | 내용 |
|------|------|
| `$queryRaw` 13곳 | LibSQL 어댑터 미지원 → 선행 교체 필수 |
| 인터랙티브 트랜잭션 | Prisma 6.x 지원됨 → 변경 불필요 |
| 미들웨어 Edge Runtime | Prisma 쿼리 절대 금지, 환경변수 + 리다이렉트만 허용 |
| sqld 포트 8889 | `expose`만 사용, `ports` 외부 노출 금지 |
| uploads 볼륨 | Public/Admin 동일 볼륨 마운트 필수 |
| AUTH_SECRET | Admin/Public 동일 값 사용 (세션 쿠키 공유) |
| 다중 호스트 확장 | uploads 볼륨 → NFS 또는 S3 전환 필요 (현재 스코프 외) |

---

## 14. 구현 순서 (다음 세션용)

**Phase 1 — 선행 작업 (코드 변경)**
1. `$queryRaw` 13곳 교체
   - `backup.ts`, `restore.ts` → 파일시스템 읽기
   - analytics 쿼리 7곳 → `src/lib/db/raw.ts` libsql 클라이언트 직접 사용
2. 로컬에서 `pnpm dev` + 백업/복구 + 분석 페이지 정상 동작 확인

**Phase 2 — LibSQL 어댑터 전환**
3. `pnpm add @libsql/client @prisma/adapter-libsql`
4. `prisma/schema.prisma` — `previewFeatures` 추가
5. `src/lib/db/client.ts` — 어댑터 방식으로 교체
6. `src/lib/db/raw.ts` — libsql 클라이언트 export
7. `pnpm prisma generate` + `pnpm dev` 검증

**Phase 3 — Docker/인프라**
8. `next.config.ts` — `output: "standalone"` 추가
9. `Dockerfile` 작성 (runner + migrator 스테이지)
10. `docker-compose.yml` 작성
11. `nginx.conf` 작성
12. `.env.production` 템플릿 작성

**Phase 4 — 미들웨어 분기**
13. `src/middleware.ts` — `APP_TYPE` 분기 + matcher 확장

**Phase 5 — 통합 테스트**
14. 로컬 Docker 빌드 + docker-compose 기동 검증
15. Public/Admin 라우팅 분기 동작 확인
16. 백업/복구 동작 확인
17. `AGENTS.md` 운영 배포 가이드 업데이트
