import { test, expect } from "@playwright/test";
import { prisma, seedAdmin } from "../fixtures/db";

test.beforeAll(async () => {
  await seedAdmin();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("채팅 설정에 버튼 이미지 URL을 넣으면 public 플로팅 버튼이 이미지로 표시된다", async ({
  browser,
}) => {
  const buttonImageDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==";
  const adminPage = await browser.newPage();
  const publicPage = await browser.newPage();

  await adminPage.goto("http://127.0.0.1:3001/admin/login");
  await adminPage.getByLabel("이메일").fill("admin@crinity.io");
  await adminPage.getByLabel("비밀번호").fill("admin1234");
  await adminPage.getByRole("button", { name: "로그인" }).click();
  await expect(adminPage).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });

  await adminPage.goto("http://127.0.0.1:3001/admin/settings/chat");
  await expect(adminPage.getByLabel("플로팅 채팅 버튼 활성화")).toBeVisible({ timeout: 10000 });
  if (!(await adminPage.getByLabel("플로팅 채팅 버튼 활성화").isChecked())) {
    await adminPage.getByLabel("플로팅 채팅 버튼 활성화").click();
  }
  const buttonImageUrlInput = adminPage.getByRole("textbox", { name: "버튼 이미지 URL", exact: true });
  await expect(buttonImageUrlInput).toBeEnabled({ timeout: 10000 });
  await buttonImageUrlInput.fill(buttonImageDataUrl);
  await adminPage.getByRole("combobox", { name: "버튼 크기", exact: true }).click();
  await adminPage.getByRole("option", { name: "크게" }).click();
  await adminPage.getByRole("combobox", { name: "버튼 모양", exact: true }).click();
  await adminPage.getByRole("option", { name: "원형" }).click();
  await adminPage.getByRole("combobox", { name: "버튼 그림자", exact: true }).click();
  await adminPage.getByRole("option", { name: "강하게" }).click();
  const saveResponse = adminPage.waitForResponse(
    (response) =>
      response.url().includes("/api/admin/chat/widget-settings") &&
      response.request().method() === "PATCH",
    { timeout: 10000 }
  );
  await adminPage.getByRole("button", { name: "위젯 설정 저장" }).click();
  await expect((await saveResponse).ok()).toBeTruthy();
  await prisma.chatWidgetSettings.update({
    where: { id: "default" },
    data: {
      enabled: true,
      buttonImageUrl: buttonImageDataUrl,
      buttonSize: "lg",
      buttonShape: "circle",
      buttonShadow: "strong",
    },
  });

  await publicPage.goto(`http://127.0.0.1:3000/?ts=${Date.now()}`);
  const launcher = publicPage.locator("#crinity-chat-launcher");
  await expect(launcher).toBeVisible({ timeout: 10000 });
  await expect(launcher.locator("img")).toHaveAttribute("src", buttonImageDataUrl);
  await expect
    .poll(async () => await launcher.evaluate((element) => getComputedStyle(element).borderRadius))
    .toBe("9999px");
  await expect
    .poll(async () => await launcher.evaluate((element) => getComputedStyle(element).boxShadow))
    .toContain("rgba(15, 23, 42, 0.34)");
});
