import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { outlookMoveEmailChannel } from "@/inngest/channels/outlook-move-email";
import { decode } from "html-entities";

type OutlookMoveEmailData = {
  variableName?: string;
  messageId: string;
  destinationFolderId: string;
};

export const outlookMoveEmailExecutor: NodeExecutor<OutlookMoveEmailData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(outlookMoveEmailChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.messageId) {
      await publish(outlookMoveEmailChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Outlook: Move Email error: messageId is required.");
    }

    if (!data.destinationFolderId) {
      await publish(outlookMoveEmailChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Outlook: Move Email error: destinationFolderId is required.");
    }

    // Compile fields with Handlebars
    const messageId = data.messageId ? decode(Handlebars.compile(data.messageId)(context)) : undefined;
    const destinationFolderId = data.destinationFolderId ? decode(Handlebars.compile(data.destinationFolderId)(context)) : undefined;

    // TODO: Implement Outlook: Move Email logic here
    const result = await step.run("outlook-move-email", async () => {
      // Add implementation here
      throw new NonRetriableError("Outlook: Move Email: Not yet implemented");
    });

    await publish(outlookMoveEmailChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(outlookMoveEmailChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
