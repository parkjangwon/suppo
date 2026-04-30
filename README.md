# Suppo — 헬프데스크

<p align="center">
  <strong>고객 포털과 관리자 대시보드가 분리된 셀프호스팅 헬프데스크 시스템</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js 15">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT">
</p>

---

## 이 시스템이 제공하는 것

| 사용자 | 무엇을 하나 |
|--------|------------|
| **고객** | 티켓 제출 → 진행 상황 확인 → 댓글로 추가 문의 |
| **상담원** | 티켓 접수 · 처리 · 댓글 작성 · 내부 메모 · 파일 첨부 |
| **관리자** | 상담원 관리 · 통계 확인 · 이메일/브랜딩/연동 설정 |

**포함된 기능:**
- 고객 포털 (티켓 제출, 상태 조회, 지식베이스, CSAT 설문)
- 관리자 패널 (티켓 목록/상세, 담당자 배정, 일괄 처리, 검색/필터)
- 이메일 알림 (티켓 접수, 댓글, 내부 알림)
- 실시간 알림 (관리자 패널 내 SSE 푸시)
- 지식베이스 관리 (초안/게시/비공개)
- 팀 · 영업시간 · 업무 규칙 설정
- GitHub/GitLab 이슈 연동
- 공개 API + Outbound Webhook
- 다국어 지원 (한국어/영어)
- SAML SSO (BoxyHQ)

---

## 빠른 시작 (Docker Compose)

서버 1대와 Docker가 있으면 충분합니다.

```bash
# 1. 저장소 클론
git clone https://github.com/parkjangwon/suppo.git
cd suppo

# 2. 실행
docker compose up -d
```

기본 접속 주소:

| 역할 | URL |
|------|-----|
| 고객 포털 | http://localhost:3000 |
| 관리자 패널 | http://localhost:3001/admin/login |

기본 관리자 계정:

```
이메일: admin@suppo.io
비밀번호: admin1234
```

> **첫 로그인 후 반드시 비밀번호를 변경하세요.**

---

## 배포 후 필수 설정 (이것만 하면 됩니다)

### 1단계. 비밀번호 변경

Admin 패널 우측 상단 프로필 → 비밀번호 변경

### 2단계. 이메일 설정

`Admin → 설정 → 이메일 연동`에서 발송 방식을 선택합니다.

| 방식 | 설정 항목 |
|------|----------|
| SMTP | 호스트, 포트, 계정, 비밀번호 |
| Resend | API Key |

설정 후 **고객 이메일 알림 활성화** 토글을 켜야 실제 발송됩니다.  
설정 전까지는 이메일이 발송되지 않습니다 (오류 없이 조용히 스킵됨).

### 3단계. 문의 유형 등록

`Admin → 설정 → 문의 유형`에서 최소 1개를 등록해야 고객이 티켓을 제출할 수 있습니다.

예시:
- 기술 지원
- 구매/결제 문의
- 기타

### 4단계. 상담원 계정 추가

`Admin → 상담원 관리 → 상담원 추가`

필요에 따라 팀(`Admin → 팀 관리`)도 구성합니다.

### 5단계. 브랜딩 설정 (선택)

`Admin → 설정 → 브랜딩`에서 회사명, 로고, 색상을 변경합니다.  
고객 포털과 이메일에 반영됩니다.

---

## 운영 환경 구성 (도메인 분리)

리버스 프록시(nginx, Caddy 등) 뒤에 배포하는 경우 `docker/.env`에서 외부 URL을 설정합니다.

```bash
# docker/.env
PUBLIC_URL=https://help.example.com       # 고객이 접속하는 주소
ADMIN_URL=https://admin.example.com       # 관리자가 접속하는 주소
APP_BASE_URL=https://help.example.com     # 이메일 링크에 사용되는 기본 URL
BIND_IP=127.0.0.1                         # 리버스 프록시 뒤라면 127.0.0.1
EMAIL_DOMAIN=example.com                  # 발신 이메일 도메인
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=강력한_비밀번호
SEED_PROFILE=none                         # 운영 환경에서는 demo 데이터 제외
```

시크릿 키(`AUTH_SECRET`, `TICKET_ACCESS_SECRET`, `GIT_TOKEN_ENCRYPTION_KEY`)는 비워 두면 첫 실행 시 자동 생성됩니다.  
**한 번 생성된 시크릿은 절대 변경하지 마세요.** 변경하면 모든 세션과 암호화 토큰이 무효화됩니다.

---

## 상태 확인 및 로그

```bash
# 전체 서비스 상태
docker compose -f docker/docker-compose.yml ps

# 실시간 로그 (Ctrl+C로 종료)
docker compose -f docker/docker-compose.yml logs -f public admin

# 특정 서비스 로그
docker compose -f docker/docker-compose.yml logs -f migrate bootstrap
```

외부 모니터링은 관리자 앱의 `/api/health`를 확인하면 됩니다. 응답에는 DB, 업로드 볼륨 쓰기 가능 여부, Redis, 내부 dispatch 토큰 설정 상태가 포함됩니다. 상태가 `unhealthy`이면 HTTP 503을 반환합니다.

---

## 업데이트 방법

```bash
# 최신 코드 받기
git pull

# 이미지 재빌드 및 재시작 (데이터 유지)
docker compose -f docker/docker-compose.yml up --build -d
```

마이그레이션은 `migrate` 서비스가 재시작 시 자동으로 적용합니다.

---

## 백업

Docker 볼륨 2개가 데이터를 보관합니다:

| 볼륨 | 내용 |
|------|------|
| `suppo_db_data` | 티켓, 설정, 전체 PostgreSQL 데이터 |
| `suppo_uploads` | 첨부 파일 |

첨부파일은 로컬 파일시스템 또는 Docker 공유 볼륨의 `UPLOAD_DIR` 경로에 저장됩니다. 기본값은 `uploads`이며, 상대 경로는 로컬에서는 프로젝트 루트 기준, Docker에서는 컨테이너 앱 루트(`/app`) 기준으로 해석됩니다. public/admin 앱이 같은 경로를 읽지만 첨부파일은 직접 정적 URL로 공개하지 않고, 티켓 권한을 확인하는 `/api/attachments/{id}` 다운로드 API를 통해서만 제공합니다.

볼륨 백업 예시:

```bash
# DB 백업
docker compose exec -T postgres pg_dump -U suppo -d suppo \
  > backup/suppo-$(date +%Y%m%d).sql

# 업로드 파일 백업
docker run --rm \
  -v suppo_uploads:/data \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/uploads-$(date +%Y%m%d).tar.gz /data
```

관리자 화면의 `Admin → 설정 → 시스템`에서 ZIP 백업을 내려받은 뒤, 복구 전에 구조 검증을 실행할 수 있습니다.

```bash
pnpm ops:backup-drill -- --file ./backup/backup-YYYY-MM-DD.zip
```

이 검증은 ZIP 구조, 주요 테이블 JSON, 첨부파일 DB 레코드와 ZIP 내부 파일의 대응을 확인합니다. 운영 DB를 수정하지 않는 dry-run 검증입니다.

---

## 데이터 초기화

> **주의: 아래 명령은 모든 티켓과 첨부 파일을 삭제합니다.**

```bash
docker compose -f docker/docker-compose.yml down -v
docker compose -f docker/docker-compose.yml up --build -d
```

---

## 배포 전 환경 검증

운영 환경에서 필수 변수, URL, 시크릿 길이/중복, 업로드 경로, 초기 관리자 비밀번호가 올바른지 확인합니다.

```bash
pnpm ops:validate-env -- --env-file docker/.env --allow-generated-secrets
```

API 라우트의 권한 보호 방식도 배포 전에 감사합니다.

```bash
pnpm ops:auth-audit
```

서비스를 올린 뒤에는 기본 헬스/접속 흐름을 확인합니다.

```bash
pnpm ops:smoke -- --env-file docker/.env
```

---

## 시스템 요구사항

| 항목 | 최소 사양 |
|------|----------|
| OS | Linux (Ubuntu 22.04 이상 권장) |
| CPU | 1 vCPU |
| 메모리 | 1 GB RAM |
| 디스크 | 10 GB (첨부 파일 용량에 따라 추가) |
| Docker | 24 이상 |
| Docker Compose | v2 이상 |

소규모 팀(상담원 10명 이하, 월 티켓 수천 건 이하) 기준입니다.

---

## 자주 묻는 질문

**Q. 이메일을 설정했는데 발송이 안 됩니다.**  
Admin → 설정 → 이메일 연동에서 **"고객 이메일 알림 활성화"** 토글이 켜져 있는지 확인하세요.

**Q. 고객이 티켓 제출 시 문의 유형 목록이 비어 있습니다.**  
Admin → 설정 → 문의 유형에서 최소 1개를 등록해야 합니다.

**Q. 관리자 비밀번호를 잊었습니다.**  
DB에 직접 접근해 비밀번호 해시를 초기화하거나, 볼륨을 삭제 후 재시작해 초기 계정으로 복구합니다.

**Q. 여러 대의 서버로 확장할 수 있나요?**  
현재 실시간 알림(SSE)과 요청 제한이 단일 서버 인메모리 방식입니다. 수평 확장 시 알림이 누락될 수 있으며, 소규모 팀에서는 서버 1대로 충분합니다.

**Q. SSL/HTTPS는 어떻게 설정하나요?**  
nginx, Caddy 같은 리버스 프록시에서 SSL을 처리하고 Suppo는 HTTP로 내부 통신하도록 구성을 권장합니다. `BIND_IP=127.0.0.1`으로 설정하면 외부 직접 노출을 막을 수 있습니다.

---

## 웹 콘솔 설정 메뉴 안내

환경 변수가 아닌 Admin 패널에서 관리되는 설정 목록입니다.

| 메뉴 | 경로 | 설명 |
|------|------|------|
| 이메일 연동 | `/admin/settings/email` | SMTP/Resend 설정, 알림 활성화 |
| 브랜딩 | `/admin/settings/branding` | 회사명, 로고, 주색상 |
| 문의 유형 | `/admin/settings/request-types` | 고객 폼의 카테고리 |
| 템플릿 | `/admin/templates` | 댓글 빠른 답변 템플릿 |
| 영업시간 | `/admin/settings/business-hours` | SLA 산정 기준 시간 |
| 업무 규칙 | `/admin/settings/operations` | 자동 배정, 응답 목표 |
| Git 연동 | `/admin/settings/git` | GitHub/GitLab 이슈 연결 |
| SAML SSO | `/admin/settings/saml` | 기업 SSO (BoxyHQ) |
| AI/LLM | `/admin/settings/llm` | 자동 분류, 인사이트 |
| 연동 설정 | `/admin/settings/integrations` | 공개 API 키, Webhook |
| 시스템 | `/admin/settings/system` | 백업/복원, 감사 로그 |

---

## 로컬 개발 환경 (기여자용)

```bash
# 요구사항: Node.js 22+, Docker
pnpm build:all   # 비어 있는 클론이면 의존성/로컬 env를 먼저 준비한 뒤 빌드
./install.sh     # PostgreSQL 자동 실행, migration, bootstrap/demo seed 적용
# ./instal.sh    # 오타도 동일하게 동작
pnpm dev:all     # 개발 서버 실행 (Public :3000, Admin :3001)
pnpm test        # 단위 테스트
pnpm test:e2e    # E2E 테스트
```

---

## 라이선스

MIT
