import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { outlookReplyToEmailChannel } from "@/inngest/channels/outlook-reply-to-email";
import { decode } from "html-entities";

type OutlookReplyToEmailData = {
  variableName?: string;
  messageId: string;
  body: string;
};

export const outlookReplyToEmailExecutor: NodeExecutor<OutlookReplyToEmailData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(outlookReplyToEmailChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.messageId) {
      await publish(outlookReplyToEmailChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Outlook: Reply to Email error: messageId is required.");
    }

    if (!data.body) {
      await publish(outlookReplyToEmailChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Outlook: Reply to Email error: body is required.");
    }

    // Compile fields with Handlebars
    const messageId = data.messageId ? decode(Handlebars.compile(data.messageId)(context)) : undefined;
    const body = data.body ? decode(Handlebars.compile(data.body)(context)) : undefined;

    // TODO: Implement Outlook: Reply to Email logic here
    const result = await step.run("outlook-reply-to-email", async () => {
      // Add implementation here
      throw new NonRetriableError("Outlook: Reply to Email: Not yet implemented");
    });

    await publish(outlookReplyToEmailChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(outlookReplyToEmailChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
