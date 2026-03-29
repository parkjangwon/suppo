import { prisma } from "@crinity/db";
import { verifyChatCustomerAccess } from "@crinity/shared/chat/customer-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const access = await verifyChatCustomerAccess(id, token);
  if (!access) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let lastSeenAt = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`));

      while (!request.signal.aborted) {
        const events = await prisma.chatEvent.findMany({
          where: {
            conversationId: id,
            createdAt: {
              gt: lastSeenAt,
            },
          },
          orderBy: { createdAt: "asc" },
          take: 20,
        });

        for (const event of events) {
          lastSeenAt = event.createdAt;
          controller.enqueue(
            encoder.encode(`event: message\ndata: ${JSON.stringify({
              id: event.id,
              type: event.type,
              createdAt: event.createdAt.toISOString(),
              payload: event.payload,
            })}\n\n`)
          );
        }

        controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
        await sleep(1000);
      }

      controller.close();
    },
    cancel() {
      return undefined;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
