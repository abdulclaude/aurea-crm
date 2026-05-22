import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { and, desc, eq, isNull, type SQL } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { retentionAutomation } from "@/db/schema";

const RETENTION_TEMPLATES = [
  {
    type: "WELCOME_SEQUENCE" as const,
    name: "Welcome new clients",
    trigger: { event: "member_created", delay: 0 },
    actions: [
      { type: "send_email", template: "welcome", delay: 0 },
      {
        type: "send_sms",
        message:
          "Welcome to {{studio_name}}! We're excited to have you. Book your first class at {{booking_link}}",
        delay: 3600,
      },
      { type: "send_email", template: "first_class_tips", delay: 86400 },
      {
        type: "create_task",
        title: "Follow up with new member",
        delay: 259200,
      },
    ],
  },
  {
    type: "CLASS_REMINDER" as const,
    name: "Class Reminder",
    trigger: { event: "class_upcoming", hoursBeforeClass: 24 },
    actions: [
      { type: "send_email", template: "class_reminder_24h", delay: 0 },
      {
        type: "send_sms",
        message:
          "Reminder: You have {{class_name}} tomorrow at {{class_time}}. See you there!",
        delay: 0,
      },
    ],
  },
  {
    type: "NO_SHOW_FOLLOW_UP" as const,
    name: "No-Show Follow Up",
    trigger: { event: "member_no_show", delay: 3600 },
    actions: [
      { type: "send_email", template: "missed_you", delay: 0 },
      {
        type: "send_sms",
        message:
          "We missed you at {{class_name}} today! Everything OK? Book your next class: {{booking_link}}",
        delay: 7200,
      },
    ],
  },
  {
    type: "MEMBERSHIP_EXPIRING" as const,
    name: "Membership Expiring Soon",
    trigger: { event: "membership_expiring", daysBeforeExpiry: 7 },
    actions: [
      { type: "send_email", template: "membership_expiring", delay: 0 },
      {
        type: "send_sms",
        message:
          "Your {{plan_name}} membership expires in {{days_remaining}} days. Renew now to keep your streak going!",
        delay: 86400,
      },
      {
        type: "create_task",
        title: "Call member about renewal",
        delay: 172800,
      },
    ],
  },
  {
    type: "WIN_BACK" as const,
    name: "Win back lapsed clients",
    trigger: { event: "member_inactive", daysInactive: 14 },
    actions: [
      { type: "send_email", template: "we_miss_you", delay: 0 },
      {
        type: "send_sms",
        message:
          "Hey {{first_name}}, we haven't seen you in a while! Come back and try our new {{latest_class_type}} class 🧘",
        delay: 172800,
      },
      { type: "send_email", template: "special_offer", delay: 604800 },
    ],
  },
  {
    type: "MILESTONE_CELEBRATION" as const,
    name: "Milestone Celebrations",
    trigger: {
      event: "attendance_milestone",
      milestones: [10, 25, 50, 100, 200, 365],
    },
    actions: [
      { type: "send_email", template: "milestone_celebration", delay: 0 },
      {
        type: "send_sms",
        message:
          "🎉 Congrats {{first_name}}! You've completed {{milestone}} classes! Keep up the amazing work!",
        delay: 0,
      },
    ],
  },
  {
    type: "ATTENDANCE_DROP" as const,
    name: "Attendance Drop Alert",
    trigger: { event: "attendance_declining", threshold: 50 },
    actions: [
      { type: "send_email", template: "check_in", delay: 0 },
      {
        type: "create_task",
        title: "Check in with member - attendance dropping",
        delay: 86400,
      },
    ],
  },
  {
    type: "BIRTHDAY" as const,
    name: "Birthday Wishes",
    trigger: { event: "member_birthday", delay: 0 },
    actions: [
      { type: "send_email", template: "happy_birthday", delay: 0 },
      {
        type: "send_sms",
        message:
          "Happy Birthday {{first_name}}! 🎂 Enjoy a free class on us today. Use code: BDAY{{year}}",
        delay: 0,
      },
    ],
  },
  {
    type: "REFERRAL_REQUEST" as const,
    name: "Ask for Referrals",
    trigger: { event: "attendance_milestone", milestones: [10, 25] },
    actions: [{ type: "send_email", template: "referral_ask", delay: 86400 }],
  },
  {
    type: "INTRO_OFFER_EXPIRING" as const,
    name: "Intro Offer Expiring",
    trigger: { event: "intro_offer_expiring", daysBeforeExpiry: 2 },
    actions: [
      { type: "send_email", template: "intro_expiring", delay: 0 },
      {
        type: "send_sms",
        message:
          "Your intro offer expires in {{days_remaining}} days! Ready to join as a full member? We have plans starting at {{lowest_plan_price}}/mo",
        delay: 43200,
      },
      {
        type: "create_task",
        title: "Follow up on intro offer conversion",
        delay: 86400,
      },
    ],
  },
];

export const retentionRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organization",
      });

    return db.query.retentionAutomation.findMany({
      where: and(
        eq(retentionAutomation.organizationId, ctx.orgId),
        ...(ctx.locationId
          ? [eq(retentionAutomation.locationId, ctx.locationId)]
          : []),
      ),
      orderBy: desc(retentionAutomation.createdAt),
    });
  }),

  getTemplates: protectedProcedure.query(() => {
    return RETENTION_TEMPLATES.map((t) => ({
      type: t.type,
      name: t.name,
      trigger: t.trigger,
      actionsCount: t.actions.length,
    }));
  }),

  createFromTemplate: protectedProcedure
    .input(
      z.object({
        type: z.enum([
          "WELCOME_SEQUENCE",
          "CLASS_REMINDER",
          "NO_SHOW_FOLLOW_UP",
          "MEMBERSHIP_EXPIRING",
          "WIN_BACK",
          "MILESTONE_CELEBRATION",
          "ATTENDANCE_DROP",
          "BIRTHDAY",
          "REFERRAL_REQUEST",
          "INTRO_OFFER_EXPIRING",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });

      const template = RETENTION_TEMPLATES.find((t) => t.type === input.type);
      if (!template)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });

      const scopeConditions: SQL[] = [
        eq(retentionAutomation.organizationId, ctx.orgId),
        ctx.locationId
          ? eq(retentionAutomation.locationId, ctx.locationId)
          : isNull(retentionAutomation.locationId),
        eq(retentionAutomation.type, input.type),
      ];
      const existing = await db.query.retentionAutomation.findFirst({
        where: and(...scopeConditions),
      });

      if (existing)
        throw new TRPCError({
          code: "CONFLICT",
          message: "Automation already exists for this type",
        });

      const now = new Date();
      const [createdAutomation] = await db
        .insert(retentionAutomation)
        .values({
          id: createId(),
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          name: template.name,
          type: template.type,
          trigger: template.trigger,
          actions: template.actions,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return createdAutomation;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        trigger: z.record(z.string(), z.unknown()).optional(),
        actions: z.array(z.record(z.string(), z.unknown())).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      const { id, trigger, actions, ...rest } = input;

      const automation = await db.query.retentionAutomation.findFirst({
        where: and(
          eq(retentionAutomation.id, id),
          eq(retentionAutomation.organizationId, ctx.orgId),
        ),
      });

      if (!automation)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Automation not found",
        });

      const updateData: Partial<typeof retentionAutomation.$inferInsert> = {
        ...rest,
        updatedAt: new Date(),
      };
      if (trigger !== undefined) updateData.trigger = trigger;
      if (actions !== undefined) updateData.actions = actions;

      const [updatedAutomation] = await db
        .update(retentionAutomation)
        .set(updateData)
        .where(eq(retentionAutomation.id, id))
        .returning();

      return updatedAutomation;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });

      const automation = await db.query.retentionAutomation.findFirst({
        where: and(
          eq(retentionAutomation.id, input.id),
          eq(retentionAutomation.organizationId, ctx.orgId),
        ),
      });

      if (!automation)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Automation not found",
        });

      const [deletedAutomation] = await db
        .delete(retentionAutomation)
        .where(eq(retentionAutomation.id, input.id))
        .returning();

      return deletedAutomation;
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const [updatedAutomation] = await db
        .update(retentionAutomation)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(eq(retentionAutomation.id, input.id))
        .returning();

      return updatedAutomation;
    }),
});
