import { auth } from "@/auth";
import { notificationService } from "@suppo/shared/notifications/sse-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.agentId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const agentId = session.user.agentId;

  let heartbeat: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      notificationService.subscribe(agentId, controller);

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25_000);
    },
    cancel() {
      clearInterval(heartbeat);
      notificationService.unsubscribe(agentId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
