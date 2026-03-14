# Crinity Ticket System — Design Spec

## Context

Crinity는 SaaS 제품에 대한 기술지원 및 VOC(Voice of Customer) 처리를 위한 티켓 시스템이 필요하다. 고객이 웹 페이지에서 문의를 작성하면, 상담원(5~15명)에게 자동 할당되어 처리되는 구조이다. 단일 제품 대상이며, 별도의 멀티테넌트 구조는 불필요하다.

## Architecture

**Next.js 15 풀스택 모놀리스** — 고객 페이지와 백오피스를 하나의 Next.js 프로젝트에서 Route Group으로 분리하여 운영한다.

- **프론트엔드**: Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui
- **백엔드**: Next.js API Routes + Server Actions
- **DB**: PostgreSQL + Prisma ORM
- **인증**: NextAuth.js v5 (Credentials + Google + GitHub OAuth)
- **이메일**: Nodemailer + SMTP (개발) / AWS SES 또는 Resend (프로덕션)
- **파일 저장**: S3 (프로덕션) / 로컬 볼륨 (개발)
- **배포**: Docker + docker-compose, AWS 클라우드

## Data Model

### Entities

**Ticket**
- `id` (PK), `ticketNumber` (UQ, 자동생성), `customerName`, `customerEmail`, `customerPhone?`
- `subject`, `description`, `categoryId` (FK→Category), `priority` (URGENT/HIGH/MEDIUM/LOW)
- `status` (OPEN/IN_PROGRESS/WAITING/RESOLVED/CLOSED)
- `assigneeId` (FK→Agent, nullable), `createdAt`, `updatedAt`, `resolvedAt?`, `closedAt?`

**Agent**
- `id` (PK), `name`, `email` (UQ), `role` (ADMIN/AGENT), `isActive`
- `maxTickets` (최대 동시 처리 수), `avatarUrl?`, `authProvider`, `passwordHash?`
- `lastAssignedAt?` (마지막 할당 시각, 로드밸런싱 동률 해소용)

**Category**
- `id` (PK), `name`, `description?`, `sortOrder`

**AgentCategory** (Agent ↔ Category 다대다)
- `agentId` (FK→Agent), `categoryId` (FK→Category)
- 복합 PK: (`agentId`, `categoryId`)

**Comment**
- `id` (PK), `ticketId` (FK→Ticket), `authorType` (CUSTOMER/AGENT)
- `authorId?` (FK→Agent, agent인 경우), `authorName`, `authorEmail`
- `content`, `isInternal` (내부 메모 여부), `createdAt`

**Attachment**
- `id` (PK), `ticketId` (FK→Ticket), `commentId?` (FK→Comment)
- `fileName`, `fileUrl`, `fileSize`, `mimeType`, `uploadedBy`, `createdAt`
- 제약: 최대 파일 크기 10MB, 허용 MIME: 이미지(png/jpg/gif/webp), 문서(pdf/doc/docx/xls/xlsx), 텍스트(txt/csv/log), 압축(zip), 티켓당 최대 20개

**GitLink**
- `id` (PK), `ticketId` (FK→Ticket), `provider` (GITHUB/GITLAB/CODECOMMIT)
- `repoFullName`, `issueNumber`, `issueUrl`, `createdAt`

**TicketTransfer**
- `id` (PK), `ticketId` (FK→Ticket), `fromAgentId` (FK→Agent), `toAgentId` (FK→Agent)
- `reason?`, `createdAt`

**ResponseTemplate**
- `id` (PK), `title`, `content`, `categoryId?` (FK→Category)
- `createdById` (FK→Agent), `createdAt`, `updatedAt`

**TicketActivity** (감사 로그)
- `id` (PK), `ticketId` (FK→Ticket), `actorType` (SYSTEM/AGENT/CUSTOMER)
- `actorId?` (FK→Agent), `action` (CREATED/ASSIGNED/STATUS_CHANGED/TRANSFERRED/PRIORITY_CHANGED)
- `oldValue?`, `newValue?`, `createdAt`

## Security & Access Control

### Public Endpoints (고객 페이지)
- **Rate Limiting**: 티켓 생성 IP당 분당 5회, 조회 IP당 분당 20회
- **CAPTCHA**: 티켓 생성 폼에 hCaptcha 또는 Turnstile 적용
- **티켓번호 형식**: 추측 불가능하도록 `CRN-{nanoid(10)}` 형식 사용 (예: `CRN-V1StGXR8_Z`)
- **티켓 접근**: 티켓번호 + 이메일 일치 시에만 조회 가능 (비순차적 번호로 열거 공격 방지)

### Admin Endpoints (백오피스)
- 모든 API 요청에 NextAuth 세션 검증 필수

| Action | ADMIN | AGENT |
|---|---|---|
| 대시보드 조회 | O | O |
| 전체 티켓 목록 조회 | O | O (본인 할당만 기본, 전체 조회 가능) |
| 티켓 상태 변경 | O | O (본인 할당 티켓만) |
| 티켓 우선순위 변경 | O | O (본인 할당 티켓만) |
| 티켓 양도 | O | O |
| 응답/내부메모 작성 | O | O |
| 상담원 관리 (CRUD) | O | X |
| 시스템 설정 변경 | O | X |
| 응답 템플릿 관리 | O | O |

### Git Token Storage
- Git provider 토큰은 DB에 AES-256-GCM으로 암호화 저장
- 복호화 키는 환경 변수(`GIT_TOKEN_ENCRYPTION_KEY`)로 관리

### Email Failure Handling
- 이메일 발송 실패 시 최대 3회 재시도 (exponential backoff)
- 실패 로그 DB 기록, 관리자 대시보드에서 확인 가능
- 이메일 실패가 핵심 비즈니스 로직(티켓 생성 등)을 차단하지 않음

## Page Structure

### Customer Pages (`(public)` route group)

| Route | Purpose |
|---|---|
| `/` | 랜딩 — 티켓 작성 또는 조회 선택 |
| `/ticket/new` | 티켓 작성 폼 (이름, 이메일, 전화, 카테고리, 우선순위, 제목, 내용, 첨부파일) |
| `/ticket/submitted` | 제출 완료 — 티켓번호 안내 |
| `/ticket/lookup` | 티켓 조회 (티켓번호 + 이메일) |
| `/ticket/[number]` | 티켓 상세 — 상태, 대화 내역, 추가 메시지 작성, 파일 첨부 |

### Admin Pages (`(admin)` route group)

| Route | Purpose |
|---|---|
| `/admin/login` | 로그인 (이메일+비밀번호 / Google / GitHub OAuth) |
| `/admin/dashboard` | 대시보드 — 오늘 접수, 미할당, 평균 응답시간, 상담원별 현황 |
| `/admin/tickets` | 티켓 목록 — 필터(상태/카테고리/우선순위/담당자), 검색, 정렬 |
| `/admin/tickets/[id]` | 티켓 상세 관리 — 대화, 내부메모, 상태변경, 양도, Git연동, 템플릿 사용 |
| `/admin/templates` | 응답 템플릿 CRUD |
| `/admin/agents` | 상담원 관리 (admin 역할만) — 추가, 편집, 비활성화, 카테고리 전문성 설정 |
| `/admin/settings` | 시스템 설정 — 알림 이메일, 카테고리 관리, Git 연동 설정 (토큰/인증) |

## Core Features

### 1. Ticket Auto-Assignment (Load Balancing)

**Weighted Round-Robin + Category Affinity** 알고리즘:

1. **카테고리 매칭**: 해당 카테고리 전문 상담원이 있으면 우선 필터링
2. **가용성 체크**: 각 상담원의 (현재 처리중 / maxTickets) 비율 계산, 비율 < 1.0인 상담원만 후보
3. **가중 선택**: 비율이 가장 낮은 상담원에게 할당. 동률 시 마지막 할당 시간이 가장 오래된 상담원 우선
4. **Fallback**: 가용 상담원이 없으면 미할당 상태로 두고, 관리자에게 이메일 알림

### 2. Ticket Transfer

- 상담원이 백오피스 티켓 상세에서 "양도" 버튼 클릭
- 다른 활성 상담원 목록에서 선택 + 양도 사유 입력(선택)
- `TicketTransfer` 이력 자동 기록
- 양도받은 상담원에게 이메일 알림

### 3. Email Notifications

| Event | Recipient | Content |
|---|---|---|
| 티켓 접수 | 고객 + 설정된 알림 이메일 | 티켓번호, 제목, 조회 링크 |
| 상담원 할당 | 담당 상담원 | 티켓 정보, 고객 정보, 백오피스 링크 |
| 상담원 응답 | 고객 | 응답 내용, 티켓 조회 링크 |
| 고객 추가 메시지 | 담당 상담원 | 메시지 내용, 백오피스 링크 |
| 티켓 양도 | 새 담당 상담원 | 양도 사유, 티켓 정보 |
| 상태 변경 | 고객 | 새 상태, 조회 링크 |

### 4. Git Repository Integration

- **설정**: `/admin/settings`에서 Git provider별 토큰/인증 정보 등록
- **기존 이슈 연결**: 저장소 선택 → 이슈 번호 입력 또는 검색 → GitLink 생성
- **새 이슈 생성**: 저장소 선택 → 제목/내용 작성(티켓 정보 자동 채움) → API로 이슈 생성 → GitLink 생성
- **표시**: 티켓 상세에 연결된 이슈 목록, 상태(open/closed), 클릭 시 해당 Git 페이지로 이동
- **지원 provider**: GitHub REST API, GitLab REST API, AWS CodeCommit SDK

### 5. Customer Ticket Tracking

- 티켓 제출 시 고유 티켓번호 발급: `CRN-{nanoid(10)}` (DB unique constraint)
- `/ticket/lookup`에서 티켓번호 + 이메일로 조회
- `/ticket/[number]`에서 상태, 대화 내역 확인 및 추가 메시지 작성 가능
- 상태 변경/응답 시 이메일 알림

### 6. Internal Notes

- 상담원이 `isInternal: true`인 Comment를 작성
- 고객에게는 표시되지 않음 (고객 조회 시 필터링)
- 백오피스에서는 구분되는 스타일로 표시

### 7. Dashboard & Statistics

- 오늘/이번주/이번달 접수 건수
- 상태별 티켓 현황 (파이 차트)
- 미할당 티켓 수
- 평균 첫 응답 시간, 평균 해결 시간
- 상담원별 처리 현황 (바 차트)
- 카테고리별 접수 현황
- 기본 조회 범위: 최근 30일. 통계는 실시간 DB 쿼리 (현재 규모에서는 캐싱 불필요)

### 8. Agent Deactivation

- 상담원 비활성화 시 해당 상담원에게 할당된 미완료 티켓은 자동 재할당 알고리즘 실행
- 재할당 대상이 없으면 미할당 상태로 전환 + 관리자 알림

### 9. Pagination

- 티켓 목록: 커서 기반 페이지네이션, 기본 페이지 크기 20
- 댓글: 생성 시간순 전체 로드 (티켓당 댓글 수 일반적으로 적음)

### 10. Response Templates

- 상담원이 자주 사용하는 응답을 템플릿으로 저장
- 카테고리별 분류 가능
- 티켓 응답 작성 시 템플릿 선택하여 자동 채움

### Out of Scope (v1)

- Git webhook 기반 실시간 이슈 상태 동기화 (pull 방식으로 조회 시점에 상태 확인)
- 다국어(i18n) 지원
- 고객 만족도 조사
- GDPR/데이터 보존 정책 (추후 필요 시 추가)

## Directory Structure

```
crinity-ticket/
├── src/
│   ├── app/
│   │   ├── (public)/                # 고객용 라우트 그룹
│   │   │   ├── page.tsx             # 랜딩 페이지
│   │   │   ├── ticket/
│   │   │   │   ├── new/page.tsx
│   │   │   │   ├── submitted/page.tsx
│   │   │   │   ├── lookup/page.tsx
│   │   │   │   └── [number]/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (admin)/                 # 백오피스 라우트 그룹
│   │   │   ├── admin/
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── tickets/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── templates/page.tsx
│   │   │   │   ├── agents/page.tsx
│   │   │   │   └── settings/page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── tickets/
│   │   │   ├── comments/
│   │   │   ├── attachments/
│   │   │   ├── agents/
│   │   │   ├── git/
│   │   │   └── auth/[...nextauth]/
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── db/                      # Prisma client, queries
│   │   ├── email/                   # 이메일 발송 로직
│   │   ├── assignment/              # 로드밸런싱 알고리즘
│   │   ├── git/                     # Git provider 연동
│   │   └── auth/                    # NextAuth 설정
│   ├── components/
│   │   ├── ui/                      # 공통 UI (shadcn/ui)
│   │   ├── ticket/                  # 티켓 관련 컴포넌트
│   │   └── admin/                   # 백오피스 관련 컴포넌트
│   └── types/                       # TypeScript 타입 정의
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## Verification

1. **로컬 개발 환경**: `docker-compose up` → PostgreSQL + Next.js 개발 서버 실행
2. **고객 플로우**: 티켓 작성 → 이메일 수신 확인 → 티켓번호로 조회 → 대화 추가
3. **상담원 플로우**: 로그인 → 대시보드 확인 → 티켓 목록/상세 → 응답 작성 → 상태 변경
4. **할당 테스트**: 여러 티켓 연속 생성 시 상담원별 균등 분배 확인
5. **양도 테스트**: 티켓 양도 → 새 상담원에게 알림 → 이력 기록 확인
6. **Git 연동**: 설정에서 토큰 등록 → 티켓에 이슈 연결/생성 → 상태 표시 확인
