import { existsSync } from "node:fs";
import path from "node:path";

interface ResolveDatabaseUrlOptions {
  cwd?: string;
  configuredUrl?: string;
}

function findWorkspaceRoot(startCwd: string) {
  let current = path.resolve(startCwd);
  let previous = "";

  while (current !== previous) {
    if (existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }

    if (path.basename(current) === "apps") {
      return path.dirname(current);
    }

    previous = current;
    current = path.dirname(current);
  }

  return startCwd;
}

export function resolveDatabaseUrl({
  cwd = process.cwd(),
  configuredUrl = process.env.DATABASE_URL?.trim(),
}: ResolveDatabaseUrlOptions = {}): string {
  const workspaceRoot = findWorkspaceRoot(cwd);

  if (configuredUrl) {
    if (configuredUrl.startsWith("file:./") || configuredUrl.startsWith("file:../")) {
      const relativePath = configuredUrl.slice("file:".length);
      return `file:${path.resolve(workspaceRoot, relativePath)}`;
    }

    return configuredUrl;
  }

  return `file:${path.resolve(workspaceRoot, "packages/db/dev.db")}`;
}
