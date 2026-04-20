import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@suppo/db";
import { z } from "zod";
import { createSamlMetadataBaseUrl } from "@suppo/shared/utils/app-urls";

const createSchema = z.object({
  name: z.string().min(1, "회사명을 입력하세요"),
  domain: z.string().regex(/^[a-z0-9][-a-z0-9]*\.[-a-z0-9]+$/, "유효한 도메인을 입력하세요"),
  idpEntityId: z.string().min(1, "IdP Entity ID를 입력하세요"),
  idpSsoUrl: z.string().url("유효한 SSO URL을 입력하세요"),
  idpSloUrl: z.string().url("유효한 SLO URL을 입력하세요").optional().or(z.literal("")),
  idpCertificate: z.string().min(1, "인증서를 입력하세요"),
  isActive: z.boolean().default(true),
});

function getBaseUrl() {
  return createSamlMetadataBaseUrl();
}

function generateSpUrls(domain: string) {
  const baseUrl = getBaseUrl();
  return {
    spEntityId: `${baseUrl}/api/auth/saml/${domain}`,
    spAcsUrl: `${baseUrl}/api/auth/callback/boxyhq-saml`,
  };
}

export async function GET() {
  const session = await auth();
  
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const providers = await prisma.sAMLProvider.findMany({
      orderBy: { createdAt: "desc" },
    });
    
    return NextResponse.json(providers);
  } catch (error) {
    console.error("Failed to fetch SAML providers:", error);
    return NextResponse.json(
      { error: "Failed to fetch SAML providers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = createSchema.parse(body);
    
    const { spEntityId, spAcsUrl } = generateSpUrls(validated.domain);
    
    const provider = await prisma.sAMLProvider.create({
      data: {
        name: validated.name,
        domain: validated.domain.toLowerCase(),
        isActive: validated.isActive,
        idpEntityId: validated.idpEntityId,
        idpSsoUrl: validated.idpSsoUrl,
        idpSloUrl: validated.idpSloUrl || null,
        idpCertificate: validated.idpCertificate,
        spEntityId,
        spAcsUrl,
      },
    });
    
    return NextResponse.json(provider, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "이미 등록된 도메인입니다" },
        { status: 409 }
      );
    }
    
    console.error("Failed to create SAML provider:", error);
    return NextResponse.json(
      { error: "Failed to create SAML provider" },
      { status: 500 }
    );
  }
}
