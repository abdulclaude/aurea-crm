import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { googleCalendarCreateEventChannel } from "@/inngest/channels/google-calendar-create-event";
import { auth } from "@/lib/auth";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GoogleCalendarCreateEventData = {
  variableName?: string;
  summary: string;
  startDateTime: string;
  endDateTime: string;
  description?: string;
  location?: string;
  attendees?: string;
};

export const googleCalendarCreateEventExecutor: NodeExecutor<GoogleCalendarCreateEventData> =
  async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
      googleCalendarCreateEventChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.summary || !data.startDateTime || !data.endDateTime) {
        await publish(
          googleCalendarCreateEventChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Calendar: Event title, start date/time, and end date/time are required"
        );
      }

      // Get Google OAuth token
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
          googleCalendarCreateEventChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Calendar is not connected. Please connect Google in Settings → Apps."
        );
      }

      // Compile templates
      const summary = decode(Handlebars.compile(data.summary)(context));
      const startDateTime = decode(Handlebars.compile(data.startDateTime)(context));
      const endDateTime = decode(Handlebars.compile(data.endDateTime)(context));
      const description = data.description
        ? decode(Handlebars.compile(data.description)(context))
        : undefined;
      const location = data.location
        ? decode(Handlebars.compile(data.location)(context))
        : undefined;
      const attendeesString = data.attendees
        ? decode(Handlebars.compile(data.attendees)(context))
        : undefined;

      // Parse attendees
      const attendees = attendeesString
        ? attendeesString
            .split(",")
            .map((email) => email.trim())
            .filter((email) => email.length > 0)
            .map((email) => ({ email }))
        : [];

      // Create event payload
      const eventPayload: any = {
        summary,
        start: {
          dateTime: startDateTime,
          timeZone: "UTC",
        },
        end: {
          dateTime: endDateTime,
          timeZone: "UTC",
        },
      };

      if (description) {
        eventPayload.description = description;
      }

      if (location) {
        eventPayload.location = location;
      }

      if (attendees.length > 0) {
        eventPayload.attendees = attendees;
      }

      // Create calendar event
      const response = await step.run("create-calendar-event", async () => {
        const res = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(eventPayload),
          }
        );

        if (!res.ok) {
          const error = await res.text();
          throw new Error(`Google Calendar API error: ${error}`);
        }

        return await res.json();
      });

      await publish(
        googleCalendarCreateEventChannel().status({ nodeId, status: "success" })
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
                attendees: response.attendees,
              },
            }
          : {}),
      };
    } catch (error) {
      await publish(
        googleCalendarCreateEventChannel().status({ nodeId, status: "error" })
      );
      throw error;
    }
  };
