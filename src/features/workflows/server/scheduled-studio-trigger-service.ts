import "server-only";

import { and, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { NodeType } from "@/db/enums";
import {
  client,
  location,
  node,
  studioBooking,
  studioClass,
  studioMembership,
  workflows,
} from "@/db/schema";
import { birthdayTriggerConfigSchema } from "@/features/nodes/triggers/components/birthday-trigger/config";
import {
  matchesClassBookedTrigger,
  membershipExpiringTriggerConfigSchema,
} from "@/features/nodes/studio/lib/studio-node-config";
import { sendWorkflowExecution } from "@/inngest/utils";

export async function evaluateBirthdayTriggers(
  now = new Date(),
): Promise<number> {
  const triggerNodes = await db
    .select({
      nodeId: node.id,
      nodeData: node.data,
      workflowId: workflows.id,
      organizationId: workflows.organizationId,
      locationId: workflows.locationId,
      timezone: location.timezone,
    })
    .from(node)
    .innerJoin(workflows, eq(workflows.id, node.workflowId))
    .leftJoin(location, eq(location.id, workflows.locationId))
    .where(
      and(
        eq(node.type, NodeType.BIRTHDAY_TRIGGER),
        eq(workflows.archived, false),
        eq(workflows.isTemplate, false),
      ),
    );

  let triggered = 0;
  for (const triggerNode of triggerNodes) {
    if (!triggerNode.organizationId) continue;
    const parsed = birthdayTriggerConfigSchema.safeParse(triggerNode.nodeData);
    if (!parsed.success) continue;
    const target = localCalendarTarget(
      now,
      triggerNode.timezone ?? "UTC",
      parsed.data.daysBefore,
    );
    const members = await db
      .select({
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        birthMonth: client.birthMonth,
        birthDay: client.birthDay,
      })
      .from(client)
      .where(
        and(
          eq(client.organizationId, triggerNode.organizationId),
          triggerNode.locationId
            ? eq(client.locationId, triggerNode.locationId)
            : isNull(client.locationId),
          eq(client.birthMonth, target.month),
          eq(client.birthDay, target.day),
        ),
      );

    for (const member of members) {
      await sendWorkflowExecution({
        workflowId: triggerNode.workflowId,
        expectedOrganizationId: triggerNode.organizationId,
        expectedLocationId: triggerNode.locationId,
        idempotencyKey: [
          "birthday",
          triggerNode.nodeId,
          member.id,
          target.year,
          target.month,
          target.day,
        ].join(":"),
        initialData: {
          triggerData: {
            clientId: member.id,
            client: member,
            daysUntilBirthday: parsed.data.daysBefore,
            birthdayDate: `${target.year}-${pad(target.month)}-${pad(target.day)}`,
          },
        },
      });
      triggered += 1;
    }
  }
  return triggered;
}

export async function evaluateMembershipExpiringTriggers(
  now = new Date(),
): Promise<number> {
  const triggerNodes = await db
    .select({
      nodeId: node.id,
      nodeData: node.data,
      workflowId: workflows.id,
      organizationId: workflows.organizationId,
      locationId: workflows.locationId,
      timezone: location.timezone,
    })
    .from(node)
    .innerJoin(workflows, eq(workflows.id, node.workflowId))
    .leftJoin(location, eq(location.id, workflows.locationId))
    .where(
      and(
        eq(node.type, NodeType.MEMBERSHIP_EXPIRING_TRIGGER),
        eq(workflows.archived, false),
        eq(workflows.isTemplate, false),
      ),
    );

  let triggered = 0;
  for (const triggerNode of triggerNodes) {
    if (!triggerNode.organizationId) continue;
    const parsed = membershipExpiringTriggerConfigSchema.safeParse(
      triggerNode.nodeData,
    );
    if (!parsed.success) continue;
    const timezone = triggerNode.timezone ?? "UTC";
    const target = localCalendarTarget(now, timezone, parsed.data.daysBefore);
    const targetKey = `${target.year}-${pad(target.month)}-${pad(target.day)}`;
    const utcTarget = new Date(
      Date.UTC(target.year, target.month - 1, target.day),
    );
    const candidates = await db
      .select({
        id: studioMembership.id,
        clientId: studioMembership.clientId,
        name: studioMembership.name,
        endDate: studioMembership.endDate,
        totalClasses: studioMembership.totalClasses,
        usedClasses: studioMembership.usedClasses,
        stripeSubscriptionId: studioMembership.stripeSubscriptionId,
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
      })
      .from(studioMembership)
      .innerJoin(client, eq(client.id, studioMembership.clientId))
      .where(
        and(
          eq(studioMembership.organizationId, triggerNode.organizationId),
          triggerNode.locationId
            ? eq(studioMembership.locationId, triggerNode.locationId)
            : isNull(studioMembership.locationId),
          inArray(studioMembership.status, ["ACTIVE", "PAST_DUE"]),
          gte(
            studioMembership.endDate,
            new Date(utcTarget.getTime() - 86_400_000),
          ),
          lt(
            studioMembership.endDate,
            new Date(utcTarget.getTime() + 172_800_000),
          ),
        ),
      );

    for (const membership of candidates) {
      if (!membership.endDate) continue;
      if (localDateKey(membership.endDate, timezone) !== targetKey) continue;
      const packageLike =
        membership.totalClasses !== null && !membership.stripeSubscriptionId;
      if (
        (parsed.data.membershipKind === "PACKAGE" && !packageLike) ||
        (parsed.data.membershipKind === "SUBSCRIPTION" && packageLike)
      ) {
        continue;
      }
      await sendWorkflowExecution({
        workflowId: triggerNode.workflowId,
        expectedOrganizationId: triggerNode.organizationId,
        expectedLocationId: triggerNode.locationId,
        idempotencyKey: [
          "membership-expiring",
          triggerNode.nodeId,
          membership.id,
          targetKey,
        ].join(":"),
        initialData: {
          triggerData: {
            clientId: membership.clientId,
            client: {
              id: membership.clientId,
              name: membership.clientName,
              email: membership.clientEmail,
              phone: membership.clientPhone,
            },
            membership: {
              id: membership.id,
              name: membership.name,
              endDate: membership.endDate.toISOString(),
              totalClasses: membership.totalClasses,
              usedClasses: membership.usedClasses,
              kind: packageLike ? "PACKAGE" : "SUBSCRIPTION",
            },
            daysUntilExpiry: parsed.data.daysBefore,
          },
        },
      });
      triggered += 1;
    }
  }
  return triggered;
}

export async function evaluateUpcomingClassTriggers(
  now = new Date(),
): Promise<number> {
  const startsAfter = new Date(now.getTime() + 55 * 60_000);
  const startsBefore = new Date(now.getTime() + 65 * 60_000);
  const rows = await db
    .select({
      nodeId: node.id,
      nodeData: node.data,
      workflowId: workflows.id,
      organizationId: workflows.organizationId,
      workflowLocationId: workflows.locationId,
      bookingId: studioBooking.id,
      clientId: studioBooking.clientId,
      classId: studioClass.id,
      className: studioClass.name,
      classStartTime: studioClass.startTime,
      serviceTypeId: studioClass.serviceTypeId,
      classSeriesId: sql<
        string | null
      >`${studioClass.metadata}->>'classSeriesId'`,
      bookingCount:
        sql<number>`(select count(*)::int from "StudioBooking" member_booking where member_booking."clientId" = ${studioBooking.clientId})`.mapWith(
          Number,
        ),
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone,
    })
    .from(node)
    .innerJoin(workflows, eq(workflows.id, node.workflowId))
    .innerJoin(
      studioClass,
      and(
        eq(studioClass.organizationId, workflows.organizationId),
        or(
          eq(studioClass.locationId, workflows.locationId),
          and(
            isNull(studioClass.locationId),
            isNull(workflows.locationId),
          ),
        ),
      ),
    )
    .innerJoin(studioBooking, eq(studioBooking.classId, studioClass.id))
    .innerJoin(
      client,
      and(
        eq(client.id, studioBooking.clientId),
        eq(client.organizationId, workflows.organizationId),
        or(
          eq(client.locationId, studioClass.locationId),
          and(isNull(client.locationId), isNull(studioClass.locationId)),
        ),
      ),
    )
    .where(
      and(
        eq(node.type, NodeType.CLASS_BOOKED_TRIGGER),
        eq(workflows.archived, false),
        eq(workflows.isTemplate, false),
        eq(studioClass.status, "SCHEDULED"),
        inArray(studioBooking.status, ["BOOKED", "ATTENDED"]),
        gte(studioClass.startTime, startsAfter),
        lt(studioClass.startTime, startsBefore),
      ),
    );

  let triggered = 0;
  for (const row of rows) {
    if (!row.organizationId) continue;
    if (
      !matchesClassBookedTrigger(row.nodeData, {
        classId: row.classId,
        className: row.className,
        serviceTypeId: row.serviceTypeId,
        classSeriesId: row.classSeriesId,
        bookingCount: row.bookingCount,
        triggerTiming: "ONE_HOUR_BEFORE",
      })
    ) {
      continue;
    }
    await sendWorkflowExecution({
      workflowId: row.workflowId,
      expectedOrganizationId: row.organizationId,
      expectedLocationId: row.workflowLocationId,
      idempotencyKey: [
        "one-hour-before-class",
        row.nodeId,
        row.bookingId,
        row.classStartTime.toISOString(),
      ].join(":"),
      initialData: {
        triggerData: {
          bookingId: row.bookingId,
          clientId: row.clientId,
          client: {
            id: row.clientId,
            name: row.clientName,
            email: row.clientEmail,
            phone: row.clientPhone,
          },
          class: {
            id: row.classId,
            name: row.className,
            startTime: row.classStartTime.toISOString(),
            serviceTypeId: row.serviceTypeId,
            classSeriesId: row.classSeriesId,
          },
          minutesUntilClass: 60,
        },
      },
    });
    triggered += 1;
  }
  return triggered;
}

function localCalendarTarget(
  now: Date,
  timezone: string,
  daysAhead: number,
): { year: number; month: number; day: number } {
  const safeTimezone = normalizeTimezone(timezone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  const target = new Date(
    Date.UTC(values.year ?? 1970, (values.month ?? 1) - 1, values.day ?? 1),
  );
  target.setUTCDate(target.getUTCDate() + daysAhead);
  return {
    year: target.getUTCFullYear(),
    month: target.getUTCMonth() + 1,
    day: target.getUTCDate(),
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function localDateKey(value: Date, timezone: string): string {
  const safeTimezone = normalizeTimezone(timezone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeTimezone(timezone: string): string {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    return timezone;
  } catch {
    return "UTC";
  }
}
