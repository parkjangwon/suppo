import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const createdDirs: string[] = [];

afterEach(async () => {
  delete process.env.UPLOAD_DIR;

  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
});

describe("deleteLocalFileUrl", () => {
  it("deletes files referenced by internal upload URLs", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "suppo-cleanup-"));
    createdDirs.push(tempDir);
    process.env.UPLOAD_DIR = tempDir;
    const filePath = path.join(tempDir, "ticket-1", "saved.txt");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "saved");

    const { deleteLocalFileUrl } = await import("@suppo/shared/storage/local-storage");
    await deleteLocalFileUrl("/uploads/ticket-1/saved.txt");

    await expect(fs.access(filePath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("does not delete paths outside the upload root", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "suppo-cleanup-"));
    createdDirs.push(tempDir);
    process.env.UPLOAD_DIR = tempDir;

    const outsideFile = path.join(tempDir, "..", `outside-${Date.now()}.txt`);
    await fs.writeFile(outsideFile, "outside");
    createdDirs.push(outsideFile);

    const { deleteLocalFileUrl } = await import("@suppo/shared/storage/local-storage");
    await deleteLocalFileUrl(`/uploads/../${path.basename(outsideFile)}`);

    await expect(fs.access(outsideFile)).resolves.toBeUndefined();
  });
});
