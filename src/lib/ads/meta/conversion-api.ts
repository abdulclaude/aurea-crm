import crypto from "node:crypto";
import { z } from "zod";

const META_GRAPH_API_VERSION = "v25.0";
const PROVIDER_TIMEOUT_MS = 10_000;

export type MetaConversionEvent = {
  eventName: string;
  eventTime: number;
  eventId: string;
  eventSourceUrl?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  userAgent?: string;
  ipAddress?: string;
  fbp?: string;
  fbc?: string;
  fbclid?: string;
  value?: number;
  currency?: string;
  contentType?: string;
  contentIds?: string[];
  contentName?: string;
  numItems?: number;
  orderId?: string;
  customData?: Record<string, unknown>;
};

export type MetaConversionAPIConfig = {
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
};

export type MetaConversionResult = {
  success: boolean;
  providerEventId: string;
  errorCode?: string;
  errorMessage?: string;
};

const metaResponseSchema = z.object({
  events_received: z.number().int().nonnegative().optional(),
  error: z
    .object({
      code: z.number().int().optional(),
    })
    .optional(),
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

export async function sendMetaConversion(
  config: MetaConversionAPIConfig,
  event: MetaConversionEvent,
): Promise<MetaConversionResult> {
  const userData: Record<string, string | string[] | undefined> = {
    client_ip_address: event.ipAddress,
    client_user_agent: event.userAgent,
  };
  const hashedEmail = hashValue(event.email);
  const hashedPhone = event.phone ? hashValue(formatPhone(event.phone)) : undefined;
  const hashedFirstName = hashValue(event.firstName);
  const hashedLastName = hashValue(event.lastName);
  const hashedCity = hashValue(event.city);
  const hashedState = hashValue(event.state);
  const hashedZipCode = hashValue(event.zipCode);
  if (hashedEmail) userData.em = [hashedEmail];
  if (hashedPhone) userData.ph = [hashedPhone];
  if (hashedFirstName) userData.fn = [hashedFirstName];
  if (hashedLastName) userData.ln = [hashedLastName];
  if (hashedCity) userData.ct = [hashedCity];
  if (hashedState) userData.st = [hashedState];
  if (hashedZipCode) userData.zp = [hashedZipCode];
  if (event.country) userData.country = [event.country.toLowerCase()];
  if (event.fbp) userData.fbp = event.fbp;
  if (event.fbc) {
    userData.fbc = event.fbc;
  } else if (event.fbclid) {
    userData.fbc = `fb.1.${event.eventTime}.${event.fbclid}`;
  }

  const customData: Record<string, unknown> = { ...event.customData };
  if (event.value !== undefined) customData.value = event.value;
  if (event.currency) customData.currency = event.currency;
  if (event.contentType) customData.content_type = event.contentType;
  if (event.contentIds) customData.content_ids = event.contentIds;
  if (event.contentName) customData.content_name = event.contentName;
  if (event.numItems !== undefined) customData.num_items = event.numItems;
  if (event.orderId) customData.order_id = event.orderId;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(config.pixelId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: [
            {
              event_name: event.eventName,
              event_time: event.eventTime,
              event_id: event.eventId,
              event_source_url: event.eventSourceUrl,
              action_source: "website",
              user_data: userData,
              custom_data:
                Object.keys(customData).length > 0 ? customData : undefined,
            },
          ],
          test_event_code: config.testEventCode,
        }),
        signal: controller.signal,
      },
    );
    const parsed = metaResponseSchema.safeParse(await response.json());
    if (
      !response.ok ||
      !parsed.success ||
      !parsed.data.events_received
    ) {
      const providerCode = parsed.success ? parsed.data.error?.code : undefined;
      return {
        success: false,
        providerEventId: event.eventId,
        errorCode: providerCode
          ? `META_${providerCode}`
          : response.ok
            ? "META_RESPONSE_INVALID"
            : `META_HTTP_${response.status}`,
        errorMessage: "Meta did not accept the conversion event.",
      };
    }
    return { success: true, providerEventId: event.eventId };
  } catch (error) {
    return {
      success: false,
      providerEventId: event.eventId,
      errorCode: error instanceof Error && error.name === "AbortError"
        ? "META_TIMEOUT"
        : "META_REQUEST_FAILED",
      errorMessage: "Meta conversion delivery failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendMetaPurchase(
  config: MetaConversionAPIConfig,
  data: {
    eventId: string;
    email?: string;
    phone?: string;
    value: number;
    currency: string;
    orderId: string;
    contentIds?: string[];
    fbclid?: string;
    fbp?: string;
    fbc?: string;
    ipAddress?: string;
    userAgent?: string;
    eventTime?: number;
    eventSourceUrl?: string;
  },
): Promise<MetaConversionResult> {
  return sendMetaConversion(config, {
    eventName: "Purchase",
    eventTime: data.eventTime ?? Math.floor(Date.now() / 1000),
    eventId: data.eventId,
    eventSourceUrl: data.eventSourceUrl,
    email: data.email,
    phone: data.phone,
    value: data.value,
    currency: data.currency,
    orderId: data.orderId,
    contentIds: data.contentIds,
    fbclid: data.fbclid,
    fbp: data.fbp,
    fbc: data.fbc,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });
}

export async function sendMetaLead(
  config: MetaConversionAPIConfig,
  data: {
    eventId: string;
    email?: string;
    phone?: string;
    value?: number;
    currency?: string;
    fbclid?: string;
    fbp?: string;
    fbc?: string;
    ipAddress?: string;
    userAgent?: string;
    eventTime?: number;
    eventSourceUrl?: string;
  },
): Promise<MetaConversionResult> {
  return sendMetaConversion(config, {
    eventName: "Lead",
    eventTime: data.eventTime ?? Math.floor(Date.now() / 1000),
    eventId: data.eventId,
    eventSourceUrl: data.eventSourceUrl,
    email: data.email,
    phone: data.phone,
    value: data.value,
    currency: data.currency,
    fbclid: data.fbclid,
    fbp: data.fbp,
    fbc: data.fbc,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });
}
