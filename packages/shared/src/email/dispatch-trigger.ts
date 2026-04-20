import { processOutbox } from "@suppo/shared/email/process-outbox";

export function dispatchEmailOutboxSoon(limit = 25) {
  void processOutbox({ limit }).catch((error) => {
    console.error("Failed to dispatch email outbox:", error);
  });
}
