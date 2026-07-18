import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import { z } from "zod";

import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { getWorkflowProviderBindingSpec } from "@/features/workflows/lib/workflow-provider-binding";
import { googleFormReadResponsesChannel } from "@/inngest/channels/google-form-read-responses";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GoogleFormReadResponsesData = {
  providerAccountId: string;
  variableName?: string;
  formId: string;
  limit?: string;
};

const googleFormResponseSchema = z.object({
  responseId: z.string().optional(),
  createTime: z.string().optional(),
  lastSubmittedTime: z.string().optional(),
  respondentEmail: z.string().optional(),
  answers: z.record(z.string(), z.unknown()).optional(),
});

const googleFormResponsesSchema = z.object({
  responses: z.array(googleFormResponseSchema).optional(),
});

const googleFormMetadataSchema = z.object({
  info: z
    .object({
      title: z.string().optional(),
    })
    .optional(),
  items: z
    .array(
      z.object({
        title: z.string().optional(),
        questionItem: z
          .object({
            question: z
              .object({
                questionId: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
      })
    )
    .optional(),
});

const providerBinding = getWorkflowProviderBindingSpec(
  NodeType.GOOGLE_FORM_READ_RESPONSES,
);

export const googleFormReadResponsesExecutor: NodeExecutor<GoogleFormReadResponsesData> =
  async ({ data, nodeId, scope, context, step, publish }) => {
    await publish(
      googleFormReadResponsesChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.providerAccountId || !data.formId) {
        await publish(
          googleFormReadResponsesChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Forms: Account and form ID are required"
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
      const formId = decode(Handlebars.compile(data.formId)(context));
      const limit = data.limit
        ? parseInt(decode(Handlebars.compile(data.limit)(context)), 10)
        : 10;

      // Get form responses
      const response = await step.run("get-form-responses", async () => {
        const res = await oauthAuthenticatedFetch(
          grant,
          `https://forms.googleapis.com/v1/forms/${formId}/responses`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Google Forms API rejected the form request with status ${res.status}.`);
        }

        const payload: unknown = await res.json();
        return googleFormResponsesSchema.parse(payload);
      });

      // Get form metadata to include question info
      const formMetadata = await step.run("get-form-metadata", async () => {
        const res = await oauthAuthenticatedFetch(
          grant,
          `https://forms.googleapis.com/v1/forms/${formId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Google Forms API rejected the response request with status ${res.status}.`);
        }

        const payload: unknown = await res.json();
        return googleFormMetadataSchema.parse(payload);
      });

      // Process and limit responses
      const responses = (response.responses || []).slice(0, limit).map((resp) => {
        const answers: Record<string, unknown> = {};

        // Map question IDs to their answers
        if (resp.answers) {
          for (const [questionId, answer] of Object.entries(resp.answers)) {
            const question = formMetadata.items?.find(
              (item) =>
                item.questionItem?.question?.questionId === questionId
            );

            const questionTitle = question?.title || questionId;
            answers[questionTitle] = answer;
          }
        }

        return {
          responseId: resp.responseId,
          createTime: resp.createTime,
          lastSubmittedTime: resp.lastSubmittedTime,
          respondentEmail: resp.respondentEmail,
          answers,
        };
      });

      await publish(
        googleFormReadResponsesChannel().status({ nodeId, status: "success" })
      );

      return {
        ...context,
        ...(data.variableName
          ? {
              [data.variableName]: {
                formId,
                formTitle: formMetadata.info?.title,
                responses,
                totalResponses: response.responses?.length || 0,
              },
            }
          : {}),
      };
    } catch (error) {
      await publish(
        googleFormReadResponsesChannel().status({ nodeId, status: "error" })
      );
      throw error;
    }
  };
