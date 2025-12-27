import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { outlookSearchEmailsChannel } from "@/inngest/channels/outlook-search-emails";
import { decode } from "html-entities";

type OutlookSearchEmailsData = {
  variableName?: string;
  query: string;
};

export const outlookSearchEmailsExecutor: NodeExecutor<OutlookSearchEmailsData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(outlookSearchEmailsChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.query) {
      await publish(outlookSearchEmailsChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Outlook: Search Emails error: query is required.");
    }

    // Compile fields with Handlebars
    const query = data.query ? decode(Handlebars.compile(data.query)(context)) : undefined;

    // TODO: Implement Outlook: Search Emails logic here
    const result = await step.run("outlook-search-emails", async () => {
      // Add implementation here
      throw new NonRetriableError("Outlook: Search Emails: Not yet implemented");
    });

    await publish(outlookSearchEmailsChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(outlookSearchEmailsChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
