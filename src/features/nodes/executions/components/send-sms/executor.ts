import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { sendSmsChannel } from "@/inngest/channels/send-sms";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { client } from "@/db/schema";
import { enqueueSmsMessages } from "@/features/sms/server/services/enqueue-sms";

type SendSmsData = {
  to?: string;
  message?: string;
  clientId?: string;
  purpose?: "MARKETING" | "ONE_TO_ONE";
};

export const sendSmsExecutor: NodeExecutor<SendSmsData> = async ({
  data,
  nodeId,
  scope,
  context,
  step,
  publish,
}) => {
  await publish(sendSmsChannel().status({ nodeId, status: "loading" }));

  try {
    if (!data.to && !data.clientId) {
      await publish(sendSmsChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Send SMS error: Either 'to' phone number or 'clientId' is required."
      );
    }

    if (!data.message) {
      await publish(sendSmsChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Send SMS error: message is required.");
    }

    const clientId = data.clientId
      ? Handlebars.compile(data.clientId)(context)
      : undefined;

    const phoneNumber = await step.run("resolve-phone", async () => {
      if (data.to) {
        return Handlebars.compile(data.to)(context);
      }

      const foundClient = await db.query.client.findFirst({
        where: and(
          eq(client.id, clientId!),
          eq(client.organizationId, scope.organizationId),
          scope.locationId
            ? eq(client.locationId, scope.locationId)
            : isNull(client.locationId),
        ),
        columns: { phone: true },
      });

      if (!foundClient?.phone) {
        throw new NonRetriableError(
          `Send SMS error: Client ${clientId} has no phone number.`
        );
      }

      return foundClient.phone;
    });

    const compiledMessage = Handlebars.compile(data.message)(context);

    const result = await step.run("queue-sms", async () => {
      const queued = await enqueueSmsMessages({
        organizationId: scope.organizationId,
        locationId: scope.locationId,
        recipients: [{ to: phoneNumber, clientId }],
        body: compiledMessage,
        purpose: data.purpose ?? "ONE_TO_ONE",
      });
      const messageId = queued.messageIds[0];
      if (!messageId) {
        throw new NonRetriableError("Send SMS error: Message was not queued.");
      }
      return { messageId, suppressed: queued.suppressed === 1 };
    });

    await publish(sendSmsChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      smsQueued: !result.suppressed,
      smsSuppressed: result.suppressed,
      messageId: result.messageId,
    };
  } catch (error) {
    await publish(sendSmsChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
