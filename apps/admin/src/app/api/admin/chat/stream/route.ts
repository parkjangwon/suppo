import { prisma } from "@crinity/db";

import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");
  const encoder = new TextEncoder();
  let lastSeenAt = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`));

      while (!request.signal.aborted) {
        const events = await prisma.chatEvent.findMany({
          where: {
            ...(conversationId ? { conversationId } : {}),
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
              conversationId: event.conversationId,
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
