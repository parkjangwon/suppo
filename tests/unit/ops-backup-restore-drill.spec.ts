import { describe, expect, it } from "vitest";
import JSZip from "jszip";

import { validateBackupZip } from "../../scripts/ops-backup-restore-drill.mjs";

const requiredTables = [
  "agent",
  "attachment",
  "category",
  "comment",
  "customer",
  "requestType",
  "systemBranding",
  "ticket",
];

async function makeBackupZip(options: { includeAttachmentFile: boolean }) {
  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify({
    version: "1.0",
    schemaVersion: "20260429000000_test",
    createdAt: new Date().toISOString(),
    tables: requiredTables,
  }));

  const data = zip.folder("data")!;
  for (const table of requiredTables) {
    data.file(`${table}.json`, JSON.stringify([]));
  }

  data.file("attachment.json", JSON.stringify([
    {
      id: "attachment-1",
      fileName: "debug.txt",
      fileUrl: "/uploads/ticket-1/debug.txt",
    },
  ]));

  if (options.includeAttachmentFile) {
    zip.folder("attachments")!.folder("ticket-1")!.file("debug.txt", "debug");
  }

  return zip.generateAsync({ type: "nodebuffer" });
}

describe("ops backup restore drill", () => {
  it("passes for a structurally restorable backup archive", async () => {
    const result = await validateBackupZip(await makeBackupZip({ includeAttachmentFile: true }));

    expect(result.ok).toBe(true);
    expect(result.findings.filter((finding) => finding.level === "error")).toEqual([]);
    expect(result.summary.attachments).toBe(1);
  });

  it("fails when an attachment DB record points to a missing file", async () => {
    const result = await validateBackupZip(await makeBackupZip({ includeAttachmentFile: false }));

    expect(result.ok).toBe(false);
    expect(result.findings.map((finding) => finding.message)).toContain(
      "Attachment attachment-1 points to missing attachments/ticket-1/debug.txt",
    );
  });
});
