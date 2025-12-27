import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { geminiSummariseChannel } from "@/inngest/channels/gemini-summarise";
import { decode } from "html-entities";

type GeminiSummariseData = {
  variableName?: string;
  text: string;
};

export const geminiSummariseExecutor: NodeExecutor<GeminiSummariseData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(geminiSummariseChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.text) {
      await publish(geminiSummariseChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Gemini: Summarise error: text is required.");
    }

    // Compile fields with Handlebars
    const text = data.text ? decode(Handlebars.compile(data.text)(context)) : undefined;

    // TODO: Implement Gemini: Summarise logic here
    const result = await step.run("gemini-summarise", async () => {
      // Add implementation here
      throw new NonRetriableError("Gemini: Summarise: Not yet implemented");
    });

    await publish(geminiSummariseChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(geminiSummariseChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
