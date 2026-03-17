import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { CustomFieldType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const customFields = await prisma.customFieldDefinition.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(customFields);
  } catch (error) {
    console.error("Failed to fetch custom fields:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const customField = await prisma.customFieldDefinition.create({
      data: {
        key: body.key,
        name: body.name,
        description: body.description,
        fieldType: body.fieldType as CustomFieldType,
        options: body.options,
        isRequired: body.isRequired,
        isActive: body.isActive ?? true,
        sortOrder: 0,
      },
    });

    return NextResponse.json(customField, { status: 201 });
  } catch (error) {
    console.error("Failed to create custom field:", error);
    if (error instanceof Error && error.message.includes("unique")) {
      return NextResponse.json({ error: "이미 존재하는 키입니다." }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
