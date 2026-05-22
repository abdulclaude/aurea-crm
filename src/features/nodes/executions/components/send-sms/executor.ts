import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { sendSmsChannel } from "@/inngest/channels/send-sms";
import { MessageDirection, SmsStatus } from "@/db/enums";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import { client, node as nodeTable, smsConfig as smsConfigTable, smsMessage } from "@/db/schema";

type SendSmsData = {
  to?: string;
  message?: string;
  clientId?: string;
};

export const sendSmsExecutor: NodeExecutor<SendSmsData> = async ({
  data,
  nodeId,
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
        where: eq(client.id, clientId!),
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
      const node = await db.query.node.findFirst({
        where: eq(nodeTable.id, nodeId),
        with: {
          workflow: { columns: { organizationId: true, locationId: true } },
        },
      });

      const orgId = node?.workflow?.organizationId;
      if (!orgId) {
        throw new NonRetriableError(
          "Send SMS error: Workflow must be in an organization context."
        );
      }

      const smsConfig = await db.query.smsConfig.findFirst({
        where: eq(smsConfigTable.organizationId, orgId),
      });

      if (!smsConfig) {
        throw new NonRetriableError(
          "Send SMS error: No SMS configuration found for this organization."
        );
      }

      const [message] = await db
        .insert(smsMessage)
        .values({
          id: createId(),
          organizationId: orgId,
          locationId: node.workflow.locationId ?? null,
          to: phoneNumber,
          from: smsConfig.fromNumber,
          body: compiledMessage,
          direction: MessageDirection.OUTBOUND,
          status: SmsStatus.QUEUED,
          clientId: clientId ?? null,
        })
        .returning();

      return { messageId: message.id };
    });

    await publish(sendSmsChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      smsSent: true,
      messageId: result.messageId,
    };
  } catch (error) {
    await publish(sendSmsChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
