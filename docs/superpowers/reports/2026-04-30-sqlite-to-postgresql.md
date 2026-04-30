# SQLite → PostgreSQL 마이그레이션 완료 보고서

**작업일:** 2026-04-30  
**브랜치:** master  
**프로젝트:** suppo (Next.js monorepo, `/Users/pjw/dev/project/suppo`)  
**상태:** ✅ 완료 (UI 수동 확인 제외)

---

## 작업 배경

Suppo는 기존에 SQLite/libSQL(Turso) 스택을 사용하고 있었다. 규모 확장 대비 및 코드 단순화를 위해 개발·운영 환경 모두 PostgreSQL 17로 전환하기로 결정했다.

---

## 변경 커밋 목록

| 커밋 | 내용 |
|------|------|
| `08ff130` | 로컬 개발용 PostgreSQL compose 추가, .env.example 업데이트 |
| `3d13f4f` | Prisma 스키마 postgresql 전환, tags→String[], workDdays→Int[] |
| `0e7d5c1` | libSQL 완전 제거, db client/raw 단순화 |
| `3c104c1` | 앱 코드 JSON string 우회 패턴 제거 (tags, workDays) |
| `fd301d5` | 분석 raw SQL SQLite → PostgreSQL 문법 전환 |
| `f65d383` | customer-insights.ts EPOCH 연산 괄호 버그 수정 |
| `f749d62` | 운영 Docker sqld → postgres 교체 |
| `6584960` | Prisma v6 .env 로딩 픽스, 구 SQLite 테스트 제거 |

---

## 주요 변경 내용

### 1. 로컬 개발 환경
- **신규 파일:** `docker-compose.dev.yml` — postgres:17-alpine, 포트 5432, `pgdata` named volume
- **`.env`:** `DATABASE_URL=postgresql://suppo:suppo_dev@localhost:5432/suppo` (DATABASE_AUTH_TOKEN 제거)

### 2. Prisma 스키마 (`packages/db/prisma/schema.prisma`)
- `provider`: `"sqlite"` → `"postgresql"`
- `Ticket.tags`: `String? @default("[]")` → `String[] @default([])`
- `BusinessCalendar.workDays`: `String? @default("[1,2,3,4,5]")` → `Int[] @default([1,2,3,4,5])`
- 기존 마이그레이션 전체 삭제 후 PostgreSQL 초기 마이그레이션 재생성 (`20260430022502_initial_postgresql`)

### 3. packages/db 라이브러리 (`packages/db/src/`)
**삭제된 파일:**
- `src/resolve-database-url.ts` — libSQL HTTP URL 감지 로직 (불필요)
- `prisma/migrate.ts` — libSQL 전용 마이그레이션 러너

**재작성된 파일:**
- `src/client.ts`: libSQL 어댑터 완전 제거 → 표준 PrismaClient 싱글턴
- `src/raw.ts`: libSQL 클라이언트 제거 → `prisma.$queryRawUnsafe` 래퍼

**package.json:** `@libsql/client`, `@prisma/adapter-libsql` 의존성 제거

### 4. 앱 코드 JSON 우회 패턴 제거

PostgreSQL 네이티브 배열 타입 도입으로 아래 파일의 `JSON.parse` / `JSON.stringify` 제거:

| 파일 | 변경 내용 |
|------|----------|
| `apps/admin/src/lib/llm/service.ts` | `formatTags(string\|null)` → `formatTags(string[]\|null)` |
| `apps/admin/src/lib/system/seed-functions.ts` | tags/workDays 배열 직접 전달 |
| `apps/admin/src/app/api/admin/settings/business-hours/route.ts` | workDays JSON 직렬화 제거 |
| `apps/admin/src/lib/sla/engine.ts` | workDays JSON.parse 제거 |
| `apps/public/src/app/api/tickets/route.ts` | tags JSON.stringify 제거 |
| `apps/admin/src/app/api/tickets/search/route.ts` | `contains` → `has` (PG 배열 연산자) |
| `apps/admin/src/lib/db/queries/admin-analytics/filters.ts` | `formatDateForSQLite` → `formatDateForSQL` |

### 5. Raw SQL 분석 쿼리 (5개 파일)

**변환 규칙 적용:**

| SQLite | PostgreSQL |
|--------|------------|
| `julianday(a) - julianday(b)) * 1440` | `EXTRACT(EPOCH FROM (a - b)) / 60` |
| `julianday(a) - julianday(b)) * 24` | `EXTRACT(EPOCH FROM (a - b)) / 3600` |
| `strftime('%Y-%m-%d', col)` | `TO_CHAR(col, 'YYYY-MM-DD')` |
| `strftime('%Y-%m', col)` | `TO_CHAR(col, 'YYYY-MM')` |
| `strftime('%Y-W%W', col)` | `TO_CHAR(col, 'IYYY-"W"IW')` |
| `IN (?,?,?)` 동적 생성 | `= ANY($1::text[])` 단일 배열 파라미터 |
| `?` 플레이스홀더 | `$1, $2, $3...` positional params |
| 테이블/컬럼 무인용 | `"Ticket"`, `"assigneeId"` 등 쌍따옴표 인용 |

**수정된 파일:** `agents.ts`, `csat.ts`, `customer-insights.ts`, `repeat-inquiries.ts`, `vip-customers.ts`

**발견된 버그 (수정 완료):** `customer-insights.ts` — 해상도 시간 EPOCH 연산에서 `/3600` 위치가 `EXTRACT()` 내부에 잘못 들어간 괄호 오류 → 별도 커밋으로 수정

### 6. 운영 Docker (`docker/`)

**`docker/docker-compose.yml`:**
- `sqld` 서비스 제거 → `postgres:17-alpine` 서비스로 교체
- healthcheck 추가: `pg_isready -U suppo -d suppo` (interval 5s, retries 10)
- `migrate` depends_on: `sqld` → `postgres: condition: service_healthy`
- 모든 서비스(migrate, bootstrap, public, admin)의 `DATABASE_URL` → `postgresql://suppo:${POSTGRES_PASSWORD}@postgres:5432/suppo`
- `DATABASE_AUTH_TOKEN` 참조 전체 제거

**`docker/Dockerfile`:**
- migrator CMD: `tsx prisma/migrate.ts` → `prisma migrate deploy --schema=./prisma/schema.prisma`
- builder `ARG DATABASE_URL` 기본값: `file:...` → `postgresql://localhost:5432/suppo`

**`docker/.env.example`:**
- `DATABASE_AUTH_TOKEN` 섹션 제거
- `POSTGRES_PASSWORD=change-me-in-production` 추가

### 7. 검증 결과

- TypeScript: 에러 없음
- 테스트: 65개 파일 / 200개 테스트 — 전체 통과
- `prisma migrate deploy`: 성공
- `bootstrap`: 성공 (관리자 계정, 카테고리, SLA 정책 시딩 완료)

**부가 픽스:** Prisma v6 WASM 스키마 검증이 CLI 실행 전 `DATABASE_URL`을 요구하는 문제로 `packages/db/package.json` 스크립트에 `set -a && . ../../.env && set +a` 추가

---

## 미완료 항목 (수동 확인 필요)

브라우저 UI 동작 확인은 코드로 검증 불가하여 남겨뒀다. `pnpm dev` 실행 후 아래 경로 확인 권장:

- `/admin/tickets` — 티켓 목록 로드
- `/admin/tickets` 검색 — 태그 필터 동작 (배열 타입 `has` 연산자)
- `/admin/analytics` — 분석 대시보드 (raw SQL 5개 쿼리 모두)
- `/admin/settings/business-hours` — 업무 요일 저장/로드 (Int[] 타입)

---

## 사후 작업 권고

### 단기 (다음 배포 전)

1. **운영 환경 변수 설정 확인**
   - `docker/.env`에 `POSTGRES_PASSWORD` 강력한 값으로 설정 필요 (현재 예시값 `change-me-in-production`)
   - 기존 배포에서 `DATABASE_AUTH_TOKEN` 환경변수 참조가 남아있다면 제거

2. **데이터 마이그레이션 (기존 데이터가 있는 경우)**
   - 현재 작업은 스키마만 전환했으며, 기존 SQLite 데이터의 PostgreSQL 이전은 포함되지 않았다
   - 운영 데이터가 있다면 별도 마이그레이션 스크립트 작성 필요
   - `tags`, `workDays` 필드는 JSON string → 배열 변환 로직이 필요함

3. **UI 수동 검증**
   - 위 미완료 항목 참고

### 중기

4. **PostgreSQL 성능 튜닝**
   - `Ticket` 테이블 인덱스 검토: `assigneeId`, `customerId`, `createdAt`, `status` 컬럼 조회가 많음
   - `tags` 컬럼 배열 검색(`has`) 빈도가 높다면 GIN 인덱스 추가 고려
   - 분석 쿼리(`/admin/analytics`)는 날짜 범위 풀스캔이 발생할 수 있으므로 `createdAt` 인덱스 확인

5. **Connection Pooling**
   - 현재는 `PrismaClient` 직접 연결 방식
   - 트래픽이 늘어나면 PgBouncer 또는 Prisma Accelerate 도입 검토

6. **백업 정책 수립**
   - SQLite는 파일 복사로 백업이 간단했으나, PostgreSQL은 `pg_dump` 기반 정기 백업 스크립트 필요
   - Docker volume 백업 전략도 함께 수립 권장

### 장기

7. **Prisma Migrate 운영 전략**
   - 현재 `migrate deploy`는 컨테이너 기동 시 자동 실행
   - 스키마 변경이 잦아지면 무중단 마이그레이션 전략(락 최소화, 컬럼 추가 우선) 수립 필요

8. **모니터링**
   - slow query 모니터링 추가 권장 (`log_min_duration_statement` 설정 또는 pg_stat_statements 확장)
