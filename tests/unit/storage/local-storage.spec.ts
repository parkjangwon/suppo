import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const createdDirs: string[] = [];

afterEach(async () => {
  delete process.env.UPLOAD_DIR;

  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (!dir) {
      continue;
    }

    await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("saveToLocal", () => {
  it("does not append the file extension twice", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "crinity-upload-"));
    createdDirs.push(tempDir);
    process.env.UPLOAD_DIR = tempDir;
    const { saveToLocal } = await import("@crinity/shared/storage/local-storage");

    const file = {
      name: "report.pdf",
      type: "application/pdf",
      async arrayBuffer() {
        return new TextEncoder().encode("hello").buffer;
      },
    } as File;

    const storedPath = await saveToLocal(file, "ticket-1", "uuid-report.pdf");

    expect(storedPath).toBe("/uploads/ticket-1/uuid-report.pdf");
    await expect(fs.access(path.join(tempDir, "ticket-1", "uuid-report.pdf"))).resolves.toBeUndefined();
  });
});
