import { NextRequest } from "next/server";
import db from "@/lib/db";
import { auth } from "@/lib/auth";
import { consumeRealtimeEvents } from "@/lib/realtime-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-Sent Events endpoint for real-time funnel events
 * GET /api/external-funnels/[funnelId]/realtime
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ funnelId: string }> }
) {
  const { funnelId } = await params;

  // Verify authentication
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify funnel access
  const funnel = await db.funnel.findFirst({
    where: {
      id: funnelId,
      organizationId: session.session.activeOrganizationId || undefined,
    },
  });

  if (!funnel) {
    return new Response("Funnel not found", { status: 404 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      );

      // Poll for new events every 2 seconds
      intervalId = setInterval(async () => {
        try {
          // First, check in-memory cache for instant delivery (0ms latency)
          const cachedEvents = consumeRealtimeEvents(funnelId);

          if (cachedEvents.length > 0) {
            // Send cached events immediately
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "events",
                  events: cachedEvents,
                  source: "cache", // For debugging
                })}\n\n`
              )
            );
          } else {
            // Fallback: Poll database for events from the last 10 seconds
            // This handles cases where cache was cleared or server restarted
            const tenSecondsAgo = new Date(Date.now() - 10000);

            const recentEvents = await db.funnelEvent.findMany({
              where: {
                funnelId,
                timestamp: { gte: tenSecondsAgo },
              },
              orderBy: {
                timestamp: "desc",
              },
              take: 20,
              select: {
                id: true,
                eventName: true,
                pagePath: true,
                pageTitle: true,
                userId: true,
                anonymousId: true,
                deviceType: true,
                browserName: true,
                countryCode: true,
                city: true,
                isConversion: true,
                revenue: true,
                timestamp: true,
                utmSource: true,
                utmMedium: true,
                utmCampaign: true,
              },
            });

            if (recentEvents.length > 0) {
              // Send database events
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "events",
                    events: recentEvents.map((e) => ({
                      ...e,
                      revenue: e.revenue ? Number(e.revenue) : null,
                    })),
                    source: "database", // For debugging
                  })}\n\n`
                )
              );
            }
          }

          // Send heartbeat to keep connection alive
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "heartbeat",
                timestamp: new Date().toISOString(),
              })}\n\n`
            )
          );
        } catch (error) {
          console.error("Error fetching real-time events:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: "Failed to fetch events",
              })}\n\n`
            )
          );
        }
      }, 2000);
    },

    cancel() {
      if (intervalId) {
        clearInterval(intervalId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
