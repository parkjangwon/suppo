import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@crinity/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deliveries = await prisma.webhookDeliveryLog.findMany({
    where: { endpointId: id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      event: true,
      isTest: true,
      responseStatusCode: true,
      responseBody: true,
      errorMessage: true,
      createdAt: true,
    },
  });

  return NextResponse.json(deliveries);
}
