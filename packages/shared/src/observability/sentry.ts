// Sentry stub — install and configure @sentry/nextjs in each app directly.
// This stub keeps call sites consistent without requiring @sentry/nextjs in packages/shared.

export function initSentry() {
  // No-op stub. Configure @sentry/nextjs directly in each app's instrumentation file.
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  console.error("[Error]", error.message, context);
}

export function captureMessage(message: string, level = "info") {
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[${level.toUpperCase()}]`, message);
  }
}
