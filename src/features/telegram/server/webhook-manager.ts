"use server";

import { randomBytes } from "node:crypto";

import type { Prisma, Credential } from "@prisma/client";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export type TelegramCredentialMetadata = {
  botUsername?: string;
  webhookSecret?: string;
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

type TransactionClient = Prisma.TransactionClient;

export async function configureTelegramWebhook({
  credential,
  token,
  tx,
}: {
  credential: Credential;
  token: string;
  tx: TransactionClient;
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
    ...(credential.metadata as TelegramCredentialMetadata | null | undefined),
    webhookSecret,
    botUsername: getMe?.result?.username,
  };

  await tx.credential.update({
    where: { id: credential.id },
    data: { metadata },
  });
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
