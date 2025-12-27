import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { outlookCalendarDeleteEventChannel } from "@/inngest/channels/outlook-calendar-delete-event";
import { decode } from "html-entities";

type OutlookCalendarDeleteEventData = {
  variableName?: string;
  eventId: string;
};

export const outlookCalendarDeleteEventExecutor: NodeExecutor<OutlookCalendarDeleteEventData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(outlookCalendarDeleteEventChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.eventId) {
      await publish(outlookCalendarDeleteEventChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Outlook Calendar: Delete Event error: eventId is required.");
    }

    // Compile fields with Handlebars
    const eventId = data.eventId ? decode(Handlebars.compile(data.eventId)(context)) : undefined;

    // TODO: Implement Outlook Calendar: Delete Event logic here
    const result = await step.run("outlook-calendar-delete-event", async () => {
      // Add implementation here
      throw new NonRetriableError("Outlook Calendar: Delete Event: Not yet implemented");
    });

    await publish(outlookCalendarDeleteEventChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(outlookCalendarDeleteEventChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
