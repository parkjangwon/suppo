# Suppo 운영 서비스 점검 및 테스트 계획

## 목적

이 문서는 Suppo Helpdesk를 `운영 배포 가능한 수준`으로 점검하기 위한 실행 기준이다.  
목표는 단순 기능 확인이 아니라, 아래 세 가지를 한 번에 확보하는 것이다.

- 배포 가능 여부를 판단할 수 있는 운영 체크리스트
- staging 및 배포 직후에 재사용 가능한 테스트 시나리오
- 운영 중단/배포 보류 기준이 명확한 승인 규칙

현재 프로젝트는 다음 구조를 전제로 한다.

- `public/admin` 분리 Next.js 앱
- `sqld` 기반 LibSQL 공유 DB
- `docker/docker-compose.yml` 기반 멀티 컨테이너 배포
- `uploads` 공유 볼륨

## 운영 준비 점검 항목

### 1. 환경 변수 및 배포 구성

배포 전 아래 명령으로 운영 환경 변수를 검증한다.

```bash
pnpm ops:validate-env -- --env-file docker/env/.env.production
```

필수 점검 항목:

- `DATABASE_URL`
- `PUBLIC_URL`
- `ADMIN_URL`
- `AUTH_SECRET`
- `TICKET_ACCESS_SECRET`
- `GIT_TOKEN_ENCRYPTION_KEY`
- `TURNSTILE_SECRET_KEY`
- `INTERNAL_EMAIL_DISPATCH_TOKEN`
- `INTERNAL_AUTOMATION_DISPATCH_TOKEN`

추가 확인:

- `AUTH_SECRET`은 public/admin 모두 동일해야 함
- `PUBLIC_URL`, `ADMIN_URL`은 실제 도메인과 일치해야 함
- `sqld`는 외부에 직접 노출되지 않아야 함
- public/admin 모두 `uploads` 볼륨을 동일하게 마운트해야 함
- 운영 DB에는 최신 migration이 적용되어야 함

### 2. 보안 점검

반드시 확인할 항목:

- 공개 티켓 생성과 채팅 시작에 CAPTCHA가 강제되는지
- 공개 입력 경로에 rate limit이 적용되는지
- 지식베이스 문서에서 스크립트/XSS가 렌더링되지 않는지
- webhook URL이 내부망/로컬 주소를 막는지
- Public API key가 scope별로 제한되는지
- 관리자 LLM 프록시가 임의 URL 호출을 허용하지 않는지
- 이미지 업로드에서 SVG가 차단되는지

판정 기준:

- 권한 우회, XSS, SSRF, PII 과노출이 있으면 `배포 보류`
- 공개 입력 남용 방어가 동작하지 않으면 `배포 보류`

### 3. 예외처리 및 데이터 정합성

핵심 비즈니스 흐름 기준으로 확인한다.

- 티켓 생성
- 티켓 조회
- 공개 댓글
- 관리자 답변/상태 변경
- chat conversation 생성
- webhook delivery
- email outbox 처리

중점 확인:

- 첨부 검증 실패 시 부분 성공 상태가 생기지 않는지
- AI 분류 실패가 티켓 생성 자체를 막지 않는지
- webhook 실패가 이벤트 로그에 남는지
- health check가 Redis 선택 의존성 때문에 false negative를 내지 않는지

## 테스트 실행 계획

### 1. 코드/빌드 게이트

배포 전 반드시 실행:

```bash
pnpm test
pnpm lint
pnpm build:all
pnpm audit --prod
```

승인 기준:

- test 실패 없음
- lint error 없음
- build 성공
- audit high/critical 없음

### 2. Staging 통합 검증

브라우저 검증 기준:

- 공개 홈 진입
- KO/EN 전환
- 공개 티켓 생성
- 티켓 조회
- 공개 댓글 작성
- 지식베이스 검색/문서 열람
- floating chat 버튼 동작
- 관리자 로그인
- 관리자 티켓 목록/상세/답변/상태 변경
- Public API key 발급
- webhook 등록/호출 확인
- 채팅 설정 반영

자동화 기준:

```bash
pnpm test:e2e
```

운영 전 staging에서는 Playwright 전체 스위트가 녹색이어야 한다.

### 3. 배포 직후 Smoke Test

배포 직후 아래 명령으로 기본 상태를 확인한다.

```bash
pnpm ops:smoke -- --env-file docker/env/.env.production
```

기본 smoke 항목:

- public 홈 응답
- admin 로그인 페이지 응답
- admin health 응답
- public locale cookie 설정

선택 smoke 항목:

- Public API 티켓 생성/조회

이 항목은 다음 환경 변수가 있을 때만 실행된다.

- `SMOKE_PUBLIC_API_KEY`
- `SMOKE_REQUEST_TYPE_ID`

### 4. 배포 후 관측성 확인

첫 1시간 동안 확인:

- public 4xx/5xx 비율
- admin login 실패율
- public ticket 생성 실패율
- webhook 실패 수
- email outbox backlog
- health endpoint 상태

첫 24시간 동안 확인:

- CAPTCHA 실패율 급증 여부
- locale 전환 이상 여부
- chat/widget 관련 사용자 오류
- 운영팀 수동 제보

## 운영 승인 기준

### 바로 배포 가능

- staging test 전부 성공
- smoke test 전부 성공
- 배포 후 첫 1시간 심각 오류 없음

### 조건부 배포

- 기술부채 warning만 남아 있고
- 고객/상담원 핵심 흐름은 모두 성공하며
- 운영팀이 수동 모니터링을 감수할 수 있는 경우

### 배포 보류

- 보안 우회 가능
- 권한 오용 가능
- CAPTCHA/rate limit 미동작
- migration 미적용
- Public/Admin 기본 진입 실패
- smoke test 실패

## 실행 메모

- E2E는 `playwright.config.ts`에서 E2E DB migration 후 public/admin dev 서버를 새로 띄우도록 구성되어 있다.
- 운영 점검 스크립트는 실제 운영 URL을 기준으로 반복 실행할 수 있게 작성했다.
- 공개 티켓 생성은 CAPTCHA 때문에 일반 smoke로는 직접 만들기 어렵기 때문에, 운영 smoke 자동화는 Public API key 기반 티켓 생성/조회로 대체한다.
