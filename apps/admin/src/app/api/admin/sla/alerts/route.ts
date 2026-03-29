import { NextResponse } from "next/server";
import { getBackofficeSession } from "@crinity/shared/auth/session";
import { checkSLABreaches } from "@crinity/shared/sla/alerts";

export async function GET() {
  const session = await getBackofficeSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts = await checkSLABreaches();
  return NextResponse.json({ alerts });
}
