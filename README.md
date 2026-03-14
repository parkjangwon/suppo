# Crinity Ticket System

**Crinity 티켓 시스템**은 SaaS 제품에 대한 기술지원 및 VOC(Voice of Customer) 처리를 위한 종합 티켓 관리 솔루션입니다. 고객이 웹 페이지에서 문의를 작성하면 상담원에게 자동 할당되어 효율적으로 처리되는 구조입니다.

## 📋 목차

- [프로젝트 개요](#프로젝트-개요)
- [기술 스택](#기술-스택)
- [아키텍처](#아키텍처)
- [주요 기능](#주요-기능)
- [프로젝트 구조](#프로젝트-구조)
- [시작하기](#시작하기)
- [환경 변수](#환경-변수)
- [데이터베이스](#데이터베이스)
- [API 문서](#api-문서)
- [테스트](#테스트)
- [배포](#배포)
- [트러블슈팅](#트러블슈팅)

## 🎯 프로젝트 개요

### 핵심 가치
- **고객 중심**: 고객이 쉽게 문의하고 추적할 수 있는 직관적인 인터페이스
- **효율적 운영**: 자동 할당과 로드밸런싱으로 상담원 업무 분배
- **보안**: 티켓번호+이메일 기반 접근 제어, CAPTCHA, Rate Limiting
- **확장성**: Git 연동, 이메일 알림, 첨부파일 지원

### 사용자 유형
1. **고객 (Customer)**
   - 티켓 작성 및 첨부파일 업로드
   - 티켓 번호 + 이메일로 조회
   - 대화 스레드 확인 및 추가 메시지 작성

2. **상담원 (Agent)**
   - 할당된 티켓 처리
   - 낶부 메모 작성
   - 티켓 양도 및 상태 변경

3. **관리자 (Admin)**
   - 모든 티켓 관리
   - 상담원 CRUD
   - 시스템 설정 및 템플릿 관리

## 🛠 기술 스택

### 프론트엔드
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** (Radix UI 기반)

### 백엔드
- **Next.js API Routes**
- **Server Actions**
- **NextAuth.js v5** (Auth.js)
- **Prisma ORM**
- **PostgreSQL 16**

### 인프라 & 도구
- **Docker & Docker Compose**
- **pnpm** (패키지 매니저)
- **Vitest** (단위/통합 테스트)
- **Playwright** (E2E 테스트)
- **ESLint** (코드 품질)

### 외부 서비스
- **Cloudflare Turnstile** (CAPTCHA)
- **AWS S3** (파일 저장 - 프로덕션)
- **SMTP/Resend/SES** (이메일 발송)
- **GitHub/GitLab API** (이슈 연동)

## 🏗 아키텍처

### 시스템 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                        클라이언트                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   고객용     │  │   관리자용   │  │     API          │  │
│  │  (Public)    │  │   (Admin)    │  │   Routes         │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │    Next.js 15       │
              │  (Full-stack)       │
              └──────────┬──────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│  PostgreSQL  │ │    S3       │ │  External   │
│   (Prisma)   │ │  (Storage)  │ │   APIs      │
└──────────────┘ └─────────────┘ └─────────────┘
```

### 데이터 흐름

1. **티켓 생성**: 고객 → CAPTCHA 검증 → Rate Limit 확인 → 티켓 생성 → 자동 할당 → 이메일 알림
2. **티켓 조회**: 고객 → 티켓번호+이메일 검증 → Signed Cookie 발급 → 스레드 조회
3. **티켓 처리**: 상담원 → 인증 → 권한 확인 → 상태 변경/응답 → 활동 로그 기록

### 디렉토리 구조

```
crinity-ticket/
├── prisma/
│   ├── schema.prisma          # 데이터베이스 스키마
│   └── seed.ts                # 시드 데이터
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (public)/          # 고객용 라우트 그룹
│   │   │   ├── page.tsx       # 랜딩
│   │   │   └── ticket/        # 티켓 관련 페이지
│   │   ├── (admin)/           # 관리자용 라우트 그룹
│   │   │   └── admin/         # 관리자 페이지
│   │   └── api/               # API 엔드포인트
│   ├── components/            # React 컴포넌트
│   │   ├── ui/                # shadcn/ui 컴포넌트
│   │   ├── app/               # 앱 쉘 컴포넌트
│   │   ├── ticket/            # 티켓 관련 컴포넌트
│   │   └── admin/             # 관리자 컴포넌트
│   ├── lib/                   # 유틸리티 및 비즈니스 로직
│   │   ├── db/                # Prisma 클라이언트 및 쿼리
│   │   ├── auth/              # 인증 설정 및 가드
│   │   ├── tickets/           # 티켓 서비스
│   │   ├── assignment/        # 할당 알고리즘
│   │   ├── security/          # 보안 (CAPTCHA, Rate Limit)
│   │   ├── storage/           # 파일 저장
│   │   ├── email/             # 이메일 발송
│   │   ├── git/               # Git 연동
│   │   └── validation/        # Zod 스키마
│   └── types/                 # TypeScript 타입
├── tests/
│   ├── e2e/                   # Playwright E2E 테스트
│   ├── integration/           # 통합 테스트
│   └── unit/                  # 단위 테스트
├── docker-compose.yml         # Docker Compose 설정
├── Dockerfile                 # 프로덕션 이미지
└── .env.example               # 환경 변수 예시
```

## ✨ 주요 기능

### 1. 고객용 기능

| 기능 | 설명 |
|------|------|
| 티켓 작성 | 이름, 이메일, 전화, 카테고리, 우선순위, 제목, 내용, 첨부파일 |
| CAPTCHA | Cloudflare Turnstile로 봇 방지 |
| Rate Limiting | IP당 분당 5회 제한 |
| 첨부파일 | 최대 10MB, 20개, 이미지/문서/압축파일 지원 |
| 티켓 조회 | 티켓번호 + 이메일 인증, Signed Cookie 발급 |
| 대화 스레드 | 상태 및 대화 내역 확인, 추가 메시지 작성 |

### 2. 관리자용 기능

| 기능 | 설명 |
|------|------|
| 대시보드 | 오늘/주/월 통계, 상태별 현황, 상담원별 처리 현황 |
| 티켓 목록 | 필터(상태/카테고리/우선순위/담당자), 검색, 정렬 |
| 티켓 상세 | 상태/우선순위/담당자 변경, 코멘트, 낶부 메모 |
| 자동 할당 | 카테고리 전문성 + 로드밸런싱 알고리즘 |
| 티켓 양도 | 다른 상담원으로 양도, 사유 기록 |
| 상담원 관리 | CRUD, 비활성화 시 자동 재할당 |
| 응답 템플릿 | 자주 사용하는 응답 템플릿 관리 |
| Git 연동 | GitHub/GitLab 이슈 연결/생성 |

### 3. 시스템 기능

| 기능 | 설명 |
|------|------|
| 이메일 알림 | 티켓 접수/할당/응답/상태변경 시 알림 |
| Outbox 패턴 | 이메일 발송 실패 시 재시도 (최대 3회) |
| 활동 로그 | 모든 상태 변경 및 할당 이력 기록 |
| 파일 저장 | 개발: 로컬, 프로덕션: AWS S3 |
| 보안 | 티켓 접근 토큰, 민감 데이터 암호화 |

## 🚀 시작하기

### 사전 요구사항

- **Node.js** 20.x 이상
- **pnpm** 10.x 이상
- **Docker** (선택사항)
- **PostgreSQL** 16 (로컬 설치 시)

### 로컬 개발 환경 설정

#### 방법 1: Docker Compose (권장)

```bash
# 1. 저장소 클론
git clone <repository-url>
cd crinity-ticket

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 필요한 값 설정

# 3. Docker Compose 실행
docker compose up --build

# 4. 브라우저 접속
open http://localhost:3000
```

Docker Compose는 다음 서비스를 실행합니다:
- PostgreSQL 16 (포트 5432)
- Next.js 앱 (포트 3000)

#### 방법 2: 로컬 개발 서버

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일 편집 (DATABASE_URL 설정 필수)

# 3. Prisma 클라이언트 생성
pnpm prisma generate

# 4. 데이터베이스 마이그레이션
pnpm prisma migrate dev

# 5. 시드 데이터 삽입
pnpm prisma db seed

# 6. 개발 서버 실행
pnpm dev

# 7. 브라우저 접속
open http://localhost:3000
```

### 초기 계정 정보

시드 실행 후 기본 계정:

- **관리자**: admin@crinity.io / admin123
- **테스트 상담원**: agent1@crinity.io ~ agent3@crinity.io / password123

## 🔐 환경 변수

### 필수 설정

```bash
# Database (필수)
DATABASE_URL="postgresql://user:password@localhost:5432/crinity"

# Auth (필수)
AUTH_SECRET="your-secret-key-min-32-characters-long"

# Ticket Access (필수)
TICKET_ACCESS_SECRET="another-secret-key-for-ticket-access"
```

### 선택 설정

```bash
# OAuth (선택)
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
AUTH_GITHUB_ID="your-github-client-id"
AUTH_GITHUB_SECRET="your-github-client-secret"

# Email (선택)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="user@example.com"
SMTP_PASS="password"

# Storage (프로덕션)
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="ap-northeast-2"
AWS_S3_BUCKET_NAME="crinity-uploads"

# CAPTCHA (프로덕션 권장)
TURNSTILE_SECRET_KEY="your-turnstile-secret"

# Git Integration (선택)
GIT_TOKEN_ENCRYPTION_KEY="32-byte-encryption-key"
```

## 🗄 데이터베이스

### 스키마 개요

**핵심 엔티티:**
- `Ticket`: 티켓 정보
- `Agent`: 상담원 정보
- `Category`: 티켓 카테고리
- `Comment`: 코멘트/댓글
- `Attachment`: 첨부파일
- `TicketActivity`: 활동 로그
- `TicketTransfer`: 양도 이력
- `ResponseTemplate`: 응답 템플릿
- `GitLink`: Git 이슈 연결
- `EmailDelivery`: 이메일 발송 큐

### Prisma 명령어

```bash
# 마이그레이션 생성
pnpm prisma migrate dev --name <migration-name>

# 프로덕션 마이그레이션
pnpm prisma migrate deploy

# Prisma 클라이언트 생성
pnpm prisma generate

# 데이터베이스 시드
pnpm prisma db seed

# Prisma Studio 실행
pnpm prisma studio
```

## 📡 API 문서

### 주요 엔드포인트

#### 퍼블릭 API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/tickets` | 티켓 생성 |
| POST | `/api/tickets/lookup` | 티켓 조회 |
| GET | `/api/tickets/[id]` | 티켓 상세 |
| POST | `/api/comments/public` | 고객 코멘트 작성 |

#### 어드민 API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/tickets` | 티켓 목록 |
| PATCH | `/api/tickets/[id]` | 티켓 수정 |
| POST | `/api/comments` | 코멘트 작성 |
| GET/POST | `/api/agents` | 상담원 목록/생성 |
| GET | `/api/git/issues/search` | Git 이슈 검색 |
| POST | `/api/git/links` | Git 이슈 연결 |

## 🧪 테스트

### 테스트 구조

```
tests/
├── e2e/                    # E2E 테스트 (Playwright)
│   ├── public-home.spec.ts
│   ├── public-ticket-create.spec.ts
│   ├── public-ticket-thread.spec.ts
│   ├── admin-login.spec.ts
│   ├── admin-ticket-workflow.spec.ts
│   └── full-regression.spec.ts
├── integration/            # 통합 테스트
│   ├── db/
│   ├── auth/
│   ├── api/
│   └── tickets/
└── unit/                   # 단위 테스트
    ├── assignment/
    └── email/
```

### 테스트 실행

```bash
# 모든 테스트
pnpm test

# 특정 테스트 파일
pnpm test tests/unit/assignment/pick-assignee.spec.ts

# E2E 테스트
pnpm test:e2e

# E2E 특정 파일
pnpm test:e2e tests/e2e/public-home.spec.ts

# UI 모드로 E2E 실행
pnpm exec playwright test --ui
```

### 테스트 작성 가이드

- **E2E**: 사용자 관점의 흐름 테스트
- **Integration**: API 및 DB 쿼리 테스트
- **Unit**: 순수 함수 및 알고리즘 테스트

## 🚢 배포

### Docker 배포

```bash
# 이미지 빌드
docker build -t crinity-ticket .

# 컨테이너 실행
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e AUTH_SECRET="..." \
  crinity-ticket
```

### 환경별 체크리스트

**개발 환경:**
- [ ] `.env` 파일 설정
- [ ] Docker Compose로 실행
- [ ] 테스트 데이터 확인

**스테이징 환경:**
- [ ] 환경 변수 검증
- [ ] 데이터베이스 마이그레이션
- [ ] 이메일 발송 테스트
- [ ] 파일 업로드 테스트

**프로덕션 환경:**
- [ ] 모든 시크릿 키 변경
- [ ] HTTPS 설정
- [ ] CAPTCHA 활성화
- [ ] S3 버킷 설정
- [ ] 이메일 발송 설정
- [ ] 모니터링/로깅 설정
- [ ] 백업 설정

## 🐛 트러블슈팅

### 자주 발생하는 문제

**1. Prisma 클라이언트 에러**
```bash
# 해결: 클라이언트 재생성
pnpm prisma generate
```

**2. 데이터베이스 연결 실패**
```bash
# Docker Compose인 경우
docker compose ps  # 서비스 상태 확인
docker compose logs postgres  # PostgreSQL 로그 확인
```

**3. 환경 변수 누락**
```bash
# .env 파일 존재 및 내용 확인
cat .env
```

**4. 첨부파일 업로드 실패**
- 업로드 디렉토리 권한 확인
- S3 설정 확인 (프로덕션)

### 로그 확인

```bash
# Docker 로그
docker compose logs -f app

# 개발 서버 로그
pnpm dev
```

## 📄 라이선스

이 프로젝트는 [라이선스명] 하에 배포됩니다.

## 🤝 기여

기여는 언제나 환영합니다! PR을 보내주세요.

## 📞 지원

문제가 있으시면 [이슈 트래커]를 통해 문의해주세요.

---

**Crinity Ticket System** - 효율적인 고객 지원을 위한 티켓 관리 솔루션
