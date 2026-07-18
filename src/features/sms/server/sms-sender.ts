import "server-only";

import { and, desc, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { providerAccount, twilioPhoneNumber } from "@/db/schema";
import { findScopedSmsConfig } from "./sms-config";

export type ResolvedSmsSender =
  | {
      kind: "TWILIO_PHONE_NUMBER";
      id: string;
      organizationId: string;
      locationId: string | null;
      providerAccountId: string;
      provider: "TWILIO";
      fromNumber: string;
      isActive: true;
      inherited: boolean;
    }
  | {
      kind: "SMS_CONFIG";
      id: string;
      organizationId: string;
      locationId: string | null;
      providerAccountId: string;
      provider: "TWILIO" | "VONAGE" | "MESSAGEBIRD";
      fromNumber: string;
      isActive: boolean;
      inherited: boolean;
      monthlyLimit: number;
      sentThisMonth: number;
    };

export async function resolveSmsSender(input: {
  organizationId: string;
  locationId: string | null;
  includeInactiveLegacy?: boolean;
  preferredProviderAccountId?: string;
  preferredFromNumber?: string;
}): Promise<ResolvedSmsSender | null> {
  const [managed] = await db
    .select({
      id: twilioPhoneNumber.id,
      organizationId: twilioPhoneNumber.organizationId,
      locationId: twilioPhoneNumber.locationId,
      providerAccountId: twilioPhoneNumber.providerAccountId,
      fromNumber: twilioPhoneNumber.phoneNumber,
    })
    .from(twilioPhoneNumber)
    .innerJoin(
      providerAccount,
      and(
        eq(providerAccount.id, twilioPhoneNumber.providerAccountId),
        eq(providerAccount.organizationId, twilioPhoneNumber.organizationId),
      ),
    )
    .where(
      and(
        eq(twilioPhoneNumber.organizationId, input.organizationId),
        input.preferredProviderAccountId
          ? eq(
              twilioPhoneNumber.providerAccountId,
              input.preferredProviderAccountId,
            )
          : undefined,
        input.preferredFromNumber
          ? eq(twilioPhoneNumber.phoneNumber, input.preferredFromNumber)
          : undefined,
        input.locationId
          ? or(
              eq(twilioPhoneNumber.locationId, input.locationId),
              isNull(twilioPhoneNumber.locationId),
            )
          : isNull(twilioPhoneNumber.locationId),
        eq(twilioPhoneNumber.status, "ACTIVE"),
        eq(twilioPhoneNumber.smsEnabled, true),
        eq(providerAccount.provider, "TWILIO"),
        eq(providerAccount.ownershipMode, "PLATFORM_MANAGED"),
        eq(providerAccount.status, "ACTIVE"),
      ),
    )
    .orderBy(
      desc(twilioPhoneNumber.isDefault),
      input.locationId
        ? sql`CASE WHEN ${twilioPhoneNumber.locationId} = ${input.locationId} THEN 0 ELSE 1 END`
        : sql`0`,
      desc(twilioPhoneNumber.createdAt),
    )
    .limit(1);
  if (managed) {
    return {
      kind: "TWILIO_PHONE_NUMBER",
      ...managed,
      provider: "TWILIO",
      isActive: true,
      inherited: Boolean(input.locationId && !managed.locationId),
    };
  }
  const legacy = await findScopedSmsConfig({
    organizationId: input.organizationId,
    locationId: input.locationId,
    includeInactive: input.includeInactiveLegacy,
  });
  return legacy ? { kind: "SMS_CONFIG", ...legacy } : null;
}
