import "dotenv/config";
import prisma from "../src/lib/db";

const [funnelId, subaccountId] = process.argv.slice(2);

if (!funnelId || !subaccountId) {
  console.error("Usage: bunx tsx scripts/move-funnel-subaccount.ts <funnelId> <subaccountId>");
  process.exit(1);
}

async function main() {
  const funnel = await prisma.funnel.findUnique({
    where: { id: funnelId },
    select: { id: true, organizationId: true, subaccountId: true },
  });

  if (!funnel) {
    throw new Error(`Funnel not found: ${funnelId}`);
  }

  const subaccount = await prisma.subaccount.findUnique({
    where: { id: subaccountId },
    select: { id: true, organizationId: true },
  });

  if (!subaccount) {
    throw new Error(`Subaccount not found: ${subaccountId}`);
  }

  if (subaccount.organizationId !== funnel.organizationId) {
    throw new Error(
      `Subaccount ${subaccountId} does not belong to funnel organization ${funnel.organizationId}`
    );
  }

  const [
    updatedFunnel,
    eventsResult,
    sessionsResult,
    webVitalsResult,
    adSpendResult,
  ] = await prisma.$transaction([
    prisma.funnel.update({
      where: { id: funnelId },
      data: { subaccountId },
    }),
    prisma.funnelEvent.updateMany({
      where: { funnelId },
      data: { subaccountId },
    }),
    prisma.funnelSession.updateMany({
      where: { funnelId },
      data: { subaccountId },
    }),
    prisma.funnelWebVital.updateMany({
      where: { funnelId },
      data: { subaccountId },
    }),
    prisma.adSpend.updateMany({
      where: { funnelId },
      data: { subaccountId },
    }),
  ]);

  console.log("[Move Funnel] Completed");
  console.log({
    funnelId,
    fromSubaccountId: funnel.subaccountId,
    toSubaccountId: subaccountId,
    updatedFunnelId: updatedFunnel.id,
    eventsUpdated: eventsResult.count,
    sessionsUpdated: sessionsResult.count,
    webVitalsUpdated: webVitalsResult.count,
    adSpendUpdated: adSpendResult.count,
  });
}

main()
  .catch((error) => {
    console.error("[Move Funnel] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
