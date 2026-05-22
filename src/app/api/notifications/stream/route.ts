import { auth } from "@/lib/auth";
import { db } from "@/db";
import { notification, user as userTable } from "@/db/schema";
import { and, desc, eq, gt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { headers } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const notificationActor = alias(userTable, "notificationActor");

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          cleanup();
        }
      };

      const heartbeat = () => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          cleanup();
        }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeatId);
        clearInterval(pollId);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      send("connected", { message: "Connected to notification stream" });

      const heartbeatId = setInterval(heartbeat, 30_000);

      let lastCheck = new Date();
      const pollId = setInterval(async () => {
        if (closed) return;
        try {
          const notifications = await db
            .select({
              notification,
              userNotificationActorIdTouser: {
                id: notificationActor.id,
                name: notificationActor.name,
                email: notificationActor.email,
                image: notificationActor.image,
              },
            })
            .from(notification)
            .leftJoin(
              notificationActor,
              eq(notification.actorId, notificationActor.id)
            )
            .where(
              and(
                eq(notification.userId, userId),
                gt(notification.createdAt, lastCheck)
              )
            )
            .orderBy(desc(notification.createdAt))
            .then((rows) =>
              rows.map(({ notification, userNotificationActorIdTouser }) => ({
                ...notification,
                userNotificationActorIdTouser,
                actor: userNotificationActorIdTouser,
              }))
            );

          if (notifications.length > 0) {
            send("notification", { notifications });
            lastCheck = new Date();
          }
        } catch {
          // DB query failed — skip this tick, try again next interval
        }
      }, 5_000);

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
