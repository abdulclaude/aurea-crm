import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { googleCalendarDeleteEventChannel } from "@/inngest/channels/google-calendar-delete-event";
import { auth } from "@/lib/auth";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GoogleCalendarDeleteEventData = {
  variableName?: string;
  eventId: string;
};

export const googleCalendarDeleteEventExecutor: NodeExecutor<GoogleCalendarDeleteEventData> =
  async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
      googleCalendarDeleteEventChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.eventId) {
        await publish(
          googleCalendarDeleteEventChannel().status({ nodeId, status: "error" })
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
          googleCalendarDeleteEventChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Calendar is not connected. Please connect Google in Settings → Apps."
        );
      }

      const eventId = decode(Handlebars.compile(data.eventId)(context));

      await step.run("delete-calendar-event", async () => {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!res.ok) {
          const error = await res.text();
          throw new Error(`Google Calendar API error: ${error}`);
        }
      });

      await publish(
        googleCalendarDeleteEventChannel().status({ nodeId, status: "success" })
      );

      return {
        ...context,
        ...(data.variableName
          ? {
              [data.variableName]: {
                deleted: true,
                eventId,
              },
            }
          : {}),
      };
    } catch (error) {
      await publish(
        googleCalendarDeleteEventChannel().status({ nodeId, status: "error" })
      );
      throw error;
    }
  };
