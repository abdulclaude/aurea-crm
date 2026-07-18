import { z } from "zod";

import { InvoiceStatus } from "@/db/enums";

export const publicInvoiceLineItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.string(),
  unitPrice: z.string(),
  amount: z.string(),
  order: z.number().int(),
});

export const publicInvoiceSchema = z.object({
  invoiceNumber: z.string(),
  title: z.string().nullable(),
  status: z.nativeEnum(InvoiceStatus),
  issueDate: z.date(),
  dueDate: z.date(),
  clientName: z.string(),
  subtotal: z.string(),
  taxRate: z.string().nullable(),
  taxAmount: z.string(),
  discountAmount: z.string(),
  total: z.string(),
  amountPaid: z.string(),
  amountDue: z.string(),
  currency: z.string(),
  notes: z.string().nullable(),
  termsConditions: z.string().nullable(),
  lineItems: z.array(publicInvoiceLineItemSchema),
  paymentOptions: z.object({
    stripe: z.boolean(),
    bankTransfer: z.boolean(),
  }),
  merchant: z.object({
    name: z.string(),
    supportEmail: z.string().nullable(),
  }),
});

export type PublicInvoice = z.infer<typeof publicInvoiceSchema>;

export const publicBankTransferDetailsSchema = z
  .object({
    bankName: z.string().nullable(),
    accountName: z.string().nullable(),
    accountNumber: z.string().nullable(),
    sortCode: z.string().nullable(),
    routingNumber: z.string().nullable(),
    iban: z.string().nullable(),
    swiftBic: z.string().nullable(),
    accountType: z.string().nullable(),
    currency: z.string(),
    instructions: z.string().nullable(),
    referenceFormat: z.string().nullable(),
  })
  .nullable();

export type PublicBankTransferDetails = z.infer<
  typeof publicBankTransferDetailsSchema
>;
