import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";

import { db } from "@/db";
import { communicationPhoneNumberQuote } from "@/db/schema";
import type { z } from "zod";
import {
  twilioNumberSearchSchema,
} from "@/features/communications/contracts";
import { getOrCreateCommunicationProfile } from "./profile-service";
import { resolveTwilioPlatformAccount } from "./twilio-client";

type SearchInput = z.infer<typeof twilioNumberSearchSchema>;

function normalizeNumberType(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z]/g, "");
}

export async function searchTwilioPhoneNumbers(input: {
  organizationId: string;
  locationId: string | null;
  userId: string;
  search: SearchInput;
}) {
  const profile = await getOrCreateCommunicationProfile(input.organizationId);
  const smsCountryAllowed =
    !input.search.capabilities.sms ||
    profile.allowedSmsCountries.includes(input.search.country);
  const voiceCountryAllowed =
    !input.search.capabilities.voice ||
    profile.allowedVoiceCountries.includes(input.search.country);
  if (!smsCountryAllowed || !voiceCountryAllowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "This country is not enabled for every requested communications capability.",
    });
  }
  const resolved = await resolveTwilioPlatformAccount({
    organizationId: input.organizationId,
  });
  if (!resolved.client) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The managed Twilio account is still provisioning.",
    });
  }
  const country = resolved.client.availablePhoneNumbers(input.search.country);
  const listOptions = {
    limit: input.search.limit,
    areaCode: input.search.areaCode
      ? Number.parseInt(input.search.areaCode, 10)
      : undefined,
    contains: input.search.contains,
    smsEnabled: input.search.capabilities.sms || undefined,
    voiceEnabled: input.search.capabilities.voice || undefined,
  };
  const [numbers, pricing] = await Promise.all([
    input.search.numberType === "mobile"
      ? country.mobile.list(listOptions)
      : input.search.numberType === "tollFree"
        ? country.tollFree.list(listOptions)
        : country.local.list(listOptions),
    resolved.client.pricing.v1.phoneNumbers
      .countries(input.search.country)
      .fetch(),
  ]);
  const requestedType = normalizeNumberType(input.search.numberType);
  const matchingPrice = pricing.phoneNumberPrices.find((price) =>
    normalizeNumberType(price.numberType ?? "").includes(requestedType),
  );
  if (matchingPrice?.currentPrice === undefined) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Twilio did not return verified pricing for this number type.",
    });
  }
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60_000);
  const monthlyProviderCost = String(matchingPrice.currentPrice);
  const currency = pricing.priceUnit.toUpperCase();
  const quotes = numbers
    .filter(
      (number) =>
        (!input.search.capabilities.sms || number.capabilities.sms) &&
        (!input.search.capabilities.voice || number.capabilities.voice),
    )
    .map((number) => ({
    id: createId(),
    organizationId: input.organizationId,
    locationId: input.locationId,
    providerAccountId: resolved.account.id,
    phoneNumber: number.phoneNumber,
    country: input.search.country,
    numberType: input.search.numberType,
    smsEnabled: input.search.capabilities.sms,
    voiceEnabled: input.search.capabilities.voice,
    regulatoryRequirement: number.addressRequirements ?? "none",
    monthlyProviderCost,
    currency,
    expiresAt,
    createdByUserId: input.userId,
    }));
  if (quotes.length > 0) {
    await db.insert(communicationPhoneNumberQuote).values(quotes);
  }
  return quotes.map((quote) => ({
    quoteId: quote.id,
    phoneNumber: quote.phoneNumber,
    capabilities: {
      sms: quote.smsEnabled,
      voice: quote.voiceEnabled,
    },
    monthlyProviderCost: quote.monthlyProviderCost,
    currency: quote.currency,
    expiresAt: quote.expiresAt,
    regulatoryRequirement: quote.regulatoryRequirement,
  }));
}
