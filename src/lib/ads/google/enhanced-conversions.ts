import crypto from "node:crypto";
import { z } from "zod";

const GOOGLE_ADS_API_VERSION = "v24";
const PROVIDER_TIMEOUT_MS = 10_000;

export type GoogleConversionEvent = {
  conversionDateTime: string;
  conversionValue?: number;
  currencyCode?: string;
  orderId: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  address?: {
    streetAddress?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    countryCode?: string;
  };
  customVariables?: Array<{
    conversionCustomVariable: string;
    value: string;
  }>;
  cartData?: {
    merchantId?: string;
    feedCountryCode?: string;
    feedLanguageCode?: string;
    localTransactionCost?: number;
    items?: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
  };
};

export type GoogleAdsConfig = {
  customerId: string;
  conversionActionId: string;
  developerToken: string;
  accessToken: string;
  loginCustomerId?: string;
};

export type GoogleConversionResult = {
  success: boolean;
  providerEventId: string;
  errorCode?: string;
  errorMessage?: string;
};

type GoogleAddressInfo = {
  hashedFirstName?: string;
  hashedLastName?: string;
  countryCode?: string;
  postalCode?: string;
  hashedStreetAddress?: string;
};

type GoogleUserIdentifier =
  | { hashedEmail: string }
  | { hashedPhoneNumber: string }
  | { addressInfo: GoogleAddressInfo };

type GoogleClickConversion = {
  conversionAction: string;
  conversionDateTime: string;
  orderId: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  conversionValue?: number;
  currencyCode?: string;
  userIdentifiers?: GoogleUserIdentifier[];
  customVariables?: GoogleConversionEvent["customVariables"];
  cartData?: GoogleConversionEvent["cartData"];
};

const googleResponseSchema = z.object({
  partialFailureError: z
    .object({
      code: z.number().int().optional(),
    })
    .optional(),
  results: z.array(z.unknown()).optional(),
});

function hashValue(value: string | undefined): string | undefined {
  const normalized = value?.toLowerCase().trim();
  return normalized
    ? crypto.createHash("sha256").update(normalized).digest("hex")
    : undefined;
}

function formatPhone(phone: string): string {
  return `+${phone.replace(/\D/g, "")}`;
}

function deterministicJobId(providerEventId: string): number {
  return crypto
    .createHash("sha256")
    .update(providerEventId)
    .digest()
    .readUInt32BE(0) & 0x7fffffff;
}

export async function sendGoogleConversion(
  config: GoogleAdsConfig,
  event: GoogleConversionEvent,
): Promise<GoogleConversionResult> {
  const providerEventId = event.orderId;
  const clickId = event.gclid ?? event.gbraid ?? event.wbraid;
  if (!clickId) {
    return {
      success: false,
      providerEventId,
      errorCode: "GOOGLE_CLICK_ID_MISSING",
      errorMessage: "A Google click identifier is required.",
    };
  }

  const userIdentifiers: GoogleUserIdentifier[] = [];
  const hashedEmail = hashValue(event.email);
  const hashedPhone = event.phone ? hashValue(formatPhone(event.phone)) : undefined;
  if (hashedEmail) userIdentifiers.push({ hashedEmail });
  if (hashedPhone) userIdentifiers.push({ hashedPhoneNumber: hashedPhone });

  const addressInfo: GoogleAddressInfo = {};
  const hashedFirstName = hashValue(event.firstName);
  const hashedLastName = hashValue(event.lastName);
  const hashedStreetAddress = hashValue(event.address?.streetAddress);
  if (hashedFirstName) addressInfo.hashedFirstName = hashedFirstName;
  if (hashedLastName) addressInfo.hashedLastName = hashedLastName;
  if (event.address?.countryCode) {
    addressInfo.countryCode = event.address.countryCode.toUpperCase();
  }
  if (event.address?.postalCode) addressInfo.postalCode = event.address.postalCode;
  if (hashedStreetAddress) addressInfo.hashedStreetAddress = hashedStreetAddress;
  if (Object.keys(addressInfo).length > 0) {
    userIdentifiers.push({ addressInfo });
  }

  const clickConversion: GoogleClickConversion = {
    conversionAction: `customers/${config.customerId}/conversionActions/${config.conversionActionId}`,
    conversionDateTime: event.conversionDateTime,
    orderId: event.orderId,
  };
  if (event.gclid) clickConversion.gclid = event.gclid;
  else if (event.gbraid) clickConversion.gbraid = event.gbraid;
  else if (event.wbraid) clickConversion.wbraid = event.wbraid;
  if (event.conversionValue !== undefined) {
    clickConversion.conversionValue = event.conversionValue;
  }
  if (event.currencyCode) clickConversion.currencyCode = event.currencyCode;
  if (userIdentifiers.length > 0) clickConversion.userIdentifiers = userIdentifiers;
  if (event.customVariables?.length) {
    clickConversion.customVariables = event.customVariables;
  }
  if (event.cartData) clickConversion.cartData = event.cartData;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.accessToken}`,
    "Content-Type": "application/json",
    "developer-token": config.developerToken,
  };
  if (config.loginCustomerId) {
    headers["login-customer-id"] = config.loginCustomerId;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${config.customerId}:uploadClickConversions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          conversions: [clickConversion],
          partialFailure: true,
          jobId: deterministicJobId(providerEventId),
        }),
        signal: controller.signal,
      },
    );
    const parsed = googleResponseSchema.safeParse(await response.json());
    if (
      !response.ok ||
      !parsed.success ||
      parsed.data.partialFailureError ||
      !parsed.data.results?.length
    ) {
      const providerCode = parsed.success
        ? parsed.data.partialFailureError?.code
        : undefined;
      return {
        success: false,
        providerEventId,
        errorCode: providerCode
          ? `GOOGLE_${providerCode}`
          : response.ok
            ? "GOOGLE_RESPONSE_INVALID"
            : `GOOGLE_HTTP_${response.status}`,
        errorMessage: "Google Ads did not accept the conversion event.",
      };
    }
    return { success: true, providerEventId };
  } catch (error) {
    return {
      success: false,
      providerEventId,
      errorCode: error instanceof Error && error.name === "AbortError"
        ? "GOOGLE_TIMEOUT"
        : "GOOGLE_REQUEST_FAILED",
      errorMessage: "Google Ads conversion delivery failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function conversionDateTime(value?: string): string {
  return (
    value ?? new Date().toISOString()
  ).replace("T", " ").replace(/\.\d{3}Z$/, "+00:00");
}

export async function sendGooglePurchase(
  config: GoogleAdsConfig,
  data: {
    gclid?: string;
    gbraid?: string;
    wbraid?: string;
    email?: string;
    phone?: string;
    value: number;
    currency: string;
    orderId: string;
    conversionDateTime?: string;
    items?: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
  },
): Promise<GoogleConversionResult> {
  return sendGoogleConversion(config, {
    conversionDateTime: conversionDateTime(data.conversionDateTime),
    conversionValue: data.value,
    currencyCode: data.currency,
    orderId: data.orderId,
    gclid: data.gclid,
    gbraid: data.gbraid,
    wbraid: data.wbraid,
    email: data.email,
    phone: data.phone,
    cartData: data.items ? { items: data.items } : undefined,
  });
}

export async function sendGoogleLead(
  config: GoogleAdsConfig,
  data: {
    eventId: string;
    gclid?: string;
    gbraid?: string;
    wbraid?: string;
    email?: string;
    phone?: string;
    value?: number;
    currency?: string;
    conversionDateTime?: string;
  },
): Promise<GoogleConversionResult> {
  return sendGoogleConversion(config, {
    conversionDateTime: conversionDateTime(data.conversionDateTime),
    conversionValue: data.value,
    currencyCode: data.currency,
    orderId: data.eventId,
    gclid: data.gclid,
    gbraid: data.gbraid,
    wbraid: data.wbraid,
    email: data.email,
    phone: data.phone,
  });
}
