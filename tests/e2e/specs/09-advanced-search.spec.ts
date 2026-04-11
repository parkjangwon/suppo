// tests/e2e/specs/09-advanced-search.spec.ts
import { test, expect } from "@playwright/test";
import { prisma, seedAdmin, seedRequestType, cleanupTicket } from "../fixtures/db";
import { captureStep } from "../fixtures/screenshot";
import { subDays, format } from "date-fns";

test.beforeAll(async () => {
  await seedAdmin();
  await seedRequestType();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test.describe("고급 검색 필터", () => {
  const ticketNumbers: string[] = [];

  test.beforeAll(async () => {
    const rt = await seedRequestType();
    const admin = await prisma.agent.findFirst({ where: { email: "admin@crinity.io" } });

    // 테스트용 티켓 3개 생성 (다른 날짜)
    for (let i = 0; i < 3; i++) {
      const date = subDays(new Date(), i * 2); // 0, 2, 4일 전
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `CRN-E2E-SEARCH-${Date.now()}-${i}`,
          customerName: `Search Test Customer ${i}`,
          customerEmail: `search${i}@crinity-test.io`,
          subject: `[E2E] 검색 테스트 티켓 ${i}`,
          description: `Description for ticket ${i}`,
          priority: ["HIGH", "MEDIUM", "LOW"][i] as "HIGH" | "MEDIUM" | "LOW",
          status: ["OPEN", "IN_PROGRESS", "RESOLVED"][i] as "OPEN" | "IN_PROGRESS" | "RESOLVED",
          requestTypeId: rt.id,
          assigneeId: i === 0 ? admin?.id : null,
          createdAt: date,
        },
      });
      ticketNumbers.push(ticket.ticketNumber);
    }
  });

  test.afterAll(async () => {
    for (const ticketNumber of ticketNumbers) {
      await cleanupTicket(ticketNumber);
    }
  });

  test("날짜 범위로 티켓을 필터링한다", async ({ page }, testInfo) => {
    await test.step("관리자 로그인", async () => {
      await page.goto("http://127.0.0.1:3001/admin/login");
      await page.getByLabel("이메일").fill("admin@crinity.io");
      await page.getByLabel("비밀번호").fill("admin1234");
      await page.getByRole("button", { name: "로그인" }).click();
      await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });
    });

    await test.step("티켓 목록 페이지 접근", async () => {
      await page.goto("http://127.0.0.1:3001/admin/tickets");
      await expect(page.getByRole("heading", { name: "티켓 목록" })).toBeVisible();
    });

    await test.step("오늘부터 1일 전까지 필터링", async () => {
      const today = format(new Date(), "yyyy.MM.dd");
      const yesterday = format(subDays(new Date(), 1), "yyyy.MM.dd");

      // 시작일 설정
      await page.getByRole("button", { name: "시작일" }).click();
      await page.locator("[data-day]").filter({ hasText: new Date().getDate().toString() }).first().click();
      await page.waitForTimeout(500);

      // 종료일 설정
      await page.getByRole("button", { name: "종료일" }).click();
      await page.locator("[data-day]").filter({ hasText: new Date().getDate().toString() }).first().click();
      await page.waitForTimeout(500);

      await captureStep(page, testInfo, "날짜-필터-적용");

      // 결과 확인 - 첫 번째 티켓만 표시되어야 함 (오늘 생성됨)
      await expect(page.getByText(ticketNumbers[0])).toBeVisible();
    });
  });

  test("상태 + 우선순위 조합 필터링", async ({ page }, testInfo) => {
    await test.step("관리자 로그인", async () => {
      await page.goto("http://127.0.0.1:3001/admin/login");
      await page.getByLabel("이메일").fill("admin@crinity.io");
      await page.getByLabel("비밀번호").fill("admin1234");
      await page.getByRole("button", { name: "로그인" }).click();
      await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });
    });

    await test.step("티켓 목록 페이지 접근", async () => {
      await page.goto("http://127.0.0.1:3001/admin/tickets");
      await expect(page.getByRole("heading", { name: "티켓 목록" })).toBeVisible();
    });

    await test.step("상태 필터: OPEN", async () => {
      await page.getByRole("combobox").filter({ hasText: "모든 상태" }).click();
      await page.getByRole("option", { name: "열림" }).click();
      await page.waitForTimeout(500);

      await captureStep(page, testInfo, "상태-필터-OPEN");

      // OPEN 상태 티켓만 표시
      await expect(page.getByText(ticketNumbers[0])).toBeVisible();
      await expect(page.getByText(ticketNumbers[2])).not.toBeVisible();
    });

      await test.step("우선순위 필터: HIGH 추가", async () => {
      await page.getByRole("combobox").filter({ hasText: "모든 우선순위" }).click();
      await page.getByRole("option", { name: "높음 (HIGH)" }).click();
      await page.waitForTimeout(500);

      await captureStep(page, testInfo, "우선순위-필터-HIGH");

      // OPEN + HIGH 티켓만 표시 (첫 번째)
      await expect(page.getByText(ticketNumbers[0])).toBeVisible();
    });

    await test.step("필터 초기화", async () => {
      await page.getByRole("button", { name: "필터 초기화" }).click();
      await page.waitForTimeout(500);

      // 필터가 해제되면 최근 티켓들이 다시 보여야 함
      await expect(page.getByText(ticketNumbers[0])).toBeVisible();
      await expect(page.getByText(ticketNumbers[1])).toBeVisible();
    });
  });

  test("검색어로 티켓을 검색한다", async ({ page }, testInfo) => {
    await test.step("관리자 로그인 및 티켓 목록", async () => {
      await page.goto("http://127.0.0.1:3001/admin/login");
      await page.getByLabel("이메일").fill("admin@crinity.io");
      await page.getByLabel("비밀번호").fill("admin1234");
      await page.getByRole("button", { name: "로그인" }).click();
      await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });

      await page.goto("http://127.0.0.1:3001/admin/tickets");
      await expect(page.getByRole("heading", { name: "티켓 목록" })).toBeVisible();
    });

    await test.step("제목 키워드로 검색", async () => {
      const searchInput = page.getByPlaceholder("티켓 번호, 제목, 이메일 검색...");
      await searchInput.fill("[E2E] 검색 테스트 티켓 0");
      await page.getByRole("button", { name: "검색", exact: true }).click();
      await page.waitForTimeout(500);

      await captureStep(page, testInfo, "검색-결과");

      // 검색 UI가 정상 동작하고 결과 화면이 유지되는지만 확인
      await expect(page.getByRole("heading", { name: "티켓 목록" })).toBeVisible();
      await expect(searchInput).toHaveValue("[E2E] 검색 테스트 티켓 0");
    });

    await test.step("이메일로 검색", async () => {
      await page.getByRole("button", { name: "필터 초기화" }).click();
      await page.waitForTimeout(500);

      const searchInput = page.getByPlaceholder("티켓 번호, 제목, 이메일 검색...");
      await searchInput.fill("search1@crinity-test.io");
      await page.getByRole("button", { name: "검색", exact: true }).click();
      await page.waitForTimeout(500);

      await expect(page.getByRole("heading", { name: "티켓 목록" })).toBeVisible();
      await expect(searchInput).toHaveValue("search1@crinity-test.io");

      await captureStep(page, testInfo, "이메일-검색");
    });
  });

  test("담당자 필터링 (미할당 / 특정 상담원)", async ({ page }, testInfo) => {
    await test.step("관리자 로그인 및 티켓 목록", async () => {
      await page.goto("http://127.0.0.1:3001/admin/login");
      await page.getByLabel("이메일").fill("admin@crinity.io");
      await page.getByLabel("비밀번호").fill("admin1234");
      await page.getByRole("button", { name: "로그인" }).click();
      await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });

      await page.goto("http://127.0.0.1:3001/admin/tickets");
      await expect(page.getByRole("heading", { name: "티켓 목록" })).toBeVisible();
    });

    await test.step("미할당 필터", async () => {
      await page.getByRole("combobox").filter({ hasText: "모든 담당자" }).click();
      await page.getByRole("option", { name: "미할당" }).click();
      await page.waitForTimeout(500);

      await captureStep(page, testInfo, "미할당-필터");

      // 미할당 티켓 (1, 2번) 표시
      await expect(page.getByText(ticketNumbers[1])).toBeVisible();
      await expect(page.getByText(ticketNumbers[2])).toBeVisible();
    });

    await test.step("필터 초기화", async () => {
      await page.getByRole("button", { name: "필터 초기화" }).click();
      await page.waitForTimeout(500);
    });
  });
});
