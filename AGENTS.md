# AGENTS.md - Crinity Ticket System 유지보수 가이드

> **다음 유지보수 담당자를 위한 가이드**
> 
> 이 문서는 Crinity 티켓 시스템의 아키텍처, 핵심 로직, 주의사항, 문제 해결 방법을 정리합니다.

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
- **단일 제품 SaaS**: 멀티테넌트 구조 불필요
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
- API Routes는 외부 연동용, 낶부는 Server Actions 사용

### 2. 데이터베이스 설계

**Prisma 선택 이유:**
- Type-safe 쿼리
- 마이그레이션 관리 용이
- 풍부한 관계 정의

**중요 테이블 관계:**
```
Ticket 1--N Comment
Ticket N--1 Agent (assignee)
Ticket N--1 Category
Agent N--N Category (expertise)
```

**주의사항:**
- `onDelete` 동작 꼭 확인 (SetNull vs Cascade)
- 인덱스 추가 시 마이그레이션 파일 확인

### 3. 인증 아키텍처

**NextAuth.js v5 (Auth.js) 선택:**
- Credentials + OAuth 통합
- 세션 관리 자동화
- Prisma Adapter로 DB 연동

**중요:**
- `auth.ts`에서 session callback으로 role/agentId 추가
- Middleware에서 `/admin/*` 보호
- API Routes에서는 `auth()`로 세션 확인

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

### 3. 이메일 발송 (Outbox 패턴)

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
pnpm prisma generate
```

**함정:** 
- `@prisma/client` import 시 타입 에러 → generate 미실행
- 마이그레이션 충돌 → `migrate dev` vs `migrate deploy` 구분

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

### 3. Rate Limiting

**현재 구현:** 메모리 기반 (IP별)

**주의:**
- 서버 재시작 시 초기화됨
- 다중 서버 환경에서는 Redis 필요
- `/api/tickets` POST만 제한 (5분당 5회)

**확장:**
```typescript
// Redis 기반으로 변경 시
import { Redis } from 'ioredis';
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
console.log('Token payload:', payload);
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

| 날짜 | 변경 내용 | 담당자 |
|------|----------|--------|
| 2024-03-14 | 초기 버전 완성 | AI Agent |

---

**문의:** 프로젝트 관리자에게 문의하세요.
