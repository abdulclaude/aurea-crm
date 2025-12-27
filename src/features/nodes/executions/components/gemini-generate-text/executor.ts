import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { geminiGenerateTextChannel } from "@/inngest/channels/gemini-generate-text";
import { decode } from "html-entities";

type GeminiGenerateTextData = {
  variableName?: string;
  prompt: string;
};

export const geminiGenerateTextExecutor: NodeExecutor<GeminiGenerateTextData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(geminiGenerateTextChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.prompt) {
      await publish(geminiGenerateTextChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Gemini: Generate Text error: prompt is required.");
    }

    // Compile fields with Handlebars
    const prompt = data.prompt ? decode(Handlebars.compile(data.prompt)(context)) : undefined;

    // TODO: Implement Gemini: Generate Text logic here
    const result = await step.run("gemini-generate-text", async () => {
      // Add implementation here
      throw new NonRetriableError("Gemini: Generate Text: Not yet implemented");
    });

    await publish(geminiGenerateTextChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(geminiGenerateTextChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
