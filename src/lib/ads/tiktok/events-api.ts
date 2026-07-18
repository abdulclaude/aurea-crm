import crypto from "node:crypto";
import { z } from "zod";

const PROVIDER_TIMEOUT_MS = 10_000;

export type TikTokEvent = {
  event: string;
  eventId: string;
  timestamp?: string;
  pageUrl?: string;
  referrerUrl?: string;
  email?: string;
  phone?: string;
  externalId?: string;
  ttclid?: string;
  userAgent?: string;
  ipAddress?: string;
  ttp?: string;
  value?: number;
  currency?: string;
  contentType?: string;
  contentId?: string;
  contentName?: string;
  contentCategory?: string;
  contents?: Array<{
    content_id: string;
    content_name?: string;
    content_category?: string;
    quantity?: number;
    price?: number;
  }>;
  quantity?: number;
  description?: string;
  query?: string;
  properties?: Record<string, unknown>;
};

export type TikTokEventsAPIConfig = {
  pixelCode: string;
  accessToken: string;
  testEventCode?: string;
};

export type TikTokConversionResult = {
  success: boolean;
  providerEventId: string;
  errorCode?: string;
  errorMessage?: string;
};

type TikTokContext = {
  ad: { callback?: string };
  page: { url?: string; referrer?: string };
  user: {
    email?: string;
    phone_number?: string;
    external_id?: string;
    ttp?: string;
    ip?: string;
    user_agent?: string;
  };
};

const tiktokResponseSchema = z.object({
  code: z.number().int(),
  message: z.string().optional(),
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

export async function sendTikTokEvent(
  config: TikTokEventsAPIConfig,
  event: TikTokEvent,
): Promise<TikTokConversionResult> {
  const context: TikTokContext = { ad: {}, page: {}, user: {} };
  if (event.ttclid) context.ad.callback = event.ttclid;
  if (event.pageUrl) context.page.url = event.pageUrl;
  if (event.referrerUrl) context.page.referrer = event.referrerUrl;

  const hashedEmail = hashValue(event.email);
  const hashedPhone = event.phone ? hashValue(formatPhone(event.phone)) : undefined;
  if (hashedEmail) context.user.email = hashedEmail;
  if (hashedPhone) context.user.phone_number = hashedPhone;
  if (event.externalId) context.user.external_id = event.externalId;
  if (event.ttp) context.user.ttp = event.ttp;
  if (event.ipAddress) context.user.ip = event.ipAddress;
  if (event.userAgent) context.user.user_agent = event.userAgent;

  const properties: Record<string, unknown> = { ...event.properties };
  if (event.value !== undefined) properties.value = event.value;
  if (event.currency) properties.currency = event.currency;
  if (event.contentType) properties.content_type = event.contentType;
  if (event.contentId) properties.content_id = event.contentId;
  if (event.contentName) properties.content_name = event.contentName;
  if (event.contentCategory) properties.content_category = event.contentCategory;
  if (event.contents) properties.contents = event.contents;
  if (event.quantity !== undefined) properties.quantity = event.quantity;
  if (event.description) properties.description = event.description;
  if (event.query) properties.query = event.query;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch(
      "https://business-api.tiktok.com/open_api/v1.3/event/track/",
      {
        method: "POST",
        headers: {
          "Access-Token": config.accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pixel_code: config.pixelCode,
          event_source: "web",
          event_source_id: config.pixelCode,
          data: [
            {
              event: event.event,
              event_id: event.eventId,
              timestamp: event.timestamp ?? new Date().toISOString(),
              context,
              properties,
            },
          ],
          test_event_code: config.testEventCode,
        }),
        signal: controller.signal,
      },
    );
    const parsed = tiktokResponseSchema.safeParse(await response.json());
    if (!response.ok || !parsed.success || parsed.data.code !== 0) {
      const providerCode = parsed.success ? parsed.data.code : undefined;
      return {
        success: false,
        providerEventId: event.eventId,
        errorCode: providerCode
          ? `TIKTOK_${providerCode}`
          : response.ok
            ? "TIKTOK_RESPONSE_INVALID"
            : `TIKTOK_HTTP_${response.status}`,
        errorMessage: "TikTok did not accept the conversion event.",
      };
    }
    return { success: true, providerEventId: event.eventId };
  } catch (error) {
    return {
      success: false,
      providerEventId: event.eventId,
      errorCode: error instanceof Error && error.name === "AbortError"
        ? "TIKTOK_TIMEOUT"
        : "TIKTOK_REQUEST_FAILED",
      errorMessage: "TikTok conversion delivery failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendTikTokPurchase(
  config: TikTokEventsAPIConfig,
  data: {
    eventId: string;
    email?: string;
    phone?: string;
    value: number;
    currency: string;
    contentId?: string;
    contents?: TikTokEvent["contents"];
    ttclid?: string;
    ttp?: string;
    ipAddress?: string;
    userAgent?: string;
    pageUrl?: string;
    timestamp?: string;
  },
): Promise<TikTokConversionResult> {
  return sendTikTokEvent(config, {
    event: "CompletePayment",
    eventId: data.eventId,
    timestamp: data.timestamp,
    email: data.email,
    phone: data.phone,
    value: data.value,
    currency: data.currency,
    contentId: data.contentId,
    contents: data.contents,
    ttclid: data.ttclid,
    ttp: data.ttp,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    pageUrl: data.pageUrl,
  });
}

export async function sendTikTokLead(
  config: TikTokEventsAPIConfig,
  data: {
    eventId: string;
    email?: string;
    phone?: string;
    value?: number;
    currency?: string;
    ttclid?: string;
    ttp?: string;
    ipAddress?: string;
    userAgent?: string;
    pageUrl?: string;
    timestamp?: string;
  },
): Promise<TikTokConversionResult> {
  return sendTikTokEvent(config, {
    event: "SubmitForm",
    eventId: data.eventId,
    timestamp: data.timestamp,
    email: data.email,
    phone: data.phone,
    value: data.value,
    currency: data.currency,
    ttclid: data.ttclid,
    ttp: data.ttp,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    pageUrl: data.pageUrl,
  });
}
