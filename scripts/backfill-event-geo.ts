import "dotenv/config";
import { eq, inArray, isNull, or } from "drizzle-orm";
import { db, dbPool } from "../src/db";
import { funnelEvent, funnelSession } from "../src/db/schema";

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

async function main() {
  const events = await db.query.funnelEvent.findMany({
    where: or(
      isNull(funnelEvent.city),
      eq(funnelEvent.city, "Unknown"),
      isNull(funnelEvent.countryCode),
      eq(funnelEvent.countryCode, "Unknown"),
      isNull(funnelEvent.countryName),
      eq(funnelEvent.countryName, "Unknown"),
    ),
    columns: {
      id: true,
      sessionId: true,
      city: true,
      countryCode: true,
      countryName: true,
    },
  });

  const sessionIds = Array.from(
    new Set(events.map((event) => event.sessionId).filter(Boolean))
  );

  const sessionsById = new Map<
    string,
    { city?: string | null; countryCode?: string | null; countryName?: string | null }
  >();

  for (const batch of chunk(sessionIds, 500)) {
    const sessions = await db.query.funnelSession.findMany({
      where: inArray(funnelSession.sessionId, batch),
      columns: {
        sessionId: true,
        city: true,
        countryCode: true,
        countryName: true,
      },
    });

    for (const session of sessions) {
      sessionsById.set(session.sessionId, {
        city: session.city,
        countryCode: session.countryCode,
        countryName: session.countryName,
      });
    }
  }

  let updatedCount = 0;

  for (const event of events) {
    const sessionGeo = sessionsById.get(event.sessionId);
    if (!sessionGeo) continue;

    const nextCity =
      event.city && event.city !== "Unknown" ? event.city : sessionGeo.city;
    const nextCountryCode =
      event.countryCode && event.countryCode !== "Unknown"
        ? event.countryCode
        : sessionGeo.countryCode;
    const nextCountryName =
      event.countryName && event.countryName !== "Unknown"
        ? event.countryName
        : sessionGeo.countryName;

    if (!nextCity && !nextCountryCode && !nextCountryName) continue;

    await db
      .update(funnelEvent)
      .set({
        ...(nextCity && { city: nextCity }),
        ...(nextCountryCode && { countryCode: nextCountryCode }),
        ...(nextCountryName && { countryName: nextCountryName }),
      })
      .where(eq(funnelEvent.id, event.id));
    updatedCount += 1;
  }

  console.log(`[Backfill] Updated ${updatedCount} events with session geo.`);
}

main()
  .catch((error) => {
    console.error("[Backfill] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await dbPool.end();
  });
