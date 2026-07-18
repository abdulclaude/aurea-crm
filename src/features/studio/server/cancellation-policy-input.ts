import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  currencyExponent,
  decimalToMinorUnits,
  minorUnitsToDecimal,
  normalizeCurrency,
} from "@/features/commerce/lib/money";

export const cancellationMoneySchema = z.string().trim().min(1).max(32);

export const cancellationPolicyCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  lateCancelWindow: z.number().int().min(1).max(168).default(12),
  noShowFeeAmount: cancellationMoneySchema,
  lateCancelFee: cancellationMoneySchema,
  currency: z.string().trim().length(3).default("GBP"),
  deductCredits: z.boolean().default(true),
  creditsDeducted: z.number().int().min(0).max(100).default(1),
  chargeCard: z.boolean().default(false),
  sendNotification: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export const cancellationPolicyUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  lateCancelWindow: z.number().int().min(1).max(168).optional(),
  noShowFeeAmount: cancellationMoneySchema.optional(),
  lateCancelFee: cancellationMoneySchema.optional(),
  currency: z.string().trim().length(3).optional(),
  deductCredits: z.boolean().optional(),
  creditsDeducted: z.number().int().min(0).max(100).optional(),
  chargeCard: z.boolean().optional(),
  sendNotification: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export function normalizeCancellationMoney(
  value: string,
  currency: string,
): string {
  try {
    const normalizedCurrency = normalizeCurrency(currency);
    const exponent = currencyExponent(normalizedCurrency);
    const minor = decimalToMinorUnits(value, exponent);
    if (minor < 0) throw new Error("negative");
    return minorUnitsToDecimal(minor, exponent);
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Fee amounts must be valid non-negative values for the selected currency.",
    });
  }
}

export function normalizeCancellationCurrency(value: string): string {
  try {
    const currency = normalizeCurrency(value);
    if (currencyExponent(currency) > 2) {
      throw new Error("unsupported currency precision");
    }
    return currency;
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Currency must be a supported ISO code with no more than two decimal places.",
    });
  }
}
