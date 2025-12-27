import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { googleCalendarFindAvailableTimesChannel } from "@/inngest/channels/google-calendar-find-available-times";
import { decode } from "html-entities";

type GoogleCalendarFindAvailableTimesData = {
  variableName?: string;
  calendarId: string;
  timeMin: string;
  timeMax: string;
};

export const googleCalendarFindAvailableTimesExecutor: NodeExecutor<GoogleCalendarFindAvailableTimesData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(googleCalendarFindAvailableTimesChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.calendarId) {
      await publish(googleCalendarFindAvailableTimesChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Google Calendar: Find Available Times error: calendarId is required.");
    }

    if (!data.timeMin) {
      await publish(googleCalendarFindAvailableTimesChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Google Calendar: Find Available Times error: timeMin is required.");
    }

    if (!data.timeMax) {
      await publish(googleCalendarFindAvailableTimesChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Google Calendar: Find Available Times error: timeMax is required.");
    }

    // Compile fields with Handlebars
    const calendarId = data.calendarId ? decode(Handlebars.compile(data.calendarId)(context)) : undefined;
    const timeMin = data.timeMin ? decode(Handlebars.compile(data.timeMin)(context)) : undefined;
    const timeMax = data.timeMax ? decode(Handlebars.compile(data.timeMax)(context)) : undefined;

    // TODO: Implement Google Calendar: Find Available Times logic here
    const result = await step.run("google-calendar-find-available-times", async () => {
      // Add implementation here
      throw new NonRetriableError("Google Calendar: Find Available Times: Not yet implemented");
    });

    await publish(googleCalendarFindAvailableTimesChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(googleCalendarFindAvailableTimesChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
