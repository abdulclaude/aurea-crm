import { TRPCError } from "@trpc/server";
import z from "zod";
import type { Prisma } from "@prisma/client";
import {
  InvoiceStatus,
  InvoiceType,
  BillingModel,
  PaymentMethod,
  ActivityAction,
  BankTransferStatus,
} from "@prisma/client";
import { format } from "date-fns";

import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "@/trpc/init";
import { logAnalytics, getChangedFields } from "@/lib/analytics-logger";
import { generateInvoiceNumber } from "@/features/invoicing/lib/invoice-number-generator";

const INVOICE_PAGE_SIZE = 20;

const invoiceInclude = {
  invoiceLineItem: {
    orderBy: { order: "asc" as const },
  },
  invoicePayment: {
    orderBy: { paidAt: "desc" as const },
  },
  invoiceReminder: {
    orderBy: { sentAt: "desc" as const },
  },
  invoiceTemplate: true,
} satisfies Prisma.InvoiceInclude;

/**
 * Determine available payment methods for an invoice based on configured integrations
 */
async function getAvailablePaymentMethods(params: {
  organizationId: string;
  subaccountId?: string;
}): Promise<PaymentMethod[]> {
  const { organizationId, subaccountId } = params;
  const methods: PaymentMethod[] = [];

  // Check if Stripe Connect is enabled
  const stripeConnect = await prisma.stripeConnection.findFirst({
    where: {
      organizationId,
      subaccountId: subaccountId || null,
      isActive: true,
      chargesEnabled: true,
    },
  });

  if (stripeConnect) {
    methods.push(PaymentMethod.STRIPE);
  }

  // Check if Bank Transfer is enabled
  const bankTransfer = await prisma.bankTransferSettings.findFirst({
    where: {
      organizationId,
      subaccountId: subaccountId || null,
      enabled: true,
    },
  });

  if (bankTransfer) {
    methods.push(PaymentMethod.BANK_TRANSFER);
  }

  // Always include MANUAL as a fallback
  methods.push(PaymentMethod.MANUAL);

  return methods;
}

type InvoiceResult = Prisma.InvoiceGetPayload<{
  include: typeof invoiceInclude;
}>;

const mapInvoice = (invoice: InvoiceResult) => {
  return {
    id: invoice.id,
    organizationId: invoice.organizationId,
    subaccountId: invoice.subaccountId,
    invoiceNumber: invoice.invoiceNumber,
    contactId: invoice.contactId,
    contactName: invoice.contactName,
    contactEmail: invoice.contactEmail,
    contactAddress: invoice.contactAddress,
    title: invoice.title,
    type: invoice.type,
    status: invoice.status,
    billingModel: invoice.billingModel,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    paidAt: invoice.paidAt,
    subtotal: invoice.subtotal.toString(),
    taxRate: invoice.taxRate?.toString() ?? null,
    taxAmount: invoice.taxAmount.toString(),
    discountAmount: invoice.discountAmount.toString(),
    total: invoice.total.toString(),
    amountPaid: invoice.amountPaid.toString(),
    amountDue: invoice.amountDue.toString(),
    currency: invoice.currency,
    notes: invoice.notes,
    internalNotes: invoice.internalNotes,
    termsConditions: invoice.termsConditions,
    documentUrl: invoice.documentUrl,
    documentName: invoice.documentName,
    stripeInvoiceId: invoice.stripeInvoiceId,
    stripePaymentIntentId: invoice.stripePaymentIntentId,
    xeroInvoiceId: invoice.xeroInvoiceId,
    lastReminderSentAt: invoice.lastReminderSentAt,
    reminderCount: invoice.reminderCount,
    metadata: invoice.metadata,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    lineItems: invoice.invoiceLineItem.map((item) => ({
      id: item.id,
      invoiceId: item.invoiceId,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      amount: item.amount.toString(),
      timeLogId: item.timeLogId,
      order: item.order,
      metadata: item.metadata,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    payments: invoice.invoicePayment.map((payment) => ({
      id: payment.id,
      invoiceId: payment.invoiceId,
      amount: payment.amount.toString(),
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
    reminders: invoice.invoiceReminder.map((reminder) => ({
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
        contactId: z.string().optional(),
        search: z.string().optional(),
        sortBy: z.enum(["issueDate", "dueDate", "total"]).default("issueDate"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit, status, type, contactId, search, sortBy, sortOrder } =
        input;

      // Require either organizationId or subaccountId
      if (!ctx.orgId && !ctx.subaccountId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization or subaccount context required",
        });
      }

      // Build where clause
      const where: Prisma.InvoiceWhereInput = {
        organizationId: ctx.orgId ?? undefined,
        subaccountId: ctx.subaccountId ?? undefined,
        ...(status && { status }),
        ...(type && { type }),
        ...(contactId && { contactId }),
        ...(search && {
          OR: [
            { invoiceNumber: { contains: search, mode: "insensitive" } },
            { contactName: { contains: search, mode: "insensitive" } },
            { contactEmail: { contains: search, mode: "insensitive" } },
          ],
        }),
      };

      const invoices = await prisma.invoice.findMany({
        where,
        include: invoiceInclude,
        orderBy: { [sortBy]: sortOrder },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
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
      const invoice = await prisma.invoice.findUnique({
        where: { id: input.id },
        include: invoiceInclude,
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Verify access
      if (
        invoice.organizationId !== ctx.orgId &&
        invoice.subaccountId !== ctx.subaccountId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this invoice",
        });
      }

      return mapInvoice(invoice);
    }),

  create: protectedProcedure
    .input(
      z.object({
        contactId: z.string().optional(),
        contactName: z.string().min(1),
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
        ctx.subaccountId ?? undefined
      );

      // Get available payment methods
      const paymentMethods = await getAvailablePaymentMethods({
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId ?? undefined,
      });

      // Create invoice with line items
      const invoice = await prisma.invoice.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? undefined,
          invoiceNumber,
          contactId: input.contactId,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
          contactAddress: input.contactAddress,
          title: input.title,
          type: input.type,
          billingModel: input.billingModel,
          templateId: input.templateId && input.templateId !== "__default__" ? input.templateId : undefined,
          dueDate: input.dueDate,
          subtotal,
          taxRate: input.taxRate,
          taxAmount,
          discountAmount,
          total,
          amountDue: total,
          notes: input.notes,
          internalNotes: input.internalNotes,
          termsConditions: input.termsConditions,
          documentUrl: input.documentUrl,
          paymentMethods, // Add available payment methods
          createdAt: new Date(),
          updatedAt: new Date(),
          invoiceLineItem: {
            create: input.lineItems.map((item, index) => ({
              id: crypto.randomUUID(),
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.quantity * item.unitPrice,
              timeLogId: item.timeLogId,
              order: index,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          },
        },
        include: invoiceInclude,
      });

      // Log activity
      await logAnalytics({
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId ?? undefined,
        userId: ctx.auth.user.id,
        type: "INVOICE",
        action: ActivityAction.CREATED,
        entityType: "invoice",
        entityId: invoice.id,
        entityName: `${invoice.invoiceNumber} - ${invoice.contactName}`,
      });

      return mapInvoice(invoice);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        contactId: z.string().optional(),
        contactName: z.string().min(1).optional(),
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
      const existingInvoice = await prisma.invoice.findUnique({
        where: { id },
        include: { invoiceLineItem: true },
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
        existingInvoice.subaccountId !== ctx.subaccountId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this invoice",
        });
      }

      // Calculate totals if line items are updated
      let financialUpdate: Partial<Prisma.InvoiceUpdateInput> = {};

      if (lineItems) {
        const subtotal = lineItems.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        );

        const taxRate = updateData.taxRate ?? existingInvoice.taxRate?.toNumber();
        const taxAmount = taxRate ? (subtotal * taxRate) / 100 : 0;
        const discountAmount =
          updateData.discountAmount ??
          existingInvoice.discountAmount.toNumber();
        const total = subtotal + taxAmount - discountAmount;
        const amountPaid = existingInvoice.amountPaid.toNumber();

        financialUpdate = {
          subtotal,
          taxAmount,
          discountAmount,
          total,
          amountDue: total - amountPaid,
        };
      }

      // Update invoice
      const invoice = await prisma.$transaction(async (tx) => {
        // Delete old line items if updating
        if (lineItems) {
          await tx.invoiceLineItem.deleteMany({
            where: { invoiceId: id },
          });
        }

        // Update invoice
        return await tx.invoice.update({
          where: { id },
          data: {
            ...(updateData as any),
            ...(templateUpdate as any),
            ...(financialUpdate as any),
            ...(lineItems && {
              invoiceLineItem: {
                create: lineItems.map((item, index) => ({
                  id: crypto.randomUUID(),
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  amount: item.quantity * item.unitPrice,
                  timeLogId: item.timeLogId,
                  order: index,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })),
              },
            }),
          },
          include: invoiceInclude,
        });
      });

      // Log activity
      const changes = getChangedFields(existingInvoice, {
        ...existingInvoice,
        ...(updateData as any),
      } as any);

      if (changes && Object.keys(changes).length > 0) {
        await logAnalytics({
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? undefined,
          userId: ctx.auth.user.id,
          type: "INVOICE" as any,
          action: ActivityAction.UPDATED,
          entityType: "invoice",
          entityId: invoice.id,
          entityName: `${invoice.invoiceNumber} - ${invoice.contactName}`,
          changes: changes as any,
        });
      }

      return mapInvoice(invoice);
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
      const existingInvoice = await prisma.invoice.findUnique({
        where: { id },
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
        existingInvoice.subaccountId !== ctx.subaccountId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this invoice",
        });
      }

      // Update invoice document
      const invoice = await prisma.invoice.update({
        where: { id },
        data: {
          documentUrl,
          documentName,
        },
        include: invoiceInclude,
      });

      // Log activity
      await logAnalytics({
        organizationId: ctx.orgId!,
        subaccountId: ctx.subaccountId ?? undefined,
        userId: ctx.auth.user.id,
        type: "INVOICE" as any,
        action: ActivityAction.UPDATED,
        entityType: "invoice",
        entityId: invoice.id,
        entityName: `${invoice.invoiceNumber} - ${invoice.contactName}`,
        changes: {
          documentUrl: {
            old: existingInvoice.documentUrl,
            new: documentUrl,
          },
        } as any,
      });

      return mapInvoice(invoice);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await prisma.invoice.findUnique({
        where: { id: input.id },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Verify access
      if (
        invoice.organizationId !== ctx.orgId &&
        invoice.subaccountId !== ctx.subaccountId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this invoice",
        });
      }

      await prisma.invoice.delete({
        where: { id: input.id },
      });

      // Log activity
      await logAnalytics({
        organizationId: ctx.orgId!,
        subaccountId: ctx.subaccountId ?? undefined,
        userId: ctx.auth.user.id,
        type: "INVOICE",
        action: ActivityAction.DELETED,
        entityType: "invoice",
        entityId: invoice.id,
        entityName: `${invoice.invoiceNumber} - ${invoice.contactName}`,
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

      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Verify access
      if (
        invoice.organizationId !== ctx.orgId &&
        invoice.subaccountId !== ctx.subaccountId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this invoice",
        });
      }

      // Create payment and update invoice
      const payment = await prisma.$transaction(async (tx) => {
        const payment = await tx.invoicePayment.create({
          data: {
            id: crypto.randomUUID(),
            invoiceId,
            ...paymentData,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        const newAmountPaid =
          invoice.amountPaid.toNumber() + paymentData.amount;
        const newAmountDue = invoice.total.toNumber() - newAmountPaid;

        // Determine new status
        let newStatus = invoice.status;
        if (newAmountDue <= 0) {
          newStatus = InvoiceStatus.PAID;
        } else if (newAmountPaid > 0) {
          newStatus = InvoiceStatus.PARTIALLY_PAID;
        }

        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            amountPaid: newAmountPaid,
            amountDue: newAmountDue,
            status: newStatus,
            paidAt: newAmountDue <= 0 ? new Date() : invoice.paidAt,
          },
        });

        return payment;
      });

      // Log activity
      await logAnalytics({
        organizationId: ctx.orgId!,
        subaccountId: ctx.subaccountId ?? undefined,
        userId: ctx.auth.user.id,
        type: "INVOICE",
        action: ActivityAction.UPDATED,
        entityType: "invoice",
        entityId: invoice.id,
        entityName: `${invoice.invoiceNumber} - Payment Recorded`,
        changes: {
          payment: {
            old: invoice.amountPaid.toString(),
            new: (invoice.amountPaid.toNumber() + paymentData.amount).toString(),
          },
        },
      });

      return {
        id: payment.id,
        amount: payment.amount.toString(),
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
      const invoice = await prisma.invoice.findUnique({
        where: { id: input.invoiceId },
        include: invoiceInclude,
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Verify access
      if (
        invoice.organizationId !== ctx.orgId &&
        invoice.subaccountId !== ctx.subaccountId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this invoice",
        });
      }

      const sendTo = input.sendTo ?? invoice.contactEmail;
      if (!sendTo) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No email address available for reminder",
        });
      }

      // Generate payment link to include in email
      const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invoices/pay/${invoice.id}`;

      // Create reminder record
      const reminder = await prisma.$transaction(async (tx) => {
        const reminder = await tx.invoiceReminder.create({
          data: {
            id: crypto.randomUUID(),
            invoiceId: input.invoiceId,
            sentTo: sendTo,
            subject: input.subject,
            message: input.message,
            sentAt: new Date(),
            createdAt: new Date(),
          },
        });

        await tx.invoice.update({
          where: { id: input.invoiceId },
          data: {
            lastReminderSentAt: new Date(),
            reminderCount: { increment: 1 },
          },
        });

        return reminder;
      });

      // Generate PDF attachment
      let pdfBuffer: Buffer | null = null;
      try {
        const { generatePDF } = await import("@/features/invoicing/lib/pdf-generator");
        const { PRESET_TEMPLATES } = await import("@/features/invoicing/lib/template-presets");

        // Get template
        const template = invoice.invoiceTemplate
          ? {
              name: invoice.invoiceTemplate.name,
              description: invoice.invoiceTemplate.description || "",
              layout: invoice.invoiceTemplate.layout as any,
              styles: invoice.invoiceTemplate.styles as any,
            }
          : PRESET_TEMPLATES.minimal;

        // Prepare invoice data
        const invoiceData = {
          invoiceNumber: invoice.invoiceNumber,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          contactName: invoice.contactName,
          contactEmail: invoice.contactEmail,
          contactAddress: invoice.contactAddress as Record<string, unknown> | null,
          lineItems: invoice.invoiceLineItem.map((item) => ({
            description: item.description,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
            amount: item.amount.toString(),
          })),
          subtotal: invoice.subtotal.toString(),
          taxRate: invoice.taxRate?.toString(),
          taxAmount: invoice.taxAmount.toString(),
          discountAmount: invoice.discountAmount.toString(),
          total: invoice.total.toString(),
          currency: invoice.currency,
          notes: invoice.notes,
          termsConditions: invoice.termsConditions,
          // TODO: Get from organization
          businessName: "Your Business",
          businessEmail: "contact@yourbusiness.com",
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
          invoiceNumber: invoice.invoiceNumber,
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
        subaccountId: ctx.subaccountId ?? undefined,
        userId: ctx.auth.user.id,
        type: "INVOICE",
        action: ActivityAction.UPDATED,
        entityType: "invoice",
        entityId: invoice.id,
        entityName: `${invoice.invoiceNumber} - Reminder sent to ${sendTo}`,
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
      const invoice = await prisma.invoice.findUnique({
        where: { id: input.invoiceId },
        include: invoiceInclude,
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Verify access
      if (
        invoice.organizationId !== ctx.orgId &&
        invoice.subaccountId !== ctx.subaccountId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this invoice",
        });
      }

      // Require email
      if (!invoice.contactEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invoice contact must have an email address",
        });
      }

      // Generate payment link
      const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invoices/pay/${invoice.id}`;

      // Fetch subaccount if available for business name
      let businessName = "Your Business";
      if (invoice.subaccountId) {
        const subaccount = await prisma.subaccount.findUnique({
          where: { id: invoice.subaccountId },
          select: { companyName: true },
        });
        if (subaccount) {
          businessName = subaccount.companyName;
        }
      }

      // Generate PDF
      let pdfBuffer: Buffer | null = null;
      try {
        const { generatePDF } = await import("@/features/invoicing/lib/pdf-generator");
        const { PRESET_TEMPLATES } = await import("@/features/invoicing/lib/template-presets");

        const template = invoice.invoiceTemplate
          ? {
              name: invoice.invoiceTemplate.name,
              description: invoice.invoiceTemplate.description || "",
              layout: invoice.invoiceTemplate.layout as any,
              styles: invoice.invoiceTemplate.styles as any,
            }
          : PRESET_TEMPLATES.minimal;

        const invoiceData = {
          invoiceNumber: invoice.invoiceNumber,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          contactName: invoice.contactName,
          contactEmail: invoice.contactEmail,
          contactAddress: invoice.contactAddress as Record<string, unknown> | null,
          lineItems: invoice.invoiceLineItem.map((item) => ({
            description: item.description,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
            amount: item.amount.toString(),
          })),
          subtotal: invoice.subtotal.toString(),
          taxRate: invoice.taxRate?.toString(),
          taxAmount: invoice.taxAmount.toString(),
          discountAmount: invoice.discountAmount.toString(),
          total: invoice.total.toString(),
          currency: invoice.currency,
          notes: invoice.notes,
          termsConditions: invoice.termsConditions,
          businessName,
          businessEmail: "contact@yourbusiness.com",
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
          to: invoice.contactEmail,
          invoiceNumber: invoice.invoiceNumber,
          contactName: invoice.contactName,
          total: invoice.total.toString(),
          currency: invoice.currency,
          dueDate: invoice.dueDate,
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
      await prisma.invoice.update({
        where: { id: input.invoiceId },
        data: {
          status: InvoiceStatus.SENT,
        },
      });

      // Log activity (non-blocking)
      try {
        await logAnalytics({
          organizationId: ctx.orgId!,
          subaccountId: ctx.subaccountId ?? undefined,
          userId: ctx.auth.user.id,
          type: "INVOICE",
          action: ActivityAction.UPDATED,
          entityType: "invoice",
          entityId: invoice.id,
          entityName: `${invoice.invoiceNumber} - Sent to ${invoice.contactEmail}`,
        });
      } catch (error) {
        console.error("Failed to log analytics:", error);
        // Don't throw - analytics logging shouldn't break the mutation
      }

      return {
        success: true,
        sentTo: invoice.contactEmail,
      };
    }),

  generateFromTimeLogs: protectedProcedure
    .input(
      z.object({
        timeLogIds: z.array(z.string()).min(1, "At least one time log is required"),
        contactId: z.string().optional(),
        contactName: z.string().min(1).optional(),
        contactEmail: z.string().email().optional().or(z.literal("")),
        title: z.string().optional(),
        dueDate: z.date(),
        taxRate: z.number().min(0).max(100).optional(),
        discountAmount: z.number().min(0).optional(),
        notes: z.string().optional(),
        termsConditions: z.string().optional(),
        groupBy: z.enum(["worker", "date", "all"]).default("worker"),
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
      const timeLogs = await prisma.timeLog.findMany({
        where: {
          id: { in: input.timeLogIds },
          organizationId: ctx.orgId,
          status: "APPROVED", // Only approved time logs can be invoiced
        },
        include: {
          worker: true,
          contact: true,
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

      // IMPORTANT: Check if all time logs have an associated contact (client)
      const timeLogsWithoutContact = timeLogs.filter((log) => !log.contactId);
      if (timeLogsWithoutContact.length > 0) {
        const workerNames = timeLogsWithoutContact
          .map((log) => log.worker?.name || "Unknown worker")
          .filter((name, index, self) => self.indexOf(name) === index) // unique names
          .join(", ");

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot generate invoice: ${timeLogsWithoutContact.length} time log(s) do not have a contact (client) assigned. Workers without contact: ${workerNames}. Please assign a contact to these workers before generating an invoice.`,
        });
      }

      // Ensure all time logs are for the same contact (client)
      const contactIds = new Set(timeLogs.map((log) => log.contactId));
      if (contactIds.size > 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot generate invoice: Selected time logs belong to different contacts (clients). Please select time logs for only one contact at a time.",
        });
      }

      // Group time logs and create line items
      let lineItems: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        timeLogId: string;
      }> = [];

      if (input.groupBy === "worker") {
        // Group by worker
        const workerGroups = timeLogs.reduce((acc, log) => {
          const workerId = log.workerId || "no-worker";
          if (!acc[workerId]) acc[workerId] = [];
          acc[workerId].push(log);
          return acc;
        }, {} as Record<string, typeof timeLogs>);

        Object.entries(workerGroups).forEach(([workerId, logs]) => {
          const worker = logs[0]?.worker;
          const totalHours = logs.reduce(
            (sum, log) => sum + (log.duration || 0) / 60,
            0
          );
          const avgRate =
            logs.reduce(
              (sum, log) => sum + (log.hourlyRate?.toNumber() || 0),
              0
            ) / logs.length;

          lineItems.push({
            description: `${worker?.name || "Worker"} - ${logs.length} shift(s), ${totalHours.toFixed(2)} hours`,
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
              (sum, log) => sum + (log.hourlyRate?.toNumber() || 0),
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
            (sum, log) => sum + (log.hourlyRate?.toNumber() || 0),
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

      // Get contact info from time logs (we've already validated all time logs have the same contact)
      const timeLogContact = timeLogs[0]?.contact;
      if (!timeLogContact) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Contact information not found. Please ensure all time logs have a contact assigned.",
        });
      }

      // Use contact from time log, but allow override from input if provided
      const contactId = input.contactId || timeLogContact.id;
      const contactName = input.contactName || timeLogContact.name;
      const contactEmail = input.contactEmail || timeLogContact.email || undefined;

      // Determine name for invoice numbering
      // Use the contact's (client's) name for invoice numbering to group by client
      // This ensures all invoices for the same client are sequentially numbered together
      let nameForInvoice: string | undefined;

      // Check if all time logs are from the same worker
      const allSameWorker = timeLogs.every(
        (log) => log.workerId === timeLogs[0]?.workerId
      );

      if (allSameWorker) {
        // If all time logs are from one worker, use worker's name
        const firstWorker = timeLogs[0]?.worker;
        nameForInvoice = firstWorker?.name;
      } else {
        // If multiple workers, use the client's (contact's) name
        // This groups invoices by client when multiple workers are involved
        nameForInvoice = contactName;
      }

      // Generate invoice number with name if available
      const invoiceNumber = await generateInvoiceNumber(
        ctx.orgId,
        ctx.subaccountId ?? undefined,
        nameForInvoice
      );

      // Get available payment methods
      const paymentMethods = await getAvailablePaymentMethods({
        organizationId: ctx.orgId!,
        subaccountId: ctx.subaccountId ?? undefined,
      });

      // Create invoice
      const invoice = await prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.create({
          data: {
            id: crypto.randomUUID(),
            organizationId: ctx.orgId!,
            subaccountId: ctx.subaccountId ?? undefined,
            invoiceNumber,
            contactId,
            contactName,
            contactEmail,
            title: input.title ?? `Time Tracking Invoice - ${format(new Date(), "MMM yyyy")}`,
            billingModel: "HOURLY",
            dueDate: input.dueDate,
            subtotal,
            taxRate: input.taxRate,
            taxAmount,
            discountAmount,
            total,
            amountDue: total,
            notes: input.notes,
            termsConditions: input.termsConditions,
            paymentMethods, // Add available payment methods
            createdAt: new Date(),
            updatedAt: new Date(),
            invoiceLineItem: {
              create: lineItems.map((item, index) => ({
                id: crypto.randomUUID(),
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: item.quantity * item.unitPrice,
                timeLogId: item.timeLogId,
                order: index,
                createdAt: new Date(),
                updatedAt: new Date(),
              })),
            },
          },
          include: invoiceInclude,
        });

        // Update all time logs to mark them as invoiced
        await tx.timeLog.updateMany({
          where: { id: { in: input.timeLogIds } },
          data: {
            invoiceId: invoice.id,
            status: "INVOICED",
          },
        });

        return invoice;
      });

      // Log activity
      await logAnalytics({
        organizationId: ctx.orgId,
        subaccountId: ctx.subaccountId ?? undefined,
        userId: ctx.auth.user.id,
        type: "INVOICE",
        action: ActivityAction.CREATED,
        entityType: "invoice",
        entityId: invoice.id,
        entityName: `${invoice.invoiceNumber} - Generated from ${timeLogs.length} time log(s)`,
      });

      return mapInvoice(invoice);
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
      const invoice = await prisma.invoice.findUnique({
        where: { id: input.invoiceId },
        include: {
          invoiceLineItem: true,
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Note: Payment links are public, so we don't verify access here
      // The invoice ID itself acts as the authentication token

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      if (input.provider === "STRIPE") {
        // Fetch Stripe Connect account for this subaccount/organization
        const stripeConnection = await prisma.stripeConnection.findFirst({
          where: {
            isActive: true,
            ...(invoice.subaccountId
              ? { subaccountId: invoice.subaccountId }
              : { organizationId: invoice.organizationId, subaccountId: null }),
          },
        });

        if (!stripeConnection) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Stripe Connect is not set up for this account. Please connect your Stripe account in payment settings.",
          });
        }

        if (!stripeConnection.chargesEnabled) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "This Stripe account cannot accept charges yet. Please complete your Stripe account setup.",
          });
        }

        // Create Stripe Checkout Session using Connect account
        try {
          const { createStripeCheckoutSessionForConnect } = await import("@/lib/stripe");

          // Convert amount to cents
          const amountInCents = Math.round(parseFloat(invoice.amountDue.toString()) * 100);

          // Validate amount
          if (amountInCents < 1) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invoice amount must be at least $0.01 to process payment.",
            });
          }

          // Calculate application fee if configured
          let applicationFeeAmount: number | undefined;
          if (stripeConnection.applicationFeePercent || stripeConnection.applicationFeeFixed) {
            const feePercent = stripeConnection.applicationFeePercent
              ? parseFloat(stripeConnection.applicationFeePercent.toString())
              : 0;
            const feeFixed = stripeConnection.applicationFeeFixed
              ? Math.round(parseFloat(stripeConnection.applicationFeeFixed.toString()) * 100) // Convert to cents and ensure integer
              : 0;

            applicationFeeAmount = Math.round((amountInCents * feePercent) / 100 + feeFixed);
          }

          const result = await createStripeCheckoutSessionForConnect({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            amount: amountInCents,
            currency: invoice.currency,
            contactEmail: invoice.contactEmail || "",
            contactName: invoice.contactName,
            lineItems: invoice.invoiceLineItem.map((item) => {
              const quantity = Math.max(1, Math.round(item.quantity.toNumber())); // Ensure at least 1
              const amount = Math.max(1, Math.round(parseFloat(item.unitPrice.toString()) * 100)); // Ensure at least 1 cent
              return {
                name: item.description,
                quantity,
                amount,
              };
            }),
            successUrl: `${baseUrl}/invoices/pay/${invoice.id}?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${baseUrl}/invoices/pay/${invoice.id}?canceled=true`,
            stripeAccountId: stripeConnection.stripeAccountId,
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
      const paymentLink = `${baseUrl}/invoices/pay/${invoice.id}`;

      return {
        paymentLink,
        provider: "HOSTED",
      };
    }),

  // Generate PDF invoice
  generatePDF: protectedProcedure
    .input(z.object({ invoiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await prisma.invoice.findUnique({
        where: { id: input.invoiceId },
        include: invoiceInclude,
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Verify access
      if (
        invoice.organizationId !== ctx.orgId &&
        invoice.subaccountId !== ctx.subaccountId
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
        const template = invoice.invoiceTemplate
          ? {
              name: invoice.invoiceTemplate.name,
              description: invoice.invoiceTemplate.description || "",
              layout: invoice.invoiceTemplate.layout as any,
              styles: invoice.invoiceTemplate.styles as any,
            }
          : PRESET_TEMPLATES.minimal;

        // Prepare invoice data
        const invoiceData = {
          invoiceNumber: invoice.invoiceNumber,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          contactName: invoice.contactName,
          contactEmail: invoice.contactEmail,
          contactAddress: invoice.contactAddress as Record<string, unknown> | null,
          lineItems: invoice.invoiceLineItem.map((item) => ({
            description: item.description,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
            amount: item.amount.toString(),
          })),
          subtotal: invoice.subtotal.toString(),
          taxRate: invoice.taxRate?.toString(),
          taxAmount: invoice.taxAmount.toString(),
          discountAmount: invoice.discountAmount.toString(),
          total: invoice.total.toString(),
          currency: invoice.currency,
          notes: invoice.notes,
          termsConditions: invoice.termsConditions,
          // TODO: Get from organization
          businessName: "Your Business",
          businessEmail: "contact@yourbusiness.com",
        };

        // Generate PDF using React-PDF
        const pdfBuffer = await generatePDF(invoiceData, template);

        // Convert to base64 for transmission
        const pdfBase64 = pdfBuffer.toString("base64");

        return {
          filename: `invoice-${invoice.invoiceNumber}.pdf`,
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

      const templates = await prisma.invoiceTemplate.findMany({
        where: {
          OR: [
            { organizationId: ctx.orgId },
            { isSystem: true }, // Include system templates
          ],
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
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
      const template = await prisma.invoiceTemplate.findUnique({
        where: { id: input.id },
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

      await prisma.invoiceTemplate.delete({
        where: { id: input.id },
      });

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

      const template = await prisma.invoiceTemplate.findUnique({
        where: { id: input.id },
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
      const duplicate = await prisma.invoiceTemplate.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: ctx.orgId,
          subaccountId: ctx.subaccountId ?? undefined,
          name: `${template.name} (Copy)`,
          description: template.description,
          isDefault: false,
          isSystem: false,
          layout: template.layout as any,
          styles: template.styles as any,
          variables: template.variables as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return duplicate;
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
      const invoice = await prisma.invoice.findUnique({
        where: { id: input.invoiceId },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Update invoice with bank transfer proof
      const updated = await prisma.invoice.update({
        where: { id: input.invoiceId },
        data: {
          bankTransferStatus: BankTransferStatus.PROOF_UPLOADED,
          bankTransferProof: input.proofUrl,
          bankTransferNotes: input.notes,
        },
      });

      // Log activity
      await logAnalytics({
        organizationId: invoice.organizationId,
        subaccountId: invoice.subaccountId,
        userId: ctx.auth.user.id,
        type: "INVOICE",
        action: ActivityAction.UPDATED,
        entityType: "invoice",
        entityId: invoice.id,
        entityName: invoice.invoiceNumber,
        changes: {
          bankTransferStatus: {
            old: invoice.bankTransferStatus,
            new: BankTransferStatus.PROOF_UPLOADED,
          },
        },
      });

      return {
        id: updated.id,
        bankTransferStatus: updated.bankTransferStatus,
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
      const invoice = await prisma.invoice.findUnique({
        where: { id: input.invoiceId },
        include: { invoiceLineItem: true },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Verify access
      if (
        invoice.organizationId !== ctx.orgId &&
        invoice.subaccountId !== ctx.subaccountId
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
          : invoice.amountDue.toNumber();

        // Create payment record and update invoice
        const result = await prisma.$transaction(async (tx) => {
          // Create payment record
          const payment = await tx.invoicePayment.create({
            data: {
              id: crypto.randomUUID(),
              invoiceId: input.invoiceId,
              amount: paymentAmount,
              currency: invoice.currency,
              method: PaymentMethod.BANK_TRANSFER,
              referenceNumber: invoice.invoiceNumber,
              notes: input.notes,
              paidAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          // Calculate new amounts
          const newAmountPaid = invoice.amountPaid.toNumber() + paymentAmount;
          const newAmountDue = invoice.total.toNumber() - newAmountPaid;
          const isPaid = newAmountDue <= 0;

          // Update invoice
          const updated = await tx.invoice.update({
            where: { id: input.invoiceId },
            data: {
              bankTransferStatus: BankTransferStatus.VERIFIED,
              bankTransferVerifiedAt: new Date(),
              bankTransferVerifiedBy: ctx.auth.user.id,
              bankTransferNotes: input.notes,
              amountPaid: newAmountPaid,
              amountDue: newAmountDue,
              status: isPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
              paidAt: isPaid ? new Date() : invoice.paidAt,
            },
          });

          return { payment, invoice: updated };
        });

        // Log activity
        await logAnalytics({
          organizationId: invoice.organizationId,
          subaccountId: invoice.subaccountId,
          userId: ctx.auth.user.id,
          type: "INVOICE",
          action: ActivityAction.UPDATED,
          entityType: "invoice",
          entityId: invoice.id,
          entityName: invoice.invoiceNumber,
          changes: {
            bankTransferStatus: {
              old: invoice.bankTransferStatus,
              new: BankTransferStatus.VERIFIED,
            },
            status: {
              old: invoice.status,
              new: result.invoice.status,
            },
            amountPaid: {
              old: invoice.amountPaid.toString(),
              new: result.invoice.amountPaid.toString(),
            },
          },
        });

        return {
          id: result.invoice.id,
          bankTransferStatus: result.invoice.bankTransferStatus,
          status: result.invoice.status,
          amountPaid: result.invoice.amountPaid.toString(),
          amountDue: result.invoice.amountDue.toString(),
        };
      } else {
        // Reject the proof
        const updated = await prisma.invoice.update({
          where: { id: input.invoiceId },
          data: {
            bankTransferStatus: BankTransferStatus.REJECTED,
            bankTransferNotes: input.notes,
          },
        });

        // Log activity
        await logAnalytics({
          organizationId: invoice.organizationId,
          subaccountId: invoice.subaccountId,
          userId: ctx.auth.user.id,
          type: "INVOICE",
          action: ActivityAction.UPDATED,
          entityType: "invoice",
          entityId: invoice.id,
          entityName: invoice.invoiceNumber,
          changes: {
            bankTransferStatus: {
              old: invoice.bankTransferStatus,
              new: BankTransferStatus.REJECTED,
            },
          },
        });

        return {
          id: updated.id,
          bankTransferStatus: updated.bankTransferStatus,
        };
      }
    }),

  // Get bank transfer details for public invoice page (no auth required)
  getBankTransferDetails: baseProcedure
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ input }) => {
      const invoice = await prisma.invoice.findUnique({
        where: { id: input.invoiceId },
        select: {
          organizationId: true,
          subaccountId: true,
          paymentMethods: true,
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Check if bank transfer is enabled for this invoice
      if (!invoice.paymentMethods.includes(PaymentMethod.BANK_TRANSFER)) {
        return null;
      }

      // Get bank transfer settings
      const settings = await prisma.bankTransferSettings.findFirst({
        where: {
          organizationId: invoice.organizationId,
          subaccountId: invoice.subaccountId || null,
          enabled: true,
        },
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
