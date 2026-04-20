# Suppo 개선 로드맵 2026

**작성일**: 2026-03-29  
**대상 버전**: 50-Cycle Complete  
**목표**: 프로덕션 레디 + 경쟁사 대비 우위 확보

---

## 🎯 비전

**3개월 내 목표**:
- 기술 부채 해소 및 프로덕션 안정성 확보
- Zendesk/Freshdesk 대비 핵심 기능 격차 해소
- 운영 효율성 50% 향상

---

## 📊 개선 항목 요약

| Wave | 기간 | 주요 목표 | 핵심 결과물 |
|------|------|-----------|-------------|
| **Wave 1** | Week 1-2 | 안정성/보안 강화 | 프로덕션 안정화 |
| **Wave 2** | Week 3-4 | 성능 최적화 | 빠른 응답 시간 |
| **Wave 3** | Week 5-7 | 핵심 기능 추가 | 경쟁사 기능 격차 해소 |
| **Wave 4** | Week 8-10 | 운영 인프라 | 모니터링/자동화 |
| **Wave 5** | Week 11-12 | 고급 기능/ Polish | 고객 경험 향상 |

---

## 🌊 Wave 1: 안정성 & 보안 강화 (Week 1-2)

### 목표
프로덕션 배포 전 **반드시 해결해야 할** 기술 부채 및 보안 취약점 제거

### 개선 항목

#### 1.1 데이터베이스 인덱스 추가 (2일)
**우선순위**: 🔴 P0-Critical  
**담당**: Database Architect

```prisma
// 추가할 인덱스
model Ticket {
  @@index([status])
  @@index([priority])
  @@index([assigneeId])
  @@index([customerEmail])
  @@index([categoryId])
  @@index([createdAt])
  @@index([status, createdAt])
  @@index([assigneeId, status])
}

model Comment {
  @@index([ticketId, createdAt])
  @@index([agentId])
}

model KnowledgeArticle {
  @@index([categoryId])
  @@index([isPublished])
  @@index([viewCount])
}
```

**검증 기준**:
- [ ] EXPLAIN QUERY PLAN으로 Full Table Scan 제거 확인
- [ ] 주요 API 응답 시간 50% 이상 단축

---

#### 1.2 하드코딩된 관리자 비밀번호 제거 (0.5일)
**우선순위**: 🔴 P0-Critical  
**담당**: Backend Integrator

**작업 내용**:
```typescript
// auth.ts에서 제거
// - DEFAULT_ADMIN_PASSWORD 상수
// - authorizeFallbackAdmin 함수의 fallback 로직
// - 프로덕션 환경에서는 반드시 환경변수 사용
```

**검증 기준**:
- [ ] 소스코드에서 "admin1234" 검색 결과 0개
- [ ] 프로덕션 빌드 시 fallback admin 미생성

---

#### 1.3 환경변수 검증 스크립트 (1일)
**우선순위**: 🔴 P0-Critical  
**담당**: Backend Integrator

```typescript
// scripts/validate-env.ts
const requiredEnvVars = [
  'DATABASE_URL',
  'AUTH_SECRET',
  'TICKET_ACCESS_SECRET',
];

// 시작 시 검증
```

**검증 기준**:
- [ ] 누락된 환경변수 시 앱 시작 실패
- [ ] CI/CD 파이프라인에서 검증 실행

---

#### 1.4 Webhook 서명 검증 강화 (1.5일)
**우선순위**: 🟠 P1-High  
**담당**: Backend Integrator

```typescript
// apps/admin/src/app/api/webhooks/email/route.ts
// HMAC-SHA256 서명 검증 추가
```

**검증 기준**:
- [ ] Replay attack 방지 테스트 통과
- [ ] 잘못된 서명 시 401 반환

---

#### 1.5 에러 핸들링 표준화 (2일)
**우선순위**: 🟠 P1-High  
**담당**: Backend Integrator

**작업 내용**:
- 표준 에러 응답 포맷 정의
- 글로벌 에러 핸들러 미들웨어 구현
- API 라우트별 일관된 에러 처리

**검증 기준**:
- [ ] 모든 API 에러가 표준 포맷 반환
- [ ] 에러에 requestId 포함

---

### Wave 1 마일스톤
**완료 기준**: 프로덕션 배포 가능한 안정적인 상태

---

## 🌊 Wave 2: 성능 최적화 (Week 3-4)

### 목표
빠른 응답 시간과 확장 가능한 아키텍처 구축

### 개선 항목

#### 2.1 Redis 캐싱 레이어 도입 (3일)
**우선순위**: 🟠 P1-High  
**담당**: Backend Integrator

**적용 대상**:
- 카테고리 목록 (1시간 캐시)
- 지식베이스 인기 문서 (30분 캐시)
- 사용자 세션 (Redis Store)
- Rate Limiting (Redis 기반)

```typescript
// packages/shared/src/cache/redis.ts
// Upstash Redis 연결
```

**검증 기준**:
- [ ] DB 쿼리 수 50% 감소
- [ ] API 평균 응답 시간 < 200ms

---

#### 2.2 N+1 쿼리 제거 (2일)
**우선순위**: 🟠 P1-High  
**담당**: Database Architect + Backend Integrator

**대상 쿼리**:
- `getAdminTicketDetail` - include 최적화
- `getPortalTickets` - 관계 로딩 최적화
- `findRelatedArticles` - 쿼리 합치기

**검증 기준**:
- [ ] Prisma logging으로 N+1 발생 0개
- [ ] 복잡한 페이지 로드 시간 < 1초

---

#### 2.3 HTTP 캐싱 헤더 추가 (1일)
**우선순위**: 🟡 P2-Medium  
**담당**: Frontend Architect

**적용 대상**:
- Public API routes
- Static assets
- Knowledge base content

---

### Wave 2 마일스톤
**완료 기준**: Lighthouse Performance 점수 90+ (현재 예상 60-70)

---

## 🌊 Wave 3: 핵심 기능 추가 (Week 5-7)

### 목표
Zendesk/Freshdesk 대비 경쟁 우위 확보

### 개선 항목

#### 3.1 매크로/빠른 응답 기능 (5일)
**우선순위**: 🟠 P1-High  
**비즈니스 가치**: 상담원 생산성 30% 향상  
**담당**: Frontend Architect + Backend Integrator

**기능 명세**:
```typescript
// 매크로 모델
interface Macro {
  id: string;
  title: string;
  shortcut: string; // "/greeting" 등
  content: string;
  variables: string[]; // {{customer.name}}, {{ticket.number}} 등
  category: string;
  isPersonal: boolean; // 개인용 vs 팀 공유
}
```

**UI/UX**:
- 에디터에 `/` 단축키로 매크로 검색
- 변수 자동 치환
- 개인/공유 매크로 관리 페이지

**검증 기준**:
- [ ] 매크로 적용 시 응답 작성 시간 50% 단축
- [ ] 상담원 80% 이상 사용

---

#### 3.2 SLA 위반 실시간 알림 (4일)
**우선순위**: 🟠 P1-High  
**비즈니스 가치**: SLA 준수율 향상  
**담당**: Real-time Engineer + Backend Integrator

**기능 명세**:
```typescript
// SLA 규칙
interface SLARule {
  id: string;
  name: string;
  priority: Priority;
  firstResponseTime: number; // 분 단위
  resolutionTime: number;
  businessHours: BusinessHours;
}

// 위반 알림
interface SLABreachAlert {
  ticketId: string;
  ticketNumber: string;
  breachType: 'FIRST_RESPONSE' | 'RESOLUTION';
  threshold: number;
  actual: number;
  severity: 'WARNING' | 'BREACH';
}
```

**알림 채널**:
- 대시보드 실시간 알림 (SSE)
- 이메일 알림
- Slack Webhook (선택적)

**검증 기준**:
- [ ] SLA 위반 0건 누락 알림
- [ ] 알림 수신 후 평균 10분 내 조치

---

#### 3.3 티켓 병합 UI (3일)
**우선순위**: 🟡 P2-Medium  
**담당**: Frontend Architect

**기능 명세**:
- 중복 티켓 검색 및 선택
- 병합 시 댓글/첨부파일 통합
- 병합 히스토리 기록

---

#### 3.4 상담 시간 추적 (3일)
**우선순위**: 🟡 P2-Medium  
**담당**: Backend Integrator + Frontend Architect

**기능 명세**:
```typescript
interface TimeEntry {
  id: string;
  ticketId: string;
  agentId: string;
  duration: number; // 분 단위
  type: 'WORK' | 'REVIEW' | 'WAITING';
  description?: string;
  startedAt: Date;
  endedAt: Date;
}
```

**검증 기준**:
- [ ] 90% 이상의 티켓에 시간 기록
- [ ] 상담원별 생산성 리포트 생성 가능

---

### Wave 3 마일스톤
**완료 기준**: 경쟁사 대비 핵심 기능 격차 해소

---

## 🌊 Wave 4: 운영 인프라 (Week 8-10)

### 목표
프로덕션 운영을 위한 모니터링, 로깅, 자동화 인프라 구축

### 개선 항목

#### 4.1 Sentry 에러 트래킹 도입 (2일)
**우선순위**: 🟠 P1-High  
**담당**: Backend Integrator

**작업 내용**:
- Sentry SDK 설치
- 글로벌 에러 핸들러 연결
- Performance monitoring 설정

**검증 기준**:
- [ ] 프로덕션 에러 100% 수집
- [ ] 에러 알림 Slack 연동

---

#### 4.2 Health Check & Readiness Probe (1일)
**우선순위**: 🟠 P1-High  
**담당**: Backend Integrator

```typescript
// /api/health/route.ts
{
  status: "healthy",
  timestamp: "2026-03-29T10:00:00Z",
  checks: {
    database: "connected",
    redis: "connected",
    disk: "ok"
  }
}
```

---

#### 4.3 구조화된 로깅 (2일)
**우선순위**: 🟡 P2-Medium  
**담당**: Backend Integrator

**작업 내용**:
- Pino 로거 도입
- 요청 ID 추적 (X-Request-ID)
- 중요 비즈니스 이벤트 로깅

---

#### 4.4 Redis 기반 Rate Limiting (2일)
**우선순위**: 🟡 P2-Medium  
**담당**: Backend Integrator

**작업 내용**:
- 기존 in-memory rate limiter를 Redis 기반으로 교체
- 멀티 서버 환경 지원

---

### Wave 4 마일스톤
**완료 기준**: 24/7 모니터링 및 alerting 가능

---

## 🌊 Wave 5: 고급 기능 & Polish (Week 11-12)

### 목표
차별화된 사용자 경험 제공

### 개선 항목

#### 5.1 다크 모드 지원 (3일)
**우선순위**: 🟡 P2-Medium  
**담당**: Frontend Architect

**작업 내용**:
- Tailwind dark mode 설정
- 테마 전환 UI
- 사용자 설정 저장

---

#### 5.2 접근성(a11y) 개선 (4일)
**우선순위**: 🟡 P2-Medium  
**담당**: Frontend Architect

**작업 내용**:
- axe-core 테스트 도입
- 키보드 네비게이션 개선
- 스크린 리더 최적화
- WCAG 2.1 AA 준수

**검증 기준**:
- [ ] Lighthouse Accessibility 점수 95+
- [ ] 키보드만으로 모든 작업 가능

---

#### 5.3 모바일 반응형 개선 (3일)
**우선순위**: 🟡 P2-Medium  
**담당**: Frontend Architect

**작업 내용**:
- Admin 패널 모바일 최적화
- 터치 친화적 UI 개선
- PWA 지원 강화

---

### Wave 5 마일스톤
**완료 기준**: WCAG 2.1 AA 준수 + 모바일 완벽 지원

---

## 📅 종합 일정

```
Week 1-2  [Wave 1] 안정성/보안
          ├─ DB 인덱스
          ├─ 보안 취약점 제거
          └─ 환경변수 검증

Week 3-4  [Wave 2] 성능 최적화
          ├─ Redis 캐싱
          ├─ N+1 쿼리 제거
          └─ HTTP 캐싱

Week 5-7  [Wave 3] 핵심 기능
          ├─ 매크로 기능
          ├─ SLA 알림
          ├─ 티켓 병합 UI
          └─ 시간 추적

Week 8-10 [Wave 4] 운영 인프라
          ├─ Sentry 연동
          ├─ Health Check
          └─ 구조화된 로깅

Week 11-12 [Wave 5] 고급 기능
           ├─ 다크 모드
           ├─ 접근성 개선
           └─ 모바일 최적화
```

---

## 🎯 성공 지표 (KPI)

| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|----------|
| API 평균 응답 시간 | 500ms+ | <200ms | APM |
| DB 쿼리 시간 | 100ms+ | <50ms | Prisma Logging |
| 상담원 생산성 | - | +30% | 시간 추적 데이터 |
| SLA 준수율 | - | 95%+ | SLA 리포트 |
| Lighthouse Score | ~60 | 90+ | Lighthouse CI |
| 에러율 | - | <0.1% | Sentry |

---

## ✅ Wave별 완료 체크리스트

### Wave 1 완료 기준
- [ ] 모든 DB 인덱스 적용 및 검증
- [ ] 보안 취약점 0개
- [ ] 프로덕션 배포 가능

### Wave 2 완료 기준
- [ ] 캐시 적중률 80%+
- [ ] API 응답 시간 <200ms

### Wave 3 완료 기준
- [ ] 매크로 기능 상용화
- [ ] SLA 알림 정상 작동
- [ ] 경쟁사 기능 격차 해소

### Wave 4 완료 기준
- [ ] 24/7 모니터링
- [ ] 에러 알림 실시간
- [ ] 로그 검색 가능

### Wave 5 완료 기준
- [ ] WCAG 2.1 AA 준수
- [ ] 모바일 완벽 지원
- [ ] 다크 모드 지원

---

## 🚀 다음 단계

1. **Wave 1 시작**: DB 인덱스 추가부터 시작
2. **병렬 팀 구성**: Harness 에이전트 팀 투입
3. **주간 리뷰**: 매주 금요일 진행 상황 검토

**시작하시겠습니까?**