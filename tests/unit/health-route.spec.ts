import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockQueryRaw,
  mockRedisAvailable,
  mockMkdir,
  mockWriteFile,
  mockUnlink,
  mockGetUploadDir,
} = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
  mockRedisAvailable: vi.fn(),
  mockMkdir: vi.fn(),
  mockWriteFile: vi.fn(),
  mockUnlink: vi.fn(),
  mockGetUploadDir: vi.fn(),
}));

vi.mock("@suppo/db", () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
  },
}));

vi.mock("@suppo/shared/cache/redis", () => ({
  isRedisAvailable: mockRedisAvailable,
}));

vi.mock("@suppo/shared/storage/upload-config", () => ({
  getUploadDir: mockGetUploadDir,
}));

vi.mock("fs/promises", () => ({
  default: {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
    unlink: mockUnlink,
  },
}));

describe("admin health route", () => {
  beforeEach(() => {
    vi.resetModules();
    mockQueryRaw.mockReset();
    mockRedisAvailable.mockReset();
    mockMkdir.mockReset();
    mockWriteFile.mockReset();
    mockUnlink.mockReset();
    mockGetUploadDir.mockReset();

    mockQueryRaw.mockResolvedValue([{ 1: 1 }]);
    mockRedisAvailable.mockResolvedValue(true);
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
    mockGetUploadDir.mockReturnValue("/var/lib/suppo/uploads");
    process.env.INTERNAL_EMAIL_DISPATCH_TOKEN = "email-token";
    process.env.INTERNAL_AUTOMATION_DISPATCH_TOKEN = "automation-token";
  });

  it("reports database and uploads health without exposing secret values", async () => {
    const { GET } = await import("@/app/api/health/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.checks).toMatchObject({
      database: "healthy",
      uploads: "healthy",
      redis: "healthy",
      emailDispatchToken: "healthy",
      automationDispatchToken: "healthy",
    });
    expect(JSON.stringify(body)).not.toContain("email-token");
    expect(JSON.stringify(body)).not.toContain("automation-token");
  });

  it("marks the service unhealthy when uploads are not writable", async () => {
    mockWriteFile.mockRejectedValue(new Error("permission denied"));

    const { GET } = await import("@/app/api/health/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("unhealthy");
    expect(body.checks.uploads).toBe("unhealthy");
  });

  it("marks missing internal dispatch tokens as degraded", async () => {
    delete process.env.INTERNAL_EMAIL_DISPATCH_TOKEN;
    delete process.env.INTERNAL_AUTOMATION_DISPATCH_TOKEN;

    const { GET } = await import("@/app/api/health/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.checks.emailDispatchToken).toBe("unknown");
    expect(body.checks.automationDispatchToken).toBe("unknown");
  });
});
