import { z } from "zod";

export const EXPERIENCE_OPTIONS = [
  { value: "CLASS", label: "Class" },
  { value: "PRIVATE", label: "Private" },
  { value: "EVENT", label: "Event" },
] as const;

export const FORMAT_OPTIONS = [
  { value: "IN_PERSON", label: "In person" },
  { value: "VIRTUAL", label: "Virtual" },
  { value: "HYBRID", label: "Hybrid" },
] as const;

export const PAYMENT_OPTIONS = [
  { value: "PACKAGE_ONLY", label: "Package/membership only" },
  { value: "PAID", label: "Paid" },
  { value: "SLIDING_SCALE", label: "Sliding scale" },
  { value: "FREE", label: "Free" },
] as const;

export const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Public" },
  { value: "PRIVATE", label: "Private" },
] as const;

export const INTENSITY_OPTIONS = [
  { value: "All Levels", label: "All levels" },
  { value: "Beginner", label: "Beginner" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced" },
] as const;

export const CALENDAR_COLOR_OPTIONS = [
  "#D0EBDE",
  "#DCD7FE",
  "#BDDEFF",
  "#FCD9BD",
  "#FCE8F3",
  "#FFEECC",
] as const;

export const serviceTypeCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    description: z.string().trim().optional(),
    experienceType: z.enum(["CLASS", "PRIVATE", "EVENT"]),
    format: z.enum(["IN_PERSON", "VIRTUAL", "HYBRID"]),
    categoryId: z.string().trim().default("none"),
    classTypeId: z.string().trim().default("none"),
    durationMinutes: z.coerce.number().int().positive().max(1440).default(60),
    capacity: z.string().trim().optional(),
    bufferMinutes: z.coerce.number().int().min(0).max(240).default(0),
    defaultLocation: z.string().trim().optional(),
    roomIds: z.array(z.string()).default([]),
    instructorIds: z.array(z.string()).default([]),
    visibility: z.enum(["PUBLIC", "PRIVATE"]),
    paymentType: z.enum(["FREE", "PAID", "SLIDING_SCALE", "PACKAGE_ONLY"]),
    price: z.string().trim().optional(),
    slidingScaleMinPrice: z.string().trim().optional(),
    slidingScaleMaxPrice: z.string().trim().optional(),
    revenueCategory: z.string().trim().optional(),
    bookingRestrictionTags: z.array(z.string()).default([]),
    workoutTypes: z.array(z.string()).default([]),
    areasOfFocus: z.array(z.string()).default([]),
    intensity: z.string().trim().default("none"),
    equipment: z.array(z.string()).default([]),
    checkoutConfirmation: z.string().trim().optional(),
    confirmationEmailBody: z.string().trim().optional(),
    imageUrl: z.string().trim().optional(),
    allowUnpaidBookings: z.boolean(),
    delaySchedulingHours: z.string().trim().optional(),
    allowRecurringBookings: z.boolean(),
    displayImageAtCheckout: z.boolean(),
    calendarColor: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    if (value.paymentType === "PAID" && !value.price?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["price"],
        message: "Price is required for paid services",
      });
    }

    if (value.paymentType === "SLIDING_SCALE") {
      if (!value.slidingScaleMinPrice?.trim() || !value.slidingScaleMaxPrice?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["slidingScaleMinPrice"],
          message: "Sliding scale services need a minimum and maximum price",
        });
        return;
      }

      const min = Number(value.slidingScaleMinPrice);
      const max = Number(value.slidingScaleMaxPrice);

      if (min > max) {
        ctx.addIssue({
          code: "custom",
          path: ["slidingScaleMaxPrice"],
          message: "Maximum price must be greater than minimum price",
        });
      }
    }
  });

export type ServiceTypeCreateValues = z.infer<typeof serviceTypeCreateSchema>;
export type ServiceTypeCreateInput = z.input<typeof serviceTypeCreateSchema>;
export type ServiceTypeCreateStep = 0 | 1 | 2 | 3 | 4;

export function optionalNumber(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  return Number(value);
}
