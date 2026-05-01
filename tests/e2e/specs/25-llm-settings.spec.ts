import { expect, test } from "@playwright/test";

import { prisma, seedAdmin } from "../fixtures/db";
import { captureStep } from "../fixtures/screenshot";

const OLLAMA_URL = process.env.E2E_OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.E2E_OLLAMA_MODEL ?? "gemma4:e2b";

test.beforeAll(async () => {
  await seedAdmin();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("관리자가 Ollama LLM 모델을 설정한다", async ({ page }, testInfo) => {
  await test.step("관리자 로그인", async () => {
    await page.goto("http://127.0.0.1:3001/admin/login");
    await page.getByLabel("이메일").fill("admin@suppo.io");
    await page.getByLabel("비밀번호").fill("admin1234");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 10000 });
    await captureStep(page, testInfo, "관리자 로그인");
  });

  await test.step("AI 연동 설정 페이지 접근", async () => {
    await page.goto("http://127.0.0.1:3001/admin/settings/llm");
    await expect(page.getByRole("heading", { name: "AI 연동" })).toBeVisible();
    await captureStep(page, testInfo, "AI 연동 설정 페이지 접근");
  });

  await test.step("Ollama 모델 정보 입력", async () => {
    const ollamaUrlInput = page.getByText("Ollama URL").locator("..").getByRole("textbox");
    const ollamaModelInput = page.getByText("Ollama 모델명").locator("..").getByRole("textbox");

    await ollamaUrlInput.fill(OLLAMA_URL);
    await ollamaModelInput.fill(OLLAMA_MODEL);
    await captureStep(page, testInfo, "Ollama 모델 정보 입력");
  });

  await test.step("LLM 설정 저장", async () => {
    const saveResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/settings/llm") &&
        response.request().method() === "PUT",
      { timeout: 10000 }
    );

    await page.getByRole("button", { name: "설정 저장" }).click();
    const response = await saveResponse;
    expect(response.ok()).toBeTruthy();
    await captureStep(page, testInfo, "LLM 설정 저장");
  });

  await test.step("DB에서 Ollama 설정 확인", async () => {
    const settings = await prisma.lLMSettings.findUnique({ where: { id: "default" } });

    expect(settings?.provider).toBe("ollama");
    expect(settings?.ollamaUrl).toBe(OLLAMA_URL);
    expect(settings?.ollamaModel).toBe(OLLAMA_MODEL);
  });
});
