import { and, eq, isNull } from "drizzle-orm";
import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import { z } from "zod";

import { db } from "@/db";
import { client } from "@/db/schema";
import type { NodeExecutor } from "@/features/executions/types";
import { sendEmailChannel } from "@/inngest/channels/send-email";
import { sendEmail } from "@/lib/email";

import type { SendEmailFormValues } from "./config";

const compiledEmailSchema = z.string().email();

export const sendEmailExecutor: NodeExecutor<SendEmailFormValues> = async ({
  data,
  nodeId,
  scope,
  context,
  step,
  publish,
}) => {
  await publish(sendEmailChannel().status({ nodeId, status: "loading" }));

  try {
    const compile = (value: string) => Handlebars.compile(value)(context);
    const compiledClientId = data.clientId?.trim()
      ? compile(data.clientId).trim()
      : undefined;
    const recipient = await step.run("resolve-email-recipient", async () => {
      if (compiledClientId) {
        const foundClient = await db.query.client.findFirst({
          where: and(
            eq(client.id, compiledClientId),
            eq(client.organizationId, scope.organizationId),
            scope.locationId
              ? eq(client.locationId, scope.locationId)
              : isNull(client.locationId),
          ),
          columns: { id: true, email: true },
        });

        if (!foundClient?.email) {
          throw new NonRetriableError(
            "Send email error: The selected client has no email address.",
          );
        }

        return { clientId: foundClient.id, email: foundClient.email };
      }

      const directRecipient = data.to?.trim()
        ? compile(data.to).trim().toLowerCase()
        : "";
      const parsed = compiledEmailSchema.safeParse(directRecipient);
      if (!parsed.success) {
        throw new NonRetriableError(
          "Send email error: A valid recipient email or client ID is required.",
        );
      }

      return { clientId: null, email: parsed.data };
    });

    const result = await step.run("queue-workflow-email", async () =>
      sendEmail({
        organizationId: scope.organizationId,
        locationId: scope.locationId,
        clientId: recipient.clientId,
        sourceType: "WORKFLOW",
        sourceId: `${scope.executionId}:${nodeId}`,
        idempotencyKey: `workflow-email:${scope.executionId}:${nodeId}`,
        to: recipient.email,
        emailDomainId: data.emailDomainId || undefined,
        fromName: data.fromName?.trim() ? compile(data.fromName) : undefined,
        replyTo: data.replyTo?.trim() ? compile(data.replyTo) : undefined,
        subject: compile(data.subject),
        html: compile(data.html),
        text: data.text?.trim() ? compile(data.text) : undefined,
        purpose: data.purpose,
      }),
    );

    if (!result.success) {
      throw new NonRetriableError(`Send email error: ${result.error}`);
    }

    await publish(sendEmailChannel().status({ nodeId, status: "success" }));
    return {
      ...context,
      [data.variableName]: {
        deliveryId: result.deliveryId,
        status: result.status,
        recipient: recipient.email,
      },
    };
  } catch (error) {
    await publish(sendEmailChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
