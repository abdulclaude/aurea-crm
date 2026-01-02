/**
 * In-memory cache for real-time event streaming
 * 
 * This provides instant (0ms latency) event delivery to SSE clients
 * without polling the database. Events are auto-cleaned after 10 seconds.
 * 
 * Note: Cache resets on server restart - this is acceptable for real-time
 * features. Historical data is always in the database.
 */

interface CachedEvent {
  id: string;
  eventName: string;
  pagePath: string | null;
  pageTitle: string | null;
  userId: string | null;
  anonymousId: string | null;
  deviceType: string | null;
  browserName: string | null;
  countryCode: string | null;
  city: string | null;
  isConversion: boolean;
  revenue: number | null;
  timestamp: Date;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  // Core Web Vitals
  lcp: number | null;
  inp: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
  vitalRating: string | null;
}

interface CacheEntry {
  events: CachedEvent[];
  timestamp: number;
}

// Global in-memory cache: funnelId -> events
const realtimeCache = new Map<string, CacheEntry>();

// Cleanup interval (runs every 5 seconds)
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Initialize the cleanup interval (called once on server start)
 */
export function initializeRealtimeCache() {
  if (cleanupInterval) return; // Already initialized

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    const maxAge = 10000; // 10 seconds

    for (const [funnelId, entry] of realtimeCache.entries()) {
      // Remove entries older than 10 seconds
      if (now - entry.timestamp > maxAge) {
        realtimeCache.delete(funnelId);
      }
    }
  }, 5000);

  console.log("[Realtime Cache] Initialized with 10s TTL");
}

/**
 * Add events to the cache for a specific funnel
 */
export function pushRealtimeEvents(funnelId: string, events: CachedEvent[]) {
  if (events.length === 0) return;

  const existing = realtimeCache.get(funnelId);

  if (existing) {
    // Append to existing events
    existing.events.push(...events);
    existing.timestamp = Date.now(); // Update timestamp
  } else {
    // Create new entry
    realtimeCache.set(funnelId, {
      events,
      timestamp: Date.now(),
    });
  }

  console.log(
    `[Realtime Cache] Pushed ${events.length} events for funnel ${funnelId}`
  );
}

/**
 * Get and consume events from the cache (read + delete)
 */
export function consumeRealtimeEvents(funnelId: string): CachedEvent[] {
  const entry = realtimeCache.get(funnelId);

  if (!entry || entry.events.length === 0) {
    return [];
  }

  // Get events
  const events = entry.events;

  // Clear cache after reading
  realtimeCache.delete(funnelId);

  console.log(
    `[Realtime Cache] Consumed ${events.length} events for funnel ${funnelId}`
  );

  return events;
}

/**
 * Peek at events without consuming them (for debugging)
 */
export function peekRealtimeEvents(funnelId: string): CachedEvent[] {
  const entry = realtimeCache.get(funnelId);
  return entry?.events || [];
}

/**
 * Get cache statistics (for debugging/monitoring)
 */
export function getRealtimeCacheStats() {
  const stats = {
    totalFunnels: realtimeCache.size,
    funnels: Array.from(realtimeCache.entries()).map(([funnelId, entry]) => ({
      funnelId,
      eventCount: entry.events.length,
      ageMs: Date.now() - entry.timestamp,
    })),
  };

  return stats;
}

/**
 * Clear all cached events (for testing)
 */
export function clearRealtimeCache() {
  realtimeCache.clear();
  console.log("[Realtime Cache] Cleared all events");
}
