import { auth } from "@/auth";
import { notificationService } from "@suppo/shared/notifications/sse-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.agentId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const agentId = session.user.agentId;

  const stream = new ReadableStream({
    start(controller) {
      notificationService.subscribe(agentId, controller);

      // heartbeat every 25s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25_000);

      // store cleanup fn on the controller for cancel
      (controller as unknown as { _cleanup: () => void })._cleanup = () => {
        clearInterval(heartbeat);
        notificationService.unsubscribe(agentId);
      };
    },
    cancel() {
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
