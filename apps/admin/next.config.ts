import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  outputFileTracingIncludes: {
    "/**": [
      "../../node_modules/@libsql/**",
      "../../node_modules/@prisma/adapter-libsql/**",
      "../../node_modules/@prisma/driver-adapter-utils/**",
      "../../node_modules/.pnpm/@libsql*/**",
      "../../node_modules/.pnpm/@prisma+adapter-libsql@*/**",
      "../../node_modules/.pnpm/@prisma+driver-adapter-utils@*/**",
      "../../node_modules/.pnpm/libsql*/**",
      "../../packages/db/node_modules/.prisma/**"
    ]
  },
  serverExternalPackages: [
    "@prisma/adapter-libsql",
    "@libsql/client",
    "libsql",
    "@libsql/darwin-arm64",
    "@libsql/hrana-client",
    "nodemailer",
    "@aws-sdk/client-sesv2"
  ],
  transpilePackages: ["@suppo/ui", "@suppo/shared"],
  eslint: {
    ignoreDuringBuilds: true
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "600mb"
    }
  },
  async headers() {
    const isDevelopment = process.env.NODE_ENV === "development";

    const cspDirectives = {
      "default-src": ["'self'"],
      "script-src": isDevelopment
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
        : ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "https:", "blob:"],
      "font-src": ["'self'", "https:"],
      "connect-src": ["'self'", "https:", "ws:"],
      "media-src": ["'self'"],
      "object-src": ["'none'"],
      "frame-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
      "report-uri": isDevelopment ? [] : ["/api/security/csp-report"],
      "report-to": isDevelopment ? [] : ["csp-endpoint"]
    };

    const cspValue = Object.entries(cspDirectives)
      .map(([directive, sources]) => `${directive} ${sources.filter(Boolean).join(" ")}`)
      .join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspValue },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), fullscreen=(), payment=()"
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload"
          },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" }
        ]
      }
    ];
  }
};

export default nextConfig;
