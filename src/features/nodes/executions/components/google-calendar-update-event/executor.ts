import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { googleCalendarUpdateEventChannel } from "@/inngest/channels/google-calendar-update-event";
import { auth } from "@/lib/auth";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GoogleCalendarUpdateEventData = {
  variableName?: string;
  eventId: string;
  summary?: string;
  startDateTime?: string;
  endDateTime?: string;
  description?: string;
  location?: string;
};

export const googleCalendarUpdateEventExecutor: NodeExecutor<GoogleCalendarUpdateEventData> =
  async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
      googleCalendarUpdateEventChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.eventId) {
        await publish(
          googleCalendarUpdateEventChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Calendar: Event ID is required"
        );
      }

      const tokenResponse = await step.run("get-google-token", async () => {
        return await auth.api.getAccessToken({
          body: {
            providerId: "google",
            userId,
          },
        });
      });

      const accessToken = tokenResponse?.accessToken;

      if (!accessToken) {
        await publish(
          googleCalendarUpdateEventChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Calendar is not connected. Please connect Google in Settings → Apps."
        );
      }

      const eventId = decode(Handlebars.compile(data.eventId)(context));

      // Build update payload with only provided fields
      const updatePayload: any = {};

      if (data.summary) {
        updatePayload.summary = decode(Handlebars.compile(data.summary)(context));
      }

      if (data.startDateTime) {
        updatePayload.start = {
          dateTime: decode(Handlebars.compile(data.startDateTime)(context)),
          timeZone: "UTC",
        };
      }

      if (data.endDateTime) {
        updatePayload.end = {
          dateTime: decode(Handlebars.compile(data.endDateTime)(context)),
          timeZone: "UTC",
        };
      }

      if (data.description) {
        updatePayload.description = decode(Handlebars.compile(data.description)(context));
      }

      if (data.location) {
        updatePayload.location = decode(Handlebars.compile(data.location)(context));
      }

      const response = await step.run("update-calendar-event", async () => {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(updatePayload),
          }
        );

        if (!res.ok) {
          const error = await res.text();
          throw new Error(`Google Calendar API error: ${error}`);
        }

        return await res.json();
      });

      await publish(
        googleCalendarUpdateEventChannel().status({ nodeId, status: "success" })
      );

      return {
        ...context,
        ...(data.variableName
          ? {
              [data.variableName]: {
                id: response.id,
                htmlLink: response.htmlLink,
                summary: response.summary,
                start: response.start,
                end: response.end,
                location: response.location,
                description: response.description,
              },
            }
          : {}),
      };
    } catch (error) {
      await publish(
        googleCalendarUpdateEventChannel().status({ nodeId, status: "error" })
      );
      throw error;
    }
  };
