import "dotenv/config";
import prisma from "../src/lib/db";

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

async function main() {
  const events = await prisma.funnelEvent.findMany({
    where: {
      OR: [
        { city: null },
        { city: "Unknown" },
        { countryCode: null },
        { countryCode: "Unknown" },
        { countryName: null },
        { countryName: "Unknown" },
      ],
    },
    select: {
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
    const sessions = await prisma.funnelSession.findMany({
      where: { sessionId: { in: batch } },
      select: {
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

    await prisma.funnelEvent.update({
      where: { id: event.id },
      data: {
        ...(nextCity && { city: nextCity }),
        ...(nextCountryCode && { countryCode: nextCountryCode }),
        ...(nextCountryName && { countryName: nextCountryName }),
      },
    });
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
    await prisma.$disconnect();
  });
