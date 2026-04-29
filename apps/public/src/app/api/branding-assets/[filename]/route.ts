import { NextRequest } from "next/server";

import { serveBrandingAsset } from "@suppo/shared/storage/upload-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  return serveBrandingAsset(filename);
}
