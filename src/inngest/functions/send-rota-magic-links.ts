import { inngest } from "../client";
import prisma from "@/lib/db";
import { addHours, subMinutes } from "date-fns";
import crypto from "node:crypto";

const MAGIC_LINK_EXPIRY_HOURS = 72;
const PRE_SHIFT_MINUTES = 5;

/**
 * Cron function that runs every minute to send magic links to workers
 * whose shifts are starting in 5 minutes.
 */
export const sendRotaMagicLinks = inngest.createFunction(
  { id: "send-rota-magic-links", retries: 0 },
  { cron: "* * * * *" }, // Run every minute
  async () => {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + PRE_SHIFT_MINUTES * 60 * 1000);

    // Find rotas starting in approximately 5 minutes that haven't had a magic link sent
    // We use a 1-minute window to catch rotas (between 4.5 and 5.5 minutes from now)
    const upcomingRotas = await prisma.rota.findMany({
      where: {
        startTime: {
          gte: subMinutes(fiveMinutesFromNow, 0.5),
          lte: addHours(fiveMinutesFromNow, 0.5 / 60), // 0.5 minutes in hours
        },
        magicLinkSentAt: null,
        status: {
          in: ["SCHEDULED", "CONFIRMED"],
        },
      },
      include: {
        worker: {
          include: {
            organization: true,
            subaccount: true,
          },
        },
        organization: true,
        subaccount: true,
      },
    });

    const results = {
      total: upcomingRotas.length,
      sent: 0,
      failed: 0,
      skipped: 0,
    };

    for (const rota of upcomingRotas) {
      try {
        // Skip if worker doesn't have an email
        if (!rota.worker.email) {
          console.log(`Skipping rota ${rota.id} - worker ${rota.worker.name} has no email`);
          results.skipped++;
          continue;
        }

        // Generate magic link token
        const token = crypto.randomBytes(32).toString("hex");

        // Update worker with magic link token
        await prisma.worker.update({
          where: { id: rota.worker.id },
          data: {
            portalToken: token,
            portalTokenExpiry: addHours(now, MAGIC_LINK_EXPIRY_HOURS),
          },
        });

        // Generate magic link URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const magicLink = `${baseUrl}/portal/${rota.worker.id}/auth?token=${token}`;

        // Send email
        const { sendMagicLinkEmail } = await import("@/features/workers/lib/send-magic-link");
        await sendMagicLinkEmail({
          to: rota.worker.email,
          workerName: rota.worker.name,
          magicLink,
          expiresAt: addHours(now, MAGIC_LINK_EXPIRY_HOURS),
          organizationName: rota.worker.subaccount?.companyName || rota.worker.organization.name,
        });

        // Mark rota as having magic link sent
        await prisma.rota.update({
          where: { id: rota.id },
          data: { magicLinkSentAt: now },
        });

        console.log(`✓ Sent magic link to ${rota.worker.email} for rota ${rota.id}`);
        results.sent++;
      } catch (error) {
        console.error(`✗ Failed to send magic link for rota ${rota.id}:`, error);
        results.failed++;
      }
    }

    console.log(`Rota magic links: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped out of ${results.total} total`);

    return results;
  }
);
