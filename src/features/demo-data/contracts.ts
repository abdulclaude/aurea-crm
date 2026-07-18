import { z } from "zod";

export const DEMO_DATA_SCHEMA_VERSION = 1;

export const demoDataProfileSchema = z.enum([
  "SHOWCASE",
  "QA_EXHAUSTIVE",
]);

export type DemoDataProfile = z.infer<typeof demoDataProfileSchema>;

export const demoDataPreviewInputSchema = z.object({
  profile: demoDataProfileSchema,
});

export const populateDemoDataInputSchema = z.object({
  profile: demoDataProfileSchema,
  confirmation: z.string().min(1).max(200),
  idempotencyKey: z.string().min(8).max(128),
  allowExistingData: z.boolean().default(false),
});

export const recoverDemoDataInputSchema = z.object({
  runId: z.string().uuid(),
  confirmation: z.string().min(1).max(200),
});

export type DemoDataProfileConfig = {
  clientCount: number;
  historicalClassDays: number;
  futureClassDays: number;
  paymentsCount: number;
  historyMonths: number;
  label: string;
  description: string;
};

export const DEMO_DATA_PROFILE_CONFIG = {
  SHOWCASE: {
    clientCount: 150,
    historicalClassDays: 790,
    futureClassDays: 35,
    paymentsCount: 320,
    historyMonths: 26,
    label: "Showcase",
    description: "A coherent, presentation-ready studio with every major product area populated.",
  },
  QA_EXHAUSTIVE: {
    clientCount: 600,
    historicalClassDays: 790,
    futureClassDays: 70,
    paymentsCount: 900,
    historyMonths: 26,
    label: "QA exhaustive",
    description: "Larger fixtures for pagination, long-range analytics, edge states, and report limits.",
  },
} as const satisfies Record<DemoDataProfile, DemoDataProfileConfig>;

export function demoConfirmationText(locationName: string): string {
  return `POPULATE ${locationName}`;
}

export function demoRecoveryConfirmationText(locationName: string): string {
  return `RECOVER ${locationName}`;
}

export function existingDemoProductDataTotal(
  counts: Readonly<Record<string, number>>,
): number {
  return Object.entries(counts).reduce(
    (total, [name, value]) =>
      name === "siblingLocations" ? total : total + value,
    0,
  );
}

export function isDemoDataEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.DEMO_DATA_ENABLED === "true";
}
