import { auth } from "@/auth";

import { toBackofficeSession, type BackofficeSession } from "@crinity/shared/auth/config";

export async function getBackofficeSession(): Promise<BackofficeSession | null> {
  const session = await auth();
  return toBackofficeSession(session);
}
