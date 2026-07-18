import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import { z } from "zod";

import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { getWorkflowProviderBindingSpec } from "@/features/workflows/lib/workflow-provider-binding";
import { googleCalendarCreateEventChannel } from "@/inngest/channels/google-calendar-create-event";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GoogleCalendarCreateEventData = {
  providerAccountId: string;
  variableName?: string;
  summary: string;
  startDateTime: string;
  endDateTime: string;
  description?: string;
  location?: string;
  attendees?: string;
};

type GoogleCalendarEventDateTime = {
  dateTime: string;
  timeZone: "UTC";
};

type GoogleCalendarCreateEventPayload = {
  summary: string;
  start: GoogleCalendarEventDateTime;
  end: GoogleCalendarEventDateTime;
  description?: string;
  location?: string;
  attendees?: Array<{ email: string }>;
};

const googleCalendarEventResponseSchema = z.object({
  id: z.string().optional(),
  htmlLink: z.string().optional(),
  summary: z.string().optional(),
  start: z.unknown().optional(),
  end: z.unknown().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  attendees: z.unknown().optional(),
});

const providerBinding = getWorkflowProviderBindingSpec(
  NodeType.GOOGLE_CALENDAR_CREATE_EVENT,
);

export const googleCalendarCreateEventExecutor: NodeExecutor<GoogleCalendarCreateEventData> =
  async ({ data, nodeId, scope, context, step, publish }) => {
    await publish(
      googleCalendarCreateEventChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (
        !data.providerAccountId ||
        !data.summary ||
        !data.startDateTime ||
        !data.endDateTime
      ) {
        await publish(
          googleCalendarCreateEventChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Calendar: Account, event title, start date/time, and end date/time are required"
        );
      }

      const grant = await step.run("get-google-token", async () =>
        resolveOAuthProviderGrant({
          providerAccountId: data.providerAccountId,
          provider: providerBinding.provider,
          scope,
          requiredScopes: providerBinding.requiredScopes,
        })
      );
      const { accessToken } = grant;

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
      const eventPayload: GoogleCalendarCreateEventPayload = {
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
        const res = await oauthAuthenticatedFetch(
          grant,
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
          throw new Error(`Google Calendar API rejected the request with status ${res.status}.`);
        }

        const payload: unknown = await res.json();
        return googleCalendarEventResponseSchema.parse(payload);
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
