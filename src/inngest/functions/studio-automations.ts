import { inngest } from "../client";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  client,
  studioMembership,
} from "@/db/schema";
import { Resend } from "resend";
import { addDays, format } from "date-fns";
import { NodeType } from "@/db/enums";
import { triggerWorkflowsForNodeType } from "@/lib/workflow-triggers";

const resend = new Resend(process.env.RESEND_API_KEY);

function fromEmail(): string {
  return process.env.RESEND_FROM_EMAIL ?? "noreply@aurea.app";
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

// ── Welcome email ──────────────────────────────────────────────────────────────

export const sendMembershipWelcomeEmail = inngest.createFunction(
  { id: "studio-membership-welcome", retries: 2 },
  { event: "studio/membership.created" },
  async ({ event }) => {
    const { membershipId } = event.data as { membershipId: string };

    const membership = await db.query.studioMembership.findFirst({
      where: eq(studioMembership.id, membershipId),
      with: {
        client: { columns: { id: true, name: true, email: true } },
        membershipPlan: { columns: { name: true } },
        organization: { columns: { name: true, logo: true, slug: true } },
      },
    });

    if (!membership) return { skipped: true, reason: "membership not found" };
    if (!membership.client.email) return { skipped: true, reason: "no email" };

    const studioName = membership.organization?.name ?? "Your studio";
    const planName =
      membership.membershipPlan?.name ?? membership.name ?? "Membership";
    const memberName = membership.client.name;
    const portalToken = await generatePortalToken(membership.client.id);
    const portalUrl = `${appUrl()}/member-portal/${portalToken}`;

    const { error } = await resend.emails.send({
      from: fromEmail(),
      to: [membership.client.email],
      subject: `Welcome to ${studioName} — your membership is active`,
      html: buildWelcomeHtml({
        memberName,
        studioName,
        planName,
        portalUrl,
        startDate: membership.startDate,
      }),
    });

    if (error) {
      console.error("Failed to send welcome email:", error);
      throw new Error(`Resend error: ${JSON.stringify(error)}`);
    }

    return { sent: true, to: membership.client.email };
  },
);

// ── Daily expiry reminders ─────────────────────────────────────────────────────

export const checkMembershipExpiry = inngest.createFunction(
  { id: "studio-membership-expiry-check", retries: 0 },
  { cron: "0 9 * * *" }, // 9 AM daily
  async () => {
    const results = { checked: 0, sent: 0, failed: 0 };
    const reminderDays = [3, 7];

    for (const daysOut of reminderDays) {
      const windowStart = addDays(new Date(), daysOut);
      windowStart.setHours(0, 0, 0, 0);
      const windowEnd = addDays(new Date(), daysOut);
      windowEnd.setHours(23, 59, 59, 999);

      const expiring = await db.query.studioMembership.findMany({
        where: and(
          eq(studioMembership.status, "ACTIVE"),
          gte(studioMembership.endDate, windowStart),
          lte(studioMembership.endDate, windowEnd)
        ),
        with: {
          client: {
            columns: { id: true, name: true, email: true, phone: true, tags: true },
          },
          membershipPlan: { columns: { name: true } },
          organization: { columns: { name: true } },
        },
      });

      results.checked += expiring.length;

      for (const membership of expiring) {
        if (membership.organizationId) {
          await triggerWorkflowsForNodeType({
            nodeType: NodeType.MEMBERSHIP_EXPIRING_TRIGGER,
            organizationId: membership.organizationId,
            locationId: membership.locationId,
            triggerData: {
              membershipId: membership.id,
              clientId: membership.clientId,
              planId: membership.planId,
              planName: membership.membershipPlan?.name ?? membership.name,
              client: {
                id: membership.client.id,
                name: membership.client.name,
                email: membership.client.email,
                phone: membership.client.phone,
                tags: membership.client.tags,
              },
              daysUntilExpiry: daysOut,
              expiryDate: membership.endDate?.toISOString() ?? null,
              status: membership.status,
            },
          });
        }

        if (!membership.client.email) continue;

        try {
          const studioName = membership.organization?.name ?? "Your studio";
          const planName =
            membership.membershipPlan?.name ?? membership.name ?? "Membership";
          const portalToken = await generatePortalToken(membership.client.id);
          const portalUrl = `${appUrl()}/member-portal/${portalToken}`;

          const { error } = await resend.emails.send({
            from: fromEmail(),
            to: [membership.client.email],
            subject: `Your ${studioName} membership expires in ${daysOut} days`,
            html: buildExpiryReminderHtml({
              memberName: membership.client.name,
              studioName,
              planName,
              daysUntilExpiry: daysOut,
              expiryDate: membership.endDate!,
              portalUrl,
            }),
          });

          if (error) throw new Error(JSON.stringify(error));
          results.sent++;
        } catch (err) {
          console.error(
            `Failed expiry reminder for membership ${membership.id}:`,
            err,
          );
          results.failed++;
        }
      }
    }

    return results;
  },
);

// ── Helpers ────────────────────────────────────────────────────────────────────

async function generatePortalToken(clientId: string): Promise<string> {
  const { nanoid } = await import("nanoid");
  const token = nanoid(40);
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 72);
  await db
    .update(client)
    .set({ portalToken: token, portalTokenExpiry: expiry, updatedAt: new Date() })
    .where(eq(client.id, clientId));
  return token;
}

function buildWelcomeHtml({
  memberName,
  studioName,
  planName,
  portalUrl,
  startDate,
}: {
  memberName: string;
  studioName: string;
  planName: string;
  portalUrl: string;
  startDate: Date;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:30px;text-align:center;border-radius:10px 10px 0 0;">
    <h1 style="color:white;margin:0;font-size:24px;">Welcome to ${studioName}!</h1>
  </div>
  <div style="background:#fff;padding:30px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;">
    <p style="font-size:16px;">Hi ${memberName},</p>
    <p style="font-size:14px;color:#555;">Your <strong>${planName}</strong> membership is now active as of ${format(startDate, "d MMMM yyyy")}. We're glad to have you on board.</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:white;padding:14px 30px;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">View My Membership</a>
    </div>
    <p style="font-size:13px;color:#999;">From your member portal you can book classes, view your history, and check your payment records.</p>
    <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;">
    <p style="font-size:12px;color:#aaa;text-align:center;">You received this because you signed up at ${studioName}.</p>
  </div>
</body>
</html>`;
}

function buildExpiryReminderHtml({
  memberName,
  studioName,
  planName,
  daysUntilExpiry,
  expiryDate,
  portalUrl,
}: {
  memberName: string;
  studioName: string;
  planName: string;
  daysUntilExpiry: number;
  expiryDate: Date;
  portalUrl: string;
}) {
  const urgencyColor = daysUntilExpiry <= 3 ? "#ef4444" : "#f59e0b";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:${urgencyColor};padding:30px;text-align:center;border-radius:10px 10px 0 0;">
    <h1 style="color:white;margin:0;font-size:24px;">Membership Expiring Soon</h1>
  </div>
  <div style="background:#fff;padding:30px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;">
    <p style="font-size:16px;">Hi ${memberName},</p>
    <p style="font-size:14px;color:#555;">Just a heads-up — your <strong>${planName}</strong> membership at ${studioName} expires in <strong style="color:${urgencyColor}">${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}</strong> on ${format(expiryDate, "d MMMM yyyy")}.</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${portalUrl}" style="display:inline-block;background:${urgencyColor};color:white;padding:14px 30px;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">Renew Membership</a>
    </div>
    <p style="font-size:13px;color:#999;">Client ${studioName} or visit your member portal to renew before access expires.</p>
    <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;">
    <p style="font-size:12px;color:#aaa;text-align:center;">${studioName} · Member notification</p>
  </div>
</body>
</html>`;
}
