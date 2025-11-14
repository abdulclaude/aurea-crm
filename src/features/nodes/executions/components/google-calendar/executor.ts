import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";

import type { NodeExecutor } from "@/features/executions/types";
import { googleCalendarChannel } from "@/inngest/channels/google-calendar";
import { auth } from "@/lib/auth";

export type GoogleCalendarActionData = {
  variableName?: string;
  calendarId?: string;
  summary?: string;
  description?: string;
  startDateTime?: string;
  endDateTime?: string;
  timezone?: string;
};

const renderTemplate = (
  value: string | undefined,
  context: Record<string, unknown>
) => {
  if (!value) return undefined;
  return Handlebars.compile(value)(context);
};

export const googleCalendarActionExecutor: NodeExecutor<GoogleCalendarActionData> =
  async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
      googleCalendarChannel().status({ nodeId, status: "loading" })
    );

    if (!data.calendarId) {
      await publish(googleCalendarChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Calendar ID is not configured.");
    }

    if (!data.variableName) {
      await publish(googleCalendarChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Variable name is required.");
    }

    if (!data.summary) {
      await publish(googleCalendarChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Event summary is required.");
    }

    if (!data.startDateTime || !data.endDateTime) {
      await publish(googleCalendarChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Start and end date/time are required for Google Calendar nodes."
      );
    }

    const summary = renderTemplate(data.summary, context);
    const description = renderTemplate(data.description, context);
    const start = renderTemplate(data.startDateTime, context);
    const end = renderTemplate(data.endDateTime, context);

    if (!summary || !start || !end) {
      await publish(googleCalendarChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Unable to resolve summary or start/end times. Check your templates."
      );
    }

    const tokenResponse = await auth.api.getAccessToken({
      body: {
        providerId: "google",
        userId,
      },
    });

    const accessToken = tokenResponse?.accessToken;

    if (!accessToken) {
      await publish(googleCalendarChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Google Calendar is not connected. Please reconnect the integration."
      );
    }

    const payload = {
      summary,
      description,
      start: {
        dateTime: start,
        timeZone: data.timezone || "UTC",
      },
      end: {
        dateTime: end,
        timeZone: data.timezone || "UTC",
      },
    };

    const result = await step.run("google-calendar-create-event", async () => {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          data.calendarId!
        )}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new NonRetriableError(
          `Google Calendar API error (${response.status}): ${errorText}`
        );
      }

      return response.json();
    });

    await publish(googleCalendarChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [data.variableName]: result,
    };
  };
