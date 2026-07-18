import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { invoiceAccessPurposeSchema } from "@/features/invoicing/lib/public-invoice-access";
import {
  publicBankTransferDetailsSchema,
  publicInvoiceSchema,
} from "@/features/invoicing/lib/public-invoice-contract";
import { createTRPCRouter, baseProcedure } from "@/trpc/init";

import {
  getPublicBankTransferDetails,
  getPublicInvoice,
} from "./public-invoice-access";
import { PublicInvoiceAccessNotFoundError } from "./invoice-access-tokens";
import {
  createPublicInvoiceCheckout,
  PublicInvoicePaymentError,
} from "./public-invoice-checkout";

const publicInvoiceTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "Invalid invoice access token");

export const publicInvoicesRouter = createTRPCRouter({
  get: baseProcedure
    .input(
      z.object({
        token: publicInvoiceTokenSchema,
        purpose: invoiceAccessPurposeSchema,
      }),
    )
    .output(publicInvoiceSchema)
    .query(async ({ input }) => {
      try {
        return await getPublicInvoice(input);
      } catch (error) {
        throw mapPublicInvoiceError(error);
      }
    }),

  getBankTransferDetails: baseProcedure
    .input(z.object({ token: publicInvoiceTokenSchema }))
    .output(publicBankTransferDetailsSchema)
    .query(async ({ input }) => {
      try {
        return await getPublicBankTransferDetails(input);
      } catch (error) {
        throw mapPublicInvoiceError(error);
      }
    }),

  createCheckout: baseProcedure
    .input(z.object({ token: publicInvoiceTokenSchema }))
    .output(z.object({ checkoutUrl: z.string().url() }))
    .mutation(async ({ input }) => {
      try {
        const checkout = await createPublicInvoiceCheckout(input);
        return { checkoutUrl: checkout.checkoutUrl };
      } catch (error) {
        throw mapPublicInvoiceError(error);
      }
    }),
});

function mapPublicInvoiceError(error: unknown): TRPCError {
  if (error instanceof PublicInvoiceAccessNotFoundError) {
    return new TRPCError({
      code: "NOT_FOUND",
      message: "Invoice link is invalid or no longer available",
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
      message: "Secure checkout is temporarily unavailable",
      cause: error.originalCause ?? error,
    });
  }

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Unable to load this invoice",
    cause: error,
  });
}
