# Suppo

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

Suppo은 고객용 공개 채널과 관리자용 백오피스를 분리한 헬프데스크 애플리케이션입니다.

- `apps/public`: 고객 티켓 생성, 조회, 지식베이스, 설문
- `apps/admin`: 상담원/관리자 대시보드, 티켓 처리, 분석, 설정
- `packages/db`: Prisma + LibSQL/SQLite 클라이언트 및 마이그레이션
- `packages/shared`: 인증, 보안, 이메일, 티켓, 지식베이스, i18n(다국어) 등 공용 비즈니스 로직
- `packages/ui`: 공용 shadcn/ui 컴포넌트

로컬 개발은 SQLite 파일 DB를 사용하고, 운영은 LibSQL/sqld 멀티 컨테이너 구성을 기준으로 합니다.

## 핵심 기능

- 고객용 티켓 생성, 티켓 조회, 공개 댓글, 지식베이스, CSAT 설문
- 관리자용 대시보드, 티켓 목록/상세, 댓글/내부 메모, 담당자 변경, 검색/필터
- 상담원 자동 할당, presence 표시, comment lock
- 이메일 Outbox 패턴, GitHub/GitLab 이슈 연동, SAML SSO, 감사 로그
- AI 설정/인사이트/자동 분류, 파일 업로드, 브랜딩, 문의 유형/템플릿 관리
- 팀·큐 관리, 업무 규칙, 영업시간 설정, 사용자 정의 필드
- 다국어 지원 (한국어/영어, cookie 기반 locale 전환)
- 지식 문서의 public 링크는 `게시됨 + 공개` 상태에서만 admin 목록에 노출
- 실시간 채팅: 고객 위젯, 관리자 채팅 큐/상세, 첨부파일, 타이핑/읽음 상태, 채팅 분석
- public 포털 플로팅 채팅 버튼 자동 삽입 on/off
- 공개 API 키, outbound webhook, 채팅 widgetKey 프로필 분리

## 관리자 메뉴 구조

설정 메뉴는 아래처럼 역할별로 분리되어 있습니다.

- `업무 규칙`: 응답 목표, 자동 처리, 작업 바로가기
- `연동 설정`: 공개 API 키, outbound webhook
- `채팅 설정`: 플로팅 버튼 기본 설정, SLA 목표, widgetKey별 위젯 프로필
- `브랜딩`, `이메일 연동`, `Git 연동`, `SAML SSO`, `시스템` 등은 각각 독립 메뉴

즉, 운영자 입장에서:

- 티켓 처리 기준을 바꾸고 싶으면 `업무 규칙`
- 외부 시스템과 연결하고 싶으면 `연동 설정`
- 채팅 버튼/위젯을 바꾸고 싶으면 `채팅 설정`

으로 이해하면 됩니다.

## 연동 가이드

### 공개 API

연동 설정의 `공개 API 키`는 외부 시스템이 우리 헬프데스크 티켓 API를 호출할 때 씁니다.

- 관리자 경로: `/admin/settings/integrations`
- 인증 헤더: `x-api-key: <발급된 키>` 또는 `Authorization: Bearer <발급된 키>`
- 현재 지원 엔드포인트
  - `GET /api/public/tickets`
  - `POST /api/public/tickets`
  - `GET /api/public/tickets/:id`
  - `PATCH /api/public/tickets/:id`

티켓 생성 예시:

```bash
curl -X POST https://YOUR_ADMIN_DOMAIN/api/public/tickets \
  -H "Content-Type: application/json" \
  -H "x-api-key: crn_live_xxxxxxxxxxxxxxxxx" \
  -d '{
    "customerName": "홍길동",
    "customerEmail": "hong@example.com",
    "requestTypeId": "REQUEST_TYPE_ID",
    "priority": "MEDIUM",
    "subject": "외부 시스템에서 생성한 문의",
    "description": "주문 시스템 장애 접수"
  }'
```

활용 예시:

- 쇼핑몰/ERP에서 장애 접수 시 헬프데스크 티켓 자동 생성
- 사내 운영툴에서 티켓 상태를 `IN_PROGRESS`, `RESOLVED`로 동기화
- Zapier/Make에서 고객 이벤트를 티켓으로 변환

### Outbound Webhook

`Outbound Webhook`은 우리 시스템에서 발생한 이벤트를 외부 URL로 POST 전송합니다.

- 현재 이벤트
  - `ticket.created`
  - `ticket.updated`
  - `ticket.commented`
- 선택 사항
  - `서명 시크릿`: 설정하면 `x-suppo-signature` 헤더로 `sha256 HMAC` 서명이 붙습니다.

payload 예시:

```json
{
  "event": "ticket.created",
  "occurredAt": "2026-03-29T10:00:00.000Z",
  "data": {
    "source": "public-form",
    "ticketId": "ticket_123",
    "ticketNumber": "CRN-2026-000123"
  }
}
```

운영 팁:

- webhook 등록 후 `테스트 발송`으로 먼저 연결 확인
- 각 endpoint 카드에서 최근 호출 이력, 응답 코드, 에러를 바로 확인 가능
- 공개 API와 webhook을 같이 쓰면 “외부가 티켓 생성”하고 “우리 쪽 상태 변경을 다시 외부가 수신”하는 양방향 흐름을 만들 수 있음

## 채팅 기능

### public 포털 기본 플로팅 버튼

public 포털은 기본적으로 플로팅 채팅 버튼을 자동 삽입할 수 있습니다.

- 관리자 경로: `/admin/settings/chat`
- 설정 항목: `플로팅 채팅 버튼 활성화`

`활성화`면 public 포털 공통 레이아웃에서 `/chat-sdk.js`를 자동 로드하고,
`비활성화`면 버튼이 표시되지 않습니다.

### 고객 채팅 경로

- 위젯 직접 접근: `/chat/widget`
- SDK 호스트 데모: `/chat/sdk-host`
- 설문: `/survey/[ticketId]`

### 관리자 채팅 경로

- 채팅 큐: `/admin/chats`
- 채팅 분석: `/admin/chats/analytics`
- 채팅 상세: `/admin/chats/[id]`

### 써드파티 웹 임베드

써드파티 사이트는 `chat-sdk.js`를 직접 넣어서 사용할 수 있습니다.

```html
<script
  src="https://your-public-domain/chat-sdk.js"
  data-suppo-chat-sdk="true"
></script>
```

특정 프로필을 쓰려면 `widgetKey`를 지정합니다.

```html
<script
  src="https://your-public-domain/chat-sdk.js"
  data-suppo-chat-sdk="true"
  data-widget-key="brand-a-widget"
></script>
```

`widgetKey` 프로필은 관리자 `채팅 설정` 메뉴에서 생성/관리합니다.

## 기술 스택

- Frontend: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Next.js Route Handlers, NextAuth.js v5, Prisma ORM
- Database: SQLite (로컬), LibSQL/sqld (운영)
- Infra: pnpm workspaces, Docker, Docker Compose, Nginx
- Integrations: Ollama, Gemini, SMTP/SES/Resend, S3, GitHub/GitLab, BoxyHQ SAML

## 모노레포 구조

```text
suppo/
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
pnpm --filter=@suppo/db generate
pnpm --filter=@suppo/db migrate:deploy
pnpm --filter=@suppo/db seed
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

## 운영 점검

운영 배포 전에는 아래 문서와 스크립트를 기준으로 점검합니다.

- 운영 점검 문서: `docs/plans/2026-04-11-operational-readiness-and-test-plan.md`
- 운영 ENV 검증:

```bash
pnpm ops:validate-env -- --env-file docker/env/.env.production
```

- 배포 직후 smoke test:

```bash
pnpm ops:smoke -- --env-file docker/env/.env.production
```

`docker/env/.env.production`이 로컬/스테이징용 HTTP URL이면 `--allow-http`를 함께 사용합니다.

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
INITIAL_ADMIN_EMAIL="admin@suppo.io"
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
INITIAL_ADMIN_EMAIL=admin@suppo.io
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
- 업무 규칙: `/admin/settings/operations`
- 채팅 설정: `/admin/settings/chat`
- 연동 설정: `/admin/settings/integrations`
- 영업시간: `/admin/settings/business-hours`
- 사용자 정의 필드: `/admin/settings/custom-fields`
- 시스템 설정: `/admin/settings/system`

## 데이터베이스

Prisma 스키마와 마이그레이션은 `packages/db/prisma/`에 있습니다.

주요 명령어:

```bash
pnpm --filter=@suppo/db generate
pnpm --filter=@suppo/db migrate:dev --name <name>
pnpm --filter=@suppo/db migrate:deploy
pnpm --filter=@suppo/db seed
pnpm --filter=@suppo/db studio
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
- public 플로팅 채팅 버튼 on/off
- public 채팅 위젯
- SDK 팝업 위젯
- admin 로그인
- admin 티켓 목록/상세
- admin 채팅 큐/분석
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
docker build -f docker/Dockerfile --target runner --build-arg APP_NAME=public -t suppo-public:latest .
docker build -f docker/Dockerfile --target runner --build-arg APP_NAME=admin -t suppo-admin:latest .
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
- `/admin/teams`
- `/admin/customers`
- `/admin/knowledge`
- `/admin/templates`
- `/admin/calendar`
- `/admin/audit-logs`
- `/admin/settings/*`
- `/api/admin/*`
- `/api/agents/*`
- `/api/comments`
- `/api/tickets/[id]/*`

## 참고 문서

- [AGENTS.md](/Users/pjw/dev/project/crinity-helpdesk/AGENTS.md)
- [CLAUDE.md](/Users/pjw/dev/project/crinity-helpdesk/CLAUDE.md)
- `docs/superpowers/plans/2026-03-22-monorepo-restructure.md`

## Paperclip E2E verification

- 2026-03-31: Paperclip wake 이벤트로 README 반영, commit, push까지 완료.

## 라이선스

MIT

Paperclip E2E code-path verified.
