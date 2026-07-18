import { z } from "zod";

import {
  regionalCurrencySchema,
  regionalLocaleSchema,
  regionalTimezoneSchema,
} from "@/lib/regional-context/contracts";

export const workspaceWeekStarts = ["SUNDAY", "MONDAY", "SATURDAY"] as const;
export const workspaceDateFormats = [
  "LOCALE",
  "MONTH_DAY_YEAR",
  "DAY_MONTH_YEAR",
  "YEAR_MONTH_DAY",
] as const;
export const workspaceTimeFormats = [
  "TWELVE_HOUR",
  "TWENTY_FOUR_HOUR",
] as const;

export const workspaceTimezoneSchema = regionalTimezoneSchema;
export const workspaceLocaleSchema = regionalLocaleSchema;
export const workspaceCurrencySchema = regionalCurrencySchema;

export const workspaceRegionalValuesSchema = z.object({
  timezone: workspaceTimezoneSchema.nullable(),
  locale: workspaceLocaleSchema.nullable(),
  currency: workspaceCurrencySchema.nullable(),
  weekStart: z.enum(workspaceWeekStarts).nullable(),
  dateFormat: z.enum(workspaceDateFormats).nullable(),
  timeFormat: z.enum(workspaceTimeFormats).nullable(),
});

export const requiredWorkspaceRegionalValuesSchema = z.object({
  timezone: workspaceTimezoneSchema,
  locale: workspaceLocaleSchema,
  currency: workspaceCurrencySchema,
  weekStart: z.enum(workspaceWeekStarts),
  dateFormat: z.enum(workspaceDateFormats),
  timeFormat: z.enum(workspaceTimeFormats),
});

export const saveWorkspaceRegionalSettingsSchema = z.object({
  values: workspaceRegionalValuesSchema,
  expectedVersion: z.number().int().positive().nullable(),
  changeNote: z.string().trim().max(240).nullable().default(null),
});

export const rollbackWorkspaceRegionalSettingsSchema = z.object({
  targetVersion: z.number().int().positive(),
  expectedVersion: z.number().int().positive().nullable(),
  changeNote: z.string().trim().max(240).nullable().default(null),
});

export type WorkspaceRegionalValues = z.infer<
  typeof workspaceRegionalValuesSchema
>;
export type RequiredWorkspaceRegionalValues = z.infer<
  typeof requiredWorkspaceRegionalValuesSchema
>;
