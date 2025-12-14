import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { googleFormReadResponsesChannel } from "@/inngest/channels/google-form-read-responses";
import { auth } from "@/lib/auth";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GoogleFormReadResponsesData = {
  variableName?: string;
  formId: string;
  limit?: string;
};

export const googleFormReadResponsesExecutor: NodeExecutor<GoogleFormReadResponsesData> =
  async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
      (googleFormReadResponsesChannel as any).status({ nodeId, status: "loading" })
    );

    try {
      if (!data.formId) {
        await publish(
          (googleFormReadResponsesChannel as any).status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Forms: Form ID is required"
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
          (googleFormReadResponsesChannel as any).status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Forms is not connected. Please connect Google in Settings → Apps."
        );
      }

      // Compile templates
      const formId = decode(Handlebars.compile(data.formId)(context));
      const limit = data.limit
        ? parseInt(decode(Handlebars.compile(data.limit)(context)), 10)
        : 10;

      // Get form responses
      const response = await step.run("get-form-responses", async () => {
        const res = await fetch(
          `https://forms.googleapis.com/v1/forms/${formId}/responses`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!res.ok) {
          const error = await res.text();
          throw new Error(`Google Forms API error: ${error}`);
        }

        return await res.json();
      });

      // Get form metadata to include question info
      const formMetadata = await step.run("get-form-metadata", async () => {
        const res = await fetch(
          `https://forms.googleapis.com/v1/forms/${formId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!res.ok) {
          const error = await res.text();
          throw new Error(`Google Forms API error: ${error}`);
        }

        return await res.json();
      });

      // Process and limit responses
      const responses = (response.responses || []).slice(0, limit).map((resp: any) => {
        const answers: Record<string, any> = {};

        // Map question IDs to their answers
        if (resp.answers) {
          for (const [questionId, answer] of Object.entries(resp.answers)) {
            const question = formMetadata.items?.find(
              (item: any) => item.questionItem?.question?.questionId === questionId
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
        (googleFormReadResponsesChannel as any).status({ nodeId, status: "success" })
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
        (googleFormReadResponsesChannel as any).status({ nodeId, status: "error" })
      );
      throw error;
    }
  };
