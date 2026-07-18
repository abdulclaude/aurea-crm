import { z } from "zod";

export const PRICING_TYPES = [
  { value: "CLASS_PACK", label: "Class pack" },
  { value: "MEMBERSHIP", label: "Membership" },
  { value: "BUNDLE", label: "Bundle" },
  { value: "DROP_IN", label: "Drop-in" },
  { value: "INTRO_OFFER", label: "Intro offer" },
  { value: "ACCOUNT_CREDIT", label: "Account credit" },
] as const;

export const BILLING_INTERVALS = [
  { value: "ONE_TIME", label: "One-time" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUALLY", label: "Annually" },
] as const;

export const ACCESS_TARGETS = [
  { value: "ALL_SERVICES", label: "All services" },
  { value: "SERVICE_TYPE", label: "Service type" },
  { value: "SERVICE_CATEGORY", label: "Service category" },
  { value: "CLASS_TYPE", label: "Class type" },
] as const;

export const pricingOptionCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    description: z.string().trim().optional(),
    type: z.enum(PRICING_TYPES.map((item) => item.value)),
    price: z.coerce.number().min(0, "Price must be zero or more"),
    billingInterval: z.enum(BILLING_INTERVALS.map((item) => item.value)),
    classCredits: z.string().trim().optional(),
    durationDays: z.string().trim().optional(),
    revenueCategory: z.string().trim().optional(),
    accessTarget: z.enum(ACCESS_TARGETS.map((item) => item.value)),
    targetId: z.string().trim().default("none"),
    accessSummary: z.string().trim().optional(),
    termsText: z.string().trim().optional(),
    confirmationEmail: z.string().trim().optional(),
    isPublic: z.boolean(),
    showInPos: z.boolean(),
    directPurchaseEnabled: z.boolean(),
  })
  .refine(
    (value) => value.accessTarget === "ALL_SERVICES" || value.targetId !== "none",
    {
      message: "Choose the service, category, or class type this option unlocks",
      path: ["targetId"],
    },
  );

export type PricingOptionCreateValues = z.infer<
  typeof pricingOptionCreateSchema
>;
export type PricingOptionCreateInput = z.input<typeof pricingOptionCreateSchema>;

export type PricingType = PricingOptionCreateValues["type"];
export type BillingInterval = PricingOptionCreateValues["billingInterval"];
export type AccessTarget = PricingOptionCreateValues["accessTarget"];

export function optionalNumber(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  return Number(value);
}
