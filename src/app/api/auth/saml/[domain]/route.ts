import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

interface RouteParams {
  params: Promise<{ domain: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { domain } = await params;
    
    const provider = await prisma.sAMLProvider.findUnique({
      where: { domain: domain.toLowerCase() },
    });
    
    if (!provider || !provider.isActive) {
      return NextResponse.json(
        { error: "SAML provider not found" },
        { status: 404 }
      );
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const entityId = `${baseUrl}/api/auth/saml/${provider.domain}`;
    const acsUrl = `${baseUrl}/api/auth/callback/boxyhq-saml`;
    
    const metadata = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol" AuthnRequestsSigned="false" WantAssertionsSigned="true">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService 
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" 
      Location="${acsUrl}" 
      index="0" 
      isDefault="true"/>
  </md:SPSSODescriptor>
  <md:Organization>
    <md:OrganizationName xml:lang="ko">${escapeXml(provider.name)}</md:OrganizationName>
    <md:OrganizationDisplayName xml:lang="ko">${escapeXml(provider.name)}</md:OrganizationDisplayName>
    <md:OrganizationURL xml:lang="ko">${baseUrl}</md:OrganizationURL>
  </md:Organization>
  <md:ContactPerson contactType="technical">
    <md:Company>${escapeXml(provider.name)}</md:Company>
    <md:EmailAddress>admin@${provider.domain}</md:EmailAddress>
  </md:ContactPerson>
</md:EntityDescriptor>`;
    
    return new NextResponse(metadata, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Failed to generate SAML metadata:", error);
    return NextResponse.json(
      { error: "Failed to generate metadata" },
      { status: 500 }
    );
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
