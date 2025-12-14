import { TRPCError } from "@trpc/server";
import z from "zod";
import type { Prisma } from "@prisma/client";
import {
  RecurringInvoiceStatus,
  RecurringFrequency,
  BillingModel,
  ActivityAction,
} from "@prisma/client";

import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { logAnalytics } from "@/lib/analytics-logger";

const RECURRING_INVOICE_PAGE_SIZE = 20;

const recurringInvoiceInclude = {
  recurringInvoiceGeneration: {
    orderBy: { generatedAt: "desc" as const },
    take: 10,
  },
} satisfies Prisma.RecurringInvoiceInclude;

// Zod schema for line items (matches Invoice structure)
const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  amount: z.number(),
});

// Calculate next run date based on frequency
function calculateNextRunDate(params: {
  startDate: Date;
  frequency: RecurringFrequency;
  interval: number;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  lastRunDate?: Date | null;
}): Date {
  const { startDate, frequency, interval, dayOfMonth, dayOfWeek, lastRunDate } =
    params;

  // Start from lastRunDate if available, otherwise from startDate
  const baseDate = lastRunDate || startDate;
  const nextDate = new Date(baseDate);

  switch (frequency) {
    case RecurringFrequency.DAILY:
      nextDate.setDate(nextDate.getDate() + interval);
      break;

    case RecurringFrequency.WEEKLY:
      nextDate.setDate(nextDate.getDate() + 7 * interval);
      // Adjust to specific day of week if provided
      if (dayOfWeek !== null && dayOfWeek !== undefined) {
        const currentDay = nextDate.getDay();
        const diff = dayOfWeek - currentDay;
        nextDate.setDate(nextDate.getDate() + diff);
      }
      break;

    case RecurringFrequency.BIWEEKLY:
      nextDate.setDate(nextDate.getDate() + 14 * interval);
      break;

    case RecurringFrequency.MONTHLY:
      nextDate.setMonth(nextDate.getMonth() + interval);
      // Adjust to specific day of month if provided
      if (dayOfMonth !== null && dayOfMonth !== undefined) {
        nextDate.setDate(dayOfMonth);
      }
      break;

    case RecurringFrequency.QUARTERLY:
      nextDate.setMonth(nextDate.getMonth() + 3 * interval);
      if (dayOfMonth !== null && dayOfMonth !== undefined) {
        nextDate.setDate(dayOfMonth);
      }
      break;

    case RecurringFrequency.SEMIANNUALLY:
      nextDate.setMonth(nextDate.getMonth() + 6 * interval);
      if (dayOfMonth !== null && dayOfMonth !== undefined) {
        nextDate.setDate(dayOfMonth);
      }
      break;

    case RecurringFrequency.ANNUALLY:
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      if (dayOfMonth !== null && dayOfMonth !== undefined) {
        nextDate.setDate(dayOfMonth);
      }
      break;
  }

  return nextDate;
}

export const recurringInvoicesRouter = createTRPCRouter({
  // List recurring invoices
  list: protectedProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        status: z.nativeEnum(RecurringInvoiceStatus).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const where: Prisma.RecurringInvoiceWhereInput = {
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId ?? null,
      };

      if (input.status) {
        where.status = input.status;
      }

      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { contactName: { contains: input.search, mode: "insensitive" } },
          { contactEmail: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const recurringInvoices = await prisma.recurringInvoice.findMany({
        where,
        include: recurringInvoiceInclude,
        take: RECURRING_INVOICE_PAGE_SIZE + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: string | undefined;
      if (recurringInvoices.length > RECURRING_INVOICE_PAGE_SIZE) {
        const nextItem = recurringInvoices.pop();
        nextCursor = nextItem?.id;
      }

      return {
        recurringInvoices,
        nextCursor,
      };
    }),

  // Get single recurring invoice
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const recurringInvoice = await prisma.recurringInvoice.findUnique({
        where: { id: input.id },
        include: recurringInvoiceInclude,
      });

      if (!recurringInvoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recurring invoice not found",
        });
      }

      // Verify access
      if (recurringInvoice.organizationId !== ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return recurringInvoice;
    }),

  // Create recurring invoice
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        contactId: z.string().optional(),
        contactName: z.string(),
        contactEmail: z.string().email().optional(),
        contactAddress: z
          .object({
            line1: z.string().optional(),
            line2: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postalCode: z.string().optional(),
            country: z.string().optional(),
          })
          .optional(),
        frequency: z.nativeEnum(RecurringFrequency),
        interval: z.number().int().min(1).default(1),
        startDate: z.date(),
        endDate: z.date().optional(),
        dayOfMonth: z.number().int().min(1).max(31).optional(),
        dayOfWeek: z.number().int().min(0).max(6).optional(),
        lineItems: z.array(lineItemSchema),
        taxRate: z.number().optional(),
        discountAmount: z.number().default(0),
        currency: z.string().default("USD"),
        dueDays: z.number().int().default(30),
        notes: z.string().optional(),
        termsConditions: z.string().optional(),
        autoSend: z.boolean().default(false),
        sendReminders: z.boolean().default(false),
        templateId: z.string().optional(),
        billingModel: z.nativeEnum(BillingModel).default(BillingModel.RETAINER),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      // Calculate amounts
      const subtotal = input.lineItems.reduce(
        (sum, item) => sum + item.amount,
        0
      );
      const taxAmount = input.taxRate ? (subtotal * input.taxRate) / 100 : 0;
      const total = subtotal + taxAmount - input.discountAmount;

      // Calculate next run date
      const nextRunDate = calculateNextRunDate({
        startDate: input.startDate,
        frequency: input.frequency,
        interval: input.interval,
        dayOfMonth: input.dayOfMonth,
        dayOfWeek: input.dayOfWeek,
      });

      const recurringInvoice = await prisma.recurringInvoice.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId,
          name: input.name,
          description: input.description,
          contactId: input.contactId,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
          contactAddress: input.contactAddress,
          frequency: input.frequency,
          interval: input.interval,
          startDate: input.startDate,
          endDate: input.endDate,
          nextRunDate,
          dayOfMonth: input.dayOfMonth,
          dayOfWeek: input.dayOfWeek,
          lineItems: input.lineItems,
          subtotal,
          taxRate: input.taxRate,
          taxAmount,
          discountAmount: input.discountAmount,
          total,
          currency: input.currency,
          dueDays: input.dueDays,
          notes: input.notes,
          termsConditions: input.termsConditions,
          autoSend: input.autoSend,
          sendReminders: input.sendReminders,
          templateId: input.templateId,
          billingModel: input.billingModel,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        include: recurringInvoiceInclude,
      });

      // Log activity
      await logAnalytics({
        userId: ctx.auth.user.id,
        action: ActivityAction.CREATED,
        entityType: "RECURRING_INVOICE",
        entityId: recurringInvoice.id,
        entityName: input.name,
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId,
        metadata: {
          name: input.name,
          frequency: input.frequency,
          interval: input.interval,
          total,
        },
      });

      return recurringInvoice;
    }),

  // Update recurring invoice
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        contactId: z.string().optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactAddress: z
          .object({
            line1: z.string().optional(),
            line2: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postalCode: z.string().optional(),
            country: z.string().optional(),
          })
          .optional(),
        frequency: z.nativeEnum(RecurringFrequency).optional(),
        interval: z.number().int().min(1).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional().nullable(),
        dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
        dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
        lineItems: z.array(lineItemSchema).optional(),
        taxRate: z.number().optional().nullable(),
        discountAmount: z.number().optional(),
        currency: z.string().optional(),
        dueDays: z.number().int().optional(),
        notes: z.string().optional().nullable(),
        termsConditions: z.string().optional().nullable(),
        autoSend: z.boolean().optional(),
        sendReminders: z.boolean().optional(),
        templateId: z.string().optional().nullable(),
        billingModel: z.nativeEnum(BillingModel).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.recurringInvoice.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recurring invoice not found",
        });
      }

      if (existing.organizationId !== ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      // Recalculate amounts if line items or pricing changed
      let updateData: Prisma.RecurringInvoiceUpdateInput = {};

      if (input.lineItems || input.taxRate !== undefined || input.discountAmount !== undefined) {
        const lineItems = input.lineItems || (existing.lineItems as unknown as typeof input.lineItems);
        const subtotal = lineItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
        const taxRate = input.taxRate ?? (existing.taxRate ? Number(existing.taxRate) : 0);
        const discountAmount = input.discountAmount ?? Number(existing.discountAmount);
        const taxAmount = taxRate ? (subtotal * taxRate) / 100 : 0;
        const total = subtotal + taxAmount - discountAmount;

        updateData = {
          subtotal,
          taxRate,
          taxAmount,
          discountAmount,
          total,
        };
      }

      // Recalculate next run date if schedule changed
      if (
        input.frequency ||
        input.interval ||
        input.startDate ||
        input.dayOfMonth !== undefined ||
        input.dayOfWeek !== undefined
      ) {
        const nextRunDate = calculateNextRunDate({
          startDate: input.startDate || existing.startDate,
          frequency: input.frequency || existing.frequency,
          interval: input.interval || existing.interval,
          dayOfMonth: input.dayOfMonth !== undefined ? input.dayOfMonth : existing.dayOfMonth,
          dayOfWeek: input.dayOfWeek !== undefined ? input.dayOfWeek : existing.dayOfWeek,
          lastRunDate: existing.lastRunDate,
        });

        updateData.nextRunDate = nextRunDate;
      }

      // Merge all update fields
      updateData = {
        ...updateData,
        name: input.name,
        description: input.description,
        contactId: input.contactId,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactAddress: input.contactAddress,
        frequency: input.frequency,
        interval: input.interval,
        startDate: input.startDate,
        endDate: input.endDate !== undefined ? input.endDate : undefined,
        dayOfMonth: input.dayOfMonth !== undefined ? input.dayOfMonth : undefined,
        dayOfWeek: input.dayOfWeek !== undefined ? input.dayOfWeek : undefined,
        lineItems: input.lineItems,
        currency: input.currency,
        dueDays: input.dueDays,
        notes: input.notes !== undefined ? input.notes : undefined,
        termsConditions: input.termsConditions !== undefined ? input.termsConditions : undefined,
        autoSend: input.autoSend,
        sendReminders: input.sendReminders,
        templateId: input.templateId !== undefined ? input.templateId : undefined,
        billingModel: input.billingModel,
      };

      // Remove undefined values
      Object.keys(updateData).forEach((key) => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      const recurringInvoice = await prisma.recurringInvoice.update({
        where: { id: input.id },
        data: updateData,
        include: recurringInvoiceInclude,
      });

      // Log activity
      await logAnalytics({
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "RECURRING_INVOICE",
        entityId: recurringInvoice.id,
        entityName: recurringInvoice.name,
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId,
        metadata: {
          updatedFields: Object.keys(updateData),
        },
      });

      return recurringInvoice;
    }),

  // Pause/Resume recurring invoice
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(RecurringInvoiceStatus),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.recurringInvoice.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recurring invoice not found",
        });
      }

      if (existing.organizationId !== ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      const recurringInvoice = await prisma.recurringInvoice.update({
        where: { id: input.id },
        data: { status: input.status },
        include: recurringInvoiceInclude,
      });

      // Log activity
      await logAnalytics({
        userId: ctx.auth.user.id,
        action: ActivityAction.UPDATED,
        entityType: "RECURRING_INVOICE",
        entityId: recurringInvoice.id,
        entityName: recurringInvoice.name,
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId,
        metadata: {
          status: input.status,
        },
      });

      return recurringInvoice;
    }),

  // Delete recurring invoice
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.recurringInvoice.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recurring invoice not found",
        });
      }

      if (existing.organizationId !== ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      await prisma.recurringInvoice.delete({
        where: { id: input.id },
      });

      // Log activity
      await logAnalytics({
        userId: ctx.auth.user.id,
        action: ActivityAction.DELETED,
        entityType: "RECURRING_INVOICE",
        entityId: input.id,
        entityName: existing.name,
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId,
        metadata: {
          name: existing.name,
        },
      });

      return { success: true };
    }),
});
