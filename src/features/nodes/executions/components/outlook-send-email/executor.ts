import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { outlookSendEmailChannel } from "@/inngest/channels/outlook-send-email";
import { decode } from "html-entities";

type OutlookSendEmailData = {
  variableName?: string;
  to: string;
  subject: string;
  body: string;
};

export const outlookSendEmailExecutor: NodeExecutor<OutlookSendEmailData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(outlookSendEmailChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.to) {
      await publish(outlookSendEmailChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Outlook: Send Email error: to is required.");
    }

    if (!data.subject) {
      await publish(outlookSendEmailChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Outlook: Send Email error: subject is required.");
    }

    if (!data.body) {
      await publish(outlookSendEmailChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Outlook: Send Email error: body is required.");
    }

    // Compile fields with Handlebars
    const to = data.to ? decode(Handlebars.compile(data.to)(context)) : undefined;
    const subject = data.subject ? decode(Handlebars.compile(data.subject)(context)) : undefined;
    const body = data.body ? decode(Handlebars.compile(data.body)(context)) : undefined;

    // TODO: Implement Outlook: Send Email logic here
    const result = await step.run("outlook-send-email", async () => {
      // Add implementation here
      throw new NonRetriableError("Outlook: Send Email: Not yet implemented");
    });

    await publish(outlookSendEmailChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(outlookSendEmailChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
