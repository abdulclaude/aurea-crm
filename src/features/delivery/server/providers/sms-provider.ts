import "server-only";

import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { smsConfig, twilioPhoneNumber } from "@/db/schema";
import { classifyHttpFailure } from "@/features/delivery/lib/retry-policy";
import { resolveSmsProviderAccount } from "@/features/provider-accounts/server/resolver";
import type {
  DeliveryDispatchRequest,
  DeliveryDispatchResult,
  DeliveryProviderAdapter,
} from "@/features/delivery/server/providers/provider";
import { requireCommunicationEntitlement } from "@/features/communications/server/profile-service";
import { resolveTwilioPlatformAccount } from "@/features/communications/server/twilio-client";
import { getCommunicationsPublicUrl } from "@/features/communications/server/platform-credentials";
import { checkSmsSpendAtDispatch } from "@/features/communications/server/sms-spend-policy";

const twilioResponseSchema = z.object({ sid: z.string().min(1) });
const providerErrorSchema = z.object({ message: z.string().optional() });
const vonageResponseSchema = z.object({
  messages: z
    .array(
      z.object({
        status: z.string().optional(),
        "message-id": z.string().optional(),
        "error-text": z.string().optional(),
      }),
    )
    .min(1),
});
const messageBirdResponseSchema = z.object({ id: z.string().min(1) });

type SmsProvider = "TWILIO" | "VONAGE" | "MESSAGEBIRD";
type SmsCredentials = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  messagingServiceSid?: string;
  statusCallback?: string;
};

function providerFailure(
  status: number,
  message: string,
): DeliveryDispatchResult {
  return classifyHttpFailure(status) === "RETRYABLE"
    ? { kind: "retryable", code: `HTTP_${status}`, message }
    : { kind: "terminal", code: `HTTP_${status}`, message };
}

async function loadSmsCredentials(
  provider: SmsProvider,
  request: DeliveryDispatchRequest,
): Promise<SmsCredentials | DeliveryDispatchResult> {
  if (request.sender.kind === "TWILIO_PHONE_NUMBER") {
    if (provider !== "TWILIO" || !request.providerAccountId) {
      return {
        kind: "terminal",
        code: "INVALID_PROVIDER_ACCOUNT",
        message: "Managed phone numbers require their Twilio account binding",
      };
    }
    const [phone] = await db
      .select()
      .from(twilioPhoneNumber)
      .where(
        and(
          eq(twilioPhoneNumber.id, request.sender.id),
          eq(twilioPhoneNumber.organizationId, request.organizationId),
          eq(twilioPhoneNumber.providerAccountId, request.providerAccountId),
          eq(twilioPhoneNumber.status, "ACTIVE"),
          eq(twilioPhoneNumber.smsEnabled, true),
          request.locationId
            ? or(
                eq(twilioPhoneNumber.locationId, request.locationId),
                isNull(twilioPhoneNumber.locationId),
              )
            : isNull(twilioPhoneNumber.locationId),
        ),
      )
      .limit(1);
    if (!phone) {
      return {
        kind: "terminal",
        code: "TWILIO_PHONE_NUMBER_UNAVAILABLE",
        message: "The managed Twilio phone number is no longer available",
      };
    }
    try {
      await requireCommunicationEntitlement({
        organizationId: request.organizationId,
        channel: "SMS",
      });
      if (
        !(await checkSmsSpendAtDispatch({
          organizationId: request.organizationId,
          deliveryId: request.deliveryId,
        }))
      ) {
        return {
          kind: "terminal",
          code: "SMS_SPEND_LIMIT_BLOCKED",
          message: "The SMS spend reservation is missing or the limit was exceeded",
        };
      }
      const resolved = await resolveTwilioPlatformAccount({
        organizationId: request.organizationId,
      });
      if (!resolved.credentials) {
        throw new Error("The managed Twilio subaccount is not ready.");
      }
      return {
        ...resolved.credentials,
        fromNumber: phone.phoneNumber,
        messagingServiceSid: phone.messagingServiceSid ?? undefined,
        statusCallback: `${getCommunicationsPublicUrl()}/api/webhooks/twilio/sms/status`,
      };
    } catch (error) {
      return {
        kind: "terminal",
        code: "TWILIO_ACCOUNT_UNAVAILABLE",
        message:
          error instanceof Error
            ? error.message
            : "The managed Twilio account is unavailable",
      };
    }
  }

  if (request.sender.kind !== "SMS_CONFIG") {
    return {
      kind: "terminal",
      code: "INVALID_SENDER",
      message: "SMS providers require an SMS configuration reference",
    };
  }

  if (
    !request.providerAccountId ||
    request.sender.id !== request.providerAccountRef
  ) {
    return {
      kind: "terminal",
      code: "INVALID_PROVIDER_ACCOUNT",
      message: "SMS delivery is not bound to a provider account",
    };
  }

  const [config] = await db
    .select({
      providerAccountId: smsConfig.providerAccountId,
      fromNumber: smsConfig.fromNumber,
      isActive: smsConfig.isActive,
    })
    .from(smsConfig)
    .where(
      and(
        eq(smsConfig.id, request.providerAccountRef),
        eq(smsConfig.organizationId, request.organizationId),
        eq(smsConfig.providerAccountId, request.providerAccountId),
        request.locationId
          ? or(
              eq(smsConfig.locationId, request.locationId),
              isNull(smsConfig.locationId),
            )
          : isNull(smsConfig.locationId),
      ),
    )
    .limit(1);

  if (!config || !config.isActive) {
    return {
      kind: "terminal",
      code: "SMS_CONFIG_UNAVAILABLE",
      message: "The SMS provider configuration is unavailable",
    };
  }

  try {
    const account = await resolveSmsProviderAccount({
      providerAccountId: config.providerAccountId,
      scope: {
        organizationId: request.organizationId,
        locationId: request.locationId,
      },
    });
    if (account.provider !== provider) {
      return {
        kind: "terminal",
        code: "SMS_PROVIDER_MISMATCH",
        message: "The SMS account does not match the queued provider",
      };
    }
    if (provider !== "MESSAGEBIRD" && !account.externalAccountId) {
      return {
        kind: "terminal",
        code: "SMS_ACCOUNT_IDENTIFIER_MISSING",
        message: "The SMS provider account identifier is missing",
      };
    }
    return {
      accountSid: account.externalAccountId ?? "",
      authToken: account.secret,
      fromNumber: config.fromNumber,
    };
  } catch (error) {
    return {
      kind: "terminal",
      code: "SMS_PROVIDER_ACCOUNT_UNAVAILABLE",
      message:
        error instanceof Error
          ? error.message
          : "The SMS provider account is unavailable",
    };
  }
}

async function sendSms(
  provider: SmsProvider,
  request: DeliveryDispatchRequest,
  signal: AbortSignal,
): Promise<DeliveryDispatchResult> {
  if (request.payload.channel !== "SMS") {
    return {
      kind: "terminal",
      code: "INVALID_PAYLOAD",
      message: "SMS providers require an SMS payload",
    };
  }

  const credentials = await loadSmsCredentials(provider, request);
  if ("kind" in credentials) {
    return credentials;
  }

  try {
    switch (provider) {
      case "TWILIO": {
        const auth = Buffer.from(
          `${credentials.accountSid}:${credentials.authToken}`,
        ).toString("base64");
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              From: credentials.fromNumber,
              ...(credentials.messagingServiceSid
                ? { MessagingServiceSid: credentials.messagingServiceSid }
                : {}),
              To: request.destination,
              Body: request.payload.body,
              ...(credentials.statusCallback
                ? { StatusCallback: credentials.statusCallback }
                : {}),
            }),
            signal,
          },
        );
        if (!response.ok) {
          const rawError: unknown = await response
            .json()
            .catch(() => ({ message: response.statusText }));
          const parsedError = providerErrorSchema.safeParse(rawError);
          return providerFailure(
            response.status,
            parsedError.data?.message ?? "Twilio rejected the SMS request",
          );
        }

        const rawData: unknown = await response.json();
        const parsed = twilioResponseSchema.safeParse(rawData);
        return parsed.success
          ? {
              kind: "accepted",
              providerMessageId: parsed.data.sid,
              acceptedAt: new Date(),
            }
          : {
              kind: "ambiguous",
              code: "INVALID_PROVIDER_RESPONSE",
              message: "Twilio returned an invalid success response",
            };
      }

      case "VONAGE": {
        const response = await fetch("https://rest.nexmo.com/sms/json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: credentials.accountSid,
            api_secret: credentials.authToken,
            from: credentials.fromNumber,
            to: request.destination,
            text: request.payload.body,
          }),
          signal,
        });
        if (!response.ok) {
          return providerFailure(
            response.status,
            "Vonage rejected the SMS request",
          );
        }

        const rawData: unknown = await response.json();
        const parsed = vonageResponseSchema.safeParse(rawData);
        const first = parsed.success ? parsed.data.messages[0] : undefined;
        if (!first) {
          return {
            kind: "ambiguous",
            code: "INVALID_PROVIDER_RESPONSE",
            message: "Vonage returned an invalid success response",
          };
        }
        if (first.status && first.status !== "0") {
          return {
            kind: "terminal",
            code: `VONAGE_${first.status}`,
            message: first["error-text"] ?? "Vonage rejected the SMS request",
          };
        }
        if (!first["message-id"]) {
          return {
            kind: "ambiguous",
            code: "MISSING_PROVIDER_MESSAGE_ID",
            message:
              "Vonage accepted the request without returning a message ID",
          };
        }

        return {
          kind: "accepted",
          providerMessageId: first["message-id"],
          acceptedAt: new Date(),
        };
      }

      case "MESSAGEBIRD": {
        const response = await fetch("https://rest.messagebird.com/messages", {
          method: "POST",
          headers: {
            Authorization: `AccessKey ${credentials.authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            originator: credentials.fromNumber,
            recipients: [request.destination],
            body: request.payload.body,
          }),
          signal,
        });
        if (!response.ok) {
          return providerFailure(
            response.status,
            "MessageBird rejected the SMS request",
          );
        }

        const rawData: unknown = await response.json();
        const parsed = messageBirdResponseSchema.safeParse(rawData);
        return parsed.success
          ? {
              kind: "accepted",
              providerMessageId: parsed.data.id,
              acceptedAt: new Date(),
            }
          : {
              kind: "ambiguous",
              code: "INVALID_PROVIDER_RESPONSE",
              message: "MessageBird returned an invalid success response",
            };
      }
    }
  } catch (error) {
    return {
      kind: "ambiguous",
      code: "SMS_PROVIDER_REQUEST_FAILED",
      message:
        error instanceof Error
          ? error.message
          : "SMS provider request failed with an unknown error",
    };
  }
}

function createSmsAdapter(provider: SmsProvider): DeliveryProviderAdapter {
  return {
    provider,
    channels: ["SMS"],
    send: (request, signal) => sendSms(provider, request, signal),
  };
}

export const twilioProviderAdapter = createSmsAdapter("TWILIO");
export const vonageProviderAdapter = createSmsAdapter("VONAGE");
export const messageBirdProviderAdapter = createSmsAdapter("MESSAGEBIRD");
