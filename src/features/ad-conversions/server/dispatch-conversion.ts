import "server-only";

import { sendGoogleLead, sendGooglePurchase } from "@/lib/ads/google/enhanced-conversions";
import { sendMetaLead, sendMetaPurchase } from "@/lib/ads/meta/conversion-api";
import { sendTikTokLead, sendTikTokPurchase } from "@/lib/ads/tiktok/events-api";
import {
  resolveAdConversionAccounts,
  revalidateAdConversionAccount,
  type ResolvedAdConversionAccount,
} from "./provider-account-resolver";
import {
  claimAdConversionDelivery,
  recordAdConversionDeliveryResult,
  type ProviderDeliveryResult,
} from "./delivery-ledger";

export type AdConversionEventInput = {
  eventId: string;
  kind: "PURCHASE" | "LEAD";
  occurredAt: Date;
  email?: string;
  phone?: string;
  value?: number;
  currency: string;
  orderId: string;
  pageUrl?: string;
  ipAddress?: string;
  userAgent?: string;
  fbclid?: string;
  fbp?: string;
  fbc?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  ttclid?: string;
  ttp?: string;
};

export type AdConversionScope = {
  organizationId: string;
  locationId: string | null;
};

export async function dispatchAdConversionEvent(input: {
  scope: AdConversionScope;
  event: AdConversionEventInput;
}): Promise<{ attempted: number; succeeded: number }> {
  const accounts = await resolveAdConversionAccounts(input.scope);
  let attempted = 0;
  let succeeded = 0;
  const failures: string[] = [];

  for (const account of accounts) {
    if (!hasProviderAttribution(account, input.event)) continue;
    const deliveryId = await claimAdConversionDelivery({
      scope: input.scope,
      eventId: input.event.eventId,
      account,
    });
    if (!deliveryId) continue;
    attempted += 1;

    let result: ProviderDeliveryResult;
    let requestAccount = account;
    try {
      requestAccount = await revalidateAdConversionAccount({
        providerAccountId: account.id,
        provider: account.provider,
        scope: input.scope,
      });
      result = await sendWithAccount(requestAccount, input.event);
    } catch {
      result = invalidAccountResult(
        input.event.eventId,
        `${account.provider}_REQUEST_FAILED`,
      );
    }
    await recordAdConversionDeliveryResult({
      deliveryId,
      scope: input.scope,
      account: requestAccount,
      result,
    });
    if (result.success) {
      succeeded += 1;
    } else {
      failures.push(result.errorCode ?? `${account.provider}_DELIVERY_FAILED`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Ad conversion delivery failed: ${failures.join(",")}`);
  }
  return { attempted, succeeded };
}

function hasProviderAttribution(
  account: ResolvedAdConversionAccount,
  event: AdConversionEventInput,
): boolean {
  switch (account.provider) {
    case "META_CONVERSIONS":
      return Boolean(event.fbclid || event.fbc || event.fbp);
    case "GOOGLE_ADS":
      return Boolean(event.gclid || event.gbraid || event.wbraid);
    case "TIKTOK_EVENTS":
      return Boolean(event.ttclid || event.ttp);
  }
}

async function sendWithAccount(
  account: ResolvedAdConversionAccount,
  event: AdConversionEventInput,
): Promise<ProviderDeliveryResult> {
  const eventTimeSeconds = Math.floor(event.occurredAt.getTime() / 1000);
  const eventTimestamp = event.occurredAt.toISOString();
  const conversionDateTime = eventTimestamp
    .replace("T", " ")
    .replace(/\.\d{3}Z$/, "+00:00");

  switch (account.provider) {
    case "META_CONVERSIONS": {
      if (
        account.config.provider !== "META_CONVERSIONS" ||
        account.secret.provider !== "META_CONVERSIONS"
      ) {
        return invalidAccountResult(event.eventId, "META_CONFIG_INVALID");
      }
      const config = {
        pixelId: account.config.pixelId,
        accessToken: account.secret.accessToken,
        testEventCode: account.config.testEventCode ?? undefined,
      };
      return event.kind === "PURCHASE"
        ? sendMetaPurchase(config, {
            eventId: event.eventId,
            email: event.email,
            phone: event.phone,
            value: event.value ?? 0,
            currency: event.currency,
            orderId: event.orderId,
            fbclid: event.fbclid,
            fbp: event.fbp,
            fbc: event.fbc,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            eventTime: eventTimeSeconds,
            eventSourceUrl: event.pageUrl,
          })
        : sendMetaLead(config, {
            eventId: event.eventId,
            email: event.email,
            phone: event.phone,
            value: event.value,
            currency: event.currency,
            fbclid: event.fbclid,
            fbp: event.fbp,
            fbc: event.fbc,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            eventTime: eventTimeSeconds,
            eventSourceUrl: event.pageUrl,
          });
    }
    case "GOOGLE_ADS": {
      if (
        account.config.provider !== "GOOGLE_ADS" ||
        account.secret.provider !== "GOOGLE_ADS"
      ) {
        return invalidAccountResult(event.eventId, "GOOGLE_CONFIG_INVALID");
      }
      const config = {
        customerId: account.config.customerId,
        conversionActionId: account.config.conversionActionId,
        loginCustomerId: account.config.loginCustomerId ?? undefined,
        developerToken: account.secret.developerToken,
        accessToken: account.secret.accessToken,
      };
      return event.kind === "PURCHASE"
        ? sendGooglePurchase(config, {
            gclid: event.gclid,
            gbraid: event.gbraid,
            wbraid: event.wbraid,
            email: event.email,
            phone: event.phone,
            value: event.value ?? 0,
            currency: event.currency,
            orderId: event.orderId,
            conversionDateTime,
          })
        : sendGoogleLead(config, {
            eventId: event.eventId,
            gclid: event.gclid,
            gbraid: event.gbraid,
            wbraid: event.wbraid,
            email: event.email,
            phone: event.phone,
            value: event.value,
            currency: event.currency,
            conversionDateTime,
          });
    }
    case "TIKTOK_EVENTS": {
      if (
        account.config.provider !== "TIKTOK_EVENTS" ||
        account.secret.provider !== "TIKTOK_EVENTS"
      ) {
        return invalidAccountResult(event.eventId, "TIKTOK_CONFIG_INVALID");
      }
      const config = {
        pixelCode: account.config.pixelCode,
        accessToken: account.secret.accessToken,
        testEventCode: account.config.testEventCode ?? undefined,
      };
      return event.kind === "PURCHASE"
        ? sendTikTokPurchase(config, {
            eventId: event.eventId,
            email: event.email,
            phone: event.phone,
            value: event.value ?? 0,
            currency: event.currency,
            ttclid: event.ttclid,
            ttp: event.ttp,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            pageUrl: event.pageUrl,
            timestamp: eventTimestamp,
          })
        : sendTikTokLead(config, {
            eventId: event.eventId,
            email: event.email,
            phone: event.phone,
            value: event.value,
            currency: event.currency,
            ttclid: event.ttclid,
            ttp: event.ttp,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            pageUrl: event.pageUrl,
            timestamp: eventTimestamp,
          });
    }
  }
}

function invalidAccountResult(
  providerEventId: string,
  errorCode: string,
): ProviderDeliveryResult {
  return { success: false, providerEventId, errorCode };
}
