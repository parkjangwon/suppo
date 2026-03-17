import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    const isDevelopment = process.env.NODE_ENV === "development";

    // Content Security Policy
    // 개발 환경에서는 eval을 허용하지 않고, 프로덕션에서는 더 엄격한 정책
    const cspDirectives = {
      "default-src": ["'self'"],
      "script-src": isDevelopment
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
        : ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "https:", "blob:"],
      "font-src": ["'self'"],
      "connect-src": ["'self'", "https://api.github.com", "https://api.gitlab.com"],
      "media-src": ["'self'"],
      "object-src": ["'none'"],
      "frame-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
      "navigate-to": ["'self'"],
      "report-uri": isDevelopment ? [] : ["/api/security/csp-report"],
      "report-to": isDevelopment ? [] : ["csp-endpoint"],
    };

    const cspValue = Object.entries(cspDirectives)
      .map(([directive, sources]) => `${directive} ${sources.filter(Boolean).join(" ")}`)
      .join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspValue,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), fullscreen=(), payment=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
