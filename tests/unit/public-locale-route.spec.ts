import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "../../apps/public/src/app/api/locale/route";

describe("public locale route", () => {
  it("sets a locale cookie for valid locales", async () => {
    const request = new NextRequest("http://localhost/api/locale", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ locale: "en" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.cookies.get("suppo-locale")?.value).toBe("en");
  });

  it("rejects invalid locales", async () => {
    const request = new NextRequest("http://localhost/api/locale", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ locale: "jp" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
