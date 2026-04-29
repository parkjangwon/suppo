// Sentry stub — install and configure @sentry/nextjs in each app directly.
// This stub keeps call sites consistent without requiring @sentry/nextjs in packages/shared.

export function initSentry() {
  if (!process.env.SENTRY_DSN) return;
  console.log("[Sentry] SENTRY_DSN set; initialize Sentry in the app's instrumentation file.");
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  console.error("[Error]", error.message, context);
}

export function captureMessage(message: string, level = "info") {
  console.log(`[${level.toUpperCase()}]`, message);
}
