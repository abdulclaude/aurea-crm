import Handlebars from "handlebars";

import type { NodeExecutor } from "@/features/executions/types";
import { whatsappChannel } from "@/inngest/channels/whatsapp";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { NonRetriableError } from "inngest";

type WhatsAppExecutionData = {
  variableName?: string;
  integrationId?: string;
  recipient?: string;
  message?: string;
  previewUrl?: boolean;
};

export const whatsappExecutionExecutor: NodeExecutor<
  WhatsAppExecutionData
> = async ({ data, nodeId, userId, context, step, publish }) => {
  await publish(whatsappChannel().status({ nodeId, status: "loading" }));

  try {
    if (!data.variableName) {
      throw new NonRetriableError(
        "WhatsApp node error: Variable name is required."
      );
    }

    if (!data.integrationId) {
      throw new NonRetriableError(
        "WhatsApp node error: Select a connected WhatsApp number."
      );
    }

    if (!data.recipient) {
      throw new NonRetriableError(
        "WhatsApp node error: Recipient phone number is required."
      );
    }

    if (!data.message) {
      throw new NonRetriableError(
        "WhatsApp node error: Message body is required."
      );
    }

    const integration = await step.run("get-whatsapp-integration", () =>
      prisma.integration.findUnique({
        where: { id: data.integrationId },
      })
    );

    if (!integration || !integration.metadata) {
      throw new NonRetriableError("WhatsApp integration not found.");
    }

    const phoneNumberId = (integration.metadata as Record<string, unknown>)
      ?.phoneNumberId as string | undefined;

    if (!phoneNumberId) {
      throw new NonRetriableError(
        "WhatsApp integration is missing the phone number ID."
      );
    }

    const tokenResponse = await auth.api.getAccessToken({
      body: {
        providerId: "facebook",
        userId,
      },
    });

    const accessToken = tokenResponse?.accessToken;
    if (!accessToken) {
      throw new NonRetriableError(
        "Unable to obtain Facebook access token. Reconnect WhatsApp."
      );
    }

    const compiledMessage = Handlebars.compile(data.message)(context).trim();
    if (!compiledMessage) {
      throw new NonRetriableError(
        "WhatsApp node error: Message resolved to an empty string."
      );
    }

    const response = await step.run("whatsapp-send-message", async () => {
      const result = await fetch(
        `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: data.recipient,
            type: "text",
            text: {
              body: compiledMessage,
              preview_url: Boolean(data.previewUrl),
            },
          }),
        }
      );

      const payload = await result.json().catch(() => ({}));
      if (!result.ok || payload?.error) {
        throw new NonRetriableError(
          payload?.error?.message ||
            `WhatsApp API error (${result.status}): ${result.statusText}`
        );
      }

      return payload;
    });

    await publish(whatsappChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [data.variableName]: response,
    };
  } catch (error) {
    await publish(whatsappChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

