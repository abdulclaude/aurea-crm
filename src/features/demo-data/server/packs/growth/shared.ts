import { createHash } from "node:crypto";

import { savedAudienceDefinitionV2Schema } from "@/features/audiences/lib/audience-definition";
import { campaignEmailContentSchema } from "@/features/campaigns/lib/email-content-schema";
import { demoMetadata, deterministicDemoId } from "@/features/demo-data/server/types";

import type { GrowthBuildScope, GrowthPackClient } from "./types";
import type { DemoSeedContext } from "@/features/demo-data/server/types";

export const DAY_MS = 86_400_000;
export const TERMINAL_DELIVERY_STATUSES = [
  "DELIVERED",
  "BOUNCED",
  "SUPPRESSED",
  "CANCELLED",
  "DEAD_LETTER",
  "UNKNOWN",
] as const;

export function before(referenceDate: Date, days: number, hours = 0): Date {
  return new Date(referenceDate.getTime() - days * DAY_MS - hours * 3_600_000);
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function chunk<T>(rows: readonly T[], size = 500): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

export function safeEmail(client: GrowthPackClient, index: number): string {
  const normalized = client.email.trim().toLowerCase();
  return normalized || `member-${index + 1}@demo.invalid`;
}

export function safePhone(client: GrowthPackClient, index: number): string {
  const normalized = client.phone.trim();
  return normalized || `+4477009${String(index).padStart(5, "0")}`;
}

export function createGrowthBuildScope(
  context: DemoSeedContext,
  clients: GrowthPackClient[],
): GrowthBuildScope {
  if (clients.length === 0) {
    throw new Error("The growth demo pack requires at least one seeded client.");
  }
  return {
    context,
    clients,
    id: (kind, index) => deterministicDemoId(context.runId, `growth-${kind}`, index),
    metadata: (extra = {}) => demoMetadata(context, { simulated: true, ...extra }),
  };
}

export function audienceDefinition(
  variant: "MEMBERS" | "WIN_BACK" | "LEADS",
): ReturnType<typeof savedAudienceDefinitionV2Schema.parse> {
  const base = {
    version: 2 as const,
    operator: "AND" as const,
    search: "",
    types: [],
    lifecycleStages: [],
    acquisitionStages: [],
    countries: [],
    sources: [],
    assigneeIds: [],
    instructorIds: [],
    tags: { mode: "ANY" as const, values: [] },
    createdAt: null,
    lastInteractionAt: null,
    membership: { statuses: [], planIds: [] },
    commerce: { paymentState: "ANY" as const, minimumLifetimeSpend: null },
    attendance: {
      minimumVisits: null,
      maximumVisits: null,
      noVisitInDays: null,
      hasUpcomingBooking: null,
    },
    emailEligibility: "ELIGIBLE" as const,
  };
  if (variant === "MEMBERS") {
    return savedAudienceDefinitionV2Schema.parse({
      ...base,
      types: ["CUSTOMER"],
      membership: { statuses: ["ACTIVE"], planIds: [] },
    });
  }
  if (variant === "WIN_BACK") {
    return savedAudienceDefinitionV2Schema.parse({
      ...base,
      types: ["CUSTOMER", "CHURN"],
      attendance: { ...base.attendance, noVisitInDays: 30 },
    });
  }
  return savedAudienceDefinitionV2Schema.parse({
    ...base,
    types: ["LEAD", "PROSPECT"],
    lifecycleStages: ["LEAD", "MQL"],
  });
}

export function emailContent(
  subject: string,
  preheader: string,
  body: string,
): ReturnType<typeof campaignEmailContentSchema.parse> {
  return campaignEmailContentSchema.parse({
    subject,
    preheader,
    sections: [
      { type: "header", id: "header", title: subject, subtitle: preheader },
      { type: "text", id: "body", content: body, align: "left" },
      {
        type: "button",
        id: "cta",
        text: "View studio schedule",
        url: "https://demo.invalid/schedule",
        variant: "primary",
        align: "left",
      },
    ],
  });
}
