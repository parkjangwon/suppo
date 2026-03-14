import { auth } from "@/auth";

import { toBackofficeSession, type BackofficeSession } from "@/lib/auth/config";

export async function getBackofficeSession(): Promise<BackofficeSession | null> {
  const session = await auth();
  return toBackofficeSession(session);
}
