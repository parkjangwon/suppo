import { cpSync, existsSync, mkdirSync, readdirSync, realpathSync, rmSync } from "fs";
import path from "path";

const appName = process.argv[2];

if (!appName) {
  throw new Error("Usage: node docker/copy-standalone-deps.mjs <app-name>");
}

const standaloneNodeModules = `/app/apps/${appName}/.next/standalone/node_modules`;
const dbNodeModules = "/app/packages/db/node_modules";
const packages = ["@prisma/adapter-libsql", "@libsql/client", "libsql"];
const copiedRealpaths = new Set();

function copyPackageFromRealpath(packageName, packageRealpath) {
  if (copiedRealpaths.has(packageRealpath)) {
    return;
  }
  copiedRealpaths.add(packageRealpath);

  const packageDestination = path.join(standaloneNodeModules, packageName);
  rmSync(packageDestination, { force: true, recursive: true });
  mkdirSync(path.dirname(packageDestination), { recursive: true });
  cpSync(packageRealpath, packageDestination, { dereference: true, recursive: true });

  copySiblingDependencies(packageRealpath);
}

function copySiblingDependencies(packageRealpath) {
  const parts = packageRealpath.split(path.sep);
  const nodeModulesIndex = parts.lastIndexOf("node_modules");
  const packageNodeModules = parts.slice(0, nodeModulesIndex + 1).join(path.sep);

  for (const entry of readdirSync(packageNodeModules)) {
    if (entry === ".bin") {
      continue;
    }

    const source = path.join(packageNodeModules, entry);
    if (entry.startsWith("@")) {
      for (const scopedEntry of readdirSync(source)) {
        const scopedSource = path.join(source, scopedEntry);
        copyPackageFromRealpath(`${entry}/${scopedEntry}`, realpathSync(scopedSource));
      }
      continue;
    }

    copyPackageFromRealpath(entry, realpathSync(source));
  }
}

function copyPackageClosure(packageName) {
  const packageLink = path.join(dbNodeModules, packageName);
  if (!existsSync(packageLink)) {
    return;
  }

  copyPackageFromRealpath(packageName, realpathSync(packageLink));
}

for (const packageName of packages) {
  copyPackageClosure(packageName);
}
