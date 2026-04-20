import { describe, expect, it } from "vitest";

import { isAllowedImageUploadMimeType } from "@suppo/shared/security/image-upload";

describe("isAllowedImageUploadMimeType", () => {
  it("allows raster image uploads", () => {
    expect(isAllowedImageUploadMimeType("image/png")).toBe(true);
    expect(isAllowedImageUploadMimeType("image/webp")).toBe(true);
  });

  it("rejects svg uploads", () => {
    expect(isAllowedImageUploadMimeType("image/svg+xml")).toBe(false);
  });
});
