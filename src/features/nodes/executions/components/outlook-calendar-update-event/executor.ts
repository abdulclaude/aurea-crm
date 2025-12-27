import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { outlookCalendarUpdateEventChannel } from "@/inngest/channels/outlook-calendar-update-event";
import { decode } from "html-entities";

type OutlookCalendarUpdateEventData = {
  variableName?: string;
  eventId: string;
};

export const outlookCalendarUpdateEventExecutor: NodeExecutor<OutlookCalendarUpdateEventData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(outlookCalendarUpdateEventChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.eventId) {
      await publish(outlookCalendarUpdateEventChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Outlook Calendar: Update Event error: eventId is required.");
    }

    // Compile fields with Handlebars
    const eventId = data.eventId ? decode(Handlebars.compile(data.eventId)(context)) : undefined;

    // TODO: Implement Outlook Calendar: Update Event logic here
    const result = await step.run("outlook-calendar-update-event", async () => {
      // Add implementation here
      throw new NonRetriableError("Outlook Calendar: Update Event: Not yet implemented");
    });

    await publish(outlookCalendarUpdateEventChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(outlookCalendarUpdateEventChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
