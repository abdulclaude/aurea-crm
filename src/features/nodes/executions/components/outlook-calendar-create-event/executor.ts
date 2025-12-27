import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { outlookCalendarCreateEventChannel } from "@/inngest/channels/outlook-calendar-create-event";
import { decode } from "html-entities";

type OutlookCalendarCreateEventData = {
  variableName?: string;
  subject: string;
  start: string;
  end: string;
};

export const outlookCalendarCreateEventExecutor: NodeExecutor<OutlookCalendarCreateEventData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(outlookCalendarCreateEventChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.subject) {
      await publish(outlookCalendarCreateEventChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Outlook Calendar: Create Event error: subject is required.");
    }

    if (!data.start) {
      await publish(outlookCalendarCreateEventChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Outlook Calendar: Create Event error: start is required.");
    }

    if (!data.end) {
      await publish(outlookCalendarCreateEventChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Outlook Calendar: Create Event error: end is required.");
    }

    // Compile fields with Handlebars
    const subject = data.subject ? decode(Handlebars.compile(data.subject)(context)) : undefined;
    const start = data.start ? decode(Handlebars.compile(data.start)(context)) : undefined;
    const end = data.end ? decode(Handlebars.compile(data.end)(context)) : undefined;

    // TODO: Implement Outlook Calendar: Create Event logic here
    const result = await step.run("outlook-calendar-create-event", async () => {
      // Add implementation here
      throw new NonRetriableError("Outlook Calendar: Create Event: Not yet implemented");
    });

    await publish(outlookCalendarCreateEventChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(outlookCalendarCreateEventChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
