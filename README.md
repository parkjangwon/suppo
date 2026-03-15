# Crinity Helpdesk System

<p align="center">
  <strong>현대적인 고객 지원 헬프데스크 시스템</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js 15">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql" alt="PostgreSQL">
</p>

---

## 📋 목차

- [프로젝트 개요](#-프로젝트-개요)
- [기술 스택](#-기술-스택)
- [주요 기능](#-주요-기능)
- [프로젝트 구조](#-프로젝트-구조)
- [시작하기](#-시작하기)
- [환경 변수](#-환경-변수)
- [데이터베이스](#-데이터베이스)
- [기여하기](#-기여하기)
- [라이선스](#-라이선스)

---

## 🎯 프로젝트 개요

**Crinity Helpdesk System**은 SaaS 제품에 대한 기술지원 및 VOC(Voice of Customer) 처리를 위한 종합 헬프데스크 솔루션입니다. 고객이 웹 페이지에서 문의를 작성하면 상담원에게 자동 할당되어 효율적으로 처리되는 구조입니다.

### 핵심 가치

- **고객 중심**: 고객이 쉽게 문의하고 추적할 수 있는 직관적인 인터페이스
- **효율적 운영**: 자동 할당과 로드밸런싱으로 상담원 업무 분배
- **AI 활용**: LLM 연동을 통한 고객 행동 분석 및 인사이트 제공
- **보안 강화**: 감사로그, CAPTCHA, Rate Limiting, Signed Cookie
- **확장성**: Git 연동, 이메일 알림, 첨부파일 지원, SAML SSO

---

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

### AI 및 연동
- **Ollama** (로컬 LLM)
- **Google Gemini API**
- **AWS S3** (파일 저장)
- **SMTP/SES/Resend** (이메일 발송)
- **GitHub/GitLab API** (이슈 연동)

### 인프라
- **Docker & Docker Compose**
- **pnpm** (패키지 매니저)

---

## ✨ 주요 기능

### 1. 고객용 기능 (Public)

| 기능 | 설명 |
|------|-------------|
| **티켓 작성** | 이름, 이메일, 전화번호, 소속, 문의 유형(RequestType), 우선순위, 제목, 내용, 첨부파일 |
| **CAPTCHA** | Cloudflare Turnstile로 봇 방지 |
| **Rate Limiting** | IP당 분당 5회 제한 |
| **첨부파일** | 최대 10MB, 20개, 이미지/문서/압축파일 지원 |
| **티켓 조회** | 티켓번호 + 이메일 인증, Signed Cookie 발급 |
| **대화 스레드** | 상태 및 대화 내역 확인, 추가 메시지 작성 |

### 2. 관리자용 기능 (Admin)

| 기능 | 설명 |
|------|-------------|
| **대시보드** | 오늘/주/월 통계, 상태별 현황, 상담원별 처리 현황 |
| **티켓 목록** | 필터(상태/카테고리/우선순위/담당자), 검색, 정렬 |
| **티켓 상세** | 상태/우선순위/담당자 변경, 코멘트, 낶부 메모 |
| **자동 할당** | 카테고리 전문성 + 로드밸런싱 알고리즘 |
| **티켓 양도** | 다른 상담원으로 양도, 사유 기록 |
| **상담원 관리** | CRUD, 전화번호 관리, 비활성화 시 자동 재할당 |
| **고객 관리** | 고객 프로필, 티켓 이력, 메모, AI 분석 |
| **응답 템플릿** | 자주 사용하는 응답 템플릿 관리, 변수 치환({{ticket.id}}, {{customer.name}} 등), 조걸 렌더링 지원 |
| **Git 연동** | GitHub/GitLab 이슈 연결/생성 |

### 3. 설정 기능

| 기능 | 설명 |
|------|-------------|
| **이메일 설정** | SMTP/SES/Resend 프로바이더 설정 |
| **AI 설정** | Ollama/Gemini LLM 설정, 고객 분석 활성화 |
| **브랜딩** | 도메인별 커스텀 로고, 색상, 파비콘 설정 |
| **SAML SSO** | 기업 SSO 연동 (BoxyHQ) |
| **문의 유형** | 카테고리별 기본 담당 팀, 우선순위 설정 |
| **SLA 정책** | 서비스 레벨 계약 설정, WAITING 상태에서 자동 일시정지 |

### 4. 감사 및 보안

| 기능 | 설명 |
|------|-------------|
| **감사로그** | 모든 관리자/상담원 행동 기록, XLSX 날짜 지원 |
| **활동 로그** | 티켓 상태 변경, 할당, 양도 이력 |
| **보안** | 티켓 접근 토큰, 민감 데이터 암호화 |

### 5. 시스템 기능

| 기능 | 설명 |
|------|-------------|
| **이메일 알림** | 티켓 접수/할당/응답/상태변경 시 알림, 스레딩 헤더 지원 |
| **Outbox 패턴** | 이메일 발송 실패 시 재시도 (최대 3회) |
| **AI 고객 분석** | 티켓 히스토리 기반 고객 패턴 분석 |
| **파일 저장** | 개발: 로컬, 프로덕션: AWS S3 |

---

## 📁 프로젝트 구조

```
crinity-helpdesk/
├── prisma/
│   ├── schema.prisma          # 데이터베이스 스키마
│   └── migrations/            # 마이그레이션 파일
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (public)/          # 고객용 라우트
│   │   │   ├── page.tsx       # 랜딩 페이지
│   │   │   └── ticket/        # 티켓 관련 페이지
│   │   ├── (admin)/           # 관리자용 라우트
│   │   │   └── admin/         # 관리자 페이지
│   │   └── api/               # API 엔드포인트
│   ├── components/
│   │   ├── ui/                # shadcn/ui 컴포넌트
│   │   ├── app/               # 앱 쉘 컴포넌트
│   │   ├── ticket/            # 티켓 관련 컴포넌트
│   │   └── admin/             # 관리자 컴포넌트
│   ├── lib/
│   │   ├── db/                # Prisma 클라이언트 및 쿼리
│   │   ├── auth/              # 인증 설정 및 가드
│   │   ├── audit/             # 감사로깅
│   │   ├── llm/               # LLM 연동 (Ollama/Gemini)
│   │   ├── tickets/           # 티켓 서비스
│   │   ├── assignment/        # 할당 알고리즘
│   │   ├── email/             # 이메일 발송
│   │   ├── storage/           # 파일 저장
│   │   └── utils/             # 유틸리티
│   └── types/                 # TypeScript 타입
├── scripts/                   # 유틸리티 스크립트
├── tests/                     # 테스트 파일
└── docker-compose.yml         # Docker 설정
```

---

## 🚀 시작하기

### 사전 요구사항

- **Node.js** 20.x 이상
- **pnpm** 10.x 이상
- **Docker** (선택사항)
- **PostgreSQL** 16 (로컬 설치 시)

### 방법 1: Docker Compose (권장)

```bash
# 1. 저장소 클론
git clone <repository-url>
cd crinity-helpdesk

# 2. 환경 변수 설정
cp .env.example .env

# 3. Docker Compose 실행
docker compose up --build

# 4. 브라우저 접속
open http://localhost:3000
```

### 방법 2: 로컬 개발

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경 변수 설정
cp .env.example .env

# 3. Prisma 클라이언트 생성
pnpm prisma generate

# 4. 데이터베이스 마이그레이션
pnpm prisma migrate dev

# 5. 관리자 계정 생성
npx tsx scripts/seed-admin.ts

# 6. 개발 서버 실행
pnpm dev

# 7. 브라우저 접속
open http://localhost:3000
```

### 초기 관리자 계정

`.env` 파일의 `INITIAL_ADMIN_EMAIL`과 `INITIAL_ADMIN_PASSWORD`로 관리자 계정이 생성됩니다:

```bash
# .env
INITIAL_ADMIN_EMAIL=admin@crinity.io
INITIAL_ADMIN_PASSWORD=admin1234
```

시드 스크립트 실행:
```bash
npx tsx scripts/seed-admin.ts
```

> **보안 주의**: 최초 로그인 시 반드시 비밀번호를 변경해야 합니다. 시스템이 자동으로 비밀번호 변경 페이지로 리다이렉트합니다.

---

## 🔐 환경 변수

### 필수 설정

```bash
# Database (필수)
DATABASE_URL="postgresql://user:password@localhost:5432/crinity"

# Auth (필수)
AUTH_SECRET="your-secret-key-min-32-characters"
AUTH_TRUST_HOST=true  # 로컬 개발 시 필요

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

# 이메일 (SMTP/SES/Resend)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="user@example.com"
SMTP_PASS="password"

# AWS SES
SES_ACCESS_KEY="your-access-key"
SES_SECRET_KEY="your-secret-key"
SES_REGION="ap-northeast-2"

# Resend
RESEND_API_KEY="your-resend-api-key"

# 파일 저장 (프로덕션)
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="ap-northeast-2"
AWS_S3_BUCKET_NAME="crinity-uploads"

# CAPTCHA
TURNSTILE_SECRET_KEY="your-turnstile-secret"

# LLM (선택)
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2"
GEMINI_API_KEY="your-gemini-api-key"

# Git 연동
GIT_TOKEN_ENCRYPTION_KEY="32-byte-encryption-key"

# SAML SSO
AUTH_BOXYHQ_SAML_ID=""
AUTH_BOXYHQ_SAML_SECRET=""
AUTH_BOXYHQ_SAML_ISSUER=""

# Initial Admin Account (최초 관리자 계정)
INITIAL_ADMIN_EMAIL="admin@crinity.io"
INITIAL_ADMIN_PASSWORD="admin1234"
```

---

## 🗄 데이터베이스

### 핵심 엔티티

- `Ticket` - 티켓 정보 (소속, 문의 유형 포함)
- `Agent` - 상담원 정보 (전화번호, 비밀번호 변경 이력 포함)
- `Customer` - 고객 정보 (AI 분석 포함)
- `Category` - 티켓 카테고리 (상담원 전문성)
- `RequestType` - 문의 유형 (티켓 생성 시 선택)
- `Comment` - 코멘트/댓글
- `Attachment` - 첨부파일
- `AuditLog` - 감사로그 (모든 활동 기록)
- `LLMSettings` - AI 설정
- `EmailSettings` - 이메일 프로바이더 설정
- `TicketActivity` - 티켓 활동 로그
- `TicketTransfer` - 티켓 양도 이력
- `ResponseTemplate` - 응답 템플릿 (변수 치환, 조걸 렌더링)
- `GitLink` - Git 이슈 연결
- `EmailDelivery` - 이메일 발송 큐 (Outbox 패턴)
- `EmailThreadMapping` - 이메일 스레딩 관리
- `SLAClock` - SLA 시간 추적 (일시정지/재개 지원)

### Prisma 명령어

```bash
# 마이그레이션 생성
pnpm prisma migrate dev --name <migration-name>

# 프로덕션 마이그레이션
pnpm prisma migrate deploy

# Prisma 클라이언트 생성
pnpm prisma generate

# Prisma Studio 실행
pnpm prisma studio
```

---

## 🧪 테스트

```bash
# 모든 테스트
pnpm test

# E2E 테스트
pnpm test:e2e

# 특정 테스트 파일
pnpm test tests/unit/assignment/pick-assignee.spec.ts
```

---

## 🤝 기여하기

기여는 언제나 환영합니다! PR을 보내주세요.

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

---

**Crinity Helpdesk System** - 효율적인 고객 지원을 위한 티켓 관리 솔루션
