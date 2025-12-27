import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { geminiTransformChannel } from "@/inngest/channels/gemini-transform";
import { decode } from "html-entities";

type GeminiTransformData = {
  variableName?: string;
  text: string;
  instructions: string;
};

export const geminiTransformExecutor: NodeExecutor<GeminiTransformData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(geminiTransformChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.text) {
      await publish(geminiTransformChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Gemini: Transform error: text is required.");
    }

    if (!data.instructions) {
      await publish(geminiTransformChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Gemini: Transform error: instructions is required.");
    }

    // Compile fields with Handlebars
    const text = data.text ? decode(Handlebars.compile(data.text)(context)) : undefined;
    const instructions = data.instructions ? decode(Handlebars.compile(data.instructions)(context)) : undefined;

    // TODO: Implement Gemini: Transform logic here
    const result = await step.run("gemini-transform", async () => {
      // Add implementation here
      throw new NonRetriableError("Gemini: Transform: Not yet implemented");
    });

    await publish(geminiTransformChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(geminiTransformChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
