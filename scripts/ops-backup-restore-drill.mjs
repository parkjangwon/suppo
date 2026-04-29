#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import JSZip from "jszip";

const REQUIRED_TABLES = [
  "agent",
  "attachment",
  "category",
  "comment",
  "customer",
  "requestType",
  "systemBranding",
  "ticket",
];

function parseArgs(argv) {
  const args = {
    file: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--file") {
      args.file = argv[index + 1];
      index += 1;
      continue;
    }

    if (!arg.startsWith("--") && !args.file) {
      args.file = arg;
    }
  }

  return args;
}

function addFinding(findings, level, message) {
  findings.push({ level, message });
}

function uploadFileUrlToZipPath(fileUrl) {
  if (typeof fileUrl !== "string" || !fileUrl.startsWith("/uploads/")) {
    return null;
  }

  const relativePath = fileUrl.slice("/uploads/".length);
  if (!relativePath || relativePath.includes("..") || path.isAbsolute(relativePath)) {
    return null;
  }

  return `attachments/${relativePath}`;
}

async function readJsonFile(zip, fileName, findings) {
  const file = zip.file(fileName);
  if (!file) {
    addFinding(findings, "error", `${fileName} is missing`);
    return null;
  }

  try {
    return JSON.parse(await file.async("text"));
  } catch {
    addFinding(findings, "error", `${fileName} is not valid JSON`);
    return null;
  }
}

export async function validateBackupZip(buffer) {
  const findings = [];
  let zip;

  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return {
      ok: false,
      findings: [{ level: "error", message: "Backup file is not a valid ZIP archive" }],
      summary: { tables: 0, attachments: 0, attachmentFiles: 0 },
    };
  }

  const manifest = await readJsonFile(zip, "manifest.json", findings);
  if (manifest) {
    if (manifest.version !== "1.0") {
      addFinding(findings, "error", `Unsupported backup manifest version: ${manifest.version ?? "missing"}`);
    }

    if (!manifest.schemaVersion) {
      addFinding(findings, "warning", "manifest.schemaVersion is missing");
    }
  }

  const tables = new Map();
  for (const requiredTable of REQUIRED_TABLES) {
    const rows = await readJsonFile(zip, `data/${requiredTable}.json`, findings);
    if (Array.isArray(rows)) {
      tables.set(requiredTable, rows);
    } else if (rows !== null) {
      addFinding(findings, "error", `data/${requiredTable}.json must contain a JSON array`);
    }
  }

  const attachmentRows = tables.get("attachment") ?? [];
  const zipFiles = new Set(Object.keys(zip.files).filter((entry) => !zip.files[entry].dir));
  let checkedAttachmentFiles = 0;

  for (const attachment of attachmentRows) {
    const zipPath = uploadFileUrlToZipPath(attachment?.fileUrl);
    if (!zipPath) {
      addFinding(findings, "error", `Attachment ${attachment?.id ?? "(unknown)"} has an invalid fileUrl`);
      continue;
    }

    checkedAttachmentFiles += 1;
    if (!zipFiles.has(zipPath)) {
      addFinding(findings, "error", `Attachment ${attachment.id ?? attachment.fileName ?? zipPath} points to missing ${zipPath}`);
    }
  }

  const hasAttachmentsFolder = Object.keys(zip.files).some((entry) => entry === "attachments/" || entry.startsWith("attachments/"));
  if (!hasAttachmentsFolder) {
    addFinding(findings, "warning", "attachments/ folder is missing; this is only acceptable when there are no uploaded files");
  }

  return {
    ok: findings.every((finding) => finding.level !== "error"),
    findings,
    summary: {
      tables: tables.size,
      attachments: attachmentRows.length,
      attachmentFiles: checkedAttachmentFiles,
    },
  };
}

function printReport(result) {
  console.log("\nBackup Restore Drill\n");
  console.log(`Tables checked: ${result.summary.tables}`);
  console.log(`Attachment records checked: ${result.summary.attachments}`);
  console.log(`Attachment files checked: ${result.summary.attachmentFiles}`);

  if (result.findings.length === 0) {
    console.log("\nPASS: backup archive is structurally restorable");
    return;
  }

  console.log("");
  for (const finding of result.findings) {
    console.log(`${finding.level.toUpperCase()}: ${finding.message}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error("Usage: pnpm ops:backup-drill -- --file ./backup.zip");
    process.exit(2);
  }

  const buffer = await fs.readFile(path.resolve(process.cwd(), args.file));
  const result = await validateBackupZip(buffer);
  printReport(result);

  if (!result.ok) {
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
