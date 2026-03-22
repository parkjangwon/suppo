import { existsSync } from "node:fs";
import path from "node:path";

interface ResolveDatabaseUrlOptions {
  cwd?: string;
  configuredUrl?: string;
}

function resolveRepoRoot(cwd: string) {
  const repoCandidate = path.resolve(cwd, "../..");
  if (existsSync(path.join(repoCandidate, "packages/db/dev.db"))) {
    return repoCandidate;
  }

  return cwd;
}

export function resolveDatabaseUrl({
  cwd = process.cwd(),
  configuredUrl = process.env.DATABASE_URL?.trim(),
}: ResolveDatabaseUrlOptions = {}): string {
  if (configuredUrl) {
    if (configuredUrl.startsWith("file:./") || configuredUrl.startsWith("file:../")) {
      const repoRoot = resolveRepoRoot(cwd);
      const relativePath = configuredUrl.slice("file:".length);
      return `file:${path.resolve(repoRoot, relativePath.replace(/^\.\//, ""))}`;
    }

    return configuredUrl;
  }

  const appScopedPath = path.resolve(cwd, "../../packages/db/dev.db");
  if (existsSync(appScopedPath)) {
    return `file:${appScopedPath}`;
  }

  const repoScopedPath = path.resolve(cwd, "packages/db/dev.db");
  return `file:${repoScopedPath}`;
}
