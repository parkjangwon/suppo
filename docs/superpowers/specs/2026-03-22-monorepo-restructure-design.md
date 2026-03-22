# 모노레포 구조 전환 설계 문서

**날짜:** 2026-03-22
**상태:** 승인됨
**목표:** 단일 Next.js 앱(APP_TYPE 분기)을 pnpm 워크스페이스 기반 모노레포로 전환하여 admin/public 앱을 완전히 분리하고, APP_TYPE 분기로 인한 버그를 구조적으로 제거한다.

---

## 1. 배경 및 문제

### 현재 구조의 문제
- 하나의 Next.js 앱에 admin/public 코드가 공존하며 `APP_TYPE` 환경변수로 런타임 분기
- 미들웨어·라우팅·인증 로직에 `if APP_TYPE === "admin"` / `if APP_TYPE === "public"` 분기가 누적
- 한쪽 변경이 다른 쪽 버그를 유발 (예: `/knowledge` 접근 시 `/admin/login` 리다이렉트, `/admin` 경로 404 등)
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
crinity-helpdesk/                    ← git 루트 (단일 레포 유지)
├── pnpm-workspace.yaml
├── package.json                     ← 루트: 워크스페이스 툴링만 (lint, test 스크립트)
├── apps/
│   ├── admin/                       ← @crinity/admin
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
│   │       ├── auth.ts              ← NextAuth 설정 (admin)
│   │       └── middleware.ts        ← 인증 체크만 (15줄 이내)
│   └── public/                      ← @crinity/public
│       ├── package.json
│       ├── next.config.ts
│       ├── tsconfig.json
│       └── src/
│           ├── app/
│           │   ├── (public)/        ← 기존 public 라우트 그대로 이동
│           │   ├── survey/
│           │   └── api/
│           │       ├── auth/        ← NextAuth (티켓 토큰 처리용)
│           │       ├── knowledge/   ← /api/knowledge/*
│           │       ├── tickets/     ← 고객용 티켓 생성/조회
│           │       ├── comments/    ← 고객용 댓글
│           │       └── survey/      ← /api/survey/*
│           ├── components/
│           │   ├── ticket/
│           │   ├── knowledge/
│           │   └── survey/
│           ├── auth.ts              ← NextAuth 설정 (public, 최소)
│           └── middleware.ts        ← 인증 체크 없음, 단순 패스스루
└── packages/
    ├── db/                          ← @crinity/db
    │   ├── package.json
    │   ├── prisma/
    │   │   ├── schema.prisma        ← 현재 위치에서 이동
    │   │   ├── migrations/          ← 현재 위치에서 이동
    │   │   └── seed.ts
    │   └── src/
    │       ├── client.ts            ← PrismaClient 팩토리 (LibSQL 어댑터 내장)
    │       └── index.ts             ← 모든 export
    ├── ui/                          ← @crinity/ui
    │   ├── package.json
    │   └── src/
    │       └── components/ui/       ← 현재 src/components/ui/ 이동
    └── shared/                      ← @crinity/shared
        ├── package.json
        └── src/
            ├── auth/                ← auth config, BackofficeRole 타입, guards
            ├── security/            ← 티켓 access token (JWT), rate limiting
            ├── email/               ← 이메일 서비스 (Outbox 패턴)
            ├── tickets/             ← 티켓 CRUD (양쪽 사용)
            ├── knowledge/           ← 지식베이스 조회 (양쪽 사용)
            ├── branding/            ← 시스템 브랜딩
            ├── storage/             ← 파일 스토리지 (local/S3)
            ├── utils/               ← 공통 유틸리티
            └── validation/          ← Zod 스키마
```

---

## 4. 패키지 상세 명세

### 4.1 `packages/db` — `@crinity/db`

**역할:** Prisma 스키마, 마이그레이션, 클라이언트 팩토리 단일 관리

```ts
// packages/db/src/client.ts
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
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

**사용:**
```ts
import { prisma } from "@crinity/db";
```

**스크립트:**
```json
{
  "scripts": {
    "migrate": "prisma migrate deploy --schema=./prisma/schema.prisma",
    "generate": "prisma generate --schema=./prisma/schema.prisma",
    "seed": "tsx prisma/seed.ts",
    "studio": "prisma studio --schema=./prisma/schema.prisma"
  }
}
```

---

### 4.2 `packages/ui` — `@crinity/ui`

**역할:** shadcn/ui Radix 컴포넌트 공유

- 현재 `src/components/ui/` 전체를 이동
- 각 컴포넌트는 `"use client"` 지시어 유지
- `tailwind.config` 공유: 각 앱의 `tailwind.config.ts`에서 `packages/ui/src` 경로를 content에 포함

**사용:**
```ts
import { Button, Card, Dialog } from "@crinity/ui";
```

---

### 4.3 `packages/shared` — `@crinity/shared`

**역할:** admin/public 양쪽에서 사용하는 비즈니스 로직

**포함 모듈:**

| 모듈 | 현재 위치 | admin 사용 | public 사용 |
|---|---|---|---|
| `auth/config` | `src/lib/auth/config.ts` | ✓ | ✓ |
| `security/` | `src/lib/security/` | ✓ | ✓ (티켓 토큰) |
| `email/` | `src/lib/email/` | ✓ | ✓ (접수 확인) |
| `tickets/` | `src/lib/tickets/` (일부) | ✓ | ✓ (생성/조회) |
| `knowledge/` | `src/lib/knowledge/` | ✓ | ✓ |
| `branding/` | `src/lib/branding/` | ✓ | ✓ |
| `storage/` | `src/lib/storage/` | ✓ | ✓ (첨부파일) |
| `utils/` | `src/lib/utils/` | ✓ | ✓ |
| `validation/` | `src/lib/validation/` | ✓ | ✓ |

---

### 4.4 미들웨어 단순화

**`apps/admin/src/middleware.ts`** (APP_TYPE 분기 완전 제거):
```ts
import { auth } from "./auth";
import { NextResponse } from "next/server";

const BACKOFFICE_LOGIN_PATH = "/admin/login";
const BACKOFFICE_DASHBOARD_PATH = "/admin/dashboard";
const PASSWORD_CHANGE_PATH = "/admin/change-password";

export default auth((request) => {
  const { nextUrl } = request;
  const isAuthenticated = Boolean(request.auth);
  const isLoginRoute = nextUrl.pathname === BACKOFFICE_LOGIN_PATH;
  const isPasswordChangeRoute = nextUrl.pathname === PASSWORD_CHANGE_PATH;
  const isApiRoute = nextUrl.pathname.startsWith("/api/");
  const requiresPasswordChange = request.auth?.user?.isInitialPassword === true;

  if (!isAuthenticated && !isLoginRoute) return NextResponse.redirect(new URL(BACKOFFICE_LOGIN_PATH, nextUrl));
  if (isAuthenticated && isLoginRoute && !requiresPasswordChange) return NextResponse.redirect(new URL(BACKOFFICE_DASHBOARD_PATH, nextUrl));
  if (isAuthenticated && requiresPasswordChange && !isPasswordChangeRoute && !isApiRoute) return NextResponse.redirect(new URL(PASSWORD_CHANGE_PATH, nextUrl));
  if (isAuthenticated && !requiresPasswordChange && isPasswordChangeRoute) return NextResponse.redirect(new URL(BACKOFFICE_DASHBOARD_PATH, nextUrl));
});

export const config = { matcher: ["/admin/:path*"] };
```

**`apps/public/src/middleware.ts`**:
```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 고객 대상 앱 — 인증 불필요
// 티켓 access token 검증은 각 API route 핸들러에서 직접 처리
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = { matcher: ["/tickets/:path*", "/survey/:path*"] };
```

---

## 5. TypeScript 경로 설정

**루트 `tsconfig.base.json`** (공통 설정):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve"
  }
}
```

**각 앱 `tsconfig.json`**:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**패키지 참조:** 각 앱의 `package.json`에서 workspace 의존성:
```json
{
  "dependencies": {
    "@crinity/db": "workspace:*",
    "@crinity/ui": "workspace:*",
    "@crinity/shared": "workspace:*"
  }
}
```

---

## 6. Docker / 인프라

### Dockerfile (단일 파일, APP_NAME 빌드 인자)

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── 의존성 설치
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/public/package.json ./apps/public/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# ── 빌드
FROM base AS builder
ARG APP_NAME
ARG AUTH_SECRET="build-time-placeholder"
ARG DATABASE_URL="file:///dev/null"
ARG TICKET_ACCESS_SECRET="build-time-placeholder"
ARG GIT_TOKEN_ENCRYPTION_KEY="build-time-placeholder-32byte-x"
ENV AUTH_SECRET=$AUTH_SECRET DATABASE_URL=$DATABASE_URL \
    TICKET_ACCESS_SECRET=$TICKET_ACCESS_SECRET \
    GIT_TOKEN_ENCRYPTION_KEY=$GIT_TOKEN_ENCRYPTION_KEY
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter=@crinity/db prisma generate
RUN pnpm --filter=@crinity/${APP_NAME} build
ENV AUTH_SECRET="" DATABASE_URL="" TICKET_ACCESS_SECRET="" GIT_TOKEN_ENCRYPTION_KEY=""

# ── 런타임
FROM base AS runner
ARG APP_NAME
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/node_modules/.prisma ./packages/db/node_modules/.prisma
COPY --from=builder /app/apps/${APP_NAME}/public ./public
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP_NAME}/.next/standalone/server.js ./server.js
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP_NAME}/.next/standalone/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP_NAME}/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

### docker-compose.yml

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
      args:
        APP_NAME: admin   # migrate는 admin 이미지 재사용
    image: crinity-admin:latest
    restart: "no"
    depends_on:
      - sqld
    environment:
      DATABASE_URL: http://sqld:8889
    entrypoint: ["node", "packages/db/scripts/migrate.mjs"]

  public:
    build:
      context: .
      args:
        APP_NAME: public
    image: crinity-public:latest
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
      args:
        APP_NAME: admin
    image: crinity-admin:latest
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

### nginx.conf (다중화 지원)

```nginx
upstream public_app {
    server public:3000;   # --scale public=N 시 N개 인스턴스 round-robin
}
upstream admin_app {
    server admin:3000;    # --scale admin=N 시 N개 인스턴스 round-robin
}
```

Docker 내부 DNS가 서비스명(`public`, `admin`)을 실행 중인 모든 인스턴스 IP로 자동 해석하여 round-robin 로드밸런싱을 수행한다.

---

## 7. 개발 환경

```bash
# 최초 세팅
pnpm install
pnpm --filter=@crinity/db prisma migrate dev --name init
pnpm --filter=@crinity/db prisma db seed

# admin 앱 개발
pnpm --filter=@crinity/admin dev

# public 앱 개발
pnpm --filter=@crinity/public dev

# 전체 빌드
pnpm --filter=@crinity/admin build
pnpm --filter=@crinity/public build

# 테스트 (루트에서)
pnpm test
```

`DATABASE_URL`은 앱별 `.env.local`:
```env
DATABASE_URL=file:../../packages/db/dev.db
```

---

## 8. 마이그레이션 단계

| 단계 | 작업 | 완료 기준 |
|---|---|---|
| **1. 골격** | pnpm-workspace.yaml, 루트 package.json, 각 패키지/앱 package.json 생성 | `pnpm install` 성공 |
| **2. packages/db** | prisma/ 이동, client.ts 이동, export 정리, `@crinity/db` 임포트 동작 확인 | `pnpm --filter=@crinity/db prisma generate` 성공 |
| **3. packages/ui** | components/ui/ 이동, 전체 import 경로 일괄 수정 | 타입 에러 없음 |
| **4. packages/shared** | 공유 lib 이동, 양쪽 앱에서 임포트 확인 | 타입 에러 없음 |
| **5. apps/admin** | admin 라우트·컴포넌트·lib 이동, 미들웨어 단순화, `pnpm dev` 동작 확인 | 로컬 admin 앱 정상 동작 |
| **6. apps/public** | public 라우트·컴포넌트·lib 이동, 미들웨어 단순화, `pnpm dev` 동작 확인 | 로컬 public 앱 정상 동작 |
| **7. Docker** | Dockerfile 개편, docker-compose 업데이트, 이미지 빌드 확인 | `docker compose up` 성공 |
| **8. 검증** | 유닛 테스트, E2E 테스트, Docker 통합 테스트 | 전체 TC 통과 |
| **9. 정리** | APP_TYPE 환경변수 완전 제거, 구 파일 삭제 | APP_TYPE 코드 0줄 |

---

## 9. 제거되는 것

- `APP_TYPE` 환경변수 및 모든 분기 코드
- 루트 `src/` 디렉터리 (모든 코드가 apps/ 또는 packages/로 이동)
- 단일 `next.config.ts` (앱별 next.config.ts로 대체)
- 단일 `tsconfig.json` (tsconfig.base.json + 앱별 tsconfig.json으로 대체)
- nginx의 `/admin` 404 차단 규칙 (public 앱에 /admin 코드 자체가 없으므로 불필요)
- middleware의 APP_TYPE 분기 (각 앱이 독립 미들웨어 보유)
