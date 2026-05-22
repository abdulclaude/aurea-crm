import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { smsConfig, smsMessage } from "@/db/schema";

const twilioResponseSchema = z.object({
  sid: z.string(),
});

const providerErrorSchema = z.object({
  message: z.string().optional(),
});

const vonageResponseSchema = z.object({
  messages: z.array(z.object({ "message-id": z.string().optional() })).optional(),
});

const messageBirdResponseSchema = z.object({
  id: z.string().optional(),
});

interface SendResult {
  providerSid: string | null;
  status: "SENT" | "FAILED";
  errorCode?: string;
  errorMessage?: string;
}

export async function deliverSms(messageId: string): Promise<SendResult> {
  const message = await db.query.smsMessage.findFirst({
    where: eq(smsMessage.id, messageId),
  });

  if (!message) {
    return { providerSid: null, status: "FAILED", errorMessage: "Message not found" };
  }

  const config = await db.query.smsConfig.findFirst({
    where: eq(smsConfig.organizationId, message.organizationId),
  });
  if (!config) {
    return { providerSid: null, status: "FAILED", errorMessage: "SMS not configured" };
  }

  try {
    const result = await sendViaProvider(config.provider, {
      accountSid: config.accountSid,
      authToken: config.authToken,
      from: message.from,
      to: message.to,
      body: message.body,
    });

    await db
      .update(smsMessage)
      .set({
        status: "SENT",
        providerSid: result.sid,
        sentAt: new Date(),
      })
      .where(eq(smsMessage.id, messageId));

    return { providerSid: result.sid, status: "SENT" };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";

    await db
      .update(smsMessage)
      .set({
        status: "FAILED",
        errorMessage: errMsg,
      })
      .where(eq(smsMessage.id, messageId));

    return { providerSid: null, status: "FAILED", errorMessage: errMsg };
  }
}

interface ProviderConfig {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
}

async function sendViaProvider(
  provider: string,
  config: ProviderConfig,
): Promise<{ sid: string }> {
  switch (provider) {
    case "TWILIO": {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
      const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: config.from,
          To: config.to,
          Body: config.body,
        }),
      });

      if (!res.ok) {
        const rawError: unknown = await res
          .json()
          .catch(() => ({ message: res.statusText }));
        const parsedError = providerErrorSchema.safeParse(rawError);
        throw new Error(
          parsedError.data?.message ?? `Twilio error: ${res.status}`,
        );
      }

      const rawData: unknown = await res.json();
      const data = twilioResponseSchema.parse(rawData);
      return { sid: data.sid };
    }

    case "VONAGE": {
      const res = await fetch("https://rest.nexmo.com/sms/json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: config.accountSid,
          api_secret: config.authToken,
          from: config.from,
          to: config.to,
          text: config.body,
        }),
      });

      if (!res.ok) throw new Error(`Vonage error: ${res.status}`);
      const rawData: unknown = await res.json();
      const data = vonageResponseSchema.parse(rawData);
      return { sid: data.messages?.[0]?.["message-id"] ?? "vonage-" + Date.now() };
    }

    case "MESSAGEBIRD": {
      const res = await fetch("https://rest.messagebird.com/messages", {
        method: "POST",
        headers: {
          Authorization: `AccessKey ${config.authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originator: config.from,
          recipients: [config.to],
          body: config.body,
        }),
      });

      if (!res.ok) throw new Error(`MessageBird error: ${res.status}`);
      const rawData: unknown = await res.json();
      const data = messageBirdResponseSchema.parse(rawData);
      return { sid: data.id ?? "mb-" + Date.now() };
    }

    default:
      throw new Error(`Unsupported SMS provider: ${provider}`);
  }
}
