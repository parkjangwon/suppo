import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

const tempDirs: string[] = [];

afterEach(async () => {
  delete process.env.UPLOAD_DIR;
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("legacy uploads routes", () => {
  it("does not expose raw upload files from the admin app", async () => {
    const { GET } = await import("@/app/uploads/[...path]/route");

    const response = await GET(new NextRequest("http://localhost/uploads/ticket-1/file.txt"), {
      params: Promise.resolve({ path: ["ticket-1", "file.txt"] }),
    });

    expect(response.status).toBe(404);
  });

  it("does not expose raw upload files from the public app", async () => {
    const { GET } = await import("../../apps/public/src/app/uploads/[...path]/route");

    const response = await GET(new NextRequest("http://localhost/uploads/ticket-1/file.txt"), {
      params: Promise.resolve({ path: ["ticket-1", "file.txt"] }),
    });

    expect(response.status).toBe(404);
  });

  it("serves branding assets through the dedicated public route", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "suppo-branding-"));
    tempDirs.push(tempDir);
    process.env.UPLOAD_DIR = tempDir;
    await fs.mkdir(path.join(tempDir, "branding"));
    await fs.writeFile(path.join(tempDir, "branding", "logo.png"), new Uint8Array([0x89, 0x50, 0x4e, 0x47]));

    const { GET } = await import("../../apps/public/src/app/api/branding-assets/[filename]/route");
    const response = await GET(new NextRequest("http://localhost/api/branding-assets/logo.png"), {
      params: Promise.resolve({ filename: "logo.png" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("rejects branding asset path traversal", async () => {
    const { GET } = await import("@/app/api/branding-assets/[filename]/route");
    const response = await GET(new NextRequest("http://localhost/api/branding-assets/../secret.txt"), {
      params: Promise.resolve({ filename: "../secret.txt" }),
    });

    expect(response.status).toBe(404);
  });
});
