import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { headers } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SSE endpoint for real-time notification streaming
 * Clients connect to this endpoint and receive notifications in real-time
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  // Create a TransformStream to handle SSE
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Function to send SSE message
  const sendEvent = async (event: string, data: any) => {
    try {
      await writer.write(
        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      );
    } catch (error) {
      console.error("Error sending SSE event:", error);
    }
  };

  // Send initial connection success message
  sendEvent("connected", { message: "Connected to notification stream" });

  // Set up periodic heartbeat to keep connection alive
  const heartbeatInterval = setInterval(async () => {
    try {
      await writer.write(encoder.encode(": heartbeat\n\n"));
    } catch (error) {
      console.error("Error sending heartbeat:", error);
      clearInterval(heartbeatInterval);
    }
  }, 30000); // Every 30 seconds

  // Poll for new notifications every 2 seconds
  // In production, you might want to use a more sophisticated approach like Redis Pub/Sub
  let lastCheck = new Date();
  const pollInterval = setInterval(async () => {
    try {
      const newNotifications = await prisma.notification.findMany({
        where: {
          userId,
          createdAt: {
            gt: lastCheck,
          },
        },
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (newNotifications.length > 0) {
        await sendEvent("notification", {
          notifications: newNotifications,
        });
        lastCheck = new Date();
      }
    } catch (error) {
      console.error("Error polling notifications:", error);
    }
  }, 2000); // Every 2 seconds

  // Clean up on connection close
  request.signal.addEventListener("abort", () => {
    clearInterval(heartbeatInterval);
    clearInterval(pollInterval);
    writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable buffering in nginx
    },
  });
}
