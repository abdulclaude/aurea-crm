import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";

import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { getWorkflowProviderBindingSpec } from "@/features/workflows/lib/workflow-provider-binding";
import { googleCalendarDeleteEventChannel } from "@/inngest/channels/google-calendar-delete-event";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GoogleCalendarDeleteEventData = {
  providerAccountId: string;
  variableName?: string;
  eventId: string;
};

const providerBinding = getWorkflowProviderBindingSpec(
  NodeType.GOOGLE_CALENDAR_DELETE_EVENT,
);

export const googleCalendarDeleteEventExecutor: NodeExecutor<GoogleCalendarDeleteEventData> =
  async ({ data, nodeId, scope, context, step, publish }) => {
    await publish(
      googleCalendarDeleteEventChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.providerAccountId || !data.eventId) {
        await publish(
          googleCalendarDeleteEventChannel().status({ nodeId, status: "error" })
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

      await step.run("delete-calendar-event", async () => {
        const res = await oauthAuthenticatedFetch(
          grant,
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Google Calendar API rejected the request with status ${res.status}.`);
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
