import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDeleteLocalFileUrl, mockSaveToLocal } = vi.hoisted(() => ({
  mockDeleteLocalFileUrl: vi.fn(),
  mockSaveToLocal: vi.fn(),
}));

vi.mock("@suppo/shared/storage/local-storage", () => ({
  deleteLocalFileUrl: mockDeleteLocalFileUrl,
  saveToLocal: mockSaveToLocal,
}));

describe("processAttachments storage backend", () => {
  beforeEach(() => {
    vi.resetModules();
    mockDeleteLocalFileUrl.mockReset();
    mockSaveToLocal.mockReset();
    mockSaveToLocal.mockResolvedValue("/uploads/ticket-1/saved.txt");
    process.env.NODE_ENV = "production";
    process.env.AWS_S3_BUCKET_NAME = "legacy-bucket";
    process.env.AWS_REGION = "ap-northeast-2";
  });

  it("always saves ticket attachments to local storage even when legacy S3 env vars exist", async () => {
    const { processAttachments } = await import("@suppo/shared/storage/attachment-service");
    const file = new File(["plain log"], "debug.txt", { type: "text/plain" });

    const [result] = await processAttachments([file], "ticket-1");

    expect(mockSaveToLocal).toHaveBeenCalledOnce();
    expect(result.fileUrl).toBe("/uploads/ticket-1/saved.txt");
    expect(result.fileUrl).not.toContain("s3.");
  });

  it("cleans up files already saved if a later attachment fails", async () => {
    const { processAttachments } = await import("@suppo/shared/storage/attachment-service");
    const first = new File(["plain log"], "debug-1.txt", { type: "text/plain" });
    const second = new File(["plain log"], "debug-2.txt", { type: "text/plain" });

    mockSaveToLocal
      .mockResolvedValueOnce("/uploads/ticket-1/debug-1.txt")
      .mockRejectedValueOnce(new Error("disk full"));

    await expect(processAttachments([first, second], "ticket-1")).rejects.toThrow("disk full");
    expect(mockDeleteLocalFileUrl).toHaveBeenCalledWith("/uploads/ticket-1/debug-1.txt");
  });
});
