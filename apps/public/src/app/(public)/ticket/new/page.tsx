import { cookies } from "next/headers";
import { TicketForm } from "@/components/ticket/ticket-form";
import { prisma } from "@crinity/db";
import { getSystemBranding } from "@crinity/shared/db/queries/branding";
import { getPublicCopy } from "@crinity/shared/i18n/public-copy";

export async function generateMetadata() {
  const branding = await getSystemBranding();
  return {
    title: `티켓 작성 | ${branding.companyName}`,
  };
}

async function listActiveRequestTypes() {
  return prisma.requestType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, description: true },
  });
}

export default async function NewTicketPage() {
  const branding = await getSystemBranding();
  const locale = (await cookies()).get("crinity-locale")?.value;
  const copy = getPublicCopy(locale);
  const captchaSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  let requestTypes: Awaited<ReturnType<typeof listActiveRequestTypes>> = [];
  try {
    requestTypes = await listActiveRequestTypes();
  } catch (error) {
    console.error("Failed to load request types:", error);
  }

  return (
    <div className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h1
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: branding.primaryColor }}
            >
              {copy.newTicketTitle}
            </h1>
            <p className="text-slate-600">
              {copy.newTicketDescription}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
            <TicketForm requestTypes={requestTypes} captchaSiteKey={captchaSiteKey} />
          </div>
        </div>
      </div>
    </div>
  );
}
