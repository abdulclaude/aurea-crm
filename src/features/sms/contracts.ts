import { z } from "zod";

import { smsProviderSchema } from "@/features/provider-accounts/contracts";

export const saveSmsConfigSchema = z
  .object({
    provider: smsProviderSchema,
    displayName: z.string().trim().min(1).max(120),
    accountIdentifier: z.string().trim(),
    secret: z.string().trim(),
    fromNumber: z.string().trim().min(1).max(32),
    monthlyLimit: z.number().int().min(100).max(1_000_000).default(5000),
    inheritToLocations: z.boolean().default(true),
  })
  .superRefine((value, context) => {
    if (value.provider !== "MESSAGEBIRD" && !value.accountIdentifier) {
      context.addIssue({
        code: "custom",
        path: ["accountIdentifier"],
        message: "An account identifier is required for this provider",
      });
    }
  });

export type SaveSmsConfigInput = z.infer<typeof saveSmsConfigSchema>;
