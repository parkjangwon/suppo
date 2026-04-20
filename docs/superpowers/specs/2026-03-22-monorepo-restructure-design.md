# 모노레포 구조 전환 설계 문서

**날짜:** 2026-03-22
**상태:** 승인됨 (v2 — 스펙 리뷰 반영)
**목표:** 단일 Next.js 앱(APP_TYPE 분기)을 pnpm 워크스페이스 기반 모노레포로 전환하여 admin/public 앱을 완전히 분리하고, APP_TYPE 분기로 인한 버그를 구조적으로 제거한다.

---

## 1. 배경 및 문제

### 현재 구조의 문제
- 하나의 Next.js 앱에 admin/public 코드가 공존하며 `APP_TYPE` 환경변수로 런타임 분기
- 미들웨어·라우팅·인증 로직에 `if APP_TYPE === "admin"` / `if APP_TYPE === "public"` 분기가 누적
- 한쪽 변경이 다른 쪽 버그를 유발 (예: `/knowledge` 접근 시 `/admin/login` 리다이렉트)
- 기능 추가 시마다 양쪽 컨테이너 영향 검토 필요

### 목표
- admin/public 앱을 코드 레벨에서 완전 분리
- `APP_TYPE` 환경변수 및 관련 분기 코드 전면 제거
- 공유 코드는 패키지로 명시적 관리
- 운영자가 `--scale` 플래그로 각 앱을 독립적으로 다중화 가능
- 개발 환경: SQLite 파일 (Docker 불필요), 운영 환경: sqld HTTP 서버

---

## 2. 기술 스택 결정

| 항목 | 결정 | 이유 |
|---|---|---|
| 워크스페이스 | pnpm workspaces | 이미 pnpm 사용 중, 추가 툴 불필요 |
| DB (개발) | SQLite 파일 (`file:./dev.db`) | Docker 없이 즉시 개발 가능 |
| DB (운영) | LibSQL/sqld HTTP | 이미 검증됨, multi-write 지원, 스키마 변경 불필요 |
| 빌드 | Next.js standalone output | 현재 방식 유지 |
| 컨테이너 | 단일 Dockerfile + APP_NAME 빌드 인자 | admin/public 각각 독립 이미지 |

---

## 3. 디렉터리 구조

```
suppo/                    ← git 루트 (단일 레포 유지)
├── pnpm-workspace.yaml
├── package.json                     ← 루트: 워크스페이스 툴링만 (lint, test 스크립트)
├── tsconfig.base.json               ← 공통 TypeScript 설정
├── apps/
│   ├── admin/                       ← @suppo/admin
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (admin)/admin/   ← 기존 admin 라우트 그대로 이동
│   │       │   └── api/
│   │       │       ├── admin/       ← /api/admin/*
│   │       │       ├── ai/          ← /api/ai/*
│   │       │       ├── auth/        ← NextAuth 핸들러
│   │       │       ├── git/         ← /api/git/*
│   │       │       ├── internal/    ← /api/internal/*
│   │       │       ├── llm/         ← /api/llm/*
│   │       │       ├── templates/   ← /api/templates/*
│   │       │       └── webhooks/    ← /api/webhooks/*
│   │       ├── components/admin/    ← admin 전용 컴포넌트
│   │       ├── lib/                 ← admin 전용 비즈니스 로직
│   │       │   ├── ai/
│   │       │   ├── assignment/
│   │       │   ├── audit/
│   │       │   ├── git/
│   │       │   ├── llm/
│   │       │   ├── reports/
│   │       │   ├── sla/
│   │       │   └── templates/
│   │       ├── auth.ts              ← NextAuth 설정 (Credentials, Google, GitHub, SAML)
│   │       └── middleware.ts        ← 인증 체크만 (APP_TYPE 분기 없음)
│   └── public/                      ← @suppo/public
│       ├── package.json
│       ├── next.config.ts
│       ├── tsconfig.json
│       └── src/
│           ├── app/
│           │   ├── (public)/        ← 기존 public 라우트 그대로 이동
│           │   ├── survey/
│           │   └── api/
│           │       ├── knowledge/   ← /api/knowledge/*
│           │       ├── tickets/     ← 고객용 티켓 생성/조회
│           │       ├── comments/    ← 고객용 댓글
│           │       └── survey/      ← /api/survey/*
│           │       # NextAuth 없음 — 티켓 토큰은 각 API route에서 직접 검증
│           ├── components/
│           │   ├── ticket/
│           │   ├── knowledge/
│           │   └── survey/
│           └── middleware.ts        ← 없음 (또는 빈 패스스루, 아래 참고)
└── packages/
    ├── db/                          ← @suppo/db
    │   ├── package.json
    │   ├── prisma/
    │   │   ├── schema.prisma        ← 현재 위치에서 이동
    │   │   │                           generator output → "../node_modules/.prisma/client"
    │   │   ├── migrations/
    │   │   └── seed.ts
    │   └── src/
    │       ├── client.ts            ← PrismaClient 팩토리 (LibSQL 어댑터 + build guard)
    │       └── index.ts
    ├── ui/                          ← @suppo/ui
    │   ├── package.json             ← 빌드 스텝 없음 (소스 직접 소비)
    │   └── src/components/ui/       ← 현재 src/components/ui/ 이동
    └── shared/                      ← @suppo/shared
        ├── package.json
        └── src/
            ├── auth/                ← auth config, BackofficeRole 타입, guards
            ├── security/            ← 티켓 access token (JWT), rate limiting
            ├── email/               ← enqueue.ts, process-outbox.ts (공유 가능한 부분만)
            ├── tickets/             ← 티켓 CRUD (양쪽 사용)
            ├── knowledge/           ← 지식베이스 조회 (양쪽 사용)
            ├── branding/            ← 시스템 브랜딩
            ├── storage/             ← 파일 스토리지 (local/S3)
            ├── utils/               ← 공통 유틸리티
            └── validation/          ← Zod 스키마
```

---

## 4. 패키지 상세 명세

### 4.1 `packages/db` — `@suppo/db`

**Prisma 클라이언트 가시성 (중요):**
`schema.prisma`의 `generator` 블록에서 `output`을 명시적으로 설정해 각 앱에서 접근 가능하도록 한다:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
  output          = "../node_modules/.prisma/client"
}
```

이렇게 하면 `packages/db/node_modules/.prisma/client`에 생성되고, `@suppo/db`를 import하는 앱이 workspace 심링크를 통해 자동으로 참조한다. 별도로 각 앱에서 `prisma generate`를 실행할 필요 없다.

**`packages/db/src/client.ts`:**
```ts
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "";
  // 빌드 단계에서는 LibSQL 연결 시도 안 함 (URL_INVALID 오류 방지)
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  if (!isBuildPhase && (url.startsWith("http://") || url.startsWith("https://"))) {
    return new PrismaClient({
      adapter: new PrismaLibSql({ url, authToken: process.env.DATABASE_AUTH_TOKEN }),
    });
  }
  return new PrismaClient();
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**`packages/db/package.json` 스크립트:**
```json
{
  "name": "@suppo/db",
  "scripts": {
    "generate":     "prisma generate --schema=./prisma/schema.prisma",
    "migrate:dev":  "prisma migrate dev --schema=./prisma/schema.prisma",
    "migrate:deploy": "prisma migrate deploy --schema=./prisma/schema.prisma",
    "seed":         "tsx prisma/seed.ts",
    "studio":       "prisma studio --schema=./prisma/schema.prisma"
  }
}
```

**사용:**
```ts
import { prisma } from "@suppo/db";
```

---

### 4.2 `packages/ui` — `@suppo/ui`

**빌드 스텝 없음 — 소스 직접 소비 방식:**
shadcn/ui 컴포넌트는 `"use client"`, Tailwind 클래스, JSX를 포함하므로 사전 컴파일 없이 각 앱의 Next.js가 직접 트랜스파일한다.

이를 위해 각 앱의 `next.config.ts`에 반드시 추가:
```ts
const nextConfig = {
  transpilePackages: ["@suppo/ui", "@suppo/shared"],
  // ...
};
```

**Tailwind 공유 설정:**
Tailwind 테마(CSS 변수, 컬러 토큰, borderRadius 등)를 각 앱에서 중복 정의하지 않도록 `packages/ui/tailwind.config.base.ts`를 만들고 각 앱이 extends:

```ts
// packages/ui/tailwind.config.base.ts
export const uiTailwindConfig = {
  theme: { extend: { /* 공통 테마 */ } },
  plugins: [require("tailwindcss-animate")],
};

// apps/admin/tailwind.config.ts
import { uiTailwindConfig } from "@suppo/ui/tailwind.config.base";
export default {
  ...uiTailwindConfig,
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",  // ui 패키지 소스도 스캔
    "../../packages/shared/src/**/*.{ts,tsx}",
  ],
};
```

**사용:**
```ts
import { Button, Card, Dialog } from "@suppo/ui";
```

---

### 4.3 `packages/shared` — `@suppo/shared`

**포함 모듈 (admin/public 양쪽 사용):**

| 모듈 | 현재 위치 | 비고 |
|---|---|---|
| `auth/config` | `src/lib/auth/config.ts` | BackofficeRole 타입, 경로 상수 |
| `auth/guards` | `src/lib/auth/guards.ts` | |
| `security/` | `src/lib/security/` | 티켓 access token (JWT), rate limiting |
| `email/enqueue.ts` | `src/lib/email/` 중 일부 | Outbox 큐 추가 (공유) |
| `email/process-outbox.ts` | `src/lib/email/` 중 일부 | Outbox 처리 루프 (공유) |
| `tickets/` | `src/lib/tickets/` 중 일부 | 생성/조회 로직 (양쪽 사용) |
| `knowledge/` | `src/lib/knowledge/` | |
| `branding/` | `src/lib/branding/` | |
| `storage/` | `src/lib/storage/` | |
| `utils/` | `src/lib/utils/` | |
| `validation/` | `src/lib/validation/` | |

**email 분리 기준:**
- `packages/shared/src/email/` : `enqueue.ts` (Outbox에 메일 추가), `process-outbox.ts` (발송 처리) — 양쪽 사용
- `apps/admin/src/lib/email/` : `renderers.tsx` (에이전트 컨텍스트를 담은 이메일 템플릿 렌더러) — admin 전용 개념 포함

---

### 4.4 미들웨어

**`apps/admin/src/middleware.ts`** — 인증 체크 + 요청 헤더 주입:
```ts
import { auth } from "./auth";
import { NextResponse } from "next/server";
import { BACKOFFICE_DASHBOARD_PATH, BACKOFFICE_LOGIN_PATH } from "@suppo/shared/auth/config";

const PASSWORD_CHANGE_PATH = "/admin/change-password";

export default auth((request) => {
  const { nextUrl } = request;
  const isAuthenticated = Boolean(request.auth);
  const isLoginRoute = nextUrl.pathname === BACKOFFICE_LOGIN_PATH;
  const isPasswordChangeRoute = nextUrl.pathname === PASSWORD_CHANGE_PATH;
  const isApiRoute = nextUrl.pathname.startsWith("/api/");
  const requiresPasswordChange = request.auth?.user?.isInitialPassword === true;

  if (!isAuthenticated && !isLoginRoute)
    return NextResponse.redirect(new URL(BACKOFFICE_LOGIN_PATH, nextUrl));
  if (isAuthenticated && isLoginRoute && !requiresPasswordChange)
    return NextResponse.redirect(new URL(BACKOFFICE_DASHBOARD_PATH, nextUrl));
  if (isAuthenticated && requiresPasswordChange && !isPasswordChangeRoute && !isApiRoute)
    return NextResponse.redirect(new URL(PASSWORD_CHANGE_PATH, nextUrl));
  if (isAuthenticated && !requiresPasswordChange && isPasswordChangeRoute)
    return NextResponse.redirect(new URL(BACKOFFICE_DASHBOARD_PATH, nextUrl));

  // API route 핸들러가 세션을 직접 읽는 대신 헤더를 사용하는 패턴 유지
  const requestHeaders = new Headers(request.headers);
  if (request.auth?.user?.role)
    requestHeaders.set("x-backoffice-role", request.auth.user.role);
  if (request.auth?.user?.agentId)
    requestHeaders.set("x-backoffice-agent-id", request.auth.user.agentId);

  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = { matcher: ["/admin/:path*"] };
```

**`apps/public/src/middleware.ts`** — 미들웨어 없음:
- public 앱은 NextAuth 세션을 사용하지 않음 (티켓 access token은 JWT 기반, 각 API route에서 직접 검증)
- 미들웨어 파일을 생성하지 않음 (불필요한 edge runtime 호출 제거)

---

### 4.5 NextAuth 분리

**`apps/admin/src/auth.ts`** — 현재 `src/auth.ts` 그대로 이동:
- Credentials, Google, GitHub, SAML/BoxyHQ 모든 provider 유지
- `trustHost: true` 유지
- `AUTH_URL=${ADMIN_URL}` 환경변수로 콜백 URL 결정

**`apps/public/src/auth.ts`** — 불필요, 생성하지 않음:
- public 앱은 NextAuth 세션을 사용하지 않음
- 티켓 조회는 `@suppo/shared/security/ticket-access.ts`의 JWT 토큰 검증 사용

---

## 5. TypeScript 설정

**`tsconfig.base.json`** (루트):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "types": ["vitest/globals"]
  }
}
```

**각 앱 `tsconfig.json`**:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

**패키지 `tsconfig.json`**:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "paths": { "@suppo/db": ["../db/src"] }
  },
  "include": ["src"]
}
```

---

## 6. Docker / 인프라

### 6.1 Next.js standalone output (모노레포 핵심 설정)

pnpm 모노레포에서 standalone 출력 경로가 달라진다. 각 앱의 `next.config.ts`에 **반드시** 설정:

```ts
// apps/admin/next.config.ts
import path from "path";

const nextConfig = {
  output: "standalone",
  // 모노레포 루트를 tracing root로 설정해야 packages/ node_modules까지 추적됨
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@suppo/ui", "@suppo/shared"],
  // ...
};
```

standalone 빌드 결과 구조:
```
apps/admin/.next/standalone/
├── apps/admin/server.js         ← 진입점 (server.js가 루트가 아님)
├── apps/admin/.next/
├── node_modules/                ← 런타임 의존성
└── packages/                   ← workspace 패키지들
```

### 6.2 Dockerfile

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── 의존성 설치
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json   ./apps/admin/
COPY apps/public/package.json  ./apps/public/
COPY packages/db/package.json      ./packages/db/
COPY packages/ui/package.json      ./packages/ui/
COPY packages/shared/package.json  ./packages/shared/
RUN pnpm install --frozen-lockfile

# ── 프로덕션 의존성만
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json   ./apps/admin/
COPY apps/public/package.json  ./apps/public/
COPY packages/db/package.json      ./packages/db/
COPY packages/ui/package.json      ./packages/ui/
COPY packages/shared/package.json  ./packages/shared/
RUN pnpm install --frozen-lockfile --prod

# ── 빌드
FROM base AS builder
ARG APP_NAME
ARG AUTH_SECRET="build-time-placeholder"
ARG DATABASE_URL="file:///dev/null"
ARG TICKET_ACCESS_SECRET="build-time-placeholder"
ARG GIT_TOKEN_ENCRYPTION_KEY="build-time-placeholder-32byte-xx"
ENV AUTH_SECRET=$AUTH_SECRET \
    DATABASE_URL=$DATABASE_URL \
    TICKET_ACCESS_SECRET=$TICKET_ACCESS_SECRET \
    GIT_TOKEN_ENCRYPTION_KEY=$GIT_TOKEN_ENCRYPTION_KEY
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter=@suppo/db generate
RUN pnpm --filter=@suppo/${APP_NAME} build
ENV AUTH_SECRET="" DATABASE_URL="" TICKET_ACCESS_SECRET="" GIT_TOKEN_ENCRYPTION_KEY=""

# ── 마이그레이션 전용 (Prisma CLI 포함 이미지 별도)
FROM base AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/db/prisma ./packages/db/prisma
COPY packages/db/package.json ./packages/db/
COPY package.json pnpm-workspace.yaml ./
CMD ["pnpm", "--filter=@suppo/db", "migrate:deploy"]

# ── 런타임
FROM base AS runner
ARG APP_NAME
# ARG는 빌드 시에만 유효하므로 CMD에서 사용하려면 ENV로 전환 필요
ENV APP_NAME=$APP_NAME \
    NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=prod-deps /app/node_modules ./node_modules
# Prisma 생성 클라이언트 복사 (prod-deps에는 prisma CLI 없으므로 builder에서 복사)
COPY --from=builder /app/packages/db/node_modules/.prisma ./packages/db/node_modules/.prisma

# standalone 전체 복사 (모노레포 구조 그대로 유지)
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP_NAME}/.next/standalone ./
# 정적 파일 (standalone에 미포함)
COPY --from=builder --chown=nextjs:nodejs \
    /app/apps/${APP_NAME}/.next/static \
    ./apps/${APP_NAME}/.next/static
# public 폴더
COPY --from=builder --chown=nextjs:nodejs \
    /app/apps/${APP_NAME}/public \
    ./apps/${APP_NAME}/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
# shell form: $APP_NAME이 ENV로 설정되어 있으므로 런타임에 정상 확장됨
CMD node apps/$APP_NAME/server.js

### 6.3 docker-compose.yml

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
      - "8889"

  migrate:
    build:
      context: .
      target: migrator        ← 별도 migrator 스테이지 사용 (Prisma CLI 포함)
    restart: "no"
    depends_on:
      - sqld
    environment:
      DATABASE_URL: http://sqld:8889

  public:
    build:
      context: .
      target: runner
      args:
        APP_NAME: public
    image: suppo-public:latest
    restart: unless-stopped
    depends_on:
      migrate:
        condition: service_completed_successfully
    environment:
      AUTH_URL: ${PUBLIC_URL}
      AUTH_SECRET: ${AUTH_SECRET}
      DATABASE_URL: http://sqld:8889
      PUBLIC_URL: ${PUBLIC_URL}
      ADMIN_URL: ${ADMIN_URL}
      TICKET_ACCESS_SECRET: ${TICKET_ACCESS_SECRET}
      GIT_TOKEN_ENCRYPTION_KEY: ${GIT_TOKEN_ENCRYPTION_KEY}
    expose:
      - "3000"
    # 다중화: docker compose up --scale public=3 -d

  admin:
    build:
      context: .
      target: runner
      args:
        APP_NAME: admin
    image: suppo-admin:latest
    restart: unless-stopped
    depends_on:
      migrate:
        condition: service_completed_successfully
    environment:
      AUTH_URL: ${ADMIN_URL}
      AUTH_SECRET: ${AUTH_SECRET}
      DATABASE_URL: http://sqld:8889
      PUBLIC_URL: ${PUBLIC_URL}
      ADMIN_URL: ${ADMIN_URL}
      TICKET_ACCESS_SECRET: ${TICKET_ACCESS_SECRET}
      GIT_TOKEN_ENCRYPTION_KEY: ${GIT_TOKEN_ENCRYPTION_KEY}
      INITIAL_ADMIN_EMAIL: ${INITIAL_ADMIN_EMAIL}
      INITIAL_ADMIN_PASSWORD: ${INITIAL_ADMIN_PASSWORD}
    expose:
      - "3000"
    # 다중화: docker compose up --scale admin=2 -d

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - public
      - admin

volumes:
  db_data:
  uploads:
```

### 6.4 nginx.conf (다중화 지원)

```nginx
upstream public_app {
    server public:3000;   # --scale public=N 시 N개 인스턴스 round-robin
}
upstream admin_app {
    server admin:3000;    # --scale admin=N 시 N개 인스턴스 round-robin
}
```

Docker 내부 DNS가 서비스명을 실행 중인 모든 인스턴스 IP로 자동 해석하여 round-robin 로드밸런싱을 수행한다.

---

## 7. 테스트 설정

### 유닛 테스트 (Vitest)

`tests/unit/`은 루트에 유지하되, `vitest.config.ts`에서 각 패키지/앱의 `@` alias를 처리:

```ts
// vitest.config.ts (루트)
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    // 각 앱/패키지를 테스트 시 alias 해결
    alias: {
      "@suppo/db":     new URL("./packages/db/src/index.ts", import.meta.url).pathname,
      "@suppo/ui":     new URL("./packages/ui/src", import.meta.url).pathname,
      "@suppo/shared": new URL("./packages/shared/src", import.meta.url).pathname,
    },
  },
});
```

기존 테스트 파일은 이동 단계에 맞춰 import 경로를 업데이트한다.

### E2E 테스트 (Playwright)

`playwright.config.ts`에 admin/public 두 서버를 동시에 기동하도록 설정:

```ts
// playwright.config.ts (루트)
export default defineConfig({
  webServer: [
    {
      command: "pnpm --filter=@suppo/public dev --port 3000",
      port: 3000,
    },
    {
      command: "pnpm --filter=@suppo/admin dev --port 3001",
      port: 3001,
    },
  ],
  use: {
    baseURL: "http://localhost:3000",  // public 기본
  },
});
```

E2E 스펙에서 admin URL은 `http://localhost:3001`로 명시적으로 지정한다.

---

## 8. 개발 환경

```bash
# 최초 세팅
pnpm install
pnpm --filter=@suppo/db generate
pnpm --filter=@suppo/db migrate:dev --name init
pnpm --filter=@suppo/db seed

# admin 앱 개발 (포트 3001 권장)
pnpm --filter=@suppo/admin dev

# public 앱 개발 (포트 3000)
pnpm --filter=@suppo/public dev

# 전체 빌드
pnpm --filter=@suppo/admin build
pnpm --filter=@suppo/public build

# 테스트
pnpm test          # Vitest (루트에서)
pnpm test:e2e      # Playwright (루트에서)
```

각 앱의 `.env.local`:
```env
DATABASE_URL=file:../../packages/db/dev.db
```

---

## 9. 마이그레이션 단계

| 단계 | 작업 | 완료 기준 |
|---|---|---|
| **1. 골격** | pnpm-workspace.yaml, 루트 package.json, tsconfig.base.json, 각 패키지/앱 package.json 생성 | `pnpm install` 성공 |
| **2. packages/db** | prisma/ 이동, client.ts (build guard 포함) 이동, schema generator output 설정, `pnpm --filter=@suppo/db generate` 성공 | Prisma 클라이언트 생성 확인 |
| **3. packages/ui** | components/ui/ 이동, tailwind.config.base.ts 작성 | 타입 에러 없음 |
| **4. packages/shared** | 공유 lib 이동 (auth, security, email 공유분, tickets, knowledge 등) | 타입 에러 없음 |
| **5. apps/admin** | admin 라우트·컴포넌트·lib 이동, auth.ts 이동, 미들웨어 단순화, next.config.ts에 `outputFileTracingRoot`+`transpilePackages` 설정, `pnpm --filter=@suppo/admin dev` 동작 확인 | 로컬 admin 앱 정상 동작 |
| **6. apps/public** | public 라우트·컴포넌트 이동, 미들웨어 제거, next.config.ts 설정, `pnpm --filter=@suppo/public dev` 동작 확인 | 로컬 public 앱 정상 동작 |
| **7. 테스트 수정** | vitest.config.ts alias 업데이트, playwright.config.ts 멀티 서버 설정, import 경로 수정 | `pnpm test` 전체 통과 |
| **8. Docker** | Dockerfile 개편 (migrator 스테이지 포함), docker-compose 업데이트, standalone CMD 경로 확인, 이미지 빌드 | `docker compose up` 성공, 양쪽 앱 정상 동작 |
| **9. 정리** | 루트 src/ 삭제, APP_TYPE 코드 0줄 확인, 구 파일 전체 삭제 | `grep -r "APP_TYPE" .` 결과 없음 |

---

## 10. 제거되는 것

- `APP_TYPE` 환경변수 및 모든 분기 코드
- 루트 `src/` 디렉터리 전체 (모든 코드가 apps/ 또는 packages/로 이동)
- 단일 `next.config.ts`, `tsconfig.json` (앱/패키지별로 분리)
- nginx의 `/admin` 404 차단 규칙 (public 앱에 /admin 코드 자체가 없으므로 불필요)
- middleware의 APP_TYPE 분기 (각 앱이 독립 미들웨어 보유)
- public 앱의 NextAuth (불필요, 티켓 토큰으로 대체)
