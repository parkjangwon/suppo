import { describe, expect, it } from "vitest";

import { validateFile, verifyFileSignature } from "@suppo/shared/security/file-upload";

function makeFile(name: string, type: string, bytes: number[]) {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("file upload signature validation", () => {
  it("rejects zip based office files whose bytes are not zip files", async () => {
    const file = makeFile("report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", [
      0x25, 0x50, 0x44, 0x46,
    ]);

    expect(await verifyFileSignature(file, file.type)).toBe(false);
    await expect(validateFile(file)).resolves.toMatchObject({ valid: false });
  });

  it("accepts zip based office files with valid zip headers", async () => {
    const file = makeFile("report.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", [
      0x50, 0x4b, 0x03, 0x04,
    ]);

    expect(await verifyFileSignature(file, file.type)).toBe(true);
  });

  it("rejects RIFF files that are not WebP images", async () => {
    const file = makeFile("audio.webp", "image/webp", [
      0x52, 0x49, 0x46, 0x46,
      0x00, 0x00, 0x00, 0x00,
      0x57, 0x41, 0x56, 0x45,
    ]);

    expect(await verifyFileSignature(file, file.type)).toBe(false);
  });

  it("accepts WebP files with RIFF and WEBP markers", async () => {
    const file = makeFile("image.webp", "image/webp", [
      0x52, 0x49, 0x46, 0x46,
      0x00, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50,
    ]);

    expect(await verifyFileSignature(file, file.type)).toBe(true);
  });
});
