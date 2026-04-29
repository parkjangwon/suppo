import fs from "fs";
import path from "path";

const DEFAULT_UPLOAD_DIR = "uploads";
const APP_DIR_PATTERN = /[\\/]apps[\\/](admin|public)$/;

function hasWorkspaceMarker(dir: string): boolean {
  return fs.existsSync(path.join(dir, "pnpm-workspace.yaml"));
}

export function findProjectRoot(startDir = process.cwd()): string {
  let current = path.resolve(startDir);

  while (true) {
    if (hasWorkspaceMarker(current)) {
      return current;
    }

    if (APP_DIR_PATTERN.test(current)) {
      return path.resolve(current, "..", "..");
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }
    current = parent;
  }
}

export function getUploadDir(): string {
  const configuredUploadDir = process.env.UPLOAD_DIR?.trim() || DEFAULT_UPLOAD_DIR;

  if (path.isAbsolute(configuredUploadDir)) {
    return path.resolve(configuredUploadDir);
  }

  return path.resolve(findProjectRoot(), configuredUploadDir);
}

export function isPathInside(childPath: string, parentPath: string): boolean {
  const relativePath = path.relative(path.resolve(parentPath), path.resolve(childPath));

  return relativePath === "" || (
    relativePath !== "" &&
    !relativePath.startsWith("..") &&
    !path.isAbsolute(relativePath)
  );
}
