import { processOutbox } from "@suppo/shared/email/process-outbox";

export function dispatchEmailOutboxSoon(limit = 25) {
  if (
    process.env.NODE_ENV === "test" &&
    process.env.SUPPO_RUN_EMAIL_DISPATCH_IN_TESTS !== "true"
  ) {
    return;
  }

  void processOutbox({ limit }).catch((error) => {
    console.error("Failed to dispatch email outbox:", error);
  });
}
