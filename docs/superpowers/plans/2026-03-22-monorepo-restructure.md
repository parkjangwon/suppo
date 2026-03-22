# Monorepo Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 단일 Next.js 앱(APP_TYPE 분기)을 pnpm 워크스페이스 기반 모노레포로 전환하여 `apps/admin` + `apps/public` + `packages/db` + `packages/ui` + `packages/shared` 구조로 분리하고, APP_TYPE 관련 모든 분기 코드를 제거한다.

**Architecture:** pnpm workspaces 기반 단일 레포 멀티 패키지 구조. DB는 LibSQL/sqld(운영) + SQLite 파일(개발) 유지. 각 앱은 Next.js standalone output으로 빌드되며 Docker 멀티 컨테이너로 배포된다.

**Tech Stack:** Next.js 15 App Router, pnpm workspaces, TypeScript, Prisma + LibSQL, shadcn/ui, NextAuth v5, Docker + nginx

---

## 파일 구조 매핑

이 섹션은 현재 `src/`의 파일이 어디로 이동하는지 정의한다. 구현 에이전트는 이 매핑을 기준으로 모든 파일 이동과 import 경로 수정을 수행한다.

### packages/db (신규 생성)
| 현재 위치 | 새 위치 |
|---|---|
| `prisma/schema.prisma` | `packages/db/prisma/schema.prisma` |
| `prisma/migrations/` | `packages/db/prisma/migrations/` |
| `prisma/seed.ts` | `packages/db/prisma/seed.ts` |
| `src/lib/db/client.ts` | `packages/db/src/client.ts` |
| `src/lib/db/raw.ts` | `packages/db/src/raw.ts` |

**schema.prisma generator 변경**: `output = "../node_modules/.prisma/client"` 추가

### packages/ui (신규 생성)
| 현재 위치 | 새 위치 |
|---|---|
| `src/components/ui/*.tsx` (18개) | `packages/ui/src/components/ui/*.tsx` |

### packages/shared (신규 생성)
| 현재 위치 | 새 위치 |
|---|---|
| `src/lib/auth/config.ts` | `packages/shared/src/auth/config.ts` |
| `src/lib/auth/guards.ts` | `packages/shared/src/auth/guards.ts` |
| `src/lib/auth/session.ts` | `packages/shared/src/auth/session.ts` |
| `src/lib/auth/providers/boxyhq-saml.ts` | `packages/shared/src/auth/providers/boxyhq-saml.ts` |
| `src/lib/security/ticket-access.ts` | `packages/shared/src/security/ticket-access.ts` |
| `src/lib/security/rate-limit.ts` | `packages/shared/src/security/rate-limit.ts` |
| `src/lib/security/file-upload.ts` | `packages/shared/src/security/file-upload.ts` |
| `src/lib/security/content-type.ts` | `packages/shared/src/security/content-type.ts` |
| `src/lib/security/input-validation.ts` | `packages/shared/src/security/input-validation.ts` |
| `src/lib/security/captcha.ts` | `packages/shared/src/security/captcha.ts` |
| `src/lib/email/enqueue.ts` | `packages/shared/src/email/enqueue.ts` |
| `src/lib/email/process-outbox.ts` | `packages/shared/src/email/process-outbox.ts` |
| `src/lib/email/threading.ts` | `packages/shared/src/email/threading.ts` |
| `src/lib/email/providers/` | `packages/shared/src/email/providers/` |
| `src/lib/tickets/create-ticket.ts` | `packages/shared/src/tickets/create-ticket.ts` |
| `src/lib/tickets/public-thread.ts` | `packages/shared/src/tickets/public-thread.ts` |
| `src/lib/tickets/ticket-number.ts` | `packages/shared/src/tickets/ticket-number.ts` |
| `src/lib/knowledge/analytics.ts` | `packages/shared/src/knowledge/analytics.ts` |
| `src/lib/knowledge/deflection.ts` | `packages/shared/src/knowledge/deflection.ts` |
| `src/lib/knowledge/search.ts` | `packages/shared/src/knowledge/search.ts` |
| `src/lib/knowledge/slug.ts` | `packages/shared/src/knowledge/slug.ts` |
| `src/lib/knowledge/types.ts` | `packages/shared/src/knowledge/types.ts` |
| `src/lib/branding/context.tsx` | `packages/shared/src/branding/context.tsx` |
| `src/lib/storage/attachment-service.ts` | `packages/shared/src/storage/attachment-service.ts` |
| `src/lib/storage/local-storage.ts` | `packages/shared/src/storage/local-storage.ts` |
| `src/lib/storage/s3-storage.ts` | `packages/shared/src/storage/s3-storage.ts` |
| `src/lib/utils.ts` | `packages/shared/src/utils.ts` |
| `src/lib/utils/phone-format.ts` | `packages/shared/src/utils/phone-format.ts` |
| `src/lib/validation/ticket.ts` | `packages/shared/src/validation/ticket.ts` |
| `src/lib/validation/knowledge.ts` | `packages/shared/src/validation/knowledge.ts` |
| `src/lib/crypto/encrypt.ts` | `packages/shared/src/crypto/encrypt.ts` |
| `src/lib/db/queries/tickets.ts` | `packages/shared/src/db/queries/tickets.ts` |
| `src/lib/db/queries/categories.ts` | `packages/shared/src/db/queries/categories.ts` |
| `src/lib/db/queries/branding.ts` | `packages/shared/src/db/queries/branding.ts` |

### apps/admin (신규 생성)
| 현재 위치 | 새 위치 |
|---|---|
| `src/app/(admin)/` | `apps/admin/src/app/(admin)/` |
| `src/app/api/admin/` | `apps/admin/src/app/api/admin/` |
| `src/app/api/auth/` | `apps/admin/src/app/api/auth/` |
| `src/app/api/git/` | `apps/admin/src/app/api/git/` |
| `src/app/api/internal/` | `apps/admin/src/app/api/internal/` |
| `src/app/api/llm/` | `apps/admin/src/app/api/llm/` |
| `src/app/api/templates/` | `apps/admin/src/app/api/templates/` |
| `src/app/api/webhooks/` | `apps/admin/src/app/api/webhooks/` |
| `src/app/api/ai/` | `apps/admin/src/app/api/ai/` |
| `src/app/api/agents/` | `apps/admin/src/app/api/agents/` |
| `src/app/api/comments/route.ts` | `apps/admin/src/app/api/comments/route.ts` |
| `src/app/api/tickets/[id]/transfer/` | `apps/admin/src/app/api/tickets/[id]/transfer/` |
| `src/app/api/tickets/[id]/summary/` | `apps/admin/src/app/api/tickets/[id]/summary/` |
| `src/app/api/tickets/search/` | `apps/admin/src/app/api/tickets/search/` |
| `src/components/admin/` | `apps/admin/src/components/admin/` |
| `src/components/app/admin-shell.tsx` | `apps/admin/src/components/admin-shell.tsx` |
| `src/components/app/auth-provider.tsx` | `apps/admin/src/components/auth-provider.tsx` |
| `src/hooks/use-comment-lock.ts` | `apps/admin/src/hooks/use-comment-lock.ts` |
| `src/hooks/use-ticket-presence.ts` | `apps/admin/src/hooks/use-ticket-presence.ts` |
| `src/lib/ai/` | `apps/admin/src/lib/ai/` |
| `src/lib/agents/` | `apps/admin/src/lib/agents/` |
| `src/lib/assignment/` | `apps/admin/src/lib/assignment/` |
| `src/lib/audit/` | `apps/admin/src/lib/audit/` |
| `src/lib/automation/` | `apps/admin/src/lib/automation/` |
| `src/lib/git/` | `apps/admin/src/lib/git/` |
| `src/lib/llm/` | `apps/admin/src/lib/llm/` |
| `src/lib/reports/` | `apps/admin/src/lib/reports/` |
| `src/lib/sla/` | `apps/admin/src/lib/sla/` |
| `src/lib/system/` | `apps/admin/src/lib/system/` |
| `src/lib/templates/` | `apps/admin/src/lib/templates/` |
| `src/lib/email/renderers.tsx` | `apps/admin/src/lib/email/renderers.tsx` |
| `src/lib/tickets/activity.ts` | `apps/admin/src/lib/tickets/activity.ts` |
| `src/lib/tickets/collaboration.ts` | `apps/admin/src/lib/tickets/collaboration.ts` |
| `src/lib/db/queries/admin-tickets.ts` | `apps/admin/src/lib/db/queries/admin-tickets.ts` |
| `src/lib/db/queries/ticket-merge.ts` | `apps/admin/src/lib/db/queries/ticket-merge.ts` |
| `src/lib/db/queries/admin-analytics/` | `apps/admin/src/lib/db/queries/admin-analytics/` |
| `src/lib/db/queries/agents.ts` | `apps/admin/src/lib/db/queries/agents.ts` |
| `src/lib/db/queries/knowledge-admin.ts` | `apps/admin/src/lib/db/queries/knowledge-admin.ts` |
| `src/auth.ts` | `apps/admin/src/auth.ts` |
| `src/middleware.ts` (admin 부분만) | `apps/admin/src/middleware.ts` |
| `src/app/globals.css` | `apps/admin/src/app/globals.css` |
| `src/app/layout.tsx` | `apps/admin/src/app/layout.tsx` |
| `src/app/(admin)/layout.tsx` | `apps/admin/src/app/(admin)/layout.tsx` |

### apps/public (신규 생성)
| 현재 위치 | 새 위치 |
|---|---|
| `src/app/(public)/` | `apps/public/src/app/(public)/` |
| `src/app/survey/` | `apps/public/src/app/survey/` |
| `src/app/api/tickets/route.ts` | `apps/public/src/app/api/tickets/route.ts` |
| `src/app/api/tickets/[id]/route.ts` | `apps/public/src/app/api/tickets/[id]/route.ts` |
| `src/app/api/tickets/[id]/csat/` | `apps/public/src/app/api/tickets/[id]/csat/` |
| `src/app/api/comments/public/` | `apps/public/src/app/api/comments/public/` |
| `src/app/api/knowledge/` | `apps/public/src/app/api/knowledge/` |
| `src/app/api/survey/` | `apps/public/src/app/api/survey/` |
| `src/components/ticket/` | `apps/public/src/components/ticket/` |
| `src/components/knowledge/` | `apps/public/src/components/knowledge/` |
| `src/components/survey/` | `apps/public/src/components/survey/` |
| `src/components/app/public-shell.tsx` | `apps/public/src/components/public-shell.tsx` |
| `src/components/theme-provider.tsx` | `apps/public/src/components/theme-provider.tsx` |
| `src/components/theme-toggle.tsx` | `apps/public/src/components/theme-toggle.tsx` |
| `src/app/(public)/layout.tsx` | `apps/public/src/app/(public)/layout.tsx` |

### import 경로 변환 규칙

파일 이동 후 반드시 모든 import 경로를 아래 규칙으로 업데이트한다:

| 기존 import | 새 import |
|---|---|
| `@/lib/db/client` | `@crinity/db` |
| `@/lib/auth/config` | `@crinity/shared/auth/config` |
| `@/lib/auth/guards` | `@crinity/shared/auth/guards` |
| `@/lib/auth/session` | `@crinity/shared/auth/session` |
| `@/lib/auth/providers/boxyhq-saml` | `@crinity/shared/auth/providers/boxyhq-saml` |
| `@/lib/security/...` | `@crinity/shared/security/...` |
| `@/lib/email/enqueue` | `@crinity/shared/email/enqueue` |
| `@/lib/email/process-outbox` | `@crinity/shared/email/process-outbox` |
| `@/lib/email/threading` | `@crinity/shared/email/threading` |
| `@/lib/email/providers/...` | `@crinity/shared/email/providers/...` |
| `@/lib/tickets/create-ticket` | `@crinity/shared/tickets/create-ticket` |
| `@/lib/tickets/public-thread` | `@crinity/shared/tickets/public-thread` |
| `@/lib/tickets/ticket-number` | `@crinity/shared/tickets/ticket-number` |
| `@/lib/knowledge/...` | `@crinity/shared/knowledge/...` |
| `@/lib/branding/...` | `@crinity/shared/branding/...` |
| `@/lib/storage/...` | `@crinity/shared/storage/...` |
| `@/lib/utils` | `@crinity/shared/utils` |
| `@/lib/utils/...` | `@crinity/shared/utils/...` |
| `@/lib/validation/...` | `@crinity/shared/validation/...` |
| `@/lib/crypto/...` | `@crinity/shared/crypto/...` |
| `@/lib/db/queries/tickets` | `@crinity/shared/db/queries/tickets` |
| `@/lib/db/queries/categories` | `@crinity/shared/db/queries/categories` |
| `@/lib/db/queries/branding` | `@crinity/shared/db/queries/branding` |
| `@/components/ui/...` | `@crinity/ui/components/ui/...` |
| `@/components/admin/...` | `@/components/admin/...` (**admin 앱 내부에서 `@` = `apps/admin/src`**) |
| `@/components/app/admin-shell` | `@/components/admin-shell` |
| `@/components/app/auth-provider` | `@/components/auth-provider` |
| `@/components/app/public-shell` | `@/components/public-shell` |

**apps/admin/src 내부**: `@/*` → `apps/admin/src/*` (Next.js tsconfig.json paths 설정으로 자동 처리)
**apps/public/src 내부**: `@/*` → `apps/public/src/*`

---

## Task 1: pnpm 워크스페이스 골격 설정

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Modify: `package.json` (루트 — workspace root 전용으로 변경)
- Create: `apps/admin/package.json`
- Create: `apps/public/package.json`
- Create: `packages/db/package.json`
- Create: `packages/ui/package.json`
- Create: `packages/shared/package.json`

- [ ] **Step 1: pnpm-workspace.yaml 생성**

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2: tsconfig.base.json 생성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true
  }
}
```

- [ ] **Step 3: 루트 package.json 업데이트**

기존 `package.json`을 워크스페이스 루트 전용으로 변경한다. 모든 `dependencies`/`devDependencies`는 개별 패키지로 이동한다. 루트에는 워크스페이스 공통 스크립트만 남긴다:

```json
{
  "name": "crinity-helpdesk",
  "private": true,
  "scripts": {
    "dev:admin":   "pnpm --filter=@crinity/admin dev",
    "dev:public":  "pnpm --filter=@crinity/public dev",
    "build:admin": "pnpm --filter=@crinity/admin build",
    "build:public":"pnpm --filter=@crinity/public build",
    "lint":        "pnpm -r lint",
    "test":        "vitest run",
    "test:e2e":    "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.53.2",
    "dotenv": "^17.3.1",
    "playwright": "^1.53.2",
    "typescript": "^5.8.3",
    "vitest": "^3.2.4",
    "@vitejs/plugin-react": "^4.5.0",
    "jsdom": "^25.0.1"
  },
  "packageManager": "pnpm@10.13.1"
}
```

- [ ] **Step 4: packages/db/package.json 생성**

```json
{
  "name": "@crinity/db",
  "version": "0.1.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "generate":      "prisma generate --schema=./prisma/schema.prisma",
    "migrate:dev":   "prisma migrate dev --schema=./prisma/schema.prisma",
    "migrate:deploy":"prisma migrate deploy --schema=./prisma/schema.prisma",
    "seed":          "tsx prisma/seed.ts",
    "studio":        "prisma studio --schema=./prisma/schema.prisma"
  },
  "dependencies": {
    "@libsql/client": "^0.17.2",
    "@prisma/adapter-libsql": "^7.5.0",
    "@prisma/client": "^6.7.0"
  },
  "devDependencies": {
    "prisma": "^6.7.0",
    "tsx": "^4.20.6",
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 5: packages/ui/package.json 생성**

```json
{
  "name": "@crinity/ui",
  "version": "0.1.0",
  "private": true,
  "exports": {
    "./components/ui/*": "./src/components/ui/*",
    "./tailwind.config.base": "./tailwind.config.base.ts"
  },
  "dependencies": {
    "@crinity/shared": "workspace:*",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.577.0",
    "radix-ui": "^1.4.3",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "tailwind-merge": "^3.5.0"
  },
  "peerDependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "typescript": "^5.8.3",
    "tailwindcss": "^3.4.17"
  }
}
```

- [ ] **Step 6: packages/shared/package.json 생성**

```json
{
  "name": "@crinity/shared",
  "version": "0.1.0",
  "private": true,
  "exports": {
    "./*": "./src/*"
  },
  "dependencies": {
    "@crinity/db": "workspace:*",
    "bcryptjs": "^3.0.3",
    "jsonwebtoken": "^9.0.3",
    "nanoid": "^5.1.6",
    "next": "^15.3.1",
    "next-auth": "5.0.0-beta.30",
    "zod": "^4.3.6",
    "uuid": "^13.0.0"
  },
  "devDependencies": {
    "typescript": "^5.8.3"
  },
  "peerDependencies": {
    "react": "^19.1.0"
  }
}
```

- [ ] **Step 7: apps/admin/package.json 생성**

```json
{
  "name": "@crinity/admin",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev":   "next dev --turbopack --port 3001",
    "build": "next build",
    "start": "next start",
    "lint":  "next lint"
  },
  "dependencies": {
    "@crinity/db":     "workspace:*",
    "@crinity/ui":     "workspace:*",
    "@crinity/shared": "workspace:*",
    "@auth/prisma-adapter": "^2.11.1",
    "@hookform/resolvers": "^5.2.2",
    "bcryptjs": "^3.0.3",
    "date-fns": "^4.1.0",
    "exceljs": "^4.4.0",
    "helmet": "^8.0.0",
    "jszip": "^3.10.1",
    "jsonwebtoken": "^9.0.3",
    "lucide-react": "^0.577.0",
    "nanoid": "^5.1.6",
    "next": "^15.3.1",
    "next-auth": "5.0.0-beta.30",
    "next-themes": "^0.4.6",
    "react": "^19.1.0",
    "react-day-picker": "^9.14.0",
    "react-dom": "^19.1.0",
    "react-hook-form": "^7.71.2",
    "recharts": "^3.8.0",
    "sonner": "^2.0.7",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.3.1",
    "@types/bcryptjs": "^3.0.0",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/jszip": "^3.4.1",
    "@types/node": "^22.15.17",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.30.1",
    "eslint-config-next": "^15.3.1",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 8: apps/public/package.json 생성**

```json
{
  "name": "@crinity/public",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev":   "next dev --turbopack --port 3000",
    "build": "next build",
    "start": "next start",
    "lint":  "next lint"
  },
  "dependencies": {
    "@crinity/db":     "workspace:*",
    "@crinity/ui":     "workspace:*",
    "@crinity/shared": "workspace:*",
    "@hookform/resolvers": "^5.2.2",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.577.0",
    "next": "^15.3.1",
    "next-themes": "^0.4.6",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-hook-form": "^7.71.2",
    "sonner": "^2.0.7",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.3.1",
    "@types/node": "^22.15.17",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.30.1",
    "eslint-config-next": "^15.3.1",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 9: 각 패키지/앱 디렉터리 및 tsconfig.json 생성**

`packages/db/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "paths": { "@crinity/db": ["./src/index.ts"] }
  },
  "include": ["src", "prisma"]
}
```

`packages/ui/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "paths": { "@crinity/db": ["../db/src/index.ts"] }
  },
  "include": ["src"]
}
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@crinity/db": ["../db/src/index.ts"],
      "@crinity/shared": ["./src"]
    }
  },
  "include": ["src"]
}
```

`apps/admin/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@crinity/db": ["../../packages/db/src/index.ts"],
      "@crinity/ui": ["../../packages/ui/src"],
      "@crinity/shared": ["../../packages/shared/src"]
    },
    "types": ["vitest/globals"]
  },
  "include": ["src", "next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`apps/public/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@crinity/db": ["../../packages/db/src/index.ts"],
      "@crinity/ui": ["../../packages/ui/src"],
      "@crinity/shared": ["../../packages/shared/src"]
    }
  },
  "include": ["src", "next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 10: pnpm install 실행 및 검증**

모든 명령은 모노레포 루트에서 실행한다.

```bash
pnpm install
```

Expected: `Lockfile is up to date` 또는 새 lockfile 생성. `node_modules/.pnpm/` 아래 패키지 설치 확인. 에러 없음.

- [ ] **Step 11: Commit**

```bash
git add pnpm-workspace.yaml tsconfig.base.json package.json \
        packages/db/package.json packages/ui/package.json packages/shared/package.json \
        packages/db/tsconfig.json packages/ui/tsconfig.json packages/shared/tsconfig.json \
        apps/admin/package.json apps/admin/tsconfig.json \
        apps/public/package.json apps/public/tsconfig.json
git commit -m "chore: add pnpm workspace scaffold — packages and apps structure"
```

---

## Task 2: packages/db — Prisma 클라이언트 패키지

**Files:**
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/raw.ts`
- Create: `packages/db/src/index.ts`
- Move: `prisma/` → `packages/db/prisma/`
- Modify: `packages/db/prisma/schema.prisma` (generator output 추가)

- [ ] **Step 1: prisma/ 디렉터리 이동**

```bash
mkdir -p packages/db/prisma packages/db/src
cp -r prisma/. packages/db/prisma/
```

아직 루트 `prisma/`는 삭제하지 않는다 (Task 9에서 일괄 정리).

- [ ] **Step 2: schema.prisma generator 블록 수정**

`packages/db/prisma/schema.prisma`의 generator 블록을 다음과 같이 변경한다:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
  output          = "../node_modules/.prisma/client"
}
```

`output`은 `packages/db/prisma/schema.prisma` 기준 상대경로이므로 `packages/db/node_modules/.prisma/client`에 클라이언트가 생성된다.

- [ ] **Step 3: packages/db/src/client.ts 생성**

현재 `src/lib/db/client.ts`의 내용을 기반으로 build guard 포함하여 생성:

```typescript
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "";

  // 빌드 단계에서는 LibSQL 연결 시도 안 함 (URL_INVALID 오류 방지)
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

  const prismaOptions: import("@prisma/client").PrismaClientOptions = {
    log: process.env.NODE_ENV === "development"
      ? ["query", "warn", "error"]
      : ["error"],
  };

  const isLibsql = url.startsWith("http://") || url.startsWith("https://");
  if (isLibsql && !isBuildPhase) {
    prismaOptions.adapter = new PrismaLibSql({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
  }

  return new PrismaClient(prismaOptions);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 4: packages/db/src/raw.ts 생성**

`src/lib/db/raw.ts`의 내용을 복사. import 경로 `@/lib/db/client` → `./client`로 변경.

- [ ] **Step 5: packages/db/src/index.ts 생성**

```typescript
export { prisma } from "./client";
export type { PrismaClient } from "@prisma/client";
// raw SQL 헬퍼가 있으면 re-export
export * from "./raw";
```

- [ ] **Step 6: Prisma 클라이언트 생성 실행**

```bash
pnpm --filter=@crinity/db generate
```

Expected: `✔ Generated Prisma Client` — `packages/db/node_modules/.prisma/client/` 디렉터리 생성 확인.

```bash
ls packages/db/node_modules/.prisma/client/
```

Expected: `index.js`, `index.d.ts` 등 파일 존재.

- [ ] **Step 7: packages/db/prisma/seed.ts 수정**

`packages/db/prisma/seed.ts`에서 import 경로 업데이트:
- `@/lib/system/seed-functions` → 이 파일은 admin 앱으로 이동하므로, seed.ts는 **Task 5 완료 후** 수정한다. 현재는 그냥 복사만 유지.

- [ ] **Step 8: Commit**

```bash
git add packages/db/
git commit -m "feat: add packages/db with Prisma client factory and LibSQL adapter"
```

---

## Task 3: packages/ui — UI 컴포넌트 패키지

**Files:**
- Create: `packages/ui/src/components/ui/` (18개 컴포넌트 파일)
- Create: `packages/ui/tailwind.config.base.ts`

- [ ] **Step 1: UI 컴포넌트 복사**

```bash
mkdir -p packages/ui/src/components/ui
cp -r src/components/ui/. packages/ui/src/components/ui/
```

- [ ] **Step 2: packages/ui 내 `@/lib/utils` import 경로 수정**

shadcn/ui 컴포넌트들은 `cn()` 유틸리티를 `@/lib/utils`에서 import한다. 복사 후 이 경로를 `@crinity/shared/utils`로 변경해야 한다:

```bash
grep -r "@/lib/utils" packages/ui/src/components/ui/ --include="*.tsx"
```

Expected: 각 컴포넌트에서 `from "@/lib/utils"` 발견 (~18개). 일괄 수정:

```bash
find packages/ui/src -name "*.tsx" -o -name "*.ts" | \
  xargs sed -i '' 's|from "@/lib/utils"|from "@crinity/shared/utils"|g'
```

수정 후 재확인:
```bash
grep -r "@/" packages/ui/src/ --include="*.tsx" --include="*.ts"
```

Expected: 결과 없음.

- [ ] **Step 3: tailwind.config.base.ts 생성**

현재 루트 `tailwind.config.ts` (또는 `tailwind.config.js`)의 theme 설정을 확인 후 추출:

```bash
cat tailwind.config.ts 2>/dev/null || cat tailwind.config.js 2>/dev/null
```

`packages/ui/tailwind.config.base.ts` 생성:

```typescript
import type { Config } from "tailwindcss";

export const uiTailwindConfig: Partial<Config> = {
  darkMode: ["class"],
  theme: {
    extend: {
      // 현재 tailwind.config.ts 의 theme.extend 내용 그대로 복사
      // CSS 변수 기반 컬러 시스템, borderRadius, keyframes 등 포함
      colors: {
        border:      "hsl(var(--border))",
        input:       "hsl(var(--input))",
        ring:        "hsl(var(--ring))",
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT:        "hsl(var(--sidebar-background))",
          foreground:     "hsl(var(--sidebar-foreground))",
          primary:        "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent:         "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border:         "hsl(var(--sidebar-border))",
          ring:           "hsl(var(--sidebar-ring))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

**주의:** 실제 루트 `tailwind.config.ts`를 읽어 theme 내용을 정확히 복사해야 한다.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/
git commit -m "feat: add packages/ui with shadcn/ui components and shared Tailwind config"
```

---

## Task 4: packages/shared — 공유 비즈니스 로직 패키지

**Files:**
- Create: `packages/shared/src/` 하위 전체 (파일 구조 매핑 참조)

- [ ] **Step 1: shared 디렉터리 구조 생성 및 파일 복사**

다음 순서로 복사. **파일을 복사한 후** 각 파일 내 import 경로를 아래 규칙으로 변경한다:
- `@/lib/db/client` → `@crinity/db`
- `@/lib/...` (shared 범위 내 상호 참조) → `./` 또는 `../` 상대경로 또는 `@crinity/shared/...`

```bash
mkdir -p \
  packages/shared/src/auth/providers \
  packages/shared/src/security \
  packages/shared/src/email/providers \
  packages/shared/src/tickets \
  packages/shared/src/knowledge \
  packages/shared/src/branding \
  packages/shared/src/storage \
  packages/shared/src/utils \
  packages/shared/src/validation \
  packages/shared/src/crypto \
  packages/shared/src/db/queries

# auth
cp src/lib/auth/config.ts         packages/shared/src/auth/config.ts
cp src/lib/auth/guards.ts         packages/shared/src/auth/guards.ts
cp src/lib/auth/session.ts        packages/shared/src/auth/session.ts
cp src/lib/auth/providers/boxyhq-saml.ts packages/shared/src/auth/providers/boxyhq-saml.ts

# security
cp src/lib/security/ticket-access.ts    packages/shared/src/security/ticket-access.ts
cp src/lib/security/rate-limit.ts       packages/shared/src/security/rate-limit.ts
cp src/lib/security/file-upload.ts      packages/shared/src/security/file-upload.ts
cp src/lib/security/content-type.ts     packages/shared/src/security/content-type.ts
cp src/lib/security/input-validation.ts packages/shared/src/security/input-validation.ts
cp src/lib/security/captcha.ts          packages/shared/src/security/captcha.ts

# email (shared parts)
cp src/lib/email/enqueue.ts             packages/shared/src/email/enqueue.ts
cp src/lib/email/process-outbox.ts      packages/shared/src/email/process-outbox.ts
cp src/lib/email/threading.ts           packages/shared/src/email/threading.ts
cp src/lib/email/providers/*.ts         packages/shared/src/email/providers/

# tickets (shared)
cp src/lib/tickets/create-ticket.ts     packages/shared/src/tickets/create-ticket.ts
cp src/lib/tickets/public-thread.ts     packages/shared/src/tickets/public-thread.ts
cp src/lib/tickets/ticket-number.ts     packages/shared/src/tickets/ticket-number.ts

# knowledge
cp src/lib/knowledge/*.ts               packages/shared/src/knowledge/

# branding
cp src/lib/branding/context.tsx         packages/shared/src/branding/context.tsx

# storage
cp src/lib/storage/*.ts                 packages/shared/src/storage/

# utils, validation, crypto
cp src/lib/utils.ts                     packages/shared/src/utils.ts
cp src/lib/utils/*.ts                   packages/shared/src/utils/
cp src/lib/validation/*.ts              packages/shared/src/validation/
cp src/lib/crypto/*.ts                  packages/shared/src/crypto/

# shared DB queries
cp src/lib/db/queries/tickets.ts        packages/shared/src/db/queries/tickets.ts
cp src/lib/db/queries/categories.ts     packages/shared/src/db/queries/categories.ts
cp src/lib/db/queries/branding.ts       packages/shared/src/db/queries/branding.ts
```

- [ ] **Step 2: import 경로 일괄 수정**

`packages/shared/src/` 전체에서 다음 교체를 수행:

```bash
# @/lib/db/client → @crinity/db
find packages/shared/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/lib/db/client|@crinity/db|g'

# @/lib/auth/... → @crinity/shared/auth/...
find packages/shared/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/lib/auth/|@crinity/shared/auth/|g'

# @/lib/security/... → @crinity/shared/security/...
find packages/shared/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/lib/security/|@crinity/shared/security/|g'

# @/lib/email/... → @crinity/shared/email/...
find packages/shared/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/lib/email/|@crinity/shared/email/|g'

# @/lib/tickets/... → @crinity/shared/tickets/...
find packages/shared/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/lib/tickets/|@crinity/shared/tickets/|g'

# @/lib/knowledge/... → @crinity/shared/knowledge/...
find packages/shared/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/lib/knowledge/|@crinity/shared/knowledge/|g'

# @/lib/storage/... → @crinity/shared/storage/...
find packages/shared/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/lib/storage/|@crinity/shared/storage/|g'

# @/lib/utils → @crinity/shared/utils
find packages/shared/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  -e 's|from "@/lib/utils"|from "@crinity/shared/utils"|g' \
  -e 's|from "@/lib/utils/|from "@crinity/shared/utils/|g'

# @/lib/validation/... → @crinity/shared/validation/...
find packages/shared/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/lib/validation/|@crinity/shared/validation/|g'

# @/lib/crypto/... → @crinity/shared/crypto/...
find packages/shared/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/lib/crypto/|@crinity/shared/crypto/|g'

# @/lib/db/queries/... → @crinity/shared/db/queries/...
find packages/shared/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/lib/db/queries/|@crinity/shared/db/queries/|g'

# @/lib/branding/... → @crinity/shared/branding/...
find packages/shared/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/lib/branding/|@crinity/shared/branding/|g'
```

**macOS 주의**: `sed -i ''` (빈 문자열 필수). Linux에서는 `sed -i`

- [ ] **Step 3: TypeScript 타입 에러 확인**

```bash
cd packages/shared && npx tsc --noEmit
```

Expected: 에러 없음. 에러 발생 시 누락된 import 경로를 수동으로 수정한다.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/
git commit -m "feat: add packages/shared with auth, security, email, tickets, knowledge, storage modules"
```

---

## Task 5: apps/admin — 어드민 앱 설정

**Files:**
- Create: `apps/admin/src/` 전체 (파일 구조 매핑 참조)
- Create: `apps/admin/next.config.ts`
- Create: `apps/admin/tailwind.config.ts`
- Create: `apps/admin/postcss.config.js`
- Create: `apps/admin/src/auth.ts`
- Create: `apps/admin/src/middleware.ts`
- Create: `apps/admin/src/app/globals.css`
- Create: `apps/admin/src/app/layout.tsx`
- Create: `apps/admin/.env.local` (로컬 개발용)

- [ ] **Step 1: admin 앱 디렉터리 구조 생성 및 파일 복사**

```bash
mkdir -p \
  apps/admin/src/app/\(admin\)/admin \
  apps/admin/src/app/api \
  apps/admin/src/components/admin \
  apps/admin/src/hooks \
  apps/admin/src/lib

# app routes (admin)
cp -r src/app/\(admin\)/. apps/admin/src/app/\(admin\)/

# API routes (admin-specific)
cp -r src/app/api/admin        apps/admin/src/app/api/
cp -r src/app/api/auth         apps/admin/src/app/api/
cp -r src/app/api/git          apps/admin/src/app/api/
cp -r src/app/api/internal     apps/admin/src/app/api/
cp -r src/app/api/llm          apps/admin/src/app/api/
cp -r src/app/api/templates    apps/admin/src/app/api/
cp -r src/app/api/webhooks     apps/admin/src/app/api/
cp -r src/app/api/agents       apps/admin/src/app/api/
cp -r src/app/api/ai           apps/admin/src/app/api/

# admin 전용 comment (route.ts, 인증 필요)
mkdir -p apps/admin/src/app/api/comments
cp src/app/api/comments/route.ts apps/admin/src/app/api/comments/route.ts

# admin 전용 ticket sub-routes
mkdir -p apps/admin/src/app/api/tickets/\[id\]
cp -r src/app/api/tickets/\[id\]/transfer apps/admin/src/app/api/tickets/\[id\]/
cp -r src/app/api/tickets/\[id\]/summary  apps/admin/src/app/api/tickets/\[id\]/
cp -r src/app/api/tickets/search           apps/admin/src/app/api/tickets/

# components
cp -r src/components/admin/.       apps/admin/src/components/admin/
cp src/components/app/admin-shell.tsx apps/admin/src/components/admin-shell.tsx
cp src/components/app/auth-provider.tsx apps/admin/src/components/auth-provider.tsx

# hooks
cp src/hooks/use-comment-lock.ts    apps/admin/src/hooks/
cp src/hooks/use-ticket-presence.ts apps/admin/src/hooks/

# lib (admin-specific)
cp -r src/lib/ai         apps/admin/src/lib/
cp -r src/lib/agents     apps/admin/src/lib/
cp -r src/lib/assignment apps/admin/src/lib/
cp -r src/lib/audit      apps/admin/src/lib/
cp -r src/lib/automation apps/admin/src/lib/
cp -r src/lib/git        apps/admin/src/lib/
cp -r src/lib/llm        apps/admin/src/lib/
cp -r src/lib/reports    apps/admin/src/lib/
cp -r src/lib/sla        apps/admin/src/lib/
cp -r src/lib/system     apps/admin/src/lib/
cp -r src/lib/templates  apps/admin/src/lib/
mkdir -p apps/admin/src/lib/email
cp src/lib/email/renderers.tsx apps/admin/src/lib/email/
mkdir -p apps/admin/src/lib/tickets
cp src/lib/tickets/activity.ts     apps/admin/src/lib/tickets/
cp src/lib/tickets/collaboration.ts apps/admin/src/lib/tickets/
mkdir -p apps/admin/src/lib/db/queries/admin-analytics
cp src/lib/db/queries/admin-tickets.ts  apps/admin/src/lib/db/queries/
cp src/lib/db/queries/ticket-merge.ts   apps/admin/src/lib/db/queries/
cp src/lib/db/queries/agents.ts         apps/admin/src/lib/db/queries/
cp src/lib/db/queries/knowledge-admin.ts apps/admin/src/lib/db/queries/
cp -r src/lib/db/queries/admin-analytics/. apps/admin/src/lib/db/queries/admin-analytics/

# root-level app files
cp src/app/globals.css    apps/admin/src/app/globals.css
cp src/app/layout.tsx     apps/admin/src/app/layout.tsx  # 아래 Step 3에서 수정
cp src/app/\(admin\)/layout.tsx apps/admin/src/app/\(admin\)/layout.tsx

# auth and middleware
cp src/auth.ts      apps/admin/src/auth.ts
cp src/middleware.ts apps/admin/src/middleware.ts  # 아래 Step 4에서 수정
```

- [ ] **Step 2: import 경로 일괄 수정 (shared 패키지 참조)**

`apps/admin/src/` 전체에서 수행:

```bash
cd /path/to/crinity-helpdesk

find apps/admin/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  -e 's|@/lib/db/client|@crinity/db|g' \
  -e 's|@/lib/auth/|@crinity/shared/auth/|g' \
  -e 's|@/lib/security/|@crinity/shared/security/|g' \
  -e 's|@/lib/email/enqueue|@crinity/shared/email/enqueue|g' \
  -e 's|@/lib/email/process-outbox|@crinity/shared/email/process-outbox|g' \
  -e 's|@/lib/email/threading|@crinity/shared/email/threading|g' \
  -e 's|@/lib/email/providers/|@crinity/shared/email/providers/|g' \
  -e 's|@/lib/tickets/create-ticket|@crinity/shared/tickets/create-ticket|g' \
  -e 's|@/lib/tickets/public-thread|@crinity/shared/tickets/public-thread|g' \
  -e 's|@/lib/tickets/ticket-number|@crinity/shared/tickets/ticket-number|g' \
  -e 's|@/lib/knowledge/|@crinity/shared/knowledge/|g' \
  -e 's|@/lib/branding/|@crinity/shared/branding/|g' \
  -e 's|@/lib/storage/|@crinity/shared/storage/|g' \
  -e 's|from "@/lib/utils"|from "@crinity/shared/utils"|g' \
  -e 's|from "@/lib/utils/|from "@crinity/shared/utils/|g' \
  -e 's|@/lib/validation/|@crinity/shared/validation/|g' \
  -e 's|@/lib/crypto/|@crinity/shared/crypto/|g' \
  -e 's|@/lib/db/queries/tickets|@crinity/shared/db/queries/tickets|g' \
  -e 's|@/lib/db/queries/categories|@crinity/shared/db/queries/categories|g' \
  -e 's|@/lib/db/queries/branding|@crinity/shared/db/queries/branding|g' \
  -e 's|@/components/ui/|@crinity/ui/components/ui/|g' \
  -e 's|@/components/app/admin-shell|@/components/admin-shell|g' \
  -e 's|@/components/app/auth-provider|@/components/auth-provider|g'
```

- [ ] **Step 3: apps/admin/src/app/layout.tsx 정리**

루트 `src/app/layout.tsx`에 있던 APP_TYPE 분기가 있으면 제거하고, admin 앱 전용 레이아웃으로 수정한다. 일반적으로 `<html>`, `<body>`, 폰트, `<AuthProvider>` 정도면 충분하다.

- [ ] **Step 4: apps/admin/src/middleware.ts 재작성**

APP_TYPE 분기를 완전히 제거하고, 인증 체크 + 헤더 주입만 남긴다:

```typescript
import { NextResponse } from "next/server";
import { auth } from "./auth";
import { BACKOFFICE_DASHBOARD_PATH, BACKOFFICE_LOGIN_PATH } from "@crinity/shared/auth/config";

const PASSWORD_CHANGE_PATH = "/admin/change-password";

export default auth((request) => {
  const { nextUrl } = request;
  const isAuthenticated = Boolean(request.auth);
  const isLoginRoute = nextUrl.pathname === BACKOFFICE_LOGIN_PATH;
  const isPasswordChangeRoute = nextUrl.pathname === PASSWORD_CHANGE_PATH;
  const isApiRoute = nextUrl.pathname.startsWith("/api/");
  const user = request.auth?.user as { isInitialPassword?: boolean } | undefined;
  const requiresPasswordChange = user?.isInitialPassword === true;

  if (!isAuthenticated && !isLoginRoute)
    return NextResponse.redirect(new URL(BACKOFFICE_LOGIN_PATH, nextUrl));
  if (isAuthenticated && isLoginRoute && !requiresPasswordChange)
    return NextResponse.redirect(new URL(BACKOFFICE_DASHBOARD_PATH, nextUrl));
  if (isAuthenticated && requiresPasswordChange && !isPasswordChangeRoute && !isApiRoute)
    return NextResponse.redirect(new URL(PASSWORD_CHANGE_PATH, nextUrl));
  if (isAuthenticated && !requiresPasswordChange && isPasswordChangeRoute)
    return NextResponse.redirect(new URL(BACKOFFICE_DASHBOARD_PATH, nextUrl));

  const requestHeaders = new Headers(request.headers);
  if (request.auth?.user?.role)
    requestHeaders.set("x-backoffice-role", request.auth.user.role);
  if (request.auth?.user?.agentId)
    requestHeaders.set("x-backoffice-agent-id", request.auth.user.agentId);

  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = { matcher: ["/admin/:path*"] };
```

- [ ] **Step 5: apps/admin/next.config.ts 생성**

```typescript
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // 모노레포 루트를 tracing root로 설정 (packages/ node_modules 포함)
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // @libsql 네이티브 바이너리 명시 포함
  outputFileTracingIncludes: {
    "/**": [
      "../../node_modules/@libsql/**",
      "../../node_modules/.pnpm/@libsql*/**",
      "../../node_modules/.pnpm/libsql*/**",
      "../../packages/db/node_modules/.prisma/**",
    ],
  },
  transpilePackages: ["@crinity/ui", "@crinity/shared"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: {
    serverActions: { bodySizeLimit: "600mb" },
  },
  async headers() {
    // 현재 루트 next.config.ts 의 headers() 함수 내용 그대로 복사
    // CSP, X-Frame-Options, X-Content-Type-Options 등 보안 헤더 유지
    const isDevelopment = process.env.NODE_ENV === "development";
    // ... (루트 next.config.ts 참조하여 완전히 복사)
    return [];
  },
};

export default nextConfig;
```

**주의:** `headers()` 함수 내용은 현재 루트 `next.config.ts`에서 완전히 복사해야 한다.

- [ ] **Step 6: apps/admin/tailwind.config.ts 생성**

```typescript
import type { Config } from "tailwindcss";
import { uiTailwindConfig } from "@crinity/ui/tailwind.config.base";

const config: Config = {
  ...uiTailwindConfig,
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../packages/shared/src/**/*.{ts,tsx}",
  ],
};

export default config;
```

- [ ] **Step 7: apps/admin/postcss.config.js 생성**

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 8: apps/admin/.env.local 생성 (개발용)**

```env
DATABASE_URL=file:../../packages/db/dev.db
AUTH_SECRET=local-dev-secret-32-chars-minimum
TICKET_ACCESS_SECRET=local-dev-ticket-secret
GIT_TOKEN_ENCRYPTION_KEY=local-dev-encryption-key-32bytexx
INITIAL_ADMIN_EMAIL=admin@crinity.io
INITIAL_ADMIN_PASSWORD=admin1234
AUTH_URL=http://localhost:3001
```

`.gitignore`에 `apps/admin/.env.local`이 포함되어 있는지 확인한다.

- [ ] **Step 9: DB 초기화 및 admin 개발 서버 테스트**

```bash
# 처음이라면 마이그레이션 실행
pnpm --filter=@crinity/db migrate:dev --name init

# admin 개발 서버 기동
pnpm --filter=@crinity/admin dev
```

Expected: `http://localhost:3001/admin/login` 에서 로그인 페이지 표시, 로그인 후 대시보드 접근 성공.

- [ ] **Step 10: packages/db/prisma/seed.ts import 경로 수정**

`packages/db/prisma/seed.ts`는 `src/lib/system/seed-functions`를 import하는데, 이 파일은 `apps/admin/src/lib/system/seed-functions.ts`로 이동했다. seed.ts를 수정한다:

```bash
sed -i '' 's|@/lib/system/seed-functions|../../../apps/admin/src/lib/system/seed-functions|g' \
  packages/db/prisma/seed.ts
```

수정 후 확인:
```bash
grep "seed-functions" packages/db/prisma/seed.ts
```
Expected: `from "../../../apps/admin/src/lib/system/seed-functions"` 형태로 변경됨.

- [ ] **Step 11: TypeScript 타입 에러 확인**

```bash
cd apps/admin && npx tsc --noEmit
```

Expected: 에러 없음 (또는 minor type 에러면 수정).

- [ ] **Step 12: Commit**

```bash
git add apps/admin/ packages/db/prisma/seed.ts
git commit -m "feat: add apps/admin with simplified middleware and monorepo package imports"
```

---

## Task 6: apps/public — 퍼블릭 앱 설정

**Files:**
- Create: `apps/public/src/` 전체
- Create: `apps/public/next.config.ts`
- Create: `apps/public/tailwind.config.ts`
- Create: `apps/public/postcss.config.js`
- Create: `apps/public/.env.local`
- **No middleware** (파일 생성 안 함)

- [ ] **Step 1: public 앱 파일 복사**

```bash
mkdir -p \
  apps/public/src/app/\(public\) \
  apps/public/src/app/survey \
  apps/public/src/app/api \
  apps/public/src/components/ticket \
  apps/public/src/components/knowledge \
  apps/public/src/components/survey

# app routes (public)
cp -r src/app/\(public\)/. apps/public/src/app/\(public\)/

# survey
cp -r src/app/survey/. apps/public/src/app/survey/

# API routes (public-specific)
cp src/app/api/tickets/route.ts               apps/public/src/app/api/tickets/
mkdir -p apps/public/src/app/api/tickets/\[id\]
cp src/app/api/tickets/\[id\]/route.ts        apps/public/src/app/api/tickets/\[id\]/
cp -r src/app/api/tickets/\[id\]/csat         apps/public/src/app/api/tickets/\[id\]/
cp -r src/app/api/comments/public             apps/public/src/app/api/comments/
cp -r src/app/api/knowledge                   apps/public/src/app/api/
cp -r src/app/api/survey                      apps/public/src/app/api/

# components
cp -r src/components/ticket/.    apps/public/src/components/ticket/
cp -r src/components/knowledge/. apps/public/src/components/knowledge/
cp -r src/components/survey/.    apps/public/src/components/survey/
cp src/components/app/public-shell.tsx apps/public/src/components/public-shell.tsx
cp src/components/theme-provider.tsx   apps/public/src/components/
cp src/components/theme-toggle.tsx     apps/public/src/components/

# layout and globals
cp src/app/globals.css apps/public/src/app/globals.css
cp src/app/\(public\)/layout.tsx apps/public/src/app/\(public\)/layout.tsx
```

`apps/public/src/app/layout.tsx` 생성 (최소 루트 레이아웃):
```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "헬프데스크",
  description: "고객 지원 센터",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: import 경로 일괄 수정**

```bash
find apps/public/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  -e 's|@/lib/db/client|@crinity/db|g' \
  -e 's|@/lib/auth/|@crinity/shared/auth/|g' \
  -e 's|@/lib/security/|@crinity/shared/security/|g' \
  -e 's|@/lib/email/enqueue|@crinity/shared/email/enqueue|g' \
  -e 's|@/lib/email/process-outbox|@crinity/shared/email/process-outbox|g' \
  -e 's|@/lib/email/threading|@crinity/shared/email/threading|g' \
  -e 's|@/lib/email/providers/|@crinity/shared/email/providers/|g' \
  -e 's|@/lib/tickets/create-ticket|@crinity/shared/tickets/create-ticket|g' \
  -e 's|@/lib/tickets/public-thread|@crinity/shared/tickets/public-thread|g' \
  -e 's|@/lib/tickets/ticket-number|@crinity/shared/tickets/ticket-number|g' \
  -e 's|@/lib/knowledge/|@crinity/shared/knowledge/|g' \
  -e 's|@/lib/branding/|@crinity/shared/branding/|g' \
  -e 's|@/lib/storage/|@crinity/shared/storage/|g' \
  -e 's|from "@/lib/utils"|from "@crinity/shared/utils"|g' \
  -e 's|from "@/lib/utils/|from "@crinity/shared/utils/|g' \
  -e 's|@/lib/validation/|@crinity/shared/validation/|g' \
  -e 's|@/lib/crypto/|@crinity/shared/crypto/|g' \
  -e 's|@/lib/db/queries/tickets|@crinity/shared/db/queries/tickets|g' \
  -e 's|@/lib/db/queries/categories|@crinity/shared/db/queries/categories|g' \
  -e 's|@/lib/db/queries/branding|@crinity/shared/db/queries/branding|g' \
  -e 's|@/components/ui/|@crinity/ui/components/ui/|g' \
  -e 's|@/components/app/public-shell|@/components/public-shell|g'
```

- [ ] **Step 3: apps/public/next.config.ts 생성**

```typescript
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  outputFileTracingIncludes: {
    "/**": [
      "../../node_modules/@libsql/**",
      "../../node_modules/.pnpm/@libsql*/**",
      "../../node_modules/.pnpm/libsql*/**",
      "../../packages/db/node_modules/.prisma/**",
    ],
  },
  transpilePackages: ["@crinity/ui", "@crinity/shared"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: {
    serverActions: { bodySizeLimit: "600mb" },
  },
  async headers() {
    // CSP 보안 헤더 — 루트 next.config.ts 에서 복사
    return [];
  },
};

export default nextConfig;
```

- [ ] **Step 4: apps/public/tailwind.config.ts 및 postcss.config.js 생성**

`apps/admin/` 와 동일 구조로 생성.

- [ ] **Step 5: apps/public/.env.local 생성**

```env
DATABASE_URL=file:../../packages/db/dev.db
TICKET_ACCESS_SECRET=local-dev-ticket-secret
AUTH_URL=http://localhost:3000
```

- [ ] **Step 6: public 개발 서버 테스트**

```bash
pnpm --filter=@crinity/public dev
```

Expected: `http://localhost:3000` 에서 공개 헬프데스크 메인 페이지 표시. `/knowledge`, `/tickets/new`, `/survey/*` 등 공개 경로 동작 확인.

- [ ] **Step 7: TypeScript 타입 에러 확인**

```bash
cd apps/public && npx tsc --noEmit
```

Expected: 에러 없음.

- [ ] **Step 8: Commit**

```bash
git add apps/public/
git commit -m "feat: add apps/public without middleware, clean public-only route set"
```

---

## Task 7: 테스트 설정 업데이트

**Files:**
- Modify: `vitest.config.ts`
- Modify: `playwright.config.ts`
- Modify: `tests/unit/**/*.spec.ts` (import 경로 업데이트)

- [ ] **Step 1: vitest.config.ts 업데이트**

```typescript
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 대부분 unit test는 admin 전용 lib을 테스트하므로 @ → apps/admin/src
      "@": path.resolve(__dirname, "./apps/admin/src"),
      "@crinity/db":     path.resolve(__dirname, "./packages/db/src/index.ts"),
      "@crinity/ui":     path.resolve(__dirname, "./packages/ui/src"),
      "@crinity/shared": path.resolve(__dirname, "./packages/shared/src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    include: ["tests/unit/**/*.spec.ts"],
    exclude: [".worktrees/**", "tests/integration/**", "tests/e2e/**"],
  },
});
```

- [ ] **Step 2: unit test import 경로 업데이트**

현재 unit test의 `@/lib/...` import는 이제 `apps/admin/src/lib/...`를 가리키게 되므로, admin 전용 lib을 테스트하는 파일은 변경 불필요.

단, shared 패키지를 테스트하는 파일(`tests/unit/email/outbox.spec.ts`)은 수정 필요:

`tests/unit/email/outbox.spec.ts`:
```typescript
// 변경 전
import { enqueueEmail } from "@/lib/email/enqueue";
import { processOutbox } from "@/lib/email/process-outbox";

// 변경 후
import { enqueueEmail } from "@crinity/shared/email/enqueue";
import { processOutbox } from "@crinity/shared/email/process-outbox";
```

- [ ] **Step 3: unit 테스트 실행 확인**

```bash
pnpm test
```

Expected: 전체 unit 테스트 PASS. 실패 시 import 경로 에러를 수정한다.

- [ ] **Step 4: playwright.config.ts 업데이트**

```typescript
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  testDir: "./tests/e2e/specs",
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: [
    ["html"],
    ["./tests/reporter/excel-reporter.ts"],
  ],
  use: {
    baseURL: "http://127.0.0.1:3000",  // public 앱 기본
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter=@crinity/public dev --port 3000",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm --filter=@crinity/admin dev --port 3001",
      url: "http://127.0.0.1:3001",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

- [ ] **Step 5: E2E 테스트 스펙의 admin URL 참조 업데이트**

E2E 스펙 파일 중 admin 페이지를 테스트하는 파일에서 `http://localhost:3000/admin/...` → `http://localhost:3001/admin/...` 또는 `http://127.0.0.1:3001/admin/...`으로 변경.

```bash
grep -r "127.0.0.1:3000/admin\|localhost:3000/admin" tests/e2e/
```

발견된 파일들을 수동으로 확인 후 `3001`로 변경.

- [ ] **Step 6: E2E 테스트 실행 (선택적)**

```bash
pnpm test:e2e
```

Expected: 전체 E2E 통과. 실패 시 URL 참조 오류를 수정한다.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts playwright.config.ts tests/
git commit -m "test: update vitest and playwright config for monorepo — dual webServer, package aliases"
```

---

## Task 8: Docker 인프라 업데이트

**Files:**
- Rewrite: `Dockerfile`
- Rewrite: `docker-compose.yml`
- Modify: `nginx.conf` (admin 404 차단 블록 제거)

- [ ] **Step 1: Dockerfile 재작성**

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── 의존성 설치 (빌드용 — devDeps 포함)
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json   ./apps/admin/
COPY apps/public/package.json  ./apps/public/
COPY packages/db/package.json      ./packages/db/
COPY packages/ui/package.json      ./packages/ui/
COPY packages/shared/package.json  ./packages/shared/
RUN pnpm install --frozen-lockfile

# ── 프로덕션 전용 의존성
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json   ./apps/admin/
COPY apps/public/package.json  ./apps/public/
COPY packages/db/package.json      ./packages/db/
COPY packages/ui/package.json      ./packages/ui/
COPY packages/shared/package.json  ./packages/shared/
RUN pnpm install --frozen-lockfile --prod

# ── 마이그레이션 전용 스테이지 (Prisma CLI 포함)
FROM base AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/db/package.json      ./packages/db/
COPY packages/db/prisma            ./packages/db/prisma
COPY package.json pnpm-workspace.yaml ./
CMD ["pnpm", "--filter=@crinity/db", "migrate:deploy"]

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
RUN pnpm --filter=@crinity/db generate
RUN pnpm --filter=@crinity/${APP_NAME} build
# 빌드 완료 후 민감 ENV 초기화
ENV AUTH_SECRET="" DATABASE_URL="" TICKET_ACCESS_SECRET="" GIT_TOKEN_ENCRYPTION_KEY=""

# ── 런타임 (최소 이미지)
FROM base AS runner
ARG APP_NAME
ENV APP_NAME=$APP_NAME \
    NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# pnpm 가상 스토어 symlink 처리:
# outputFileTracingRoot가 모노레포 루트를 가리키므로 Next.js standalone은
# 모든 의존성의 실제 파일을 standalone/node_modules에 직접 복사(symlink 해소)한다.
# standalone 복사 후 prod-deps/node_modules는 Prisma 어댑터 등 일부에 필요할 수 있으므로 함께 복사.
# 순서 중요: prod-deps 먼저, standalone이 덮어씀.
COPY --from=prod-deps /app/node_modules ./node_modules
# Prisma 생성 클라이언트 (builder에서만 생성됨, packages/db/node_modules/.prisma)
COPY --from=builder /app/packages/db/node_modules/.prisma ./packages/db/node_modules/.prisma

# standalone 전체 복사 (모노레포 구조 유지: apps/{APP_NAME}/server.js)
# standalone/node_modules는 이미 symlink 해소된 파일 복사본이므로 prod-deps 위에 덮어쓰기 안전
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
# shell form: ENV APP_NAME이 런타임에 확장됨
CMD node apps/$APP_NAME/server.js
```

**[pnpm symlink 이슈 발생 시 대안]**: 만약 `node_modules` 충돌로 시작 오류가 발생하면, standalone의 node_modules 대신 prod-deps의 node_modules만 사용하는 방식으로 전환한다. runner 스테이지에서 standalone 전체 복사 대신:
```dockerfile
# 대안: standalone에서 server.js와 번들된 .next만 선택 복사 (node_modules 제외)
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP_NAME}/.next/standalone/apps/${APP_NAME}/server.js \
    ./apps/${APP_NAME}/server.js
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP_NAME}/.next/standalone/apps/${APP_NAME}/.next \
    ./apps/${APP_NAME}/.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP_NAME}/.next/standalone/packages \
    ./packages
```
이 경우 prod-deps node_modules + standalone .next + Prisma 클라이언트 조합으로 동작한다.

- [ ] **Step 2: docker-compose.yml 재작성**

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
      target: migrator
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
    image: crinity-public:latest
    restart: unless-stopped
    depends_on:
      migrate:
        condition: service_completed_successfully
    environment:
      DATABASE_URL: http://sqld:8889
      PUBLIC_URL: ${PUBLIC_URL}
      ADMIN_URL: ${ADMIN_URL}
      AUTH_URL: ${PUBLIC_URL}
      AUTH_SECRET: ${AUTH_SECRET}
      TICKET_ACCESS_SECRET: ${TICKET_ACCESS_SECRET}
      GIT_TOKEN_ENCRYPTION_KEY: ${GIT_TOKEN_ENCRYPTION_KEY}
    volumes:
      - uploads:/app/apps/public/public/uploads
    expose:
      - "3000"
    # 다중화: docker compose up --scale public=3 -d

  admin:
    build:
      context: .
      target: runner
      args:
        APP_NAME: admin
    image: crinity-admin:latest
    restart: unless-stopped
    depends_on:
      migrate:
        condition: service_completed_successfully
    environment:
      DATABASE_URL: http://sqld:8889
      PUBLIC_URL: ${PUBLIC_URL}
      ADMIN_URL: ${ADMIN_URL}
      AUTH_URL: ${ADMIN_URL}
      AUTH_SECRET: ${AUTH_SECRET}
      TICKET_ACCESS_SECRET: ${TICKET_ACCESS_SECRET}
      GIT_TOKEN_ENCRYPTION_KEY: ${GIT_TOKEN_ENCRYPTION_KEY}
      INITIAL_ADMIN_EMAIL: ${INITIAL_ADMIN_EMAIL}
      INITIAL_ADMIN_PASSWORD: ${INITIAL_ADMIN_PASSWORD}
    volumes:
      - uploads:/app/apps/admin/public/uploads
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

- [ ] **Step 3: nginx.conf 업데이트**

이제 public 앱에 `/admin` 코드 자체가 없으므로 nginx의 `/admin` 404 차단 블록이 불필요하다:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream public_app {
        server public:3000;  # --scale public=N 시 자동 round-robin
    }

    upstream admin_app {
        server admin:3000;   # --scale admin=N 시 자동 round-robin
    }

    server {
        listen 80;
        server_name helpdesk.crinity.io;
        # /admin 차단 블록 제거 — public 앱에 /admin 코드 없음

        location / {
            proxy_pass         http://public_app;
            proxy_set_header   Host $host;
            proxy_set_header   X-Real-IP $remote_addr;
            proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto $scheme;
            proxy_set_header   X-Forwarded-Host $host;
            client_max_body_size 600M;
        }
    }

    server {
        listen 80;
        server_name admin.crinity.io;

        location = / {
            return 301 /admin/dashboard;
        }

        location / {
            proxy_pass         http://admin_app;
            proxy_set_header   Host $host;
            proxy_set_header   X-Real-IP $remote_addr;
            proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto $scheme;
            proxy_set_header   X-Forwarded-Host $host;
            client_max_body_size 100M;
        }
    }
}
```

- [ ] **Step 4: Docker 이미지 빌드 테스트**

```bash
# admin 이미지 빌드
docker build --target runner --build-arg APP_NAME=admin -t crinity-admin:latest .

# public 이미지 빌드
docker build --target runner --build-arg APP_NAME=public -t crinity-public:latest .
```

Expected: 빌드 성공. 실패 시 Dockerfile COPY 경로 오류를 수정한다.

- [ ] **Step 5: docker compose 전체 기동 테스트**

```bash
docker compose up --build -d
docker compose logs -f
```

Expected: `migrate` 서비스 완료, `admin` + `public` 서비스 기동. `helpdesk.crinity.io` 와 `admin.crinity.io` 접근 확인.

- [ ] **Step 6: Commit**

```bash
git add Dockerfile docker-compose.yml nginx.conf
git commit -m "chore: update Dockerfile with APP_NAME build arg, migrator stage, and monorepo standalone paths"
```

---

## Task 9: 루트 src/ 정리 및 최종 검증

**Files:**
- Delete: `src/` (루트 전체)
- Delete: 루트의 `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `tailwind.config.js`
- Delete: `scripts/migrate.mjs` (migrator 스테이지로 대체됨)
- Modify: `CLAUDE.md` (명령어 업데이트)
- Verify: APP_TYPE 관련 코드 0줄

- [ ] **Step 1: APP_TYPE 코드 완전 제거 확인**

삭제 전에 `apps/`, `packages/` 안에 APP_TYPE 참조가 없는지 확인:

```bash
grep -r "APP_TYPE" apps/ packages/ --include="*.ts" --include="*.tsx"
```

Expected: 결과 없음. 있으면 해당 파일에서 제거 후 진행.

- [ ] **Step 2: 루트 src/ 삭제**

모든 파일이 `apps/` 또는 `packages/`로 이동 완료된 것을 확인한 후 삭제:

```bash
rm -rf src/
```

- [ ] **Step 3: 루트 설정 파일 정리**

```bash
# 이제 앱별 next.config.ts가 있으므로 루트 next.config.ts 삭제
rm -f next.config.ts

# 루트 tsconfig.json 삭제 (tsconfig.base.json으로 대체됨)
rm -f tsconfig.json

# 루트 tailwind 설정 삭제 (packages/ui/tailwind.config.base.ts로 대체됨)
rm -f tailwind.config.ts tailwind.config.js tailwind.config.mjs 2>/dev/null

# 루트 prisma/ 삭제 (packages/db/prisma/로 이동됨)
rm -rf prisma/

# 루트 scripts/ 정리 (migrate.mjs는 migrator 스테이지로 대체됨)
rm -f scripts/migrate.mjs
# scripts/ 아래 다른 스크립트가 있으면 확인 후 필요한 것만 유지
```

- [ ] **Step 4: CLAUDE.md 업데이트**

`CLAUDE.md`의 Commands 섹션을 모노레포 명령어로 업데이트:

```markdown
## Commands

\`\`\`bash
# 개발 서버
pnpm dev:admin   # admin 앱 (localhost:3001)
pnpm dev:public  # public 앱 (localhost:3000)

# 빌드
pnpm build:admin
pnpm build:public

# DB
pnpm --filter=@crinity/db generate      # Prisma 클라이언트 재생성
pnpm --filter=@crinity/db migrate:dev --name <name>  # 마이그레이션 생성
pnpm --filter=@crinity/db studio        # Prisma Studio
pnpm --filter=@crinity/db seed          # 시드 데이터

# 테스트
pnpm test        # Vitest unit tests (루트에서)
pnpm test:e2e    # Playwright E2E (admin + public 서버 자동 기동)

# 최초 설정
pnpm install
pnpm --filter=@crinity/db generate
pnpm --filter=@crinity/db migrate:dev --name init
pnpm --filter=@crinity/db seed
\`\`\`
```

- [ ] **Step 5: 최종 APP_TYPE 검증**

```bash
grep -r "APP_TYPE" . \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  --exclude-dir=".git" --exclude-dir="node_modules" --exclude-dir=".next"
```

Expected: **결과 없음** (0줄). 이 검증이 통과해야 마이그레이션 완료.

- [ ] **Step 6: 전체 빌드 검증**

```bash
pnpm --filter=@crinity/admin build
pnpm --filter=@crinity/public build
pnpm test
```

Expected: admin 빌드 성공, public 빌드 성공, unit 테스트 전체 PASS.

- [ ] **Step 7: 최종 Commit**

```bash
git add -A
git commit -m "feat: complete monorepo restructure — remove src/, APP_TYPE eliminated, apps/admin + apps/public separated"
```

---

## 구현 시 주의사항

1. **파일 이동 순서**: packages/db → packages/ui → packages/shared → apps/admin → apps/public 순서를 지킨다. 의존성 순서.

2. **sed 명령어**: macOS에서는 `sed -i ''` (빈 문자열 필수), Linux에서는 `sed -i`. `&&`로 체이닝하면 한 번에 처리 가능.

3. **Prisma generate 위치**: `packages/db/prisma/schema.prisma`에서 `output = "../node_modules/.prisma/client"` 설정 후 `pnpm --filter=@crinity/db generate` 실행. 생성 결과는 `packages/db/node_modules/.prisma/client/`.

4. **standalone 출력 경로**: 모노레포에서 standalone은 `apps/{APP_NAME}/.next/standalone/apps/{APP_NAME}/server.js`에 생성된다. Docker runner에서 `CMD node apps/$APP_NAME/server.js` (shell form, ENV 확장).

5. **transpilePackages**: `@crinity/ui`와 `@crinity/shared`는 사전 컴파일 없이 소스로 소비되므로 각 앱의 `next.config.ts`에 반드시 포함.

6. **공유 볼륨**: 두 앱이 파일 업로드를 공유하려면 `uploads` 볼륨을 `apps/admin/public/uploads`와 `apps/public/public/uploads` 양쪽에 마운트해야 한다. (docker-compose.yml Step 2 참조)

7. **타입 에러 처리**: Task 5, 6에서 TypeScript 에러가 발생할 경우, 대부분 import 경로 수정으로 해결된다. `next.config.ts`의 `typescript: { ignoreBuildErrors: true }` 설정 덕분에 빌드는 통과하지만, 타입 에러는 반드시 수정한다.

8. **seed.ts 업데이트 (Task 2 Step 7)**: `packages/db/prisma/seed.ts`가 `@/lib/system/seed-functions`를 import하는데, 이 파일은 `apps/admin/src/lib/system/seed-functions.ts`로 이동한다. Task 5 완료 후 seed.ts의 import를 수정:
   ```typescript
   // 수정 전
   import { ... } from "@/lib/system/seed-functions";
   // 수정 후 (상대경로)
   import { ... } from "../../../apps/admin/src/lib/system/seed-functions";
   ```
   또는 `packages/shared/src/system/seed-functions.ts`로 이동을 고려한다.
