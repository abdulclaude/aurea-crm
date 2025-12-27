import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { geminiClassifyChannel } from "@/inngest/channels/gemini-classify";
import { decode } from "html-entities";

type GeminiClassifyData = {
  variableName?: string;
  text: string;
  categories: string;
};

export const geminiClassifyExecutor: NodeExecutor<GeminiClassifyData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(geminiClassifyChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.text) {
      await publish(geminiClassifyChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Gemini: Classify error: text is required.");
    }

    if (!data.categories) {
      await publish(geminiClassifyChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Gemini: Classify error: categories is required.");
    }

    // Compile fields with Handlebars
    const text = data.text ? decode(Handlebars.compile(data.text)(context)) : undefined;
    const categories = data.categories ? decode(Handlebars.compile(data.categories)(context)) : undefined;

    // TODO: Implement Gemini: Classify logic here
    const result = await step.run("gemini-classify", async () => {
      // Add implementation here
      throw new NonRetriableError("Gemini: Classify: Not yet implemented");
    });

    await publish(geminiClassifyChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(geminiClassifyChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
