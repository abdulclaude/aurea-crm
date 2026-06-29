"use client";

import { z } from "zod";

export const DIFFICULTY_OPTIONS = [
  { value: "ALL_LEVELS", label: "All levels" },
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
] as const;

export const PRICING_MODEL_OPTIONS = [
  { value: "PACKAGE_ONLY", label: "Package only" },
  { value: "DROP_IN", label: "Paid drop-in" },
  { value: "SLIDING_SCALE", label: "Sliding scale" },
  { value: "FREE", label: "Free" },
] as const;

export const REPEAT_OPTIONS = [
  { value: "NONE", label: "Does not repeat" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Every 2 weeks" },
  { value: "MONTHLY", label: "Monthly" },
] as const;

export type ClassSelectOption = {
  id: string;
  name: string;
  capacity?: number | null;
};

export type ServiceTypeSelectOption = {
  capacity?: number | null;
  classTypeId?: string | null;
  description?: string | null;
  durationMinutes: number;
  id: string;
  name: string;
  paymentType: "FREE" | "PAID" | "SLIDING_SCALE" | "PACKAGE_ONLY";
  price?: string | null;
  slidingScaleMaxPrice?: string | null;
  slidingScaleMinPrice?: string | null;
};

export type CancellationPolicyOption = {
  id: string;
  name: string;
};

const integerStringSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d+$/.test(value), {
    message: "Use a whole number",
  });

const moneyStringSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d+(\.\d{1,2})?$/.test(value), {
    message: "Use a valid amount",
  });

const optionalUrlSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || z.string().url().safeParse(value).success, {
    message: "Use a valid URL",
  });

export const classFormSchema = z
  .object({
    name: z.string().trim().min(1, "Class name is required").max(200),
    description: z.string().trim().max(2000),
    serviceTypeId: z.string(),
    classTypeId: z.string(),
    instructorId: z.string(),
    roomId: z.string(),
    difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"]),
    imageUrl: optionalUrlSchema,
    date: z.string().min(1, "Date is required"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    repeatFrequency: z.enum(["NONE", "WEEKLY", "BIWEEKLY", "MONTHLY"]),
    repeatCount: integerStringSchema,
    maxCapacity: integerStringSchema,
    onlineCapacity: integerStringSchema,
    walkInCapacity: integerStringSchema,
    isVirtual: z.boolean(),
    spotPickingEnabled: z.boolean(),
    pricingModel: z.enum(["FREE", "DROP_IN", "PACKAGE_ONLY", "SLIDING_SCALE"]),
    dropInPrice: moneyStringSchema,
    slidingScaleMinPrice: moneyStringSchema,
    slidingScaleMaxPrice: moneyStringSchema,
    currency: z.string().length(3),
    bookingWindowHours: integerStringSchema,
    cancellationWindowHours: integerStringSchema,
    waitlistEnabled: z.boolean(),
    autoPromoteWaitlist: z.boolean(),
    onlineBookingEnabled: z.boolean(),
    cancellationPolicyId: z.string(),
  })
  .superRefine((values, ctx) => {
    const start = new Date(`${values.date}T${values.startTime}`);
    const end = new Date(`${values.date}T${values.endTime}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
    if (end <= start) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End time must be after start time",
      });
    }

    if (values.pricingModel === "DROP_IN" && !values.dropInPrice) {
      ctx.addIssue({
        code: "custom",
        path: ["dropInPrice"],
        message: "Drop-in price is required",
      });
    }

    if (values.pricingModel === "SLIDING_SCALE") {
      if (!values.slidingScaleMinPrice || !values.slidingScaleMaxPrice) {
        ctx.addIssue({
          code: "custom",
          path: ["slidingScaleMinPrice"],
          message: "Set the sliding scale range",
        });
        return;
      }

      if (
        moneyToPence(values.slidingScaleMinPrice) >
        moneyToPence(values.slidingScaleMaxPrice)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["slidingScaleMaxPrice"],
          message: "Maximum must be greater than minimum",
        });
      }
    }

    const maxCapacity = optionalInteger(values.maxCapacity);
    const onlineCapacity = optionalInteger(values.onlineCapacity) ?? 0;
    const walkInCapacity = optionalInteger(values.walkInCapacity) ?? 0;
    if (maxCapacity && onlineCapacity + walkInCapacity > maxCapacity) {
      ctx.addIssue({
        code: "custom",
        path: ["onlineCapacity"],
        message: "Split capacity cannot exceed total capacity",
      });
    }
  });

export type ClassFormValues = z.infer<typeof classFormSchema>;

export function optionalInteger(value: string): number | undefined {
  if (!value.trim()) return undefined;
  return Number(value);
}

export function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function moneyToPence(amount: string): number {
  const [pounds, pennies = ""] = amount.split(".");
  return Number(pounds) * 100 + Number(pennies.padEnd(2, "0"));
}
