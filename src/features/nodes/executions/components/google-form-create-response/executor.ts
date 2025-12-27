import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { googleFormCreateResponseChannel } from "@/inngest/channels/google-form-create-response";
import { decode } from "html-entities";

type GoogleFormCreateResponseData = {
  variableName?: string;
  formId: string;
  responses: string;
};

export const googleFormCreateResponseExecutor: NodeExecutor<GoogleFormCreateResponseData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(googleFormCreateResponseChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.formId) {
      await publish(googleFormCreateResponseChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Google Forms: Create Response error: formId is required.");
    }

    if (!data.responses) {
      await publish(googleFormCreateResponseChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Google Forms: Create Response error: responses is required.");
    }

    // Compile fields with Handlebars
    const formId = data.formId ? decode(Handlebars.compile(data.formId)(context)) : undefined;
    const responses = data.responses ? decode(Handlebars.compile(data.responses)(context)) : undefined;

    // TODO: Implement Google Forms: Create Response logic here
    const result = await step.run("google-form-create-response", async () => {
      // Add implementation here
      throw new NonRetriableError("Google Forms: Create Response: Not yet implemented");
    });

    await publish(googleFormCreateResponseChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(googleFormCreateResponseChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
