# E2E 테스트 자동화 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제 DB 기반 Playwright E2E 테스트 6개 작성 + 테스트 실행 시 Excel 체크리스트(스크린샷 포함) 자동 생성

**Architecture:** Playwright 커스텀 리포터(`excel-reporter.ts`)가 `onStepEnd`/`onTestEnd`/`onEnd` 이벤트를 수집하고, 테스트 코드 내 `testInfo.attach()`로 첨부된 스크린샷을 `exceljs`로 Excel에 임베드한다. 테스트는 순차 실행(`workers: 1`)하며, Prisma fixture로 시드 데이터 관리 및 cleanup을 수행한다.

**Tech Stack:** Playwright 1.53, exceljs 4.4 (기설치), Prisma 6.7 (SQLite), Next.js 15, TypeScript

---

## 파일 구조

| 경로 | 역할 |
|------|------|
| `tests/e2e/fixtures/db.ts` | PrismaClient 싱글턴 + seed/cleanup 헬퍼 |
| `tests/e2e/fixtures/screenshot.ts` | 스크린샷 캡처 + testInfo.attach 헬퍼 |
| `tests/e2e/specs/01-public-home.spec.ts` | 공개 홈페이지 렌더링 확인 |
| `tests/e2e/specs/02-public-ticket-create.spec.ts` | 티켓 생성 폼 + DB 확인 |
| `tests/e2e/specs/03-public-ticket-lookup.spec.ts` | 티켓 조회 흐름 |
| `tests/e2e/specs/04-admin-login.spec.ts` | 관리자 로그인/오류 |
| `tests/e2e/specs/05-admin-ticket-list.spec.ts` | 티켓 목록 + 필터 |
| `tests/e2e/specs/06-admin-ticket-detail.spec.ts` | 티켓 상세 + 답변 + 상태변경 |
| `tests/reporter/excel-reporter.ts` | Playwright 커스텀 리포터 |
| `playwright.config.ts` | testDir, workers, reporter 수정 |

기존 `tests/e2e/*.spec.ts` 7개 파일은 삭제한다.

---

## Task 1: DB fixture + screenshot 헬퍼

**Files:**
- Create: `tests/e2e/fixtures/db.ts`
- Create: `tests/e2e/fixtures/screenshot.ts`

- [ ] **Step 1: `tests/e2e/fixtures/db.ts` 작성**

```typescript
// tests/e2e/fixtures/db.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export { prisma };

export async function seedAdmin() {
  const existing = await prisma.agent.findUnique({
    where: { email: "admin@crinity.io" },
  });
  if (existing) return existing;

  return prisma.agent.create({
    data: {
      name: "Admin",
      email: "admin@crinity.io",
      passwordHash: await bcrypt.hash("admin123", 10),
      role: "ADMIN",
      isActive: true,
    },
  });
}

export async function seedRequestType() {
  const existing = await prisma.requestType.findFirst({
    where: { isActive: true },
  });
  if (existing) return existing;

  return prisma.requestType.create({
    data: {
      name: "일반 문의",
      isActive: true,
      sortOrder: 0,
    },
  });
}

export async function cleanupTicket(ticketNumber: string) {
  const ticket = await prisma.ticket.findUnique({ where: { ticketNumber } });
  if (!ticket) return;
  await prisma.comment.deleteMany({ where: { ticketId: ticket.id } });
  await prisma.ticketActivity.deleteMany({ where: { ticketId: ticket.id } });
  await prisma.ticket.delete({ where: { id: ticket.id } });
}

export async function getTicketByNumber(ticketNumber: string) {
  return prisma.ticket.findUnique({ where: { ticketNumber } });
}
```

- [ ] **Step 2: `tests/e2e/fixtures/screenshot.ts` 작성**

```typescript
// tests/e2e/fixtures/screenshot.ts
import { Page, TestInfo } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.resolve("test-report/screenshots");

export async function captureStep(
  page: Page,
  testInfo: TestInfo,
  stepName: string
) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const safeName = stepName.replace(/[^a-zA-Z0-9가-힣]/g, "_").slice(0, 50);
  const filename = `${Date.now()}-${safeName}.png`;
  const filePath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filePath, fullPage: true });
  await testInfo.attach(stepName, {
    path: filePath,
    contentType: "image/png",
  });
}
```

- [ ] **Step 3: fixtures 디렉토리 생성 확인**

```bash
ls tests/e2e/fixtures/
```

Expected: `db.ts`, `screenshot.ts` 파일 존재

- [ ] **Step 4: 커밋**

```bash
git add tests/e2e/fixtures/
git commit -m "test: E2E fixture 헬퍼 추가 (DB seed/cleanup, screenshot)"
```

---

## Task 2: Excel 리포터

**Files:**
- Create: `tests/reporter/excel-reporter.ts`

- [ ] **Step 1: reporter 디렉토리 생성 후 `excel-reporter.ts` 작성**

```typescript
// tests/reporter/excel-reporter.ts
import {
  Reporter,
  TestCase,
  TestResult,
  TestStep,
  FullResult,
} from "@playwright/test/reporter";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

interface RowData {
  no: number;
  file: string;
  scenario: string;
  step: string;
  method: string;
  result: "PASS" | "FAIL" | "SKIP";
  error: string;
  screenshotPath: string | null;
  duration: number;
}

export default class ExcelReporter implements Reporter {
  private rows: RowData[] = [];
  private rowNo = 1;
  private stepResults = new Map<string, { status: string; error: string; duration: number }>();

  onStepEnd(test: TestCase, _result: TestResult, step: TestStep) {
    if (step.category !== "test.step") return;
    this.stepResults.set(`${test.id}::${step.title}`, {
      status: step.error ? "FAIL" : "PASS",
      error: step.error?.message ?? "",
      duration: step.duration,
    });
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const file = path.basename(test.location.file);
    const scenario = test.parent.title
      ? `${test.parent.title} > ${test.title}`
      : test.title;

    // Collect step-level screenshot attachments
    const attachmentsByStep = new Map<string, string>();
    for (const att of result.attachments) {
      if (att.contentType === "image/png" && att.path) {
        attachmentsByStep.set(att.name, att.path);
      }
    }

    // If no steps recorded, add a single row for the whole test
    const stepKeys = [...this.stepResults.keys()].filter((k) =>
      k.startsWith(test.id + "::")
    );

    if (stepKeys.length === 0) {
      this.rows.push({
        no: this.rowNo++,
        file,
        scenario,
        step: "-",
        method: test.title,
        result: result.status === "passed" ? "PASS" : result.status === "skipped" ? "SKIP" : "FAIL",
        error: result.error?.message ?? "",
        screenshotPath: [...attachmentsByStep.values()][0] ?? null,
        duration: result.duration,
      });
      return;
    }

    for (const key of stepKeys) {
      const stepTitle = key.replace(`${test.id}::`, "");
      const sr = this.stepResults.get(key)!;
      this.rows.push({
        no: this.rowNo++,
        file,
        scenario,
        step: stepTitle,
        method: stepTitle,
        result: sr.status === "PASS" ? "PASS" : "FAIL",
        error: sr.error,
        screenshotPath: attachmentsByStep.get(stepTitle) ?? null,
        duration: sr.duration,
      });
    }
  }

  async onEnd(_result: FullResult) {
    const outDir = path.resolve("test-report");
    fs.mkdirSync(outDir, { recursive: true });

    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const outPath = path.join(outDir, `${ts}-e2e-checklist.xlsx`);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("E2E 체크리스트");

    // Header
    ws.columns = [
      { header: "No", key: "no", width: 5 },
      { header: "테스트 파일", key: "file", width: 30 },
      { header: "시나리오", key: "scenario", width: 40 },
      { header: "단계", key: "step", width: 40 },
      { header: "테스트 방법", key: "method", width: 40 },
      { header: "결과", key: "result", width: 8 },
      { header: "실패 메시지", key: "error", width: 40 },
      { header: "스크린샷", key: "screenshot", width: 30 },
      { header: "실행시간(ms)", key: "duration", width: 14 },
    ];

    // Style header row
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 20;

    const IMG_COL_WIDTH_PX = 220;
    const IMG_HEIGHT_PX = 140;

    for (const rowData of this.rows) {
      const rowIndex = ws.rowCount + 1;
      const row = ws.addRow({
        no: rowData.no,
        file: rowData.file,
        scenario: rowData.scenario,
        step: rowData.step,
        method: rowData.method,
        result: rowData.result,
        error: rowData.error,
        screenshot: "",
        duration: rowData.duration,
      });
      row.alignment = { vertical: "middle", wrapText: true };
      row.height = rowData.screenshotPath ? IMG_HEIGHT_PX * 0.75 + 4 : 18;

      // Color result cell
      const resultCell = row.getCell("result");
      if (rowData.result === "PASS") {
        resultCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF70AD47" } };
        resultCell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      } else if (rowData.result === "FAIL") {
        resultCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } };
        resultCell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      }

      // Embed screenshot
      if (rowData.screenshotPath && fs.existsSync(rowData.screenshotPath)) {
        const imgId = wb.addImage({
          filename: rowData.screenshotPath,
          extension: "png",
        });
        // Column H = index 7 (0-based)
        ws.addImage(imgId, {
          tl: { col: 7, row: rowIndex - 1 },
          br: { col: 8, row: rowIndex },
          editAs: "oneCell",
        });
      }
    }

    await wb.xlsx.writeFile(outPath);
    console.log(`\n✅ Excel 체크리스트 저장됨: ${outPath}`);
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add tests/reporter/
git commit -m "test: Playwright Excel 리포터 추가"
```

---

## Task 3: playwright.config.ts 수정

**Files:**
- Modify: `playwright.config.ts`

- [ ] **Step 1: 기존 파일 확인 후 수정**

`playwright.config.ts`를 아래 내용으로 변경:

```typescript
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  testDir: "./tests/e2e/specs",
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: [
    ["html"],
    ["./tests/reporter/excel-reporter.ts"],
  ],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 2: specs/ 디렉토리 생성**

```bash
mkdir -p tests/e2e/specs
```

> **주의:** 기존 `tests/e2e/*.spec.ts` 7개 파일 삭제는 **Task 9(마지막 spec) 커밋 이후**에 한다.
> 삭제 전까지는 `testDir: './tests/e2e/specs'`로 변경했으므로 기존 파일들은 실행되지 않는다.

- [ ] **Step 3: 커밋**

```bash
git add playwright.config.ts tests/e2e/specs/
git commit -m "test: playwright 설정 변경 (순차실행, Excel 리포터, specs/ 디렉토리)"
```

---

## Task 4: 01-public-home.spec.ts

**Files:**
- Create: `tests/e2e/specs/01-public-home.spec.ts`

- [ ] **Step 1: 파일 작성**

```typescript
// tests/e2e/specs/01-public-home.spec.ts
import { test, expect } from "@playwright/test";
import { captureStep } from "../fixtures/screenshot";

test("공개 홈페이지 렌더링 확인", async ({ page }, testInfo) => {
  await test.step("홈 페이지 접근", async () => {
    await page.goto("/");
    await expect(page.getByText("Crinity Helpdesk").first()).toBeVisible();
    await captureStep(page, testInfo, "홈 페이지 접근");
  });

  await test.step("새 티켓 제출 링크 확인", async () => {
    await expect(page.getByRole("link", { name: "티켓 작성" })).toBeVisible();
    await captureStep(page, testInfo, "새 티켓 제출 링크 확인");
  });
});
```

- [ ] **Step 2: 단독 실행 확인**

```bash
pnpm test:e2e --grep "공개 홈페이지"
```

Expected: 1 passed, `test-report/screenshots/` 에 PNG 파일 생성

- [ ] **Step 3: 커밋**

```bash
git add tests/e2e/specs/01-public-home.spec.ts
git commit -m "test(e2e): 공개 홈페이지 spec 추가"
```

---

## Task 5: 02-public-ticket-create.spec.ts

**Files:**
- Create: `tests/e2e/specs/02-public-ticket-create.spec.ts`

- [ ] **Step 1: 파일 작성**

```typescript
// tests/e2e/specs/02-public-ticket-create.spec.ts
import { test, expect } from "@playwright/test";
import { prisma, seedAdmin, seedRequestType, cleanupTicket } from "../fixtures/db";
import { captureStep } from "../fixtures/screenshot";

let createdTicketNumber: string | null = null;

test.beforeAll(async () => {
  await seedAdmin();
  await seedRequestType();
});

test.afterEach(async () => {
  if (createdTicketNumber) {
    await cleanupTicket(createdTicketNumber);
    createdTicketNumber = null;
  }
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("고객이 티켓을 생성하고 티켓 번호를 받는다", async ({ page }, testInfo) => {
  await test.step("티켓 생성 폼 접근", async () => {
    await page.goto("/ticket/new");
    await expect(page.getByRole("heading")).toBeVisible();
    await captureStep(page, testInfo, "티켓 생성 폼 접근");
  });

  await test.step("폼 입력", async () => {
    await page.getByLabel("이름").fill("테스트 고객");
    await page.getByLabel("이메일").fill("e2e-test@crinity-test.io");
    await page.getByLabel("제목").fill("[E2E] 테스트 티켓 제목");
    await page.getByLabel("내용").fill("E2E 자동화 테스트에서 생성된 티켓입니다. 자동으로 삭제됩니다.");

    // 문의 유형 선택 (첫 번째 활성 항목)
    const typeSelect = page.getByLabel("문의 유형");
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption({ index: 1 });
    }

    await page.getByLabel("우선순위").selectOption("MEDIUM");
    await captureStep(page, testInfo, "폼 입력");
  });

  await test.step("티켓 제출", async () => {
    await page.getByRole("button", { name: "티켓 제출" }).click();
    await expect(page).toHaveURL(/\/ticket\/submitted/, { timeout: 10000 });
    await captureStep(page, testInfo, "티켓 제출");
  });

  await test.step("티켓 번호 확인", async () => {
    const url = page.url();
    const match = url.match(/id=(CRN-[^&]+)/);
    expect(match).not.toBeNull();
    createdTicketNumber = match![1];

    await expect(page.getByText(/문의가 접수되었습니다/)).toBeVisible();
    await expect(page.getByText(createdTicketNumber)).toBeVisible();
    await captureStep(page, testInfo, "티켓 번호 확인");
  });

  await test.step("DB 레코드 확인", async () => {
    expect(createdTicketNumber).not.toBeNull();
    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber: createdTicketNumber! },
    });
    expect(ticket).not.toBeNull();
    expect(ticket!.customerEmail).toBe("e2e-test@crinity-test.io");
  });
});
```

- [ ] **Step 2: 단독 실행**

```bash
pnpm test:e2e --grep "티켓을 생성하고"
```

Expected: 1 passed

- [ ] **Step 3: 커밋**

```bash
git add tests/e2e/specs/02-public-ticket-create.spec.ts
git commit -m "test(e2e): 티켓 생성 spec 추가 (실제 DB)"
```

---

## Task 6: 03-public-ticket-lookup.spec.ts

**Files:**
- Create: `tests/e2e/specs/03-public-ticket-lookup.spec.ts`

- [ ] **Step 1: 파일 작성**

```typescript
// tests/e2e/specs/03-public-ticket-lookup.spec.ts
import { test, expect } from "@playwright/test";
import { prisma, seedAdmin, seedRequestType, cleanupTicket } from "../fixtures/db";
import { captureStep } from "../fixtures/screenshot";

const TEST_EMAIL = "e2e-lookup@crinity-test.io";
let ticketNumber: string;

test.beforeAll(async () => {
  await seedAdmin();
  const rt = await seedRequestType();
  // DB에 직접 티켓 생성 (조회 테스트용)
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `CRN-E2E-LOOKUP-${Date.now()}`,
      customerName: "조회 테스트 고객",
      customerEmail: TEST_EMAIL,
      subject: "[E2E] 조회 테스트 티켓",
      description: "조회 테스트용 티켓입니다.",
      priority: "MEDIUM",
      requestTypeId: rt.id,
    },
  });
  ticketNumber = ticket.ticketNumber;
});

test.afterAll(async () => {
  await cleanupTicket(ticketNumber);
  await prisma.$disconnect();
});

test("고객이 티켓 번호와 이메일로 티켓을 조회한다", async ({ page }, testInfo) => {
  await test.step("조회 폼 접근", async () => {
    await page.goto("/ticket/lookup");
    await expect(page.getByLabel("티켓 번호")).toBeVisible();
    await captureStep(page, testInfo, "조회 폼 접근");
  });

  await test.step("티켓 번호 및 이메일 입력", async () => {
    await page.getByLabel("티켓 번호").fill(ticketNumber);
    await page.getByLabel("이메일").fill(TEST_EMAIL);
    await captureStep(page, testInfo, "티켓 번호 및 이메일 입력");
  });

  await test.step("조회 후 상세 페이지 이동", async () => {
    await page.getByRole("button", { name: "조회" }).click();
    await expect(page).toHaveURL(new RegExp(`/ticket/${ticketNumber}`), { timeout: 10000 });
    await captureStep(page, testInfo, "조회 후 상세 페이지 이동");
  });

  await test.step("티켓 정보 표시 확인", async () => {
    await expect(page.getByText(ticketNumber)).toBeVisible();
    await captureStep(page, testInfo, "티켓 정보 표시 확인");
  });
});
```

- [ ] **Step 2: 단독 실행**

```bash
pnpm test:e2e --grep "티켓 번호와 이메일로"
```

Expected: 1 passed

- [ ] **Step 3: 커밋**

```bash
git add tests/e2e/specs/03-public-ticket-lookup.spec.ts
git commit -m "test(e2e): 티켓 조회 spec 추가 (실제 DB)"
```

---

## Task 7: 04-admin-login.spec.ts

**Files:**
- Create: `tests/e2e/specs/04-admin-login.spec.ts`

- [ ] **Step 1: 파일 작성**

```typescript
// tests/e2e/specs/04-admin-login.spec.ts
import { test, expect } from "@playwright/test";
import { seedAdmin, prisma } from "../fixtures/db";
import { captureStep } from "../fixtures/screenshot";

test.beforeAll(async () => {
  await seedAdmin();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("관리자가 올바른 자격증명으로 로그인하여 대시보드에 진입한다", async ({ page }, testInfo) => {
  await test.step("로그인 페이지 접근", async () => {
    await page.goto("/admin/login");
    await expect(page.getByText("관리 콘솔")).toBeVisible();
    await captureStep(page, testInfo, "로그인 페이지 접근");
  });

  await test.step("자격증명 입력", async () => {
    await page.getByLabel("이메일").fill("admin@crinity.io");
    await page.getByLabel("비밀번호").fill("admin123");
    await captureStep(page, testInfo, "자격증명 입력");
  });

  await test.step("로그인 후 대시보드 이동", async () => {
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });
    await captureStep(page, testInfo, "로그인 후 대시보드 이동");
  });
});

test("잘못된 자격증명으로 로그인 시 오류 메시지가 표시된다", async ({ page }, testInfo) => {
  await test.step("로그인 페이지 접근", async () => {
    await page.goto("/admin/login");
  });

  await test.step("잘못된 자격증명 입력 및 제출", async () => {
    await page.getByLabel("이메일").fill("wrong@example.com");
    await page.getByLabel("비밀번호").fill("wrongpassword");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page.getByText("로그인에 실패했습니다")).toBeVisible({ timeout: 5000 });
    await captureStep(page, testInfo, "잘못된 자격증명 입력 및 제출");
  });
});
```

- [ ] **Step 2: 단독 실행**

```bash
pnpm test:e2e --grep "관리자가 올바른|잘못된 자격증명"
```

Expected: 2 passed

- [ ] **Step 3: 커밋**

```bash
git add tests/e2e/specs/04-admin-login.spec.ts
git commit -m "test(e2e): 관리자 로그인 spec 추가 (실제 DB)"
```

---

## Task 8: 05-admin-ticket-list.spec.ts

**Files:**
- Create: `tests/e2e/specs/05-admin-ticket-list.spec.ts`

- [ ] **Step 1: 파일 작성**

```typescript
// tests/e2e/specs/05-admin-ticket-list.spec.ts
import { test, expect } from "@playwright/test";
import { prisma, seedAdmin, seedRequestType, cleanupTicket } from "../fixtures/db";
import { captureStep } from "../fixtures/screenshot";

const TEST_TICKETS: string[] = [];

test.beforeAll(async () => {
  await seedAdmin();
  const rt = await seedRequestType();

  // 필터 테스트용 티켓 2개 생성
  const t1 = await prisma.ticket.create({
    data: {
      ticketNumber: `CRN-E2E-LIST-OPEN-${Date.now()}`,
      customerName: "목록 테스트 고객1",
      customerEmail: "e2e-list1@crinity-test.io",
      subject: "[E2E] 목록 테스트 OPEN 티켓",
      description: "목록 필터 테스트용",
      priority: "MEDIUM",
      status: "OPEN",
      requestTypeId: rt.id,
    },
  });
  const t2 = await prisma.ticket.create({
    data: {
      ticketNumber: `CRN-E2E-LIST-IP-${Date.now()}`,
      customerName: "목록 테스트 고객2",
      customerEmail: "e2e-list2@crinity-test.io",
      subject: "[E2E] 목록 테스트 IN_PROGRESS 티켓",
      description: "목록 필터 테스트용",
      priority: "HIGH",
      status: "IN_PROGRESS",
      requestTypeId: rt.id,
    },
  });
  TEST_TICKETS.push(t1.ticketNumber, t2.ticketNumber);
});

test.afterAll(async () => {
  for (const tn of TEST_TICKETS) await cleanupTicket(tn);
  await prisma.$disconnect();
});

test("관리자 세션으로 티켓 목록 페이지에 접근하고 필터를 사용한다", async ({ page }, testInfo) => {
  await test.step("관리자 로그인", async () => {
    await page.goto("/admin/login");
    await page.getByLabel("이메일").fill("admin@crinity.io");
    await page.getByLabel("비밀번호").fill("admin123");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });
    await captureStep(page, testInfo, "관리자 로그인");
  });

  await test.step("티켓 목록 페이지 접근", async () => {
    await page.goto("/admin/tickets");
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10000 });
    await captureStep(page, testInfo, "티켓 목록 페이지 접근");
  });

  await test.step("상태 필터 적용 (OPEN)", async () => {
    // Radix Select — aria-label로 선택
    await page.getByLabel("상태 필터").click();
    await page.getByRole("option", { name: "열림 (OPEN)" }).click();
    await page.waitForTimeout(500); // 필터 적용 대기
    await captureStep(page, testInfo, "상태 필터 적용 (OPEN)");
  });

  await test.step("필터 초기화", async () => {
    await page.getByLabel("상태 필터").click();
    await page.getByRole("option", { name: "모든 상태" }).click();
    await page.waitForTimeout(500);
    await captureStep(page, testInfo, "필터 초기화");
  });
});
```

- [ ] **Step 2: 단독 실행**

```bash
pnpm test:e2e --grep "티켓 목록 페이지"
```

Expected: 1 passed

> **참고:** 상태 필터 옵션 텍스트가 다르면 실패할 수 있음. 실패 시 `page.getByLabel("상태 필터").click()` 후 `page.pause()`로 실제 옵션 텍스트 확인 후 수정.

- [ ] **Step 3: 커밋**

```bash
git add tests/e2e/specs/05-admin-ticket-list.spec.ts
git commit -m "test(e2e): 관리자 티켓 목록/필터 spec 추가"
```

---

## Task 9: 06-admin-ticket-detail.spec.ts

**Files:**
- Create: `tests/e2e/specs/06-admin-ticket-detail.spec.ts`

- [ ] **Step 1: 파일 작성**

```typescript
// tests/e2e/specs/06-admin-ticket-detail.spec.ts
import { test, expect } from "@playwright/test";
import { prisma, seedAdmin, seedRequestType, cleanupTicket } from "../fixtures/db";
import { captureStep } from "../fixtures/screenshot";

let ticketId: string;
let ticketNumber: string;

test.beforeAll(async () => {
  await seedAdmin();
  const rt = await seedRequestType();
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `CRN-E2E-DETAIL-${Date.now()}`,
      customerName: "상세 테스트 고객",
      customerEmail: "e2e-detail@crinity-test.io",
      subject: "[E2E] 상세 페이지 테스트 티켓",
      description: "관리자 답변 및 상태 변경 테스트용 티켓입니다.",
      priority: "HIGH",
      status: "OPEN",
      requestTypeId: rt.id,
    },
  });
  ticketId = ticket.id;
  ticketNumber = ticket.ticketNumber;
});

test.afterAll(async () => {
  await cleanupTicket(ticketNumber);
  await prisma.$disconnect();
});

test("관리자가 티켓 상세에서 답변을 작성하고 상태를 변경한다", async ({ page }, testInfo) => {
  await test.step("관리자 로그인", async () => {
    await page.goto("/admin/login");
    await page.getByLabel("이메일").fill("admin@crinity.io");
    await page.getByLabel("비밀번호").fill("admin123");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });
    await captureStep(page, testInfo, "관리자 로그인");
  });

  await test.step("티켓 상세 페이지 접근", async () => {
    await page.goto(`/admin/tickets/${ticketId}`);
    await expect(page.getByText(ticketNumber)).toBeVisible({ timeout: 10000 });
    await captureStep(page, testInfo, "티켓 상세 페이지 접근");
  });

  await test.step("고객 답변 작성", async () => {
    await page.getByLabel("응답 작성").fill("[E2E] 자동화 테스트 답변입니다.");
    await captureStep(page, testInfo, "고객 답변 작성");
  });

  await test.step("답변 전송", async () => {
    await page.getByRole("button", { name: "전송" }).click();
    await expect(page.getByText("[E2E] 자동화 테스트 답변입니다.")).toBeVisible({ timeout: 5000 });
    await captureStep(page, testInfo, "답변 전송");
  });

  await test.step("내부 메모 작성 및 전송", async () => {
    await page.getByLabel("응답 작성").fill("[E2E] 내부 메모 내용입니다.");
    const internalCheck = page.getByLabel("내부 메모로 저장");
    if (await internalCheck.isVisible()) {
      await internalCheck.check();
    }
    await page.getByRole("button", { name: "전송" }).click();
    await captureStep(page, testInfo, "내부 메모 작성 및 전송");
  });

  await test.step("상태 변경 (OPEN → IN_PROGRESS)", async () => {
    // 상태 변경 UI는 구현에 따라 select 또는 버튼일 수 있음 — 실제 컴포넌트 확인 후 조정
    const statusSelect = page.getByLabel("상태");
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption("IN_PROGRESS");
    } else {
      await page.getByRole("button", { name: /상태 변경|IN_PROGRESS|진행중/i }).first().click();
    }
    await page.waitForTimeout(500);
    await captureStep(page, testInfo, "상태 변경");
  });

  await test.step("DB에서 상태 변경 확인", async () => {
    const updated = await prisma.ticket.findUnique({ where: { id: ticketId } });
    expect(updated!.status).toBe("IN_PROGRESS");
  });
});
```

- [ ] **Step 2: 단독 실행**

```bash
pnpm test:e2e --grep "티켓 상세에서 답변"
```

Expected: 1 passed

> **참고:** 답변 입력 필드 라벨("응답 작성"), 전송 버튼, 상태 변경 UI가 실제 컴포넌트와 다를 경우 실패. `page.pause()`로 실제 DOM 확인 후 로케이터 수정.

- [ ] **Step 3: 커밋**

```bash
git add tests/e2e/specs/06-admin-ticket-detail.spec.ts
git commit -m "test(e2e): 관리자 티켓 상세/답변/상태변경 spec 추가"
```

---

## Task 10: 전체 실행 및 Excel 리포트 확인

- [ ] **Step 1: 전체 E2E 실행**

```bash
pnpm test:e2e
```

Expected: 모든 테스트 통과, `test-report/YYYY-MM-DD-HHmm-e2e-checklist.xlsx` 생성

- [ ] **Step 2: Excel 파일 확인**

```bash
ls test-report/
open test-report/*.xlsx   # macOS
```

확인 항목:
- 헤더 행 파란 배경 / 흰 글씨
- PASS 셀 초록, FAIL 셀 빨강
- 스크린샷 열에 이미지 임베드
- 모든 단계 행 존재

- [ ] **Step 3: 기존 mock 기반 spec 파일 삭제**

```bash
rm tests/e2e/admin-login.spec.ts \
   tests/e2e/admin-ticket-workflow.spec.ts \
   tests/e2e/full-regression.spec.ts \
   tests/e2e/public-home.spec.ts \
   tests/e2e/public-ticket-create.spec.ts \
   tests/e2e/public-ticket-thread.spec.ts \
   tests/e2e/route-shells.spec.ts
```

- [ ] **Step 4: test-report/ gitignore 추가**

`.gitignore`에 추가:
```
test-report/
```

- [ ] **Step 5: 최종 커밋**

```bash
git add .gitignore tests/e2e/
git commit -m "chore: 기존 mock spec 삭제, test-report/ gitignore 추가"
```

---

## 실패 시 디버깅 가이드

| 증상 | 원인 | 해결 |
|------|------|------|
| 429 오류 | Rate limit 초과 | 개발 서버 재시작 후 재실행 |
| 로케이터 not found | 실제 라벨/텍스트 불일치 | `page.pause()` 또는 `--headed` 모드로 DOM 확인 |
| DB 연결 오류 | `.env` DATABASE_URL 경로 문제 | `.env` 파일 존재 여부 및 경로 확인 |
| Excel 이미지 깨짐 | 스크린샷 경로 오류 | `test-report/screenshots/` 디렉토리 존재 확인 |

헤드 모드 실행:
```bash
pnpm exec playwright test --headed --slow-mo=500
```
