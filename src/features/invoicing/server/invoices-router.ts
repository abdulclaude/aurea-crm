import { TRPCError } from "@trpc/server";
import z from "zod";
import { InvoiceStatus, InvoiceType, BillingModel, PaymentMethod, ActivityAction, BankTransferStatus } from "@/db/enums";
import { format } from "date-fns";
import { eq, and, or, ilike, isNull, inArray, desc, asc, gt, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  invoice,
  invoiceLineItem,
  invoicePayment,
  invoiceReminder,
  invoiceTemplate,
  stripeConnection,
  bankTransferSettings,
  location,
  timeLog,
} from "@/db/schema";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "@/trpc/init";
import { logAnalytics, getChangedFields } from "@/lib/analytics-logger";
import { generateInvoiceNumber } from "@/features/invoicing/lib/invoice-number-generator";
import { createNotification } from "@/lib/notifications";

const INVOICE_PAGE_SIZE = 20;

const invoiceWith = {
  invoiceLineItems: true,
  invoicePayments: true,
  invoiceReminders: true,
  invoiceTemplate: true,
} as const;

/**
 * Determine available payment methods for an invoice based on configured integrations
 */
async function getAvailablePaymentMethods(params: {
  organizationId: string;
  locationId?: string;
}): Promise<PaymentMethod[]> {
  const { organizationId, locationId } = params;
  const methods: PaymentMethod[] = [];

  // Check if Stripe Connect is enabled
  const stripeConnect = await db.query.stripeConnection.findFirst({
    where: (t, { eq, and, isNull }) =>
      and(
        eq(t.organizationId, organizationId),
        locationId ? eq(t.locationId, locationId) : isNull(t.locationId),
        eq(t.isActive, true),
        eq(t.chargesEnabled, true),
      ),
  });

  if (stripeConnect) {
    methods.push(PaymentMethod.STRIPE);
  }

  // Check if Bank Transfer is enabled
  const bankTransfer = await db.query.bankTransferSettings.findFirst({
    where: (t, { eq, and, isNull }) =>
      and(
        eq(t.organizationId, organizationId),
        locationId ? eq(t.locationId, locationId) : isNull(t.locationId),
        eq(t.enabled, true),
      ),
  });

  if (bankTransfer) {
    methods.push(PaymentMethod.BANK_TRANSFER);
  }

  // Always include MANUAL as a fallback
  methods.push(PaymentMethod.MANUAL);

  return methods;
}

type InvoiceQueryResult = Awaited<ReturnType<typeof db.query.invoice.findFirst<{
  with: typeof invoiceWith;
}>>>;

const mapInvoice = (inv: NonNullable<InvoiceQueryResult>) => {
  return {
    id: inv.id,
    organizationId: inv.organizationId,
    locationId: inv.locationId,
    invoiceNumber: inv.invoiceNumber,
    clientId: inv.clientId,
    clientName: inv.clientName,
    clientEmail: inv.clientEmail,
    clientAddress: inv.clientAddress,
    title: inv.title,
    type: inv.type,
    status: inv.status,
    billingModel: inv.billingModel,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    paidAt: inv.paidAt,
    subtotal: inv.subtotal,
    taxRate: inv.taxRate ?? null,
    taxAmount: inv.taxAmount,
    discountAmount: inv.discountAmount,
    total: inv.total,
    amountPaid: inv.amountPaid,
    amountDue: inv.amountDue,
    currency: inv.currency,
    notes: inv.notes,
    internalNotes: inv.internalNotes,
    termsConditions: inv.termsConditions,
    documentUrl: inv.documentUrl,
    documentName: inv.documentName,
    stripeInvoiceId: inv.stripeInvoiceId,
    stripePaymentIntentId: inv.stripePaymentIntentId,
    xeroInvoiceId: inv.xeroInvoiceId,
    lastReminderSentAt: inv.lastReminderSentAt,
    reminderCount: inv.reminderCount,
    metadata: inv.metadata,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
    lineItems: inv.invoiceLineItems.map((item) => ({
      id: item.id,
      invoiceId: item.invoiceId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
      timeLogId: item.timeLogId,
      order: item.order,
      metadata: item.metadata,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    payments: inv.invoicePayments.map((payment) => ({
      id: payment.id,
      invoiceId: payment.invoiceId,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      paidAt: payment.paidAt,
      stripePaymentId: payment.stripePaymentId,
      xeroPaymentId: payment.xeroPaymentId,
      referenceNumber: payment.referenceNumber,
      notes: payment.notes,
      metadata: payment.metadata,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    })),
    reminders: inv.invoiceReminders.map((reminder) => ({
      id: reminder.id,
      invoiceId: reminder.invoiceId,
      sentAt: reminder.sentAt,
      sentTo: reminder.sentTo,
      subject: reminder.subject,
      message: reminder.message,
      opened: reminder.opened,
      openedAt: reminder.openedAt,
      metadata: reminder.metadata,
      createdAt: reminder.createdAt,
    })),
  };
};

export const invoicesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(INVOICE_PAGE_SIZE),
        status: z.nativeEnum(InvoiceStatus).optional(),
        type: z.nativeEnum(InvoiceType).optional(),
        clientId: z.string().optional(),
        search: z.string().optional(),
        sortBy: z.enum(["issueDate", "dueDate", "total"]).default("issueDate"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit, status, type, clientId, search, sortBy, sortOrder } =
        input;

      // Require either organizationId or locationId
      if (!ctx.orgId && !ctx.locationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization or location context required",
        });
      }

      const sortColumn = sortBy === "issueDate"
        ? invoice.issueDate
        : sortBy === "dueDate"
          ? invoice.dueDate
          : invoice.total;
      const orderFn = sortOrder === "asc" ? asc : desc;

      const invoices = await db.query.invoice.findMany({
        where: (t, ops) => {
          const conditions = [];

          if (ctx.orgId) conditions.push(ops.eq(t.organizationId, ctx.orgId));
          if (ctx.locationId) conditions.push(ops.eq(t.locationId, ctx.locationId));
          if (status) conditions.push(ops.eq(t.status, status));
          if (type) conditions.push(ops.eq(t.type, type));
          if (clientId) conditions.push(ops.eq(t.clientId, clientId));
          if (cursor) conditions.push(ops.gt(t.id, cursor));

          if (search) {
            conditions.push(
              ops.or(
                ops.ilike(t.invoiceNumber, `%${search}%`),
                ops.ilike(t.clientName, `%${search}%`),
                ops.ilike(t.clientEmail, `%${search}%`),
              )!,
            );
          }

          return conditions.length > 0 ? ops.and(...conditions) : undefined;
        },
        with: invoiceWith,
        orderBy: orderFn(sortColumn),
        limit: limit + 1,
      });

      let nextCursor: string | undefined = undefined;
      if (invoices.length > limit) {
        const nextItem = invoices.pop();
        nextCursor = nextItem?.id;
      }

      return {
        invoices: invoices.map(mapInvoice),
        pagination: {
          nextCursor,
          hasMore: !!nextCursor,
        },
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const inv = await db.query.invoice.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
        with: invoiceWith,
      });

      if (!inv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Verify access
      if (
        inv.organizationId !== ctx.orgId &&
        inv.locationId !== ctx.locationId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this invoice",
        });
      }

      return mapInvoice(inv);
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        clientName: z.string().min(1),
        clientEmail: z.string().email().optional(),
        clientAddress: z
          .object({
            line1: z.string().optional(),
            line2: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postalCode: z.string().optional(),
            country: z.string().optional(),
          })
          .optional(),
        title: z.string().optional(),
        type: z.nativeEnum(InvoiceType).default(InvoiceType.SENT),
        billingModel: z.nativeEnum(BillingModel).default("CUSTOM"),
        templateId: z.string().optional(),
        dueDate: z.date(),
        lineItems: z.array(
          z.object({
            description: z.string().min(1),
            quantity: z.number().positive(),
            unitPrice: z.number(),
            timeLogId: z.string().optional(),
          })
        ),
        taxRate: z.number().min(0).max(100).optional(),
        discountAmount: z.number().min(0).optional(),
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
        termsConditions: z.string().optional(),
        documentUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      // Calculate line items totals
      const subtotal = input.lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );

      const taxAmount = input.taxRate
        ? (subtotal * input.taxRate) / 100
        : 0;
      const discountAmount = input.discountAmount ?? 0;
      const total = subtotal + taxAmount - discountAmount;

      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber(
        ctx.orgId,
        ctx.locationId ?? undefined
      );

      // Get available payment methods
      const paymentMethods = await getAvailablePaymentMethods({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? undefined,
      });

      // Create invoice with line items in a transaction
      const createdInvoice = await db.transaction(async (tx) => {
        const invoiceId = crypto.randomUUID();
        const now = new Date();

        const [inv] = await tx.insert(invoice).values({
          id: invoiceId,
          organizationId: ctx.orgId!,
          locationId: ctx.locationId ?? undefined,
          invoiceNumber,
          clientId: input.clientId,
          clientName: input.clientName,
          clientEmail: input.clientEmail,
          clientAddress: input.clientAddress,
          title: input.title,
          type: input.type,
          billingModel: input.billingModel,
          templateId: input.templateId && input.templateId !== "__default__" ? input.templateId : undefined,
          dueDate: input.dueDate,
          subtotal: String(subtotal),
          taxRate: input.taxRate != null ? String(input.taxRate) : undefined,
          taxAmount: String(taxAmount),
          discountAmount: String(discountAmount),
          total: String(total),
          amountDue: String(total),
          amountPaid: "0",
          notes: input.notes,
          internalNotes: input.internalNotes,
          termsConditions: input.termsConditions,
          documentUrl: input.documentUrl,
          paymentMethods,
          createdAt: now,
          updatedAt: now,
        }).returning();

        if (input.lineItems.length > 0) {
          await tx.insert(invoiceLineItem).values(
            input.lineItems.map((item, index) => ({
              id: crypto.randomUUID(),
              invoiceId,
              description: item.description,
              quantity: String(item.quantity),
              unitPrice: String(item.unitPrice),
              amount: String(item.quantity * item.unitPrice),
              timeLogId: item.timeLogId,
              order: index,
              createdAt: now,
              updatedAt: now,
            })),
          );
        }

        return inv!;
      });

      // Fetch the full invoice with relations
      const fullInvoice = await db.query.invoice.findFirst({
        where: (t, { eq }) => eq(t.id, createdInvoice.id),
        with: invoiceWith,
      });

      // Log activity
      await logAnalytics({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? undefined,
        userId: ctx.auth.user.id,
        type: "INVOICE",
        action: ActivityAction.CREATED,
        entityType: "invoice",
        entityId: createdInvoice.id,
        entityName: `${createdInvoice.invoiceNumber} - ${createdInvoice.clientName}`,
      });

      return mapInvoice(fullInvoice!);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        clientId: z.string().optional(),
        clientName: z.string().min(1).optional(),
        clientEmail: z.string().email().optional(),
        clientAddress: z
          .object({
            line1: z.string().optional(),
            line2: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postalCode: z.string().optional(),
            country: z.string().optional(),
          })
          .optional(),
        title: z.string().optional(),
        status: z.nativeEnum(InvoiceStatus).optional(),
        templateId: z.string().optional(),
        dueDate: z.date().optional(),
        lineItems: z
          .array(
            z.object({
              id: z.string().optional(), // Existing line item ID
              description: z.string().min(1),
              quantity: z.number().positive(),
              unitPrice: z.number(),
              timeLogId: z.string().optional(),
            })
          )
          .optional(),
        taxRate: z.number().min(0).max(100).optional(),
        discountAmount: z.number().min(0).optional(),
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
        termsConditions: z.string().optional(),
        documentUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, lineItems, templateId, ...updateData } = input;

      // Handle template ID - null out if "__default__" is selected
      const templateUpdate = templateId !== undefined
        ? { templateId: templateId === "__default__" ? null : templateId }
        : {};

      // Fetch existing invoice
      const existingInvoice = await db.query.invoice.findFirst({
        where: (t, { eq }) => eq(t.id, id),
        with: { invoiceLineItems: true },
      });

      if (!existingInvoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Verify access
      if (
        existingInvoice.organizationId !== ctx.orgId &&
        existingInvoice.locationId !== ctx.locationId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this invoice",
        });
      }

      // Calculate totals if line items are updated
      let financialUpdate: Record<string, unknown> = {};

      if (lineItems) {
        const subtotal = lineItems.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        );

        const taxRate = updateData.taxRate ?? (existingInvoice.taxRate ? parseFloat(existingInvoice.taxRate) : undefined);
        const taxAmount = taxRate ? (subtotal * taxRate) / 100 : 0;
        const discountAmount =
          updateData.discountAmount ??
          parseFloat(existingInvoice.discountAmount);
        const total = subtotal + taxAmount - discountAmount;
        const amountPaid = parseFloat(existingInvoice.amountPaid);

        financialUpdate = {
          subtotal: String(subtotal),
          taxAmount: String(taxAmount),
          discountAmount: String(discountAmount),
          total: String(total),
          amountDue: String(total - amountPaid),
        };
      }

      // Build the update set
      const updateSet: Record<string, unknown> = {
        updatedAt: new Date(),
        ...templateUpdate,
        ...financialUpdate,
      };
      if (updateData.clientId !== undefined) updateSet.clientId = updateData.clientId;
      if (updateData.clientName !== undefined) updateSet.clientName = updateData.clientName;
      if (updateData.clientEmail !== undefined) updateSet.clientEmail = updateData.clientEmail;
      if (updateData.clientAddress !== undefined) updateSet.clientAddress = updateData.clientAddress;
      if (updateData.title !== undefined) updateSet.title = updateData.title;
      if (updateData.status !== undefined) updateSet.status = updateData.status;
      if (updateData.dueDate !== undefined) updateSet.dueDate = updateData.dueDate;
      if (updateData.taxRate !== undefined) updateSet.taxRate = String(updateData.taxRate);
      if (updateData.discountAmount !== undefined) updateSet.discountAmount = String(updateData.discountAmount);
      if (updateData.notes !== undefined) updateSet.notes = updateData.notes;
      if (updateData.internalNotes !== undefined) updateSet.internalNotes = updateData.internalNotes;
      if (updateData.termsConditions !== undefined) updateSet.termsConditions = updateData.termsConditions;
      if (updateData.documentUrl !== undefined) updateSet.documentUrl = updateData.documentUrl;

      // Update invoice in a transaction
      await db.transaction(async (tx) => {
        // Delete old line items if updating
        if (lineItems) {
          await tx.delete(invoiceLineItem).where(eq(invoiceLineItem.invoiceId, id));

          // Insert new line items
          if (lineItems.length > 0) {
            const now = new Date();
            await tx.insert(invoiceLineItem).values(
              lineItems.map((item, index) => ({
                id: crypto.randomUUID(),
                invoiceId: id,
                description: item.description,
                quantity: String(item.quantity),
                unitPrice: String(item.unitPrice),
                amount: String(item.quantity * item.unitPrice),
                timeLogId: item.timeLogId,
                order: index,
                createdAt: now,
                updatedAt: now,
              })),
            );
          }
        }

        // Update invoice
        await tx.update(invoice).set(updateSet).where(eq(invoice.id, id));
      });

      // Re-fetch the full invoice
      const updatedInvoice = await db.query.invoice.findFirst({
        where: (t, { eq }) => eq(t.id, id),
        with: invoiceWith,
      });

      // Log activity
      const changes = getChangedFields(existingInvoice, {
        ...existingInvoice,
        ...(updateData as any),
      } as any);

      if (changes && Object.keys(changes).length > 0) {
        await logAnalytics({
          organizationId: ctx.orgId!,
          locationId: ctx.locationId ?? undefined,
          userId: ctx.auth.user.id,
          type: "INVOICE" as any,
          action: ActivityAction.UPDATED,
          entityType: "invoice",
          entityId: updatedInvoice!.id,
          entityName: `${updatedInvoice!.invoiceNumber} - ${updatedInvoice!.clientName}`,
          changes: changes as any,
        });
      }

      return mapInvoice(updatedInvoice!);
    }),

  updateDocument: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        documentUrl: z.string().url().nullable(),
        documentName: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, documentUrl, documentName } = input;

      // Fetch existing invoice
      const existingInvoice = await db.query.invoice.findFirst({
        where: (t, { eq }) => eq(t.id, id),
      });

      if (!existingInvoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Verify access
      if (
        existingInvoice.organizationId !== ctx.orgId &&
        existingInvoice.locationId !== ctx.locationId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this invoice",
        });
      }

      // Update invoice document
      await db.update(invoice).set({
        documentUrl,
        documentName,
      }).where(eq(invoice.id, id));

      // Re-fetch the full invoice
      const updatedInvoice = await db.query.invoice.findFirst({
        where: (t, { eq }) => eq(t.id, id),
        with: invoiceWith,
      });

      // Log activity
      await logAnalytics({
        organizationId: ctx.orgId!,
        locationId: ctx.locationId ?? undefined,
        userId: ctx.auth.user.id,
        type: "INVOICE" as any,
        action: ActivityAction.UPDATED,
        entityType: "invoice",
        entityId: updatedInvoice!.id,
        entityName: `${updatedInvoice!.invoiceNumber} - ${updatedInvoice!.clientName}`,
        changes: {
          documentUrl: {
            old: existingInvoice.documentUrl,
            new: documentUrl,
          },
        } as any,
      });

      return mapInvoice(updatedInvoice!);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const inv = await db.query.invoice.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
      });

      if (!inv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Verify access
      if (
        inv.organizationId !== ctx.orgId &&
        inv.locationId !== ctx.locationId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this invoice",
        });
      }

      await db.delete(invoice).where(eq(invoice.id, input.id));

      await createNotification({
        type: "INVOICE_DELETED",
        title: "Invoice deleted",
        message: `${ctx.auth.user.name} deleted invoice ${inv.invoiceNumber}`,
        actorId: ctx.auth.user.id,
        entityType: "invoice",
        entityId: inv.id,
        organizationId: inv.organizationId,
        locationId: inv.locationId ?? undefined,
      });

      // Log activity
      await logAnalytics({
        organizationId: ctx.orgId!,
        locationId: ctx.locationId ?? undefined,
        userId: ctx.auth.user.id,
        type: "INVOICE",
        action: ActivityAction.DELETED,
        entityType: "invoice",
        entityId: inv.id,
        entityName: `${inv.invoiceNumber} - ${inv.clientName}`,
      });

      return { success: true };
    }),

  recordPayment: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        amount: z.number().positive(),
        method: z.nativeEnum(PaymentMethod),
        paidAt: z.date().default(new Date()),
        referenceNumber: z.string().optional(),
        notes: z.string().optional(),
        stripePaymentId: z.string().optional(),
        xeroPaymentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { invoiceId, ...paymentData } = input;

      const inv = await db.query.invoice.findFirst({
        where: (t, { eq }) => eq(t.id, invoiceId),
      });

      if (!inv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Verify access
      if (
        inv.organizationId !== ctx.orgId &&
        inv.locationId !== ctx.locationId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this invoice",
        });
      }

      // Create payment and update invoice
      const payment = await db.transaction(async (tx) => {
        const now = new Date();
        const [payment] = await tx.insert(invoicePayment).values({
          id: crypto.randomUUID(),
          invoiceId,
          amount: String(paymentData.amount),
          method: paymentData.method,
          paidAt: paymentData.paidAt,
          stripePaymentId: paymentData.stripePaymentId,
          xeroPaymentId: paymentData.xeroPaymentId,
          referenceNumber: paymentData.referenceNumber,
          notes: paymentData.notes,
          createdAt: now,
          updatedAt: now,
        }).returning();

        const newAmountPaid =
          parseFloat(inv.amountPaid) + paymentData.amount;
        const newAmountDue = parseFloat(inv.total) - newAmountPaid;

        // Determine new status
        let newStatus = inv.status;
        if (newAmountDue <= 0) {
          newStatus = InvoiceStatus.PAID;
        } else if (newAmountPaid > 0) {
          newStatus = InvoiceStatus.PARTIALLY_PAID;
        }

        await tx.update(invoice).set({
          amountPaid: String(newAmountPaid),
          amountDue: String(newAmountDue),
          status: newStatus,
          paidAt: newAmountDue <= 0 ? new Date() : inv.paidAt,
        }).where(eq(invoice.id, invoiceId));

        return payment!;
      });

      // Log activity
      await logAnalytics({
        organizationId: ctx.orgId!,
        locationId: ctx.locationId ?? undefined,
        userId: ctx.auth.user.id,
        type: "INVOICE",
        action: ActivityAction.UPDATED,
        entityType: "invoice",
        entityId: inv.id,
        entityName: `${inv.invoiceNumber} - Payment Recorded`,
        changes: {
          payment: {
            old: inv.amountPaid,
            new: String(parseFloat(inv.amountPaid) + paymentData.amount),
          },
        },
      });

      await createNotification({
        type: "INVOICE_PAYMENT_RECORDED",
        title: "Invoice payment recorded",
        message: `${ctx.auth.user.name} recorded a payment for invoice ${inv.invoiceNumber}`,
        actorId: ctx.auth.user.id,
        entityType: "invoice",
        entityId: inv.id,
        organizationId: inv.organizationId,
        locationId: inv.locationId ?? undefined,
        data: {
          amount: paymentData.amount,
          method: paymentData.method,
        },
      });

      return {
        id: payment.id,
        amount: payment.amount,
        method: payment.method,
        paidAt: payment.paidAt,
      };
    }),

  sendReminder: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        subject: z.string().min(1),
        message: z.string().min(1),
        sendTo: z.string().email().optional(), // Override invoice email
      })
    )
    .mutation(async ({ ctx, input }) => {
      const inv = await db.query.invoice.findFirst({
        where: (t, { eq }) => eq(t.id, input.invoiceId),
        with: invoiceWith,
      });

      if (!inv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Verify access
      if (
        inv.organizationId !== ctx.orgId &&
        inv.locationId !== ctx.locationId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this invoice",
        });
      }

      const sendTo = input.sendTo ?? inv.clientEmail;
      if (!sendTo) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No email address available for reminder",
        });
      }

      // Generate payment link to include in email
      const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invoices/pay/${inv.id}`;

      // Create reminder record
      const reminder = await db.transaction(async (tx) => {
        const now = new Date();
        const [reminder] = await tx.insert(invoiceReminder).values({
          id: crypto.randomUUID(),
          invoiceId: input.invoiceId,
          sentTo: sendTo,
          subject: input.subject,
          message: input.message,
          sentAt: now,
          createdAt: now,
        }).returning();

        await tx.update(invoice).set({
          lastReminderSentAt: now,
          reminderCount: sql`${invoice.reminderCount} + 1`,
        }).where(eq(invoice.id, input.invoiceId));

        return reminder!;
      });

      // Generate PDF attachment
      let pdfBuffer: Buffer | null = null;
      try {
        const { generatePDF } = await import("@/features/invoicing/lib/pdf-generator");
        const { PRESET_TEMPLATES } = await import("@/features/invoicing/lib/template-presets");

        // Get template
        const template = inv.invoiceTemplate
          ? {
              name: inv.invoiceTemplate.name,
              description: inv.invoiceTemplate.description || "",
              layout: inv.invoiceTemplate.layout as any,
              styles: inv.invoiceTemplate.styles as any,
            }
          : PRESET_TEMPLATES.minimal;

        // Prepare invoice data
        const invoiceData = {
          invoiceNumber: inv.invoiceNumber,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          clientName: inv.clientName,
          clientEmail: inv.clientEmail,
          clientAddress: inv.clientAddress as Record<string, unknown> | null,
          lineItems: inv.invoiceLineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
          })),
          subtotal: inv.subtotal,
          taxRate: inv.taxRate ?? undefined,
          taxAmount: inv.taxAmount,
          discountAmount: inv.discountAmount,
          total: inv.total,
          currency: inv.currency,
          notes: inv.notes,
          termsConditions: inv.termsConditions,
          // TODO: Get from organization
          businessName: "Your Business",
          businessEmail: "client@yourbusiness.com",
        };

        // Generate PDF
        pdfBuffer = await generatePDF(invoiceData, template);
      } catch (error) {
        console.error("Failed to generate PDF attachment:", error);
        // Continue without PDF - email will still be sent
      }

      // Send email with Resend
      try {
        const { sendInvoiceReminder } = await import("@/lib/email");

        const result = await sendInvoiceReminder({
          to: sendTo,
          subject: input.subject,
          message: input.message,
          invoiceNumber: inv.invoiceNumber,
          pdfBuffer: pdfBuffer || undefined,
          paymentLink,
        });

        if (!result.success) {
          console.error("Failed to send reminder email:", result.error);
          // Don't throw - we've already created the reminder record
        }
      } catch (error) {
        console.error("Failed to send reminder email:", error);
        // Don't throw - we've already created the reminder record
      }

      // Log activity
      await logAnalytics({
        organizationId: ctx.orgId!,
        locationId: ctx.locationId ?? undefined,
        userId: ctx.auth.user.id,
        type: "INVOICE",
        action: ActivityAction.UPDATED,
        entityType: "invoice",
        entityId: inv.id,
        entityName: `${inv.invoiceNumber} - Reminder sent to ${sendTo}`,
      });

      await createNotification({
        type: "INVOICE_REMINDER_SENT",
        title: "Invoice reminder sent",
        message: `${ctx.auth.user.name} sent a reminder for invoice ${inv.invoiceNumber}`,
        actorId: ctx.auth.user.id,
        entityType: "invoice",
        entityId: inv.id,
        organizationId: inv.organizationId,
        locationId: inv.locationId ?? undefined,
        data: {
          sentTo: sendTo,
        },
      });

      return {
        id: reminder.id,
        sentAt: reminder.sentAt,
        sentTo: reminder.sentTo,
      };
    }),

  // Send invoice to client
  sendInvoice: protectedProcedure
    .input(z.object({ invoiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const inv = await db.query.invoice.findFirst({
        where: (t, { eq }) => eq(t.id, input.invoiceId),
        with: invoiceWith,
      });

      if (!inv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Verify access
      if (
        inv.organizationId !== ctx.orgId &&
        inv.locationId !== ctx.locationId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this invoice",
        });
      }

      // Require email
      if (!inv.clientEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invoice client must have an email address",
        });
      }

      // Generate payment link
      const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invoices/pay/${inv.id}`;

      // Fetch location if available for business name
      let businessName = "Your Business";
      if (inv.locationId) {
        const loc = await db.query.location.findFirst({
          where: (t, { eq }) => eq(t.id, inv.locationId!),
          columns: { companyName: true },
        });
        if (loc) {
          businessName = loc.companyName;
        }
      }

      // Generate PDF
      let pdfBuffer: Buffer | null = null;
      try {
        const { generatePDF } = await import("@/features/invoicing/lib/pdf-generator");
        const { PRESET_TEMPLATES } = await import("@/features/invoicing/lib/template-presets");

        const template = inv.invoiceTemplate
          ? {
              name: inv.invoiceTemplate.name,
              description: inv.invoiceTemplate.description || "",
              layout: inv.invoiceTemplate.layout as any,
              styles: inv.invoiceTemplate.styles as any,
            }
          : PRESET_TEMPLATES.minimal;

        const invoiceData = {
          invoiceNumber: inv.invoiceNumber,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          clientName: inv.clientName,
          clientEmail: inv.clientEmail,
          clientAddress: inv.clientAddress as Record<string, unknown> | null,
          lineItems: inv.invoiceLineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
          })),
          subtotal: inv.subtotal,
          taxRate: inv.taxRate ?? undefined,
          taxAmount: inv.taxAmount,
          discountAmount: inv.discountAmount,
          total: inv.total,
          currency: inv.currency,
          notes: inv.notes,
          termsConditions: inv.termsConditions,
          businessName,
          businessEmail: "client@yourbusiness.com",
        };

        pdfBuffer = await generatePDF(invoiceData, template);
      } catch (error) {
        console.error("Failed to generate PDF:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate invoice PDF",
        });
      }

      // Send email
      try {
        const { sendInvoiceEmail } = await import("@/lib/email");

        const result = await sendInvoiceEmail({
          to: inv.clientEmail,
          invoiceNumber: inv.invoiceNumber,
          clientName: inv.clientName,
          total: inv.total,
          currency: inv.currency,
          dueDate: inv.dueDate,
          pdfBuffer,
          paymentLink,
          businessName,
        });

        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error || "Failed to send invoice email",
          });
        }
      } catch (error) {
        console.error("Failed to send invoice email:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to send invoice email",
        });
      }

      // Update invoice status to SENT
      await db.update(invoice).set({
        status: InvoiceStatus.SENT,
      }).where(eq(invoice.id, input.invoiceId));

      await createNotification({
        type: "INVOICE_SENT",
        title: "Invoice sent",
        message: `${ctx.auth.user.name} sent invoice ${inv.invoiceNumber}`,
        actorId: ctx.auth.user.id,
        entityType: "invoice",
        entityId: inv.id,
        organizationId: inv.organizationId,
        locationId: inv.locationId ?? undefined,
        data: {
          sentTo: inv.clientEmail,
          total: inv.total,
          currency: inv.currency,
        },
      });

      // Log activity (non-blocking)
      try {
        await logAnalytics({
          organizationId: ctx.orgId!,
          locationId: ctx.locationId ?? undefined,
          userId: ctx.auth.user.id,
          type: "INVOICE",
          action: ActivityAction.UPDATED,
          entityType: "invoice",
          entityId: inv.id,
          entityName: `${inv.invoiceNumber} - Sent to ${inv.clientEmail}`,
        });
      } catch (error) {
        console.error("Failed to log analytics:", error);
        // Don't throw - analytics logging shouldn't break the mutation
      }

      return {
        success: true,
        sentTo: inv.clientEmail,
      };
    }),

  generateFromTimeLogs: protectedProcedure
    .input(
      z.object({
        timeLogIds: z.array(z.string()).min(1, "At least one time log is required"),
        clientId: z.string().optional(),
        clientName: z.string().min(1).optional(),
        clientEmail: z.string().email().optional().or(z.literal("")),
        title: z.string().optional(),
        dueDate: z.date(),
        taxRate: z.number().min(0).max(100).optional(),
        discountAmount: z.number().min(0).optional(),
        notes: z.string().optional(),
        termsConditions: z.string().optional(),
        groupBy: z.enum(["instructor", "date", "all"]).default("instructor"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      // Fetch time logs
      const timeLogs = await db.query.timeLog.findMany({
        where: (t, { and, eq, inArray }) =>
          and(
            inArray(t.id, input.timeLogIds),
            eq(t.organizationId, ctx.orgId!),
            eq(t.status, "APPROVED"),
          ),
        with: {
          instructor: true,
          client: true,
        },
      });

      if (timeLogs.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No approved time logs found",
        });
      }

      // Check if any time logs are already invoiced
      const alreadyInvoiced = timeLogs.filter((log) => log.invoiceId);
      if (alreadyInvoiced.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${alreadyInvoiced.length} time log(s) are already invoiced`,
        });
      }

      // IMPORTANT: Check if all time logs have an associated client (client)
      const timeLogsWithoutClient = timeLogs.filter((log) => !log.clientId);
      if (timeLogsWithoutClient.length > 0) {
        const instructorNames = timeLogsWithoutClient
          .map((log) => log.instructor?.name || "Unknown instructor")
          .filter((name, index, self) => self.indexOf(name) === index) // unique names
          .join(", ");

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot generate invoice: ${timeLogsWithoutClient.length} time log(s) do not have a client (client) assigned. Instructors without client: ${instructorNames}. Please assign a client to these instructors before generating an invoice.`,
        });
      }

      // Ensure all time logs are for the same client (client)
      const clientIds = new Set(timeLogs.map((log) => log.clientId));
      if (clientIds.size > 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot generate invoice: Selected time logs belong to different clients (clients). Please select time logs for only one client at a time.",
        });
      }

      // Group time logs and create line items
      let lineItems: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        timeLogId: string;
      }> = [];

      if (input.groupBy === "instructor") {
        // Group by instructor
        const instructorGroups = timeLogs.reduce((acc, log) => {
          const instructorId = log.instructorId || "no-instructor";
          if (!acc[instructorId]) acc[instructorId] = [];
          acc[instructorId].push(log);
          return acc;
        }, {} as Record<string, typeof timeLogs>);

        Object.entries(instructorGroups).forEach(([_instructorId, logs]) => {
          const instructor = logs[0]?.instructor;
          const totalHours = logs.reduce(
            (sum, log) => sum + (log.duration || 0) / 60,
            0
          );
          const avgRate =
            logs.reduce(
              (sum, log) => sum + (log.hourlyRate ? parseFloat(log.hourlyRate) : 0),
              0
            ) / logs.length;

          lineItems.push({
            description: `${instructor?.name || "Instructor"} - ${logs.length} shift(s), ${totalHours.toFixed(2)} hours`,
            quantity: totalHours,
            unitPrice: avgRate,
            timeLogId: logs[0]!.id, // Store first time log ID
          });
        });
      } else if (input.groupBy === "date") {
        // Group by date
        const dateGroups = timeLogs.reduce((acc, log) => {
          const date = format(new Date(log.startTime), "yyyy-MM-dd");
          if (!acc[date]) acc[date] = [];
          acc[date].push(log);
          return acc;
        }, {} as Record<string, typeof timeLogs>);

        Object.entries(dateGroups).forEach(([date, logs]) => {
          const totalHours = logs.reduce(
            (sum, log) => sum + (log.duration || 0) / 60,
            0
          );
          const avgRate =
            logs.reduce(
              (sum, log) => sum + (log.hourlyRate ? parseFloat(log.hourlyRate) : 0),
              0
            ) / logs.length;

          lineItems.push({
            description: `Work on ${format(new Date(date), "MMM dd, yyyy")} - ${logs.length} shift(s)`,
            quantity: totalHours,
            unitPrice: avgRate,
            timeLogId: logs[0]!.id,
          });
        });
      } else {
        // All time logs as one line item
        const totalHours = timeLogs.reduce(
          (sum, log) => sum + (log.duration || 0) / 60,
          0
        );
        const avgRate =
          timeLogs.reduce(
            (sum, log) => sum + (log.hourlyRate ? parseFloat(log.hourlyRate) : 0),
            0
          ) / timeLogs.length;

        lineItems.push({
          description: `${timeLogs.length} shift(s), ${totalHours.toFixed(2)} hours total`,
          quantity: totalHours,
          unitPrice: avgRate,
          timeLogId: timeLogs[0]!.id,
        });
      }

      // Calculate totals
      const subtotal = lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const taxAmount = input.taxRate ? (subtotal * input.taxRate) / 100 : 0;
      const discountAmount = input.discountAmount ?? 0;
      const total = subtotal + taxAmount - discountAmount;

      // Get client info from time logs (we've already validated all time logs have the same client)
      const timeLogClient = timeLogs[0]?.client;
      if (!timeLogClient) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Client information not found. Please ensure all time logs have a client assigned.",
        });
      }

      // Use client from time log, but allow override from input if provided
      const clientId = input.clientId || timeLogClient.id;
      const clientName = input.clientName || timeLogClient.name;
      const clientEmail = input.clientEmail || timeLogClient.email || undefined;

      // Determine name for invoice numbering
      // Use the client's (client's) name for invoice numbering to group by client
      // This ensures all invoices for the same client are sequentially numbered together
      let nameForInvoice: string | undefined;

      // Check if all time logs are from the same instructor
      const allSameInstructor = timeLogs.every(
        (log) => log.instructorId === timeLogs[0]?.instructorId
      );

      if (allSameInstructor) {
        // If all time logs are from one instructor, use instructor's name
        const firstInstructor = timeLogs[0]?.instructor;
        nameForInvoice = firstInstructor?.name;
      } else {
        // If multiple instructors, use the client's (client's) name
        // This groups invoices by client when multiple instructors are involved
        nameForInvoice = clientName;
      }

      // Generate invoice number with name if available
      const invoiceNumber = await generateInvoiceNumber(
        ctx.orgId,
        ctx.locationId ?? undefined,
        nameForInvoice
      );

      // Get available payment methods
      const paymentMethods = await getAvailablePaymentMethods({
        organizationId: ctx.orgId!,
        locationId: ctx.locationId ?? undefined,
      });

      // Create invoice
      const createdInvoice = await db.transaction(async (tx) => {
        const invoiceId = crypto.randomUUID();
        const now = new Date();

        const [inv] = await tx.insert(invoice).values({
          id: invoiceId,
          organizationId: ctx.orgId!,
          locationId: ctx.locationId ?? undefined,
          invoiceNumber,
          clientId,
          clientName,
          clientEmail,
          title: input.title ?? `Time Tracking Invoice - ${format(new Date(), "MMM yyyy")}`,
          billingModel: "HOURLY",
          dueDate: input.dueDate,
          subtotal: String(subtotal),
          taxRate: input.taxRate != null ? String(input.taxRate) : undefined,
          taxAmount: String(taxAmount),
          discountAmount: String(discountAmount),
          total: String(total),
          amountDue: String(total),
          amountPaid: "0",
          notes: input.notes,
          termsConditions: input.termsConditions,
          paymentMethods,
          createdAt: now,
          updatedAt: now,
        }).returning();

        if (lineItems.length > 0) {
          await tx.insert(invoiceLineItem).values(
            lineItems.map((item, index) => ({
              id: crypto.randomUUID(),
              invoiceId,
              description: item.description,
              quantity: String(item.quantity),
              unitPrice: String(item.unitPrice),
              amount: String(item.quantity * item.unitPrice),
              timeLogId: item.timeLogId,
              order: index,
              createdAt: now,
              updatedAt: now,
            })),
          );
        }

        // Update all time logs to mark them as invoiced
        await tx.update(timeLog).set({
          invoiceId,
          status: "INVOICED",
        }).where(inArray(timeLog.id, input.timeLogIds));

        return inv!;
      });

      // Fetch full invoice with relations
      const fullInvoice = await db.query.invoice.findFirst({
        where: (t, { eq }) => eq(t.id, createdInvoice.id),
        with: invoiceWith,
      });

      // Log activity
      await logAnalytics({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? undefined,
        userId: ctx.auth.user.id,
        type: "INVOICE",
        action: ActivityAction.CREATED,
        entityType: "invoice",
        entityId: createdInvoice.id,
        entityName: `${createdInvoice.invoiceNumber} - Generated from ${timeLogs.length} time log(s)`,
      });

      return mapInvoice(fullInvoice!);
    }),

  // Generate payment link for invoice (Stripe or hosted page)
  generatePaymentLink: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        provider: z.enum(["STRIPE", "HOSTED"]).default("HOSTED"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const inv = await db.query.invoice.findFirst({
        where: (t, { eq }) => eq(t.id, input.invoiceId),
        with: { invoiceLineItems: true },
      });

      if (!inv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Note: Payment links are public, so we don't verify access here
      // The invoice ID itself acts as the authentication token

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      if (input.provider === "STRIPE") {
        // Fetch Stripe Connect account for this location/organization
        const stripeConn = await db.query.stripeConnection.findFirst({
          where: (t, { and, eq, isNull }) =>
            and(
              eq(t.isActive, true),
              inv.locationId
                ? eq(t.locationId, inv.locationId)
                : and(eq(t.organizationId, inv.organizationId), isNull(t.locationId)),
            ),
        });

        if (!stripeConn) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Stripe Connect is not set up for this account. Please connect your Stripe account in payment settings.",
          });
        }

        if (!stripeConn.chargesEnabled) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "This Stripe account cannot accept charges yet. Please complete your Stripe account setup.",
          });
        }

        // Create Stripe Checkout Session using Connect account
        try {
          const { createStripeCheckoutSessionForConnect } = await import("@/lib/stripe");

          // Convert amount to cents
          const amountInCents = Math.round(parseFloat(inv.amountDue) * 100);

          // Validate amount
          if (amountInCents < 1) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invoice amount must be at least $0.01 to process payment.",
            });
          }

          // Calculate application fee if configured
          let applicationFeeAmount: number | undefined;
          if (stripeConn.applicationFeePercent || stripeConn.applicationFeeFixed) {
            const feePercent = stripeConn.applicationFeePercent
              ? parseFloat(stripeConn.applicationFeePercent)
              : 0;
            const feeFixed = stripeConn.applicationFeeFixed
              ? Math.round(parseFloat(stripeConn.applicationFeeFixed) * 100) // Convert to cents and ensure integer
              : 0;

            applicationFeeAmount = Math.round((amountInCents * feePercent) / 100 + feeFixed);
          }

          const result = await createStripeCheckoutSessionForConnect({
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            amount: amountInCents,
            currency: inv.currency,
            clientEmail: inv.clientEmail || "",
            clientName: inv.clientName,
            lineItems: inv.invoiceLineItems.map((item) => {
              const quantity = Math.max(1, Math.round(parseFloat(item.quantity))); // Ensure at least 1
              const amount = Math.max(1, Math.round(parseFloat(item.unitPrice) * 100)); // Ensure at least 1 cent
              return {
                name: item.description,
                quantity,
                amount,
              };
            }),
            successUrl: `${baseUrl}/invoices/pay/${inv.id}?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${baseUrl}/invoices/pay/${inv.id}?canceled=true`,
            stripeAccountId: stripeConn.stripeAccountId,
            applicationFeeAmount,
          });

          if (!result.success) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: result.error || "Failed to create Stripe payment session",
            });
          }

          return {
            paymentLink: result.url || "",
            provider: "STRIPE",
            sessionId: result.sessionId,
          };
        } catch (error) {
          console.error("Stripe payment link creation failed:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Failed to create Stripe payment link",
          });
        }
      }

      // Generate hosted payment page link
      const paymentLink = `${baseUrl}/invoices/pay/${inv.id}`;

      return {
        paymentLink,
        provider: "HOSTED",
      };
    }),

  // Generate PDF invoice
  generatePDF: protectedProcedure
    .input(z.object({ invoiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const inv = await db.query.invoice.findFirst({
        where: (t, { eq }) => eq(t.id, input.invoiceId),
        with: invoiceWith,
      });

      if (!inv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Verify access
      if (
        inv.organizationId !== ctx.orgId &&
        inv.locationId !== ctx.locationId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this invoice",
        });
      }

      try {
        // Import PDF generator and template presets
        const { generatePDF } = await import("@/features/invoicing/lib/pdf-generator");
        const { PRESET_TEMPLATES } = await import("@/features/invoicing/lib/template-presets");

        // Get template
        const template = inv.invoiceTemplate
          ? {
              name: inv.invoiceTemplate.name,
              description: inv.invoiceTemplate.description || "",
              layout: inv.invoiceTemplate.layout as any,
              styles: inv.invoiceTemplate.styles as any,
            }
          : PRESET_TEMPLATES.minimal;

        // Prepare invoice data
        const invoiceData = {
          invoiceNumber: inv.invoiceNumber,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          clientName: inv.clientName,
          clientEmail: inv.clientEmail,
          clientAddress: inv.clientAddress as Record<string, unknown> | null,
          lineItems: inv.invoiceLineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
          })),
          subtotal: inv.subtotal,
          taxRate: inv.taxRate ?? undefined,
          taxAmount: inv.taxAmount,
          discountAmount: inv.discountAmount,
          total: inv.total,
          currency: inv.currency,
          notes: inv.notes,
          termsConditions: inv.termsConditions,
          // TODO: Get from organization
          businessName: "Your Business",
          businessEmail: "client@yourbusiness.com",
        };

        // Generate PDF using React-PDF
        const pdfBuffer = await generatePDF(invoiceData, template);

        // Convert to base64 for transmission
        const pdfBase64 = pdfBuffer.toString("base64");

        return {
          filename: `invoice-${inv.invoiceNumber}.pdf`,
          data: pdfBase64,
          mimeType: "application/pdf",
        };
      } catch (error) {
        console.error("PDF generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate PDF",
        });
      }
    }),

  // List invoice templates
  listTemplates: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const templates = await db.query.invoiceTemplate.findMany({
        where: (t, { or, eq }) =>
          or(
            eq(t.organizationId, ctx.orgId!),
            eq(t.isSystem, true),
          ),
        limit: input.limit + 1,
        orderBy: (t, { desc }) => desc(t.createdAt),
      });

      let nextCursor: string | undefined = undefined;
      if (templates.length > input.limit) {
        const nextItem = templates.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: templates,
        nextCursor,
      };
    }),

  // Delete invoice template
  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const template = await db.query.invoiceTemplate.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      // Verify access
      if (template.organizationId !== ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this template",
        });
      }

      // Prevent deletion of system templates
      if (template.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot delete system templates",
        });
      }

      await db.delete(invoiceTemplate).where(eq(invoiceTemplate.id, input.id));

      return { success: true };
    }),

  // Duplicate invoice template
  duplicateTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }

      const template = await db.query.invoiceTemplate.findFirst({
        where: (t, { eq }) => eq(t.id, input.id),
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      // Verify access (only allow duplicating own templates or system templates)
      if (template.organizationId !== ctx.orgId && !template.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this template",
        });
      }

      // Create duplicate
      const now = new Date();
      const [duplicate] = await db.insert(invoiceTemplate).values({
        id: crypto.randomUUID(),
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? undefined,
        name: `${template.name} (Copy)`,
        description: template.description,
        isDefault: false,
        isSystem: false,
        layout: template.layout as any,
        styles: template.styles as any,
        variables: template.variables as any,
        createdAt: now,
        updatedAt: now,
      }).returning();

      return duplicate!;
    }),

  // Upload bank transfer proof of payment
  uploadBankTransferProof: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        proofUrl: z.string().url(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const inv = await db.query.invoice.findFirst({
        where: (t, { eq }) => eq(t.id, input.invoiceId),
      });

      if (!inv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Update invoice with bank transfer proof
      const [updated] = await db.update(invoice).set({
        bankTransferStatus: BankTransferStatus.PROOF_UPLOADED,
        bankTransferProof: input.proofUrl,
        bankTransferNotes: input.notes,
      }).where(eq(invoice.id, input.invoiceId)).returning();

      // Log activity
      await logAnalytics({
        organizationId: inv.organizationId,
        locationId: inv.locationId,
        userId: ctx.auth.user.id,
        type: "INVOICE",
        action: ActivityAction.UPDATED,
        entityType: "invoice",
        entityId: inv.id,
        entityName: inv.invoiceNumber,
        changes: {
          bankTransferStatus: {
            old: inv.bankTransferStatus,
            new: BankTransferStatus.PROOF_UPLOADED,
          },
        },
      });

      return {
        id: updated!.id,
        bankTransferStatus: updated!.bankTransferStatus,
      };
    }),

  // Mark bank transfer as verified (admin only)
  verifyBankTransfer: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        verified: z.boolean(),
        notes: z.string().optional(),
        amount: z.string().optional(), // Optional partial payment amount
      })
    )
    .mutation(async ({ ctx, input }) => {
      const inv = await db.query.invoice.findFirst({
        where: (t, { eq }) => eq(t.id, input.invoiceId),
        with: { invoiceLineItems: true },
      });

      if (!inv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Verify access
      if (
        inv.organizationId !== ctx.orgId &&
        inv.locationId !== ctx.locationId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this invoice",
        });
      }

      if (input.verified) {
        // Calculate payment amount (default to full amount due)
        const paymentAmount = input.amount
          ? parseFloat(input.amount)
          : parseFloat(inv.amountDue);

        // Create payment record and update invoice
        const result = await db.transaction(async (tx) => {
          const now = new Date();
          // Create payment record
          await tx.insert(invoicePayment).values({
            id: crypto.randomUUID(),
            invoiceId: input.invoiceId,
            amount: String(paymentAmount),
            currency: inv.currency,
            method: PaymentMethod.BANK_TRANSFER,
            referenceNumber: inv.invoiceNumber,
            notes: input.notes,
            paidAt: now,
            createdAt: now,
            updatedAt: now,
          });

          // Calculate new amounts
          const newAmountPaid = parseFloat(inv.amountPaid) + paymentAmount;
          const newAmountDue = parseFloat(inv.total) - newAmountPaid;
          const isPaid = newAmountDue <= 0;

          // Update invoice
          const [updated] = await tx.update(invoice).set({
            bankTransferStatus: BankTransferStatus.VERIFIED,
            bankTransferVerifiedAt: now,
            bankTransferVerifiedBy: ctx.auth.user.id,
            bankTransferNotes: input.notes,
            amountPaid: String(newAmountPaid),
            amountDue: String(newAmountDue),
            status: isPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
            paidAt: isPaid ? now : inv.paidAt,
          }).where(eq(invoice.id, input.invoiceId)).returning();

          return { invoice: updated! };
        });

        // Log activity
        await logAnalytics({
          organizationId: inv.organizationId,
          locationId: inv.locationId,
          userId: ctx.auth.user.id,
          type: "INVOICE",
          action: ActivityAction.UPDATED,
          entityType: "invoice",
          entityId: inv.id,
          entityName: inv.invoiceNumber,
          changes: {
            bankTransferStatus: {
              old: inv.bankTransferStatus,
              new: BankTransferStatus.VERIFIED,
            },
            status: {
              old: inv.status,
              new: result.invoice.status,
            },
            amountPaid: {
              old: inv.amountPaid,
              new: result.invoice.amountPaid,
            },
          },
        });

        return {
          id: result.invoice.id,
          bankTransferStatus: result.invoice.bankTransferStatus,
          status: result.invoice.status,
          amountPaid: result.invoice.amountPaid,
          amountDue: result.invoice.amountDue,
        };
      } else {
        // Reject the proof
        const [updated] = await db.update(invoice).set({
          bankTransferStatus: BankTransferStatus.REJECTED,
          bankTransferNotes: input.notes,
        }).where(eq(invoice.id, input.invoiceId)).returning();

        // Log activity
        await logAnalytics({
          organizationId: inv.organizationId,
          locationId: inv.locationId,
          userId: ctx.auth.user.id,
          type: "INVOICE",
          action: ActivityAction.UPDATED,
          entityType: "invoice",
          entityId: inv.id,
          entityName: inv.invoiceNumber,
          changes: {
            bankTransferStatus: {
              old: inv.bankTransferStatus,
              new: BankTransferStatus.REJECTED,
            },
          },
        });

        return {
          id: updated!.id,
          bankTransferStatus: updated!.bankTransferStatus,
        };
      }
    }),

  // Get bank transfer details for public invoice page (no auth required)
  getBankTransferDetails: baseProcedure
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ input }) => {
      const inv = await db.query.invoice.findFirst({
        where: (t, { eq }) => eq(t.id, input.invoiceId),
        columns: {
          organizationId: true,
          locationId: true,
          paymentMethods: true,
        },
      });

      if (!inv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Check if bank transfer is enabled for this invoice
      if (!inv.paymentMethods?.includes(PaymentMethod.BANK_TRANSFER)) {
        return null;
      }

      // Get bank transfer settings
      const settings = await db.query.bankTransferSettings.findFirst({
        where: (t, { and, eq, isNull }) =>
          and(
            eq(t.organizationId, inv.organizationId),
            inv.locationId ? eq(t.locationId, inv.locationId) : isNull(t.locationId),
            eq(t.enabled, true),
          ),
      });

      if (!settings) {
        return null;
      }

      return {
        bankName: settings.bankName,
        accountName: settings.accountName,
        accountNumber: settings.accountNumber,
        sortCode: settings.sortCode,
        routingNumber: settings.routingNumber,
        iban: settings.iban,
        swiftBic: settings.swiftBic,
        bankAddress: settings.bankAddress,
        accountType: settings.accountType,
        currency: settings.currency,
        instructions: settings.instructions,
        referenceFormat: settings.referenceFormat,
      };
    }),
});
