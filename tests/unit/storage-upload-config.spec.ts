import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { findProjectRoot, getUploadDir, isPathInside } from "@suppo/shared/storage/upload-config";

const originalCwd = process.cwd();
const originalUploadDir = process.env.UPLOAD_DIR;

function makeTempWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "suppo-upload-config-"));
  fs.mkdirSync(path.join(root, "apps", "public"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "admin"), { recursive: true });
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n");
  return fs.realpathSync(root);
}

afterEach(() => {
  process.chdir(originalCwd);

  if (originalUploadDir === undefined) {
    delete process.env.UPLOAD_DIR;
  } else {
    process.env.UPLOAD_DIR = originalUploadDir;
  }
});

describe("upload config", () => {
  it("resolves the default upload dir from the workspace root", () => {
    const root = makeTempWorkspace();
    process.chdir(path.join(root, "apps", "public"));
    delete process.env.UPLOAD_DIR;

    expect(getUploadDir()).toBe(path.join(root, "uploads"));
  });

  it("resolves relative UPLOAD_DIR values from the shared project root", () => {
    const root = makeTempWorkspace();
    process.chdir(path.join(root, "apps", "admin"));
    process.env.UPLOAD_DIR = "storage/uploads";

    expect(getUploadDir()).toBe(path.join(root, "storage", "uploads"));
  });

  it("falls back from standalone app directories to their shared root", () => {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "suppo-standalone-")));
    const appDir = path.join(root, "apps", "public");
    fs.mkdirSync(appDir, { recursive: true });

    expect(findProjectRoot(appDir)).toBe(root);
  });

  it("keeps traversal checks inside the resolved upload root", () => {
    const root = path.join(os.tmpdir(), "suppo-upload-root");

    expect(isPathInside(path.join(root, "ticket", "file.txt"), root)).toBe(true);
    expect(isPathInside(path.join(root, "..", "outside.txt"), root)).toBe(false);
  });
});
