import * as Sentry from "@sentry/nextjs";
import { initializeRealtimeCache } from "@/lib/realtime-cache";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
    
    // Initialize real-time event cache
    initializeRealtimeCache();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
