import * as Sentry from "@sentry/nextjs";

export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.log("[Sentry] SENTRY_DSN not set, skipping initialization");
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    integrations: [
      Sentry.httpIntegration(),
    ],
    beforeSend(event) {
      if (event.exception) {
        const error = event.exception.values?.[0];
        if (error) {
          console.error(`[Sentry] Captured error: ${error.type}: ${error.value}`);
        }
      }
      return event;
    },
  });

  console.log("[Sentry] Initialized successfully");
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (!process.env.SENTRY_DSN) {
    console.error("[Error]", error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
  if (!process.env.SENTRY_DSN) {
    console.log(`[${level.toUpperCase()}]`, message);
    return;
  }

  Sentry.captureMessage(message, level);
}

export { Sentry };
