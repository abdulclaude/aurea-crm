import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";

import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { getWorkflowProviderBindingSpec } from "@/features/workflows/lib/workflow-provider-binding";
import { googleCalendarChannel } from "@/inngest/channels/google-calendar";

export type GoogleCalendarActionData = {
  providerAccountId: string;
  variableName?: string;
  calendarId?: string;
  summary?: string;
  description?: string;
  startDateTime?: string;
  endDateTime?: string;
  timezone?: string;
};

const providerBinding = getWorkflowProviderBindingSpec(
  NodeType.GOOGLE_CALENDAR_EXECUTION,
);

const renderTemplate = (
  value: string | undefined,
  context: Record<string, unknown>
) => {
  if (!value) return undefined;
  return Handlebars.compile(value)(context);
};

export const googleCalendarActionExecutor: NodeExecutor<GoogleCalendarActionData> =
  async ({ data, nodeId, scope, context, step, publish }) => {
    await publish(
      googleCalendarChannel().status({ nodeId, status: "loading" })
    );

    if (!data.calendarId) {
      await publish(googleCalendarChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Calendar ID is not configured.");
    }

    if (!data.providerAccountId) {
      await publish(googleCalendarChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Select a Google Calendar account.");
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

    const grant = await resolveOAuthProviderGrant({
      providerAccountId: data.providerAccountId,
      provider: providerBinding.provider,
      scope,
      requiredScopes: providerBinding.requiredScopes,
    });
    const { accessToken } = grant;

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
      const response = await oauthAuthenticatedFetch(
        grant,
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
        throw new NonRetriableError(
          `Google Calendar API rejected the request with status ${response.status}.`,
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
