import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import { z } from "zod";

import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { getWorkflowProviderBindingSpec } from "@/features/workflows/lib/workflow-provider-binding";
import { googleCalendarUpdateEventChannel } from "@/inngest/channels/google-calendar-update-event";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GoogleCalendarUpdateEventData = {
  providerAccountId: string;
  variableName?: string;
  eventId: string;
  summary?: string;
  startDateTime?: string;
  endDateTime?: string;
  description?: string;
  location?: string;
};

type GoogleCalendarEventDateTime = {
  dateTime: string;
  timeZone: "UTC";
};

type GoogleCalendarUpdateEventPayload = {
  summary?: string;
  start?: GoogleCalendarEventDateTime;
  end?: GoogleCalendarEventDateTime;
  description?: string;
  location?: string;
};

const googleCalendarEventResponseSchema = z.object({
  id: z.string().optional(),
  htmlLink: z.string().optional(),
  summary: z.string().optional(),
  start: z.unknown().optional(),
  end: z.unknown().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});

const providerBinding = getWorkflowProviderBindingSpec(
  NodeType.GOOGLE_CALENDAR_UPDATE_EVENT,
);

export const googleCalendarUpdateEventExecutor: NodeExecutor<GoogleCalendarUpdateEventData> =
  async ({ data, nodeId, scope, context, step, publish }) => {
    await publish(
      googleCalendarUpdateEventChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.providerAccountId || !data.eventId) {
        await publish(
          googleCalendarUpdateEventChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Calendar: Account and event ID are required"
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

      const eventId = decode(Handlebars.compile(data.eventId)(context));

      // Build update payload with only provided fields
      const updatePayload: GoogleCalendarUpdateEventPayload = {};

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
        const res = await oauthAuthenticatedFetch(
          grant,
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
          throw new Error(`Google Calendar API rejected the request with status ${res.status}.`);
        }

        const payload: unknown = await res.json();
        return googleCalendarEventResponseSchema.parse(payload);
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
