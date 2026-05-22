import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, dbPool } from "../src/db";
import {
  adSpend,
  funnel,
  funnelEvent,
  funnelSession,
  funnelWebVital,
  location as locationTable,
} from "../src/db/schema";

const [funnelId, locationId] = process.argv.slice(2);

if (!funnelId || !locationId) {
  console.error("Usage: bunx tsx scripts/move-funnel-location.ts <funnelId> <locationId>");
  process.exit(1);
}

async function main() {
  const selectedFunnel = await db.query.funnel.findFirst({
    where: eq(funnel.id, funnelId),
    columns: { id: true, organizationId: true, locationId: true },
  });

  if (!selectedFunnel) {
    throw new Error(`Funnel not found: ${funnelId}`);
  }

  const location = await db.query.location.findFirst({
    where: eq(locationTable.id, locationId),
    columns: { id: true, organizationId: true },
  });

  if (!location) {
    throw new Error(`Location not found: ${locationId}`);
  }

  if (location.organizationId !== selectedFunnel.organizationId) {
    throw new Error(
      `Location ${locationId} does not belong to funnel organization ${selectedFunnel.organizationId}`
    );
  }

  const [updatedFunnel] = await db
    .update(funnel)
    .set({ locationId, updatedAt: new Date() })
    .where(eq(funnel.id, funnelId))
    .returning({ id: funnel.id });
  const eventsResult = await db
    .update(funnelEvent)
    .set({ locationId })
    .where(eq(funnelEvent.funnelId, funnelId))
    .returning({ id: funnelEvent.id });
  const sessionsResult = await db
    .update(funnelSession)
    .set({ locationId, updatedAt: new Date() })
    .where(eq(funnelSession.funnelId, funnelId))
    .returning({ id: funnelSession.id });
  const webVitalsResult = await db
    .update(funnelWebVital)
    .set({ locationId })
    .where(eq(funnelWebVital.funnelId, funnelId))
    .returning({ id: funnelWebVital.id });
  const adSpendResult = await db
    .update(adSpend)
    .set({ locationId, updatedAt: new Date() })
    .where(eq(adSpend.funnelId, funnelId))
    .returning({ id: adSpend.id });

  console.log("[Move Funnel] Completed");
  console.log({
    funnelId,
    fromLocationId: selectedFunnel.locationId,
    toLocationId: locationId,
    updatedFunnelId: updatedFunnel.id,
    eventsUpdated: eventsResult.length,
    sessionsUpdated: sessionsResult.length,
    webVitalsUpdated: webVitalsResult.length,
    adSpendUpdated: adSpendResult.length,
  });
}

main()
  .catch((error) => {
    console.error("[Move Funnel] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await dbPool.end();
  });
