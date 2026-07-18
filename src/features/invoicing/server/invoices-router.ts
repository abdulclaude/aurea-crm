import { TRPCError } from "@trpc/server";
import z from "zod";
import {
  InvoiceStatus,
  InvoiceType,
  BillingModel,
  PaymentMethod,
  ActivityAction,
  BankTransferStatus,
} from "@/db/enums";
import { format } from "date-fns";
import {
  eq,
  and,
  or,
  ilike,
  isNull,
  inArray,
  desc,
  asc,
  gt,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  invoice,
  invoiceLineItem,
  invoicePayment,
  invoiceReminder,
  invoiceTemplate,
  organization,
  stripeConnection,
  bankTransferSettings,
  location,
  timeLog,
} from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { logAnalytics, getChangedFields } from "@/lib/analytics-logger";
import { generateInvoiceNumber } from "@/features/invoicing/lib/invoice-number-generator";
import { invoiceAccessPurposeSchema } from "@/features/invoicing/lib/public-invoice-access";
import { createNotification } from "@/lib/notifications";
import { requireCapability } from "@/features/permissions/server/authorization";
import { assertInvoiceScopeAccess } from "./invoice-scope";
import {
  buildPublicInvoiceUrl,
  issueInvoiceAccessToken,
  PublicInvoiceAccessNotFoundError,
  revokeInvoiceAccessTokens,
} from "./invoice-access-tokens";
import {
  createPublicInvoiceCheckout,
  PublicInvoicePaymentError,
} from "./public-invoice-checkout";
import {
  currencyExponent,
  decimalToMinorUnits,
  minorUnitsToDecimal,
  normalizeCurrency,
} from "@/features/commerce/lib/money";
import { resolvePaymentRecoveryCases } from "@/features/commerce/server/recovery/payment-recovery-case-service";
import {
  invoiceTemplatePresetSchema,
  PRESET_TEMPLATES,
} from "@/features/invoicing/lib/template-presets";

const INVOICE_PAGE_SIZE = 20;

function getPublicAppBaseUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

function mapInvoicePaymentLinkError(error: unknown): TRPCError {
  if (error instanceof PublicInvoiceAccessNotFoundError) {
    return new TRPCError({
      code: "NOT_FOUND",
      message: "Invoice not found",
    });
  }
  if (error instanceof PublicInvoicePaymentError) {
    if (error.code !== "CHECKOUT_UNAVAILABLE") {
      return new TRPCError({
        code: "PRECONDITION_FAILED",
        message: error.message,
      });
    }
    return new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create the secure payment link",
      cause: error.originalCause ?? error,
    });
  }
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Failed to create the invoice link",
    cause: error,
  });
}

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

type InvoiceQueryResult = Awaited<
  ReturnType<
    typeof db.query.invoice.findFirst<{
      with: typeof invoiceWith;
    }>
  >
>;

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
      }),
    )
    .query(async ({ ctx, input }) => {
      const {
        cursor,
        limit,
        status,
        type,
        clientId,
        search,
        sortBy,
        sortOrder,
      } = input;

      // Require either organizationId or locationId
      if (!ctx.orgId && !ctx.locationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization or location context required",
        });
      }

      const sortColumn =
        sortBy === "issueDate"
          ? invoice.issueDate
          : sortBy === "dueDate"
            ? invoice.dueDate
            : invoice.total;
      const orderFn = sortOrder === "asc" ? asc : desc;

      const invoices = await db.query.invoice.findMany({
        where: (t, ops) => {
          const conditions = [];

          if (ctx.orgId) conditions.push(ops.eq(t.organizationId, ctx.orgId));
          if (ctx.locationId)
            conditions.push(ops.eq(t.locationId, ctx.locationId));
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

      assertInvoiceScopeAccess(inv, {
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });

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
          }),
        ),
        taxRate: z.number().min(0).max(100).optional(),
        discountAmount: z.number().min(0).optional(),
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
        termsConditions: z.string().optional(),
        documentUrl: z.string().url().optional(),
      }),
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
        0,
      );

      const taxAmount = input.taxRate ? (subtotal * input.taxRate) / 100 : 0;
      const discountAmount = input.discountAmount ?? 0;
      const total = subtotal + taxAmount - discountAmount;

      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber(
        ctx.orgId,
        ctx.locationId ?? undefined,
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

        const [inv] = await tx
          .insert(invoice)
          .values({
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
            templateId:
              input.templateId && input.templateId !== "__default__"
                ? input.templateId
                : undefined,
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
          })
          .returning();

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
            }),
          )
          .optional(),
        taxRate: z.number().min(0).max(100).optional(),
        discountAmount: z.number().min(0).optional(),
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
        termsConditions: z.string().optional(),
        documentUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, lineItems, templateId, ...updateData } = input;

      // Handle template ID - null out if "__default__" is selected
      const templateUpdate =
        templateId !== undefined
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

      assertInvoiceScopeAccess(existingInvoice, {
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });

      // Calculate totals if line items are updated
      let financialUpdate: Record<string, unknown> = {};

      if (lineItems) {
        const subtotal = lineItems.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0,
        );

        const taxRate =
          updateData.taxRate ??
          (existingInvoice.taxRate
            ? parseFloat(existingInvoice.taxRate)
            : undefined);
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
      if (updateData.clientId !== undefined)
        updateSet.clientId = updateData.clientId;
      if (updateData.clientName !== undefined)
        updateSet.clientName = updateData.clientName;
      if (updateData.clientEmail !== undefined)
        updateSet.clientEmail = updateData.clientEmail;
      if (updateData.clientAddress !== undefined)
        updateSet.clientAddress = updateData.clientAddress;
      if (updateData.title !== undefined) updateSet.title = updateData.title;
      if (updateData.status !== undefined) updateSet.status = updateData.status;
      if (updateData.dueDate !== undefined)
        updateSet.dueDate = updateData.dueDate;
      if (updateData.taxRate !== undefined)
        updateSet.taxRate = String(updateData.taxRate);
      if (updateData.discountAmount !== undefined)
        updateSet.discountAmount = String(updateData.discountAmount);
      if (updateData.notes !== undefined) updateSet.notes = updateData.notes;
      if (updateData.internalNotes !== undefined)
        updateSet.internalNotes = updateData.internalNotes;
      if (updateData.termsConditions !== undefined)
        updateSet.termsConditions = updateData.termsConditions;
      if (updateData.documentUrl !== undefined)
        updateSet.documentUrl = updateData.documentUrl;

      // Update invoice in a transaction
      await db.transaction(async (tx) => {
        // Delete old line items if updating
        if (lineItems) {
          await tx
            .delete(invoiceLineItem)
            .where(eq(invoiceLineItem.invoiceId, id));

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
      }),
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

      assertInvoiceScopeAccess(existingInvoice, {
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });

      // Update invoice document
      await db
        .update(invoice)
        .set({
          documentUrl,
          documentName,
        })
        .where(eq(invoice.id, id));

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
        type: "INVOICE",
        action: ActivityAction.UPDATED,
        entityType: "invoice",
        entityId: updatedInvoice!.id,
        entityName: `${updatedInvoice!.invoiceNumber} - ${updatedInvoice!.clientName}`,
        changes: {
          documentUrl: {
            old: existingInvoice.documentUrl,
            new: documentUrl,
          },
        },
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

      assertInvoiceScopeAccess(inv, {
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });

      if (inv.status === InvoiceStatus.PAID) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Paid invoices must be refunded or credited, not cancelled.",
        });
      }

      await db
        .update(invoice)
        .set({ status: InvoiceStatus.CANCELLED, updatedAt: new Date() })
        .where(eq(invoice.id, input.id));

      await createNotification({
        type: "INVOICE_CANCELLED",
        title: "Invoice cancelled",
        message: `${ctx.auth.user.name} cancelled invoice ${inv.invoiceNumber}`,
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
        action: ActivityAction.UPDATED,
        entityType: "invoice",
        entityId: inv.id,
        entityName: `${inv.invoiceNumber} - ${inv.clientName}`,
      });

      return { success: true, cancelled: true };
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
      }),
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

      assertInvoiceScopeAccess(inv, {
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });

      const currency = normalizeCurrency(inv.currency);
      const exponent = currencyExponent(currency);
      const paymentMinor = decimalToMinorUnits(
        String(paymentData.amount),
        exponent,
      );
      const amountDueMinor = decimalToMinorUnits(inv.amountDue, exponent);
      if (paymentMinor > amountDueMinor) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment amount cannot exceed the outstanding balance",
        });
      }

      // Create payment and update invoice
      const paymentResult = await db.transaction(async (tx) => {
        const now = new Date();
        const [payment] = await tx
          .insert(invoicePayment)
          .values({
            id: crypto.randomUUID(),
            invoiceId,
            amount: minorUnitsToDecimal(paymentMinor, exponent),
            currency,
            method: paymentData.method,
            paidAt: paymentData.paidAt,
            stripePaymentId: paymentData.stripePaymentId,
            xeroPaymentId: paymentData.xeroPaymentId,
            referenceNumber: paymentData.referenceNumber,
            notes: paymentData.notes,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        const newAmountPaidMinor =
          decimalToMinorUnits(inv.amountPaid, exponent) + paymentMinor;
        const newAmountDueMinor =
          decimalToMinorUnits(inv.total, exponent) - newAmountPaidMinor;
        const newAmountPaid = minorUnitsToDecimal(newAmountPaidMinor, exponent);
        const newAmountDue = minorUnitsToDecimal(newAmountDueMinor, exponent);

        // Determine new status
        let newStatus = inv.status;
        if (newAmountDueMinor === 0) {
          newStatus = InvoiceStatus.PAID;
        } else if (newAmountPaidMinor > 0) {
          newStatus = InvoiceStatus.PARTIALLY_PAID;
        }

        await tx
          .update(invoice)
          .set({
            amountPaid: newAmountPaid,
            amountDue: newAmountDue,
            status: newStatus,
            paidAt: newAmountDueMinor === 0 ? paymentData.paidAt : inv.paidAt,
          })
          .where(eq(invoice.id, invoiceId));

        if (newAmountDueMinor === 0 && payment) {
          await resolvePaymentRecoveryCases({
            tx,
            organizationId: inv.organizationId,
            locationId: inv.locationId,
            target: "INVOICE",
            resource: { invoiceId: inv.id },
            sourceEventId: null,
            occurredAt: paymentData.paidAt,
            attemptKey: `invoice-payment:${payment.id}`,
            provider: "AUREA",
            providerAccountRef: null,
            stripeConnectionId: null,
            providerObjectId: payment.id,
          });
        }

        return { payment: payment!, newAmountPaid };
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
            new: paymentResult.newAmountPaid,
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
        id: paymentResult.payment.id,
        amount: paymentResult.payment.amount,
        method: paymentResult.payment.method,
        paidAt: paymentResult.payment.paidAt,
      };
    }),

  sendReminder: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        subject: z.string().min(1),
        message: z.string().min(1),
        sendTo: z.string().email().optional(), // Override invoice email
      }),
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

      assertInvoiceScopeAccess(inv, {
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });

      const sendTo = input.sendTo ?? inv.clientEmail;
      if (!sendTo) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No email address available for reminder",
        });
      }

      const paymentAccess = await issueInvoiceAccessToken({
        invoiceId: inv.id,
        organizationId: inv.organizationId,
        locationId: inv.locationId,
        purpose: "PAY",
        createdBy: ctx.auth.user.id,
      });
      const paymentLink = buildPublicInvoiceUrl({
        baseUrl: getPublicAppBaseUrl(),
        token: paymentAccess.token,
        purpose: "PAY",
      });

      const now = new Date();
      const [reminder] = await db
        .insert(invoiceReminder)
        .values({
          id: crypto.randomUUID(),
          organizationId: inv.organizationId,
          locationId: inv.locationId,
          invoiceId: input.invoiceId,
          sentTo: sendTo,
          subject: input.subject,
          message: input.message,
          deliveryStatus: "QUEUED",
          queuedAt: now,
          createdAt: now,
        })
        .returning();
      if (!reminder) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create the invoice reminder",
        });
      }

      const { sendInvoiceReminder } = await import("@/lib/email");
      const delivery = await sendInvoiceReminder({
        organizationId: inv.organizationId,
        locationId: inv.locationId,
        clientId: inv.clientId,
        invoiceId: inv.id,
        reminderId: reminder.id,
        to: sendTo,
        subject: input.subject,
        message: input.message,
        invoiceNumber: inv.invoiceNumber,
        paymentLink,
      });
      if (!delivery.success) {
        await db
          .update(invoiceReminder)
          .set({
            deliveryStatus:
              delivery.status === "SUPPRESSED" ? "SUPPRESSED" : "DEAD_LETTER",
            failedAt: new Date(),
            failureMessage: delivery.error,
          })
          .where(eq(invoiceReminder.id, reminder.id));
        throw new TRPCError({
          code:
            delivery.status === "SUPPRESSED"
              ? "PRECONDITION_FAILED"
              : "INTERNAL_SERVER_ERROR",
          message: delivery.error,
        });
      }

      await db
        .update(invoiceReminder)
        .set({ outboundDeliveryId: delivery.deliveryId })
        .where(eq(invoiceReminder.id, reminder.id));

      // Log activity
      await logAnalytics({
        organizationId: ctx.orgId!,
        locationId: ctx.locationId ?? undefined,
        userId: ctx.auth.user.id,
        type: "INVOICE",
        action: ActivityAction.UPDATED,
        entityType: "invoice",
        entityId: inv.id,
        entityName: `${inv.invoiceNumber} - Reminder queued for ${sendTo}`,
      });

      await createNotification({
        type: "INVOICE_REMINDER_SENT",
        title: "Invoice reminder queued",
        message: `${ctx.auth.user.name} queued a reminder for invoice ${inv.invoiceNumber}`,
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
        sentAt: null,
        sentTo: reminder.sentTo,
        queued: true,
        deliveryId: delivery.deliveryId,
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

      assertInvoiceScopeAccess(inv, {
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });

      // Require email
      if (!inv.clientEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invoice client must have an email address",
        });
      }

      const paymentAccess = await issueInvoiceAccessToken({
        invoiceId: inv.id,
        organizationId: inv.organizationId,
        locationId: inv.locationId,
        purpose: "PAY",
        createdBy: ctx.auth.user.id,
      });
      const paymentLink = buildPublicInvoiceUrl({
        baseUrl: getPublicAppBaseUrl(),
        token: paymentAccess.token,
        purpose: "PAY",
      });

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

      const { sendInvoiceEmail } = await import("@/lib/email");
      const delivery = await sendInvoiceEmail({
        organizationId: inv.organizationId,
        locationId: inv.locationId,
        clientId: inv.clientId,
        invoiceId: inv.id,
        to: inv.clientEmail,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientName,
        total: inv.total,
        currency: inv.currency,
        dueDate: inv.dueDate,
        paymentLink,
        businessName,
      });
      if (!delivery.success) {
        throw new TRPCError({
          code:
            delivery.status === "SUPPRESSED"
              ? "PRECONDITION_FAILED"
              : "INTERNAL_SERVER_ERROR",
          message: delivery.error,
        });
      }

      // Issued status is recorded when durable delivery is accepted by the outbox.
      await db
        .update(invoice)
        .set({
          status: InvoiceStatus.SENT,
        })
        .where(eq(invoice.id, input.invoiceId));

      await createNotification({
        type: "INVOICE_SENT",
        title: "Invoice queued",
        message: `${ctx.auth.user.name} queued invoice ${inv.invoiceNumber} for delivery`,
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
          entityName: `${inv.invoiceNumber} - Queued for ${inv.clientEmail}`,
        });
      } catch (error) {
        console.error("Failed to log analytics:", error);
        // Don't throw - analytics logging shouldn't break the mutation
      }

      return {
        success: true,
        sentTo: inv.clientEmail,
        queued: true,
        deliveryId: delivery.deliveryId,
      };
    }),

  generateFromTimeLogs: protectedProcedure
    .input(
      z.object({
        timeLogIds: z
          .array(z.string())
          .min(1, "At least one time log is required"),
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
      }),
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
          message:
            "Cannot generate invoice: Selected time logs belong to different clients (clients). Please select time logs for only one client at a time.",
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
        const instructorGroups = timeLogs.reduce(
          (acc, log) => {
            const instructorId = log.instructorId || "no-instructor";
            if (!acc[instructorId]) acc[instructorId] = [];
            acc[instructorId].push(log);
            return acc;
          },
          {} as Record<string, typeof timeLogs>,
        );

        Object.entries(instructorGroups).forEach(([_instructorId, logs]) => {
          const instructor = logs[0]?.instructor;
          const totalHours = logs.reduce(
            (sum, log) => sum + (log.duration || 0) / 60,
            0,
          );
          const avgRate =
            logs.reduce(
              (sum, log) =>
                sum + (log.hourlyRate ? parseFloat(log.hourlyRate) : 0),
              0,
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
        const dateGroups = timeLogs.reduce(
          (acc, log) => {
            const date = format(new Date(log.startTime), "yyyy-MM-dd");
            if (!acc[date]) acc[date] = [];
            acc[date].push(log);
            return acc;
          },
          {} as Record<string, typeof timeLogs>,
        );

        Object.entries(dateGroups).forEach(([date, logs]) => {
          const totalHours = logs.reduce(
            (sum, log) => sum + (log.duration || 0) / 60,
            0,
          );
          const avgRate =
            logs.reduce(
              (sum, log) =>
                sum + (log.hourlyRate ? parseFloat(log.hourlyRate) : 0),
              0,
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
          0,
        );
        const avgRate =
          timeLogs.reduce(
            (sum, log) =>
              sum + (log.hourlyRate ? parseFloat(log.hourlyRate) : 0),
            0,
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
        0,
      );
      const taxAmount = input.taxRate ? (subtotal * input.taxRate) / 100 : 0;
      const discountAmount = input.discountAmount ?? 0;
      const total = subtotal + taxAmount - discountAmount;

      // Get client info from time logs (we've already validated all time logs have the same client)
      const timeLogClient = timeLogs[0]?.client;
      if (!timeLogClient) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Client information not found. Please ensure all time logs have a client assigned.",
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
        (log) => log.instructorId === timeLogs[0]?.instructorId,
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
        nameForInvoice,
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

        const [inv] = await tx
          .insert(invoice)
          .values({
            id: invoiceId,
            organizationId: ctx.orgId!,
            locationId: ctx.locationId ?? undefined,
            invoiceNumber,
            clientId,
            clientName,
            clientEmail,
            title:
              input.title ??
              `Time Tracking Invoice - ${format(new Date(), "MMM yyyy")}`,
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
          })
          .returning();

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
        await tx
          .update(timeLog)
          .set({
            invoiceId,
            status: "INVOICED",
          })
          .where(inArray(timeLog.id, input.timeLogIds));

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

  // Generate an opaque, expiring payment link. Raw invoice IDs are never public authorization.
  generatePaymentLink: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        provider: z.enum(["STRIPE", "HOSTED"]).default("HOSTED"),
      }),
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

      assertInvoiceScopeAccess(inv, {
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
        },
        capability: "commerce.manage",
        resource: {
          organizationId: inv.organizationId,
          locationId: inv.locationId,
        },
      });

      const access = await issueInvoiceAccessToken({
        invoiceId: inv.id,
        organizationId: inv.organizationId,
        locationId: inv.locationId,
        purpose: "PAY",
        createdBy: ctx.auth.user.id,
      });
      const hostedLink = buildPublicInvoiceUrl({
        baseUrl: getPublicAppBaseUrl(),
        token: access.token,
        purpose: "PAY",
      });

      if (input.provider === "HOSTED") {
        return { paymentLink: hostedLink, provider: "HOSTED" as const };
      }

      try {
        const checkout = await createPublicInvoiceCheckout({
          token: access.token,
        });
        return {
          paymentLink: checkout.checkoutUrl,
          provider: "STRIPE" as const,
          sessionId: checkout.sessionId,
        };
      } catch (error) {
        throw mapInvoicePaymentLinkError(error);
      }
    }),

  generateViewLink: protectedProcedure
    .input(z.object({ invoiceId: z.string() }))
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

      assertInvoiceScopeAccess(inv, {
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
        },
        capability: "commerce.manage",
        resource: {
          organizationId: inv.organizationId,
          locationId: inv.locationId,
        },
      });
      const access = await issueInvoiceAccessToken({
        invoiceId: inv.id,
        organizationId: inv.organizationId,
        locationId: inv.locationId,
        purpose: "VIEW",
        createdBy: ctx.auth.user.id,
      });

      return {
        viewLink: buildPublicInvoiceUrl({
          baseUrl: getPublicAppBaseUrl(),
          token: access.token,
          purpose: "VIEW",
        }),
        expiresAt: access.expiresAt,
      };
    }),

  revokePublicLinks: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        purpose: invoiceAccessPurposeSchema.optional(),
      }),
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

      assertInvoiceScopeAccess(inv, {
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
        },
        capability: "commerce.manage",
        resource: {
          organizationId: inv.organizationId,
          locationId: inv.locationId,
        },
      });
      const revokedCount = await revokeInvoiceAccessTokens({
        invoiceId: inv.id,
        organizationId: inv.organizationId,
        locationId: inv.locationId,
        purpose: input.purpose,
        revokedBy: ctx.auth.user.id,
      });

      return { revokedCount };
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

      assertInvoiceScopeAccess(inv, {
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });

      try {
        // Import PDF generator and template presets
        const { generatePDF } =
          await import("@/features/invoicing/lib/pdf-generator");
        // Get and validate the stored template before rendering.
        const template = inv.invoiceTemplate
          ? invoiceTemplatePresetSchema.parse({
              name: inv.invoiceTemplate.name,
              description: inv.invoiceTemplate.description || "",
              layout: inv.invoiceTemplate.layout,
              styles: inv.invoiceTemplate.styles,
            })
          : PRESET_TEMPLATES.minimal;

        const [org, loc] = await Promise.all([
          db.query.organization.findFirst({
            where: eq(organization.id, inv.organizationId),
            columns: { name: true, businessEmail: true },
          }),
          inv.locationId
            ? db.query.location.findFirst({
                where: and(
                  eq(location.id, inv.locationId),
                  eq(location.organizationId, inv.organizationId),
                ),
                columns: { companyName: true, businessEmail: true },
              })
            : Promise.resolve(undefined),
        ]);
        if (!org) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Invoice organization could not be resolved",
          });
        }

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
          businessName: loc?.companyName ?? org.name,
          businessEmail: loc?.businessEmail ?? org.businessEmail ?? undefined,
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
          message:
            error instanceof Error ? error.message : "Failed to generate PDF",
        });
      }
    }),

  // List invoice templates
  listTemplates: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      }),
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
          or(eq(t.organizationId, ctx.orgId!), eq(t.isSystem, true)),
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
      const [duplicate] = await db
        .insert(invoiceTemplate)
        .values({
          id: crypto.randomUUID(),
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? undefined,
          name: `${template.name} (Copy)`,
          description: template.description,
          isDefault: false,
          isSystem: false,
          layout: template.layout,
          styles: template.styles,
          variables: template.variables,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return duplicate!;
    }),

  duplicatePreset: protectedProcedure
    .input(z.object({ preset: z.enum(["minimal", "corporate"]) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context required",
        });
      }
      const preset = PRESET_TEMPLATES[input.preset];
      const now = new Date();
      const [created] = await db
        .insert(invoiceTemplate)
        .values({
          id: crypto.randomUUID(),
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
          name: `${preset.name} (Copy)`,
          description: preset.description,
          isDefault: false,
          isSystem: false,
          layout: preset.layout,
          styles: preset.styles,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create invoice template",
        });
      }
      return created;
    }),

  // Upload bank transfer proof of payment
  uploadBankTransferProof: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        proofUrl: z.string().url(),
        notes: z.string().optional(),
      }),
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

      assertInvoiceScopeAccess(inv, {
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });

      // Update invoice with bank transfer proof
      const [updated] = await db
        .update(invoice)
        .set({
          bankTransferStatus: BankTransferStatus.PROOF_UPLOADED,
          bankTransferProof: input.proofUrl,
          bankTransferNotes: input.notes,
        })
        .where(eq(invoice.id, input.invoiceId))
        .returning();

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
      }),
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

      assertInvoiceScopeAccess(inv, {
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
      });

      if (input.verified) {
        const currency = normalizeCurrency(inv.currency);
        const exponent = currencyExponent(currency);
        const paymentMinor = decimalToMinorUnits(
          input.amount ?? inv.amountDue,
          exponent,
        );
        const amountDueMinor = decimalToMinorUnits(inv.amountDue, exponent);
        if (paymentMinor <= 0 || paymentMinor > amountDueMinor) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Payment amount must be positive and cannot exceed the outstanding balance",
          });
        }
        const paymentAmount = minorUnitsToDecimal(paymentMinor, exponent);

        // Create payment record and update invoice
        const result = await db.transaction(async (tx) => {
          const now = new Date();
          // Create payment record
          const [payment] = await tx
            .insert(invoicePayment)
            .values({
              id: crypto.randomUUID(),
              invoiceId: input.invoiceId,
              amount: paymentAmount,
              currency,
              method: PaymentMethod.BANK_TRANSFER,
              referenceNumber: inv.invoiceNumber,
              notes: input.notes,
              paidAt: now,
              createdAt: now,
              updatedAt: now,
            })
            .returning();

          // Calculate new amounts
          const newAmountPaidMinor =
            decimalToMinorUnits(inv.amountPaid, exponent) + paymentMinor;
          const newAmountDueMinor =
            decimalToMinorUnits(inv.total, exponent) - newAmountPaidMinor;
          const newAmountPaid = minorUnitsToDecimal(
            newAmountPaidMinor,
            exponent,
          );
          const newAmountDue = minorUnitsToDecimal(newAmountDueMinor, exponent);
          const isPaid = newAmountDueMinor === 0;

          // Update invoice
          const [updated] = await tx
            .update(invoice)
            .set({
              bankTransferStatus: BankTransferStatus.VERIFIED,
              bankTransferVerifiedAt: now,
              bankTransferVerifiedBy: ctx.auth.user.id,
              bankTransferNotes: input.notes,
              amountPaid: newAmountPaid,
              amountDue: newAmountDue,
              status: isPaid
                ? InvoiceStatus.PAID
                : InvoiceStatus.PARTIALLY_PAID,
              paidAt: isPaid ? now : inv.paidAt,
            })
            .where(eq(invoice.id, input.invoiceId))
            .returning();

          if (isPaid && payment) {
            await resolvePaymentRecoveryCases({
              tx,
              organizationId: inv.organizationId,
              locationId: inv.locationId,
              target: "INVOICE",
              resource: { invoiceId: inv.id },
              sourceEventId: null,
              occurredAt: now,
              attemptKey: `invoice-bank-transfer:${payment.id}`,
              provider: "AUREA",
              providerAccountRef: null,
              stripeConnectionId: null,
              providerObjectId: payment.id,
            });
          }

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
        const [updated] = await db
          .update(invoice)
          .set({
            bankTransferStatus: BankTransferStatus.REJECTED,
            bankTransferNotes: input.notes,
          })
          .where(eq(invoice.id, input.invoiceId))
          .returning();

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
});
