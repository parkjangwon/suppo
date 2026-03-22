# Crinity Helpdesk System

<p align="center">
  <strong>pnpm workspace 기반 Public/Admin 분리형 헬프데스크 시스템</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js 15">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite" alt="SQLite">
  <img src="https://img.shields.io/badge/LibSQL-blue?style=flat-square" alt="LibSQL">
</p>

---

## 개요

Crinity Helpdesk System은 고객용 공개 채널과 관리자용 백오피스를 분리한 헬프데스크 애플리케이션입니다.

- `apps/public`: 고객 티켓 생성, 조회, 지식베이스, 설문
- `apps/admin`: 상담원/관리자 대시보드, 티켓 처리, 분석, 설정
- `packages/db`: Prisma + LibSQL/SQLite 클라이언트 및 마이그레이션
- `packages/shared`: 인증, 보안, 이메일, 티켓, 지식베이스 등 공용 비즈니스 로직
- `packages/ui`: 공용 shadcn/ui 컴포넌트

로컬 개발은 SQLite 파일 DB를 사용하고, 운영은 LibSQL/sqld 멀티 컨테이너 구성을 기준으로 합니다.

## 핵심 기능

- 고객용 티켓 생성, 티켓 조회, 공개 댓글, 지식베이스, CSAT 설문
- 관리자용 대시보드, 티켓 목록/상세, 댓글/내부 메모, 담당자 변경, 검색/필터
- 상담원 자동 할당, presence 표시, comment lock
- 이메일 Outbox 패턴, GitHub/GitLab 이슈 연동, SAML SSO, 감사 로그
- AI 설정/인사이트, 파일 업로드, 브랜딩, 문의 유형/템플릿 관리

## 기술 스택

- Frontend: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Next.js Route Handlers, NextAuth.js v5, Prisma ORM
- Database: SQLite (로컬), LibSQL/sqld (운영)
- Infra: pnpm workspaces, Docker, Docker Compose, Nginx
- Integrations: Ollama, Gemini, SMTP/SES/Resend, S3, GitHub/GitLab, BoxyHQ SAML

## 모노레포 구조

```text
crinity-helpdesk/
├── apps/
│   ├── admin/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── auth.ts
│   │   │   ├── auth-edge.ts
│   │   │   └── middleware.ts
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── public/
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   └── middleware.ts
│       ├── next.config.ts
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── db/
│   │   ├── prisma/
│   │   ├── src/client.ts
│   │   ├── src/raw.ts
│   │   └── src/index.ts
│   ├── shared/
│   │   └── src/
│   └── ui/
│       └── src/components/ui/
├── tests/
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── nginx.conf.template
│   ├── certs/
│   └── env/
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## 시작하기

### 요구사항

- Node.js 22 이상 권장
- pnpm 10 이상
- macOS/Linux

### 설치

```bash
pnpm install
pnpm --filter=@crinity/db generate
pnpm --filter=@crinity/db migrate:deploy
pnpm --filter=@crinity/db seed
```

### 개발 서버

공개 앱과 관리자 앱을 각각 실행합니다.

```bash
pnpm dev:public
pnpm dev:admin
pnpm dev:all
```

- Public: `http://localhost:3000`
- Admin: `http://localhost:3001`

### 빌드

```bash
pnpm build:public
pnpm build:admin
pnpm build:all
pnpm start:all
```

## 환경 변수

### 루트 `.env`

Playwright나 일부 공통 도구에서 사용합니다.

```bash
DATABASE_URL="file:./packages/db/dev.db"
AUTH_SECRET="your-auth-secret"
AUTH_URL="http://localhost:3000"
TICKET_ACCESS_SECRET="your-ticket-access-secret"
GIT_TOKEN_ENCRYPTION_KEY="your-32-byte-key"
INITIAL_ADMIN_EMAIL="admin@crinity.io"
INITIAL_ADMIN_PASSWORD="admin1234"
```

### 앱별 `.env.local`

각 앱은 자체 `.env.local`을 사용합니다.

`apps/public/.env.local`

```bash
DATABASE_URL=file:/absolute/path/to/packages/db/dev.db
TICKET_ACCESS_SECRET=local-dev-ticket-secret
AUTH_URL=http://localhost:3000
```

`apps/admin/.env.local`

```bash
DATABASE_URL=file:/absolute/path/to/packages/db/dev.db
AUTH_SECRET=local-dev-secret-32-chars-minimum
TICKET_ACCESS_SECRET=local-dev-ticket-secret
GIT_TOKEN_ENCRYPTION_KEY=local-dev-encryption-key-32bytexx
INITIAL_ADMIN_EMAIL=admin@crinity.io
INITIAL_ADMIN_PASSWORD=admin1234
AUTH_URL=http://localhost:3001
```

### 웹 콘솔에서 관리되는 설정

- 이메일 설정: `/admin/settings/email`
- AI/LLM 설정: `/admin/settings/llm`
- 브랜딩: `/admin/settings/branding`
- SAML SSO: `/admin/settings/saml`
- 문의 유형: `/admin/settings/request-types`
- Git 연동: `/admin/settings/git`
- 시스템 설정: `/admin/settings/system`

## 데이터베이스

Prisma 스키마와 마이그레이션은 `packages/db/prisma/`에 있습니다.

주요 명령어:

```bash
pnpm --filter=@crinity/db generate
pnpm --filter=@crinity/db migrate:dev --name <name>
pnpm --filter=@crinity/db migrate:deploy
pnpm --filter=@crinity/db seed
pnpm --filter=@crinity/db studio
```

## 테스트

### Unit Test

```bash
pnpm test
```

Vitest는 admin 앱 alias를 기준으로 동작하고, 공용 패키지 경로는 workspace alias로 해석합니다.

### E2E Test

```bash
pnpm test:e2e
```

Playwright는 public/admin 서버를 자동으로 띄우고 다음 핵심 흐름을 검증합니다.

- public 홈 렌더링
- public 티켓 생성
- public 티켓 조회
- admin 로그인
- admin 티켓 목록/상세
- ticket presence
- comment lock
- 고급 검색 필터

결과 체크리스트는 `test-report/` 아래 `.xlsx`로 저장됩니다.

## 배포

운영 배포는 Docker 멀티 스테이지 빌드와 Docker Compose 기준입니다.

```bash
docker compose -f docker/docker-compose.yml --env-file docker/env/.env.production up --build -d
```

구성:

- `sqld`: LibSQL 서버
- `migrate`: Prisma migration 실행
- `public`: 공개 앱 컨테이너
- `admin`: 관리자 앱 컨테이너
- `nginx`: 도메인별 리버스 프록시

### 이미지 빌드 예시

```bash
docker build -f docker/Dockerfile --target runner --build-arg APP_NAME=public -t crinity-public:latest .
docker build -f docker/Dockerfile --target runner --build-arg APP_NAME=admin -t crinity-admin:latest .
```

## 라우팅 원칙

### Public 앱

- `/`
- `/ticket/new`
- `/ticket/submitted`
- `/ticket/lookup`
- `/ticket/[number]`
- `/knowledge`
- `/knowledge/[slug]`
- `/survey/[token]`
- `/api/tickets`
- `/api/tickets/lookup`
- `/api/comments/public`

### Admin 앱

- `/` → `/admin/dashboard` 리다이렉트
- `/admin/login`
- `/admin/dashboard`
- `/admin/tickets`
- `/admin/tickets/[id]`
- `/admin/analytics`
- `/admin/agents`
- `/admin/customers`
- `/admin/settings/*`
- `/api/admin/*`
- `/api/agents/*`
- `/api/comments`
- `/api/tickets/[id]/*`

## 참고 문서

- [AGENTS.md](/Users/pjw/dev/project/crinity/crinity-helpdesk/AGENTS.md)
- [CLAUDE.md](/Users/pjw/dev/project/crinity/crinity-helpdesk/CLAUDE.md)
- `docs/superpowers/plans/2026-03-22-monorepo-restructure.md`

## 라이선스

MIT
