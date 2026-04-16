import type { MetadataRoute } from "next";
import { getPublicAppUrl } from "@crinity/shared/utils/app-urls";

const baseUrl = getPublicAppUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/_next/"]
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`
  };
}
