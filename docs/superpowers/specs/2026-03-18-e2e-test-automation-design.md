# E2E 테스트 자동화 설계

**날짜:** 2026-03-18
**프로젝트:** crinity-helpdesk
**범위:** 실제 DB 기반 E2E 테스트 + Excel 체크리스트 자동 생성

---

## 목표

- 기존 mock 기반 E2E 테스트를 실제 DB와 실제 폼 입력 기반으로 재작성
- 테스트 실행 시 각 단계별 스크린샷 자동 캡처
- 테스트 결과를 Excel 체크리스트로 자동 생성 (단계명, 테스트 방법, 결과, 스크린샷 임베드)

---

## 아키텍처

```
tests/
  e2e/
    fixtures/
      seed.ts          ← 테스트용 Prisma 시드 (관리자 계정, 샘플 티켓)
      cleanup.ts       ← 테스트 후 생성된 데이터 삭제
    specs/             ← 재작성된 실제 DB 기반 테스트
      01-public-home.spec.ts
      02-public-ticket-create.spec.ts
      03-public-ticket-lookup.spec.ts
      04-admin-login.spec.ts
      05-admin-ticket-list.spec.ts
      06-admin-ticket-detail.spec.ts
  reporter/
    excel-reporter.ts  ← Playwright 커스텀 리포터
test-report/           ← 실행 결과 저장 디렉토리
  screenshots/         ← 스크린샷 저장
  YYYY-MM-DD-e2e-checklist.xlsx
```

---

## 테스트 시나리오 (6개)

### 01. 공개 홈페이지
- 홈(`/`) 접근 → "Crinity Support" 렌더링 확인
- 스크린샷: 홈 화면

### 02. 티켓 생성
- `/ticket/new` → 실제 폼 입력 (이름, 이메일, 제목, 내용, 카테고리, 우선순위)
- CAPTCHA 토큰 버튼 클릭
- 제출 → `/ticket/submitted` URL 및 티켓 번호 확인
- DB에서 티켓 레코드 존재 확인
- 스크린샷: 폼 입력 완료, 제출 완료 화면

### 03. 티켓 조회
- `/ticket/lookup` → 생성된 티켓 번호 + 이메일 입력
- 조회 → 티켓 상세 페이지 이동 확인
- 스크린샷: 조회 폼, 티켓 상세

### 04. 관리자 로그인
- `/admin/login` → 이메일/비밀번호 입력
- 로그인 → `/admin/dashboard` 이동 확인
- 잘못된 자격증명 → 오류 메시지 확인
- 스크린샷: 로그인 폼, 대시보드

### 05. 관리자 티켓 목록
- `/admin/tickets` → 테이블 렌더링 확인
- 상태 필터 적용 → 목록 변화 확인
- 스크린샷: 목록, 필터 적용 후

### 06. 관리자 티켓 상세 + 답변
- 생성된 티켓 상세 페이지 진입
- 답변 작성 → 전송
- 내부 메모 체크 → 전송
- 상태 변경 (OPEN → IN_PROGRESS)
- 스크린샷: 상세 페이지, 답변 후, 상태 변경 후

---

## Excel 리포터

### 구현 방식
Playwright 커스텀 리포터(`Reporter` 인터페이스 구현)로 테스트 이벤트를 수신하여 `exceljs`로 Excel 파일 생성.

### Excel 열 구성

| 열 | 내용 |
|----|------|
| No | 순번 |
| 테스트 파일 | spec 파일명 |
| 시나리오 | test.describe 또는 test 이름 |
| 단계 | test.step 이름 |
| 테스트 방법 | 단계 설명 (step 이름에서 추출) |
| 결과 | PASS (초록) / FAIL (빨강) |
| 실패 메시지 | 에러 내용 (실패 시) |
| 스크린샷 | 이미지 임베드 (행 높이 자동 조정) |
| 실행 시간 | ms |

### 파일 저장
`test-report/YYYY-MM-DD-HH-mm-e2e-checklist.xlsx`

---

## 스크린샷 전략

- 각 `test.step()` 완료 시점에 `page.screenshot()` 호출
- 파일명: `{spec명}-{step명}-{타임스탬프}.png`
- `test-report/screenshots/` 에 저장
- Excel에 임베드 (섬네일 크기: 열 너비에 맞춤)

---

## 데이터 전략

- **시드 데이터:** `tests/e2e/fixtures/seed.ts` — 관리자 계정(`admin@crinity.io`) 존재 확인, 없으면 생성
- **테스트 데이터:** 각 테스트에서 생성한 티켓은 `afterEach`에서 Prisma로 삭제
- **개발 DB 사용:** `.env` 의 `DATABASE_URL` 그대로 사용 (별도 DB 불필요)

---

## 설정 변경

### `playwright.config.ts`
- `reporter` 에 커스텀 Excel 리포터 추가 (기존 `html` 리포터와 병행)
- `testDir` 를 `./tests/e2e/specs` 로 변경

### `package.json`
- `"test:e2e"` 스크립트 유지 (변경 없음)

---

## 제약 사항

- 개발 서버(`pnpm dev`)가 실행 중이어야 함 (`webServer` 설정으로 자동 시작)
- CAPTCHA: 개발 환경에서 "개발용 토큰 채우기" 버튼으로 우회
- 개발 DB 사용이므로 테스트 실행 후 일부 데이터가 남을 수 있음 (cleanup 최대한 수행)
