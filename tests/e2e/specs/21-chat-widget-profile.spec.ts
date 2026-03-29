import { test, expect } from "@playwright/test";
import { prisma, seedAdmin } from "../fixtures/db";

let profileId: string;

test.beforeAll(async () => {
  await seedAdmin();

  const profile = await prisma.chatWidgetProfile.create({
    data: {
      name: "브랜드 A 위젯",
      widgetKey: `brand-a-${Date.now()}`,
      buttonLabel: "브랜드 A 상담",
      welcomeTitle: "브랜드 A 지원센터",
      welcomeMessage: "브랜드 A 전용 채팅입니다.",
      accentColor: "#ef4444",
      position: "bottom-right",
      enabled: true,
    },
  });

  profileId = profile.id;
});

test.afterAll(async () => {
  await prisma.chatWidgetProfile.deleteMany({ where: { id: profileId } });
  await prisma.$disconnect();
});

test("widgetKey가 다르면 SDK와 위젯 문구가 프로필별로 분리된다", async ({ page }) => {
  const profile = await prisma.chatWidgetProfile.findUniqueOrThrow({
    where: { id: profileId },
  });

  await page.goto(`http://127.0.0.1:3000/chat/sdk-host?widgetKey=${encodeURIComponent(profile.widgetKey)}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect
    .poll(
      async () =>
        await page.evaluate(() => {
          // @ts-expect-error test hook
          return typeof window.CrinityChatWidget?.init === "function";
        }),
      { timeout: 10000 }
    )
    .toBe(true);
  await page.evaluate((widgetKey) => {
    // @ts-expect-error test hook
    return window.CrinityChatWidget?.init({ widgetKey });
  }, profile.widgetKey);

  const launcher = page.locator("#crinity-chat-launcher");
  await expect(launcher).toHaveText("브랜드 A 상담");

  const popupPromise = page.context().waitForEvent("page");
  await launcher.click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  await popup.evaluate(() => localStorage.clear());
  await popup.reload();

  await expect(popup.getByText("브랜드 A 지원센터")).toBeVisible({ timeout: 10000 });
  await expect(popup.getByText("브랜드 A 전용 채팅입니다.")).toBeVisible({ timeout: 10000 });
});
