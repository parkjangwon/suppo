# E2E 테스트 자동화 설계

**날짜:** 2026-03-18
**프로젝트:** suppo-helpdesk
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
      seed.ts          ← 관리자 계정 존재 확인/생성, Prisma 인스턴스 공유
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
  YYYY-MM-DD-HH-mm-e2e-checklist.xlsx
```

기존 `tests/e2e/*.spec.ts` 7개 파일은 `specs/` 하위로 이동하거나 대체된다.

---

## 테스트 시나리오 (6개)

### 01. 공개 홈페이지
- `/` 접근 → "Suppo Support" 렌더링 확인
- 스크린샷: 홈 화면

### 02. 티켓 생성
- `/ticket/new` → 실제 폼 입력:
  - 이름(`customerName`), 이메일(`customerEmail`), 제목(`subject`), 내용(`description`)
  - 문의 유형(`requestTypeId`) — 라벨: "문의 유형" (카테고리가 아님)
  - 우선순위(`priority`)
- 제출 → `/ticket/submitted?id=CRN-...` URL 및 티켓 번호 확인
- Prisma로 DB에서 티켓 레코드 존재 직접 확인 (fixtures에서 PrismaClient 공유)
- `afterEach`에서 생성된 티켓 삭제
- 스크린샷: 폼 입력 완료, 제출 완료 화면

### 03. 티켓 조회 (별도 브라우저 컨텍스트)
- `/ticket/lookup` → 티켓 번호 + 이메일 입력
- 조회 클릭 → API가 `ticket_access` HttpOnly 쿠키 설정 → 자동으로 상세 페이지 이동
- 쿠키는 API 응답에서 자동 설정되므로 별도 처리 불필요
- 스크린샷: 조회 폼, 티켓 상세

### 04. 관리자 로그인 (별도 브라우저 컨텍스트)
- `/admin/login` → 이메일/비밀번호 입력 → 로그인 → `/admin/dashboard` 이동 확인
- 잘못된 자격증명 → 오류 메시지 "로그인에 실패했습니다" 확인
- 스크린샷: 로그인 폼, 대시보드, 오류 메시지

### 05. 관리자 티켓 목록
- `/admin/tickets` → 테이블 렌더링 확인
- 상태 필터 적용 — 실제 필터 요소의 Playwright 로케이터는 구현 시 컴포넌트 확인 후 결정
- 스크린샷: 목록, 필터 적용 후

### 06. 관리자 티켓 상세 + 답변
- 02번 테스트에서 생성된 티켓의 Prisma CUID(`id`)를 fixture에서 조회하여 `/admin/tickets/[id]`로 직접 이동
- 답변 작성 → 전송
- 내부 메모 체크 → 전송
- 상태 변경 (OPEN → IN_PROGRESS)
- `afterEach`에서 생성된 댓글 및 티켓 삭제
- 스크린샷: 상세 페이지, 답변 후, 상태 변경 후

---

## Excel 리포터

### 아키텍처

```
테스트 코드                          리포터
─────────────────────────────────    ─────────────────────────────────
test.step("단계명", async () => {    onStepEnd(step, result)
  // ...                             → 단계명, 결과, 소요시간 수집
  await page.screenshot({path})  →
  await testInfo.attach("step",      onTestEnd(test, result)
    { path, contentType })       →   → attachments에서 스크린샷 경로 추출
})                                   → Excel 행 추가 + 이미지 임베드

                                     onEnd()
                                     → xlsx 파일 저장
```

- 스크린샷은 **테스트 코드** 내 각 `test.step()` 안에서 `page.screenshot()` 호출
- `testInfo.attach()`로 결과에 첨부
- 리포터는 `result.attachments`에서 이미지 경로를 읽어 Excel에 임베드
- 리포터에서 직접 `page` 접근 불가 — 이 방식으로 우회

### Excel 열 구성

| 열 | 내용 |
|----|------|
| No | 순번 |
| 테스트 파일 | spec 파일명 |
| 시나리오 | test.describe 또는 test 이름 |
| 단계 | test.step 이름 |
| 테스트 방법 | 단계 이름에서 추출 |
| 결과 | PASS (초록) / FAIL (빨강) |
| 실패 메시지 | 에러 내용 (실패 시) |
| 스크린샷 | 이미지 임베드 (행 높이 자동 조정) |
| 실행 시간(ms) | 소요 시간 |

### 파일 저장
`test-report/YYYY-MM-DD-HH-mm-e2e-checklist.xlsx`

---

## 스크린샷 전략

- 각 `test.step()` 완료 직전 `page.screenshot({ path })` 호출
- `testInfo.attach(stepName, { path, contentType: 'image/png' })`로 첨부
- 파일명: `{spec번호}-{step명}-{타임스탬프}.png`
- `test-report/screenshots/` 에 저장
- 리포터가 `result.attachments`에서 읽어 Excel 셀에 임베드

---

## 데이터 전략

### 시드 데이터
`tests/e2e/fixtures/seed.ts` — PrismaClient 싱글턴, `DATABASE_URL`은 `.env` 그대로 사용:
- 관리자 계정(`admin@suppo.io`) 존재 확인, 없으면 생성
- 테스트에 필요한 `RequestType` 레코드 확인/생성

### 테스트 데이터 격리
- 각 테스트에서 생성한 티켓/댓글은 `afterEach`에서 Prisma로 삭제
- 개발 DB 사용이므로 완전 격리는 불가 — cleanup 최대한 수행

### Rate Limit 주의
티켓 생성/조회 API는 5회/분 제한 있음. 반복 실행 시 429 오류 가능.
개발 서버 재시작 또는 잠시 대기 후 재실행.

---

## 설정 변경

### `playwright.config.ts`
```typescript
{
  testDir: './tests/e2e/specs',   // 기존 flat 파일들은 specs/로 이동
  fullyParallel: false,           // 공유 DB 사용으로 인해 순차 실행 필수
  workers: 1,
  reporter: [
    ['html'],
    ['./tests/reporter/excel-reporter.ts']
  ],
  // 나머지 설정 유지
}
```

### `package.json`
- `"test:e2e"` 스크립트 변경 없음

---

## 제약 사항

- 개발 서버(`pnpm dev`)가 실행 중이어야 함 (`webServer` 설정으로 자동 시작)
- Rate Limit: 빠른 반복 실행 시 API 429 오류 발생 가능 — 서버 재시작 또는 1분 대기
- 공개/관리자 테스트는 서로 다른 브라우저 컨텍스트 사용 (쿠키 간섭 방지)
- `ticket_access` 쿠키는 조회 API 응답에서 자동 설정 — 별도 처리 불필요
