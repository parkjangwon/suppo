import { NextRequest, NextResponse } from "next/server";
import { getBackofficeSession } from "@suppo/shared/auth/session";
import {
  listMacros,
  createMacro,
} from "@suppo/shared/macro/service";

export async function GET() {
  const session = await getBackofficeSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const macros = await listMacros(session.user.agentId, isAdmin);

  return NextResponse.json({ macros });
}

export async function POST(request: NextRequest) {
  const session = await getBackofficeSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const macro = await createMacro(body, session.user.agentId);
    return NextResponse.json({ macro }, { status: 201 });
  } catch (error) {
    console.error("Failed to create macro:", error);
    return NextResponse.json(
      { error: "Failed to create macro" },
      { status: 500 }
    );
  }
}
