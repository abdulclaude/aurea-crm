import { inngest } from "../client";
import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { rota as rotaTable, instructor as instructorTable } from "@/db/schema";
import { addHours, subMinutes } from "date-fns";
import crypto from "node:crypto";

const MAGIC_LINK_EXPIRY_HOURS = 72;
const PRE_SHIFT_MINUTES = 5;

/**
 * Cron function that runs every minute to send magic links to instructors
 * whose shifts are starting in 5 minutes.
 */
export const sendRotaMagicLinks = inngest.createFunction(
  { id: "send-rota-magic-links", retries: 0 },
  { cron: "*/5 * * * *" }, // Run every 5 minutes (reduced from every minute)
  async () => {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + PRE_SHIFT_MINUTES * 60 * 1000);

    // Find rotas starting in approximately 5 minutes that haven't had a magic link sent
    // We use a 1-minute window to catch rotas (between 4.5 and 5.5 minutes from now)
    const upcomingRotas = await db.query.rota.findMany({
      where: and(
        gte(rotaTable.startTime, subMinutes(fiveMinutesFromNow, 0.5)),
        lte(rotaTable.startTime, addHours(fiveMinutesFromNow, 0.5 / 60)),
        isNull(rotaTable.magicLinkSentAt),
        inArray(rotaTable.status, ["SCHEDULED", "CONFIRMED"])
      ),
      with: {
        instructor: {
          with: {
            organization: true,
            location: true,
          },
        },
        organization: true,
        location: true,
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
        // Skip if instructor doesn't have an email
        if (!rota.instructor.email) {
          console.log(`Skipping rota ${rota.id} - instructor ${rota.instructor.name} has no email`);
          results.skipped++;
          continue;
        }

        // Generate magic link token
        const token = crypto.randomBytes(32).toString("hex");

        // Update instructor with magic link token
        await db
          .update(instructorTable)
          .set({
            portalToken: token,
            portalTokenExpiry: addHours(now, MAGIC_LINK_EXPIRY_HOURS),
            updatedAt: now,
          })
          .where(eq(instructorTable.id, rota.instructor.id));

        // Generate magic link URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const magicLink = `${baseUrl}/instructor-signup?token=${token}&id=${rota.instructor.id}`;

        // Send email
        const { sendMagicLinkEmail } = await import("@/features/instructors/lib/send-magic-link");
        await sendMagicLinkEmail({
          to: rota.instructor.email,
          instructorName: rota.instructor.name,
          magicLink,
          expiresAt: addHours(now, MAGIC_LINK_EXPIRY_HOURS),
          organizationName: rota.instructor.location?.companyName || rota.instructor.organization.name,
        });

        // Mark rota as having magic link sent
        await db
          .update(rotaTable)
          .set({ magicLinkSentAt: now, updatedAt: now })
          .where(eq(rotaTable.id, rota.id));

        console.log(`✓ Sent magic link to ${rota.instructor.email} for rota ${rota.id}`);
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
