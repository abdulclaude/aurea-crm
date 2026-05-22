import { inngest } from "../client";
import { and, eq, gte, lte, notExists } from "drizzle-orm";
import { db } from "@/db";
import {
  client as clientTable,
  member,
  notification,
  retentionAutomation,
  studioBooking,
  studioClass,
  studioMembership,
} from "@/db/schema";
import { createId } from "@paralleldrive/cuid2";
import { Resend } from "resend";
import { subDays } from "date-fns";
import { NodeType } from "@/db/enums";
import { triggerWorkflowsForNodeType } from "@/lib/workflow-triggers";

const resend = new Resend(process.env.RESEND_API_KEY);

function fromEmail(): string {
  return process.env.RESEND_FROM_EMAIL ?? "noreply@aurea.app";
}

export const runRetentionAutomations = inngest.createFunction(
  { id: "run-retention-automations", retries: 1 },
  { cron: "0 10 * * *" },
  async () => {
    const automations = await db.query.retentionAutomation.findMany({
      where: eq(retentionAutomation.isActive, true),
    });

    const results = { processed: 0, actioned: 0, errors: 0 };

    for (const automation of automations) {
      try {
        const clients = await findMatchingClients(automation);
        results.processed += clients.length;

        for (const client of clients) {
          try {
            await executeActions(automation, client);
            results.actioned++;
          } catch {
            results.errors++;
          }
        }
      } catch {
        results.errors++;
      }
    }

    return results;
  },
);

export const runBirthdayWorkflowTriggers = inngest.createFunction(
  { id: "run-birthday-workflow-triggers", retries: 0 },
  { cron: "0 8 * * *" },
  async () => {
    const today = new Date();
    const clients = await db.query.client.findMany({
      where: and(
        eq(clientTable.birthMonth, today.getMonth() + 1),
        eq(clientTable.birthDay, today.getDate())
      ),
      columns: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tags: true,
        acquisitionStage: true,
        birthMonth: true,
        birthDay: true,
        organizationId: true,
        locationId: true,
      },
      limit: 1000,
    });

    let triggered = 0;

    for (const client of clients) {
      triggered += await triggerWorkflowsForNodeType({
        nodeType: NodeType.BIRTHDAY_TRIGGER,
        organizationId: client.organizationId,
        locationId: client.locationId,
        triggerData: {
          clientId: client.id,
          client: {
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            tags: client.tags,
            acquisitionStage: client.acquisitionStage,
            birthMonth: client.birthMonth,
            birthDay: client.birthDay,
          },
          birthMonth: client.birthMonth,
          birthDay: client.birthDay,
          date: today.toISOString(),
        },
      });
    }

    return { matchedClients: clients.length, triggeredWorkflows: triggered };
  },
);

async function findMatchingClients(
  automation: { type: string; organizationId: string; trigger: unknown },
) {
  const orgId = automation.organizationId;
  const trigger = automation.trigger as Record<string, unknown> | null;

  switch (automation.type) {
    case "ATTENDANCE_DROP": {
      const daysThreshold = (trigger?.daysInactive as number) ?? 14;
      const cutoff = subDays(new Date(), daysThreshold);
      return db
        .selectDistinct({
          id: clientTable.id,
          name: clientTable.name,
          email: clientTable.email,
        })
        .from(clientTable)
        .innerJoin(studioMembership, eq(studioMembership.clientId, clientTable.id))
        .where(
          and(
            eq(clientTable.organizationId, orgId),
            eq(clientTable.type, "CUSTOMER"),
            lte(clientTable.lastInteractionAt, cutoff),
            eq(studioMembership.status, "ACTIVE")
          )
        )
        .limit(100);
    }

    case "MEMBERSHIP_EXPIRING": {
      const daysBeforeExpiry = (trigger?.daysBefore as number) ?? 7;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysBeforeExpiry);
      const startOfTarget = new Date(targetDate);
      startOfTarget.setHours(0, 0, 0, 0);
      const endOfTarget = new Date(targetDate);
      endOfTarget.setHours(23, 59, 59, 999);

      const memberships = await db.query.studioMembership.findMany({
        where: and(
          eq(studioMembership.organizationId, orgId),
          eq(studioMembership.status, "ACTIVE"),
          gte(studioMembership.endDate, startOfTarget),
          lte(studioMembership.endDate, endOfTarget)
        ),
        with: { client: { columns: { id: true, name: true, email: true } } },
      });
      return memberships.map((m) => m.client);
    }

    case "WIN_BACK": {
      const cutoff = subDays(new Date(), 30);
      return db
        .select({
          id: clientTable.id,
          name: clientTable.name,
          email: clientTable.email,
        })
        .from(clientTable)
        .where(
          and(
            eq(clientTable.organizationId, orgId),
            eq(clientTable.type, "CUSTOMER"),
            lte(clientTable.lastInteractionAt, cutoff),
            notExists(
              db
                .select({ id: studioMembership.id })
                .from(studioMembership)
                .where(
                  and(
                    eq(studioMembership.clientId, clientTable.id),
                    eq(studioMembership.status, "ACTIVE")
                  )
                )
            )
          )
        )
        .limit(100);
    }

    case "NO_SHOW_FOLLOW_UP": {
      const yesterday = subDays(new Date(), 1);
      return db
        .selectDistinct({
          id: clientTable.id,
          name: clientTable.name,
          email: clientTable.email,
        })
        .from(studioBooking)
        .innerJoin(studioClass, eq(studioClass.id, studioBooking.classId))
        .innerJoin(clientTable, eq(clientTable.id, studioBooking.clientId))
        .where(
          and(
            eq(studioBooking.status, "NO_SHOW"),
            eq(studioClass.organizationId, orgId),
            gte(studioClass.startTime, yesterday)
          )
        );
    }

    case "BIRTHDAY": {
      const today = new Date();
      const clients = await db.query.client.findMany({
        where: and(
          eq(clientTable.organizationId, orgId),
          eq(clientTable.birthMonth, today.getMonth() + 1),
          eq(clientTable.birthDay, today.getDate())
        ),
        columns: { id: true, name: true, email: true },
      });
      return clients;
    }

    default:
      return [];
  }
}

async function executeActions(
  automation: { actions: unknown; organizationId: string },
  client: { id: string; name: string; email: string | null },
) {
  const actions = (automation.actions as Array<{ type: string; config: Record<string, unknown> }>) ?? [];

  for (const action of actions) {
    switch (action.type) {
      case "send_email": {
        if (!client.email) break;
        const subject = (action.config.subject as string) ?? "We miss you!";
        const body = (action.config.body as string) ?? "";
        const personalizedBody = body
          .replace("{{name}}", client.name)
          .replace("{{first_name}}", client.name.split(" ")[0]);

        await resend.emails.send({
          from: fromEmail(),
          to: [client.email],
          subject,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <p>Hi ${client.name.split(" ")[0]},</p>
            <p>${personalizedBody}</p>
          </div>`,
        });
        break;
      }

      case "create_task": {
        const owner = await db.query.member.findFirst({
          where: and(
            eq(member.organizationId, automation.organizationId),
            eq(member.role, "owner")
          ),
          columns: { userId: true },
        });
        if (owner) {
          await db.insert(notification).values({
              id: createId(),
              userId: owner.userId,
              organizationId: automation.organizationId,
              type: "RETENTION_TASK",
              title: (action.config.title as string) ?? "Follow up with member",
              message: `${client.name}: ${(action.config.description as string) ?? "Retention action needed"}`,
              entityType: "retention_automation",
              entityId: client.id,
          });
        }
        break;
      }
    }
  }
}
