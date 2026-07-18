import { z } from "zod";

export const visitorPrivacyInputSchema = z
  .object({
    funnelId: z.string().trim().min(1).max(255),
    anonymousId: z.string().trim().min(1).max(255).optional(),
    email: z.string().trim().email().max(320).optional(),
  })
  .superRefine((value, context) => {
    const identifiers = [value.anonymousId, value.email].filter(
      (identifier) => identifier !== undefined,
    );
    if (identifiers.length !== 1) {
      context.addIssue({
        code: "custom",
        message: "Provide exactly one visitor identifier.",
      });
    }
  });

export type VisitorPrivacyInput = z.infer<typeof visitorPrivacyInputSchema>;
