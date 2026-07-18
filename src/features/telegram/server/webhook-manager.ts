"use server";

import { createHash, randomBytes } from "node:crypto";

import { db } from "@/db";
import { credential as credentialTable } from "@/db/schema";
import { eq } from "drizzle-orm";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export type TelegramCredentialMetadata = {
  botUsername?: string;
  webhookSecretHash?: string;
};

const TELEGRAM_ALLOWED_UPDATES = ["message", "channel_post"];

export async function resolveTelegramWebhookBaseUrl() {
  const base =
    process.env.TELEGRAM_WEBHOOK_BASE_URL ??
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "";

  if (!base) {
    throw new Error(
      "Set TELEGRAM_WEBHOOK_BASE_URL (must be HTTPS) so Telegram can reach your server."
    );
  }

  if (!base.startsWith("https://")) {
    throw new Error(
      `Telegram webhook base must be HTTPS. Received: "${base}".`
    );
  }

  return base.replace(/\/$/, "");
}

async function telegramApiRequest<T>({
  token,
  method,
  body,
}: {
  token: string;
  method: string;
  body?: Record<string, unknown>;
}): Promise<T> {
  const response = await fetch(
    `${TELEGRAM_API_BASE}/bot${token}/${method}`,
    body
      ? {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      : undefined
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.ok === false) {
    const description = payload?.description || response.statusText;
    throw new Error(`Telegram API error (${method}): ${description}`);
  }

  return payload as T;
}

type CredentialRow = typeof credentialTable.$inferSelect;

function getMetadataRecord(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return metadata as Record<string, unknown>;
}

export async function configureTelegramWebhook({
  credential,
  token,
}: {
  credential: CredentialRow;
  token: string;
}) {
  const baseUrl = await resolveTelegramWebhookBaseUrl();
  const webhookSecret = randomBytes(32).toString("hex");
  const webhookUrl = `${baseUrl}/api/webhooks/telegram?credentialId=${credential.id}`;

  await telegramApiRequest({
    token,
    method: "setWebhook",
    body: {
      url: webhookUrl,
      secret_token: webhookSecret,
      drop_pending_updates: true,
      allowed_updates: TELEGRAM_ALLOWED_UPDATES,
    },
  });

  type GetMeResponse = {
    ok: boolean;
    result?: {
      username?: string;
      first_name?: string;
    };
  };

  const getMe = await telegramApiRequest<GetMeResponse>({
    token,
    method: "getMe",
  });

  const metadata: TelegramCredentialMetadata = {
    ...getMetadataRecord(credential.metadata),
    webhookSecretHash: createHash("sha256").update(webhookSecret).digest("hex"),
    botUsername: getMe?.result?.username,
  };

  await db
    .update(credentialTable)
    .set({ metadata, updatedAt: new Date() })
    .where(eq(credentialTable.id, credential.id));
}

export async function removeTelegramWebhook({ token }: { token: string }) {
  try {
    await telegramApiRequest({
      token,
      method: "deleteWebhook",
      body: {
        drop_pending_updates: true,
      },
    });
  } catch (error) {
    console.warn("[Telegram] Failed to delete webhook:", error);
  }
}
