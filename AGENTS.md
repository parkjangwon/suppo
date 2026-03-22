# AGENTS.md - Crinity Helpdesk System 유지보수 가이드

> **다음 유지보수 담당자를 위한 가이드**
>
> 이 문서는 Crinity 헬프데스크 시스템의 아키텍처, 핵심 로직, 주의사항, 문제 해결 방법을 정리합니다.

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [아키텍처 의사결정](#아키텍처-의사결정)
3. [핵심 로직 설명](#핵심-로직-설명)
4. [주의사항 & 함정](#주의사항--함정)
5. [문제 해결 가이드](#문제-해결-가이드)
6. [확장 가이드](#확장-가이드)
7. [보안 체크리스트](#보안-체크리스트)

---

## 🎯 프로젝트 개요

### 프로젝트 특성

- **LibSQL 기반 멀티 컨테이너 아키텍처**: Public/Admin 분리 + sqld 공유 DB
- **단일 제품 SaaS**: 단일 코드베이스 + 단일 Docker 이미지
- **5~15명 상담원** 규모 기준 설계
- **Next.js 풀스택 모놀리스**: 프론트엔드/백엔드 통합
- **실시간 기능 없음**: WebSocket 불필요, 폴링으로 충분

### 핵심 비즈니스 로직

1. **티켓 자동 할당**: 카테고리 전문성 + 로드밸런싱
2. **티켓 접근 제어**: 티켓번호+이메일 → Signed Cookie
3. **이메일 발송**: Outbox 패턴으로 안정성 확보

---

## 🏗 아키텍처 의사결정

### 1. Next.js 풀스택 모놀리스 선택 이유

**선택 이유:**

- 단일 코드베이스로 개발/배포 간소화
- API Routes + Server Actions으로 충분한 성능
- 작은 팀(1-3명) 유지보수에 적합

**대안 고려:**

- 마이크로서비스: 과도한 복잡성
- 분리된 BE/FE: 배포 복잡도 증가

**주의:**

- Server Components vs Client Components 구분 명확히
- API Routes는 외부 연동용, 내부는 Server Actions 사용

### 2. 데이터베이스 설계

**LibSQL + Prisma Driver Adapter 선택 이유:**

- Type-safe 쿼리
- 마이그레이션 관리 용이
- 멀티 클라이언트 동시 접근 지원 (Public/Admin 분리)
- LibSQL embedded 파일 모드로 로컬 dev 편의성 유지

**중요 테이블 관계:**

```
Ticket 1--N Comment
Ticket N--1 Agent (assignee)
Ticket N--1 Category
Agent N--N Category (expertise)
TenantBranding 1--1 Domain (고객사 브랜딩)
SAMLProvider 1--1 Domain (SAML 인증 설정)
```

**주의사항:**

- `onDelete` 동작 꼭 확인 (SetNull vs Cascade)
- 인덱스 추가 시 마이그레이션 파일 확인

### 3. 인증 아키텍처

**NextAuth.js v5 (Auth.js) 선택:**

- Credentials + OAuth + SAML 통합
- 세션 관리 자동화
- Prisma Adapter로 DB 연동

**중요:**

- `auth.ts`에서 session callback으로 role/agentId 추가
- Middleware에서 `/admin/*` 보호
- API Routes에서는 `auth()`로 세션 확인

### 4. SAML SSO 아키텍처

**BoxyHQ SAML Jackson 선택:**

- OAuth 2.0 to SAML Bridge 패턴
- NextAuth.js와 완벽한 통합
- SP-initiated 및 IdP-initiated 지원

**구성 요소:**

- `SAMLProvider` 테이블: IdP 설정 저장
- `/api/auth/saml/[domain]`: SP 메타데이터 엔드포인트
- `/admin/settings/saml`: 관리자 설정 UI

**중요:**

- 각 도메인별 별도의 SAMLProvider 레코드
- SP Entity ID: `{baseUrl}/api/auth/saml/{domain}`
- ACS URL: `{baseUrl}/api/auth/callback/boxyhq-saml`

---

## 🔧 핵심 로직 설명

### 1. 티켓 자동 할당 알고리즘

**파일:** `src/lib/assignment/pick-assignee.ts`

**알고리즘 순서:**

1. 카테고리 전문 상담원 필터링
2. 현재 로드 계산 (OPEN/IN_PROGRESS/WAITING 티켓 수)
3. 로드 비율 < 1.0인 상담원만 선택
4. 로드 비율 낮은 순 정렬
5. 동률 시 마지막 할당 시간 오래된 순

**수정 시 주의:**

- `TicketStatus` enum 값 변경 시 할당 로직도 검토
- 상담원 비활성화 시 `isActive` 확인
- 성능: 상담원 100명 이상 시 쿼리 최적화 필요

**테스트:** `tests/unit/assignment/pick-assignee.spec.ts`

### 2. 티켓 접근 제어 (Signed Cookie)

**파일:** `src/lib/security/ticket-access.ts`

**흐름:**

1. 고객이 티켓번호+이메일 입력
2. 검증 성공 시 JWT 발급 (24시간 유효)
3. HttpOnly Cookie로 저장
4. 이후 요청 시 JWT 검증

**주의사항:**

- `TICKET_ACCESS_SECRET`은 32바이트 이상
- 프로덕션에서는 반드시 Secure 플래그 활성화
- 토큰 탈취 대비 짧은 만료 시간 (24h)

### 3. 상담원 비밀번호 관리

**파일:**
- `src/app/api/agents/route.ts` — 상담원 생성 (임시 비밀번호 자동 발급)
- `src/app/api/agents/[id]/reset-password/route.ts` — 관리자 비밀번호 초기화
- `src/app/api/admin/change-password/route.ts` — 본인 비밀번호 변경
- `src/app/(admin)/admin/change-password/page.tsx` — 초기 비밀번호 변경 UI

**흐름:**
1. 관리자가 상담원 생성 → 10자 랜덤 임시 비밀번호 자동 생성 → 화면에 1회만 표시 (복사 가능)
2. 상담원이 임시 비밀번호로 로그인 → `isInitialPassword: true` → 미들웨어가 `/admin/change-password`로 리다이렉트
3. 현재 비밀번호(임시) + 새 비밀번호 입력 → DB 업데이트: `isInitialPassword: false`
4. 자동 `signOut` → 로그인 페이지 → 새 비밀번호로 로그인 → 대시보드

**관리자 비밀번호 초기화:** 상담원 목록 드롭다운 → "비밀번호 초기화" → 새 임시 비밀번호 발급 + 1회 표시

**주의사항:**
- `isInitialPassword: true`이면 미들웨어가 모든 `/admin/*` 접근을 change-password로 강제 리다이렉트
- change-password 페이지에는 "다른 계정으로 로그인" 탈출 링크가 있음 (세션 꼬임 대비)
- **임시 비밀번호 분실 시:** 관리자가 "비밀번호 초기화" 버튼으로 새 임시 비밀번호 재발급

### 4. 지식베이스 (Knowledge Base) 기능

**파일:**
- `src/lib/knowledge/search.ts` — RAG-lite 키워드 검색
- `src/app/api/knowledge/[articleId]/feedback/route.ts` — 사용자 피드백 (유용함/아님)
- `src/app/api/tickets/[id]/knowledge-links/route.ts` — 티켓-지식 연결 CRUD
- `src/app/api/tickets/[id]/suggest-response/route.ts` — AI 답변 제안 (지식베이스 주입)
- `src/app/api/admin/analytics/knowledge/route.ts` — 기여자 통계/ROI 분석

**활성화 설정:** `/admin/settings` → 브랜딩 → "지식베이스 사용" 토글 (`knowledgeEnabled` in `SystemBranding`)

**피드백 쿠키:** `kb-session` 쿠키로 비로그인 사용자 중복 피드백 방지

**관련 DB 모델:**
- `TicketKnowledgeLink` — 티켓↔지식 연결, `linkType`: `AI_SUGGESTION | AGENT_INSERT | MANUAL_LINK`
- `KnowledgeArticleFeedback` — 사용자 피드백 (쿠키 ID 기반 dedup)

### 5. 이메일 발송 (Outbox 패턴)

**파일:**

- `src/lib/email/enqueue.ts`
- `src/lib/email/process-outbox.ts`

**패턴 설명:**

1. 이메일 발송 필요 시 `EmailDelivery` 레코드 생성 (PENDING)
2. 별도 프로세스/크론이 PENDING 레코드 처리
3. 발송 성공 → SENT
4. 발송 실패 → 재시도 (최대 3회, 지수 백오프)

**장점:**

- 이메일 실패가 비즈니스 로직 블록하지 않음
- 재시도 로직 중앙화
- 발송 이력 추적 가능

**크론 설정:**

```bash
# 5분마다 실행
*/5 * * * * curl http://localhost:3000/api/internal/email-dispatch
```

### 4. 파일 저장 전략

**개발:** 로컬 파일시스템 (`uploads/`)
**프로덕션:** AWS S3

**파일:** `src/lib/storage/`

**주의:**

- 파일명에 UUID 추가 (중복 방지)
- MIME 타입 검증 (화이트리스트)
- 파일 크기 제한 (10MB)
- 티켓당 최대 20개

**마이그레이션:**
개발→프로덕션 파일 마이그레이션은 수동 또는 스크립트 필요

---

## ⚠️ 주의사항 & 함정

### 1. Prisma 관련

**주의:** `prisma generate` 필수

```bash
# schema.prisma 수정 후 반드시 실행
pnpm prisma migrate dev --name <설명>
pnpm prisma generate   # ← 이걸 빠뜨리면 런타임에서 "Cannot read properties of undefined" 발생
```

**함정:**

- `prisma.someNewModel.findMany` 에서 `Cannot read properties of undefined` → `prisma generate` 미실행
- 마이그레이션 충돌 → `migrate dev` vs `migrate deploy` 구분
- **마이그레이션 후 dev 서버 재시작 필요** (Turbopack이 새 Prisma Client를 캐시할 수 있음)

### 2. 환경 변수

**반드시 설정해야 하는 값:**

```bash
DATABASE_URL          # PostgreSQL 연결
AUTH_SECRET           # NextAuth (32바이트 이상)
TICKET_ACCESS_SECRET  # 티켓 접근 토큰
```

**함정:**

- `.env` 파일 누락 → 앱 실행 불가
- 프로덕션에 기본값 사용 → 보안 취약

### 3. 미들웨어 Edge Runtime 제약

**⚠️ 미들웨어(`src/middleware.ts`)는 Edge Runtime에서 실행됨 — Prisma Client 사용 불가**

```ts
// ❌ 절대 금지: 미들웨어에서 Prisma 쿼리
export default auth((request) => {
  const result = await prisma.agent.findUnique(...); // PrismaClientValidationError!
});

// ✅ 올바른 방법: JWT 토큰에 담긴 값만 사용
const user = request.auth?.user as { isInitialPassword?: boolean };
```

**영향 범위:**
- `src/middleware.ts` 자체
- `auth.ts`의 JWT callback — 미들웨어가 `auth()` 래퍼를 호출하므로, JWT callback 내부에서
  `shouldFetch`가 `true`가 되면 Prisma 쿼리가 Edge Runtime에서 실행됨

**현재 `shouldFetch` 조건 (`src/auth.ts`):**

```ts
const shouldFetch = !token.role || !token.agentId || (trigger === "update");
```

- `trigger === "update"` 는 API Route(Node.js)에서 `session.update()` 호출 시에만 발생 → 안전
- `!token.role || !token.agentId` 는 최초 로그인 직후에만 true → 실질적으로 미들웨어에서는 false
- **절대 `token.someField === someValue` 같은 조건을 추가하지 말 것** — 미들웨어에서 Prisma 실행됨

### 4. NextAuth JWT 스테일(Stale) 토큰

**현상:** DB의 값이 바뀌어도 JWT 쿠키가 갱신되지 않아 구 값이 유지됨

**예시:** 상담원 비밀번호 변경 후 `isInitialPassword: false`로 바뀌었지만 JWT에는 아직 `true`

**해결 방법:**
1. 변경 완료 후 반드시 `signOut()` 호출 → JWT 쿠키 삭제 → 재로그인 시 최신 DB 값으로 새 JWT 발급
2. 또는 `session.update()` 후 충분한 딜레이를 준 뒤 네비게이션 — 단, 타이밍 이슈 가능성 있음

**현재 구현:** 초기 비밀번호 변경 페이지(`/admin/change-password`)에서 `signOut({ callbackUrl: '/admin/login' })` 사용

### 5. Rate Limiting

**현재 구현:** 메모리 기반 (IP별)

**주의:**

- 서버 재시작 시 초기화됨
- 다중 서버 환경에서는 Redis 필요
- `/api/tickets` POST만 제한 (5분당 5회)

**확장:**

```typescript
// Redis 기반으로 변경 시
import { Redis } from "ioredis";
```

### 4. CAPTCHA

**개발 환경:** 테스트 모드 (Skip 가능)
**프로덕션:** 반드시 실제 키 설정

**함정:**

- `TURNSTILE_SECRET_KEY` 누락 → 모든 티켓 생성 실패
- 테스트 시 실제 CAPTCHA 통과 어려움 → 테스트 모드 필요

### 5. Git Integration

**GitHub 토큰 저장:**

- AES-256-GCM 암호화
- `GIT_TOKEN_ENCRYPTION_KEY` 필요 (32바이트)

**주의:**

- 토큰 유효기간 확인 (GitHub는 1년)
- CodeCommit은 이슈 트래커 미지원 (placeholder만 구현)

---

## 🐛 문제 해결 가이드

### 문제 1: 티켓 자동 할당 안 됨

**증상:** 새 티켓 생성 시 assigneeId가 null

**확인:**

```sql
-- 활성 상담원 확인
SELECT * FROM "Agent" WHERE "isActive" = true;

-- 카테고리 연결 확인
SELECT * FROM "AgentCategory";

-- 현재 로드 확인
SELECT "assigneeId", COUNT(*)
FROM "Ticket"
WHERE status IN ('OPEN', 'IN_PROGRESS', 'WAITING')
GROUP BY "assigneeId";
```

**해결:**

1. 상담원이 활성 상태인지 확인
2. 카테고리 전문성이 설정되어 있는지 확인
3. maxTickets 값 확인 (10으로 설정되어 있는지)

### 문제 2: 이메일 발송 안 됨

**증상:** 이메일이 발송되지 않음

**확인:**

```sql
-- EmailDelivery 테이블 확인
SELECT * FROM "EmailDelivery" ORDER BY "createdAt" DESC LIMIT 10;
```

**해결:**

1. SMTP/S3 설정 확인
2. `process-outbox.ts` 로그 확인
3. 수동 실행 테스트: `curl /api/internal/email-dispatch`

### 문제 3: 고객이 티켓 조회 못함

**증상:** "일치하는 티켓을 찾을 수 없습니다"

**확인:**

1. 티켓번호 정확한지 확인
2. 이메일 주소 정확한지 확인 (대소문자 구분)
3. 브라우저 쿠키 허용 확인

**디버깅:**

```typescript
// src/lib/security/ticket-access.ts
// JWT 검증 로그 추가
console.log("Token payload:", payload);
```

### 문제 4: 빌드 실패

**증상:** `pnpm build` 실패

**해결 순서:**

```bash
# 1. 의존성 재설치
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 2. Prisma 클라이언트 재생성
pnpm prisma generate

# 3. Lint 확인
pnpm lint

# 4. 타입 체크
pnpm tsc --noEmit

# 5. 다시 빌드
pnpm build
```

### 문제 5: SAML 로그인 실패

**증상:** SAML 인증 후 로그인되지 않음

**확인:**

```sql
-- SAML Provider 활성화 상태 확인
SELECT * FROM "SAMLProvider" WHERE domain = 'acme.com' AND "isActive" = true;

-- IdP 설정 확인
SELECT "idpEntityId", "idpSsoUrl", "idpCertificate" FROM "SAMLProvider" WHERE domain = 'acme.com';
```

**해결:**

1. SP Entity ID와 ACS URL이 IdP에 정확히 등록되었는지 확인
2. IdP 인증서가 유효한지 확인 (만료일 체크)
3. BoxyHQ 환경 변수 설정 확인:
   ```bash
   AUTH_BOXYHQ_SAML_ID=
   AUTH_BOXYHQ_SAML_SECRET=
   AUTH_BOXYHQ_SAML_ISSUER=
   ```
4. SP 메타데이터 다운로드: `/api/auth/saml/{domain}`
5. 브라우저 개발자 도구에서 SAML Response 확인

### 문제 6: 브랜딩 적용 안 됨

**증상:** 고객사별 커스텀 로고/색상이 표시되지 않음

**확인:**

```sql
-- 브랜딩 설정 확인
SELECT * FROM "TenantBranding" WHERE domain = 'acme.com' AND "isActive" = true;
```

**해결:**

1. 도메인이 정확히 일치하는지 확인 (대소문자 구분)
2. `isActive`가 true인지 확인
3. 이미지 URL이 유효한지 확인
4. 브라우저 캐시 새로고침 (Ctrl+F5)

---

## 📈 확장 가이드

### 1. 다국어 지원 (i18n)

**현재:** 한국어만 지원
**확장:** next-i18n 추가

**파일 수정:**

- `src/app/(public)/` 페이지들
- `src/components/` 컴포넌트들
- 이메일 템플릿

### 2. 실시간 알림

**현재:** 이메일만
**확장:** WebSocket 또는 SSE

**구현 위치:**

- 새 코멘트 시 실시간 알림
- 상담원 접속 중인 경우에만

### 3. 고급 검색

**현재:** 기본 필터링
**확장:** Full-text search (PostgreSQL tsvector 또는 Elasticsearch)

**구현 위치:**

- `src/lib/db/queries/admin-tickets.ts`

### 4. 모바일 앱

**방법 1:** PWA (Progressive Web App)

- `next-pwa` 패키지 추가
- manifest.json 설정

**방법 2:** React Native

- API Routes 활용
- 별도 RN 프로젝트 생성

### 5. AI 자동 응답

**구현 위치:**

- `src/lib/tickets/auto-response.ts`
- 티켓 생성 후 AI 분류 → 자동 응답 템플릿 선택

---

## 🔒 보안 체크리스트

### 배포 전 반드시 확인

- [ ] 모든 SECRET 키 변경 (개발용과 다르게)
- [ ] `AUTH_SECRET` 32바이트 이상
- [ ] `TICKET_ACCESS_SECRET` 32바이트 이상
- [ ] `GIT_TOKEN_ENCRYPTION_KEY` 32바이트
- [ ] HTTPS 활성화
- [ ] CAPTCHA 실제 키로 변경
- [ ] Rate Limiting 활성화
- [ ] 파일 업로드 MIME 타입 검증
- [ ] S3 버킷 퍼블릭 액세스 차단
- [ ] 데이터베이스 외부 접근 차단
- [ ] SAML 설정 필요 시 `AUTH_BOXYHQ_SAML_*` 환경 변수 설정

### 정기 점검

- [ ] 의존성 취약점 검사: `pnpm audit`
- [ ] Prisma 마이그레이션 최신 상태
- [ ] 이메일 발송 로그 확인
- [ ] 파일 저장 공간 확인
- [ ] 백업 테스트

---

## 📚 참고 자료

### 디자인 문서

- `docs/superpowers/specs/2026-03-13-ticket-system-design.md`
- `docs/plans/2026-03-13-ticket-system-implementation.md`

### 외부 문서

- [Next.js 15](https://nextjs.org/docs)
- [Prisma](https://www.prisma.io/docs)
- [Auth.js](https://authjs.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

---

## 🐳 Docker 배포 (운영 환경)

### 아키텍처

```
Internet
    │
    ▼
┌─────────────────────────────────┐
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

### 환경변수

| 변수 | 설명 | Public | Admin |
|------|------|--------|--------|
| `APP_TYPE` | 컨테이너 타입 | `public` | `admin` |
| `DATABASE_URL` | DB 연결 URL | `http://sqld:8889` | 동일 |
| `PUBLIC_URL` | Public 도메인 | `https://helpdesk.company.com` | 동일 |
| `ADMIN_URL` | Admin 도메인 | `https://admin.company.com` | 동일 |

### APP_TYPE별 허용 경로

| 경로 | Public | Admin |
|------|--------|--------|
| `/admin/*` | 차단 → ADMIN_URL 리다이렉트 | 허용 |
| `/knowledge/*` | 허용 | 차단 → PUBLIC_URL 리다이렉트 |
| `/tickets/*` | 허용 | 차단 → PUBLIC_URL 리다이렉트 |
| `/survey/*` | 허용 | 차단 → PUBLIC_URL 리다이렉트 |
| `/api/auth/*` | 허용 | 허용 |
| `/api/tickets/*` | 허용 | 차단 |
| `/api/knowledge/*` | 허용 | 차단 |
| `/api/webhooks/email` | 허용 | 차단 |
| `/api/webhooks/github` | 차단 | 허용 |
| `/api/admin/*` | 차단 | 허용 |

### 배포 절차

**최초 배포:**

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

**업데이트 배포:**

```bash
docker build --target runner  -t crinity-helpdesk:latest .
docker build --target migrator -t crinity-migrate:latest .

# 마이그레이션 (스키마 변경이 없으면 생략 가능)
docker run --rm --network <project>_default \
  -e DATABASE_URL=http://sqld:8889 crinity-migrate:latest

# sqld는 재시작하지 않음 (데이터 보존)
docker compose up -d --no-deps public admin nginx
```

**수평 확장 (Public만):**

```bash
docker compose up -d --scale public=3
```

### 기존 데이터 이전

SQLite → LibSQL 이전 시 백업/복구 기능 활용:
1. 기존 앱 실행 중 → `/admin/settings/system` → 백업 ZIP 다운로드
2. sqld 기동 + 새 앱 배포 후 → 같은 페이지에서 복구 ZIP 업로드

백업/복구는 Prisma JSON 방식이므로 DB 드라이버와 무관하게 동작.

### 주의사항

- sqld 포트 8889는 `expose`만 사용, `ports`로 외부 노출 금지
- uploads 볼륨은 Public/Admin 동일 볼륨 마운트 필수
- AUTH_SECRET은 Admin/Public 동일 값 사용 (세션 쿠키 공유)
- 다중 호스트 확장 시 uploads 볼륨 → NFS 또는 S3 전환 필요 (현재 스코프 외)

---

## 💡 개발 팁

### 코드 작성 시

1. **TDD 권장**: 테스트 먼저 작성
2. **타입 엄격**: `any` 사용 금지
3. **에러 처리**: 모든 API 엔드포인트 에러 핸들링
4. **로깅**: 중요 동작은 로그 남기기

### 디버깅 시

1. Prisma Studio: `pnpm prisma studio`
2. Next.js DevTools
3. Playwright Inspector: `pnpm test:e2e --ui`

### 성능 최적화

1. DB 쿼리: `EXPLAIN ANALYZE` 사용
2. 이미지: Next.js Image 컴포넌트 사용
3. 캐싱: React Cache 활용

---

## 📝 변경 이력

| 날짜       | 변경 내용                                                              | 담당자   |
| ---------- | ---------------------------------------------------------------------- | -------- |
| 2024-03-14 | 초기 버전 완성                                                         | AI Agent |
| 2026-03-21 | 지식베이스 기능 구현 (RAG-lite, 피드백, 티켓 연결, 기여자 분석)       | AI Agent |
| 2026-03-21 | 상담원 비밀번호 관리 구현 (임시 비밀번호 자동 발급, 관리자 초기화)    | AI Agent |
| 2026-03-21 | Edge Runtime 제약 및 JWT Stale 토큰 주의사항 추가                      | AI Agent |
| 2026-03-21 | Prisma generate 누락 시 런타임 오류 상세 설명 추가                     | AI Agent |
| 2026-03-21 | LibSQL 다중 컨테이너 아키텍처 전환 (SQLite → LibSQL, Public/Admin 분리) | AI Agent |

---

**문의:** 프로젝트 관리자에게 문의하세요.
