import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@crinity/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  idpEntityId: z.string().min(1).optional(),
  idpSsoUrl: z.string().url().optional(),
  idpSloUrl: z.string().url().optional().or(z.literal("")),
  idpCertificate: z.string().optional(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateSchema.parse(body);
    
    const updateData: Record<string, unknown> = {};
    
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.idpEntityId !== undefined) updateData.idpEntityId = validated.idpEntityId;
    if (validated.idpSsoUrl !== undefined) updateData.idpSsoUrl = validated.idpSsoUrl;
    if (validated.idpSloUrl !== undefined) updateData.idpSloUrl = validated.idpSloUrl || null;
    if (validated.idpCertificate !== undefined && validated.idpCertificate) {
      updateData.idpCertificate = validated.idpCertificate;
    }
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;
    
    const provider = await prisma.sAMLProvider.update({
      where: { id },
      data: updateData,
    });
    
    return NextResponse.json(provider);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    
    console.error("Failed to update SAML provider:", error);
    return NextResponse.json(
      { error: "Failed to update SAML provider" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    
    await prisma.sAMLProvider.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete SAML provider:", error);
    return NextResponse.json(
      { error: "Failed to delete SAML provider" },
      { status: 500 }
    );
  }
}
