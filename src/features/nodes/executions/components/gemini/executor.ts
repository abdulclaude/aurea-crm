import Handlebars from "handlebars";

import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

import { geminiChannel } from "@/inngest/channels/gemini";
import type { AVAILABLE_MODELS } from "./dialog";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GeminiData = {
  variableName?: string;
  credentialId?: string;
  model?: (typeof AVAILABLE_MODELS)[number];
  systemPrompt?: string;
  userPrompt?: string;
};

export const geminiExecutor: NodeExecutor<GeminiData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(geminiChannel().status({ nodeId, status: "loading" }));

  try {
    if (!data.variableName) {
      await publish(geminiChannel().status({ nodeId, status: "error" }));

      throw new NonRetriableError(
        "Gemini Node error: No variable name has been set."
      );
    }

    if (!data.credentialId) {
      await publish(geminiChannel().status({ nodeId, status: "error" }));

      throw new NonRetriableError(
        "Gemini Node error: No Credential ID has been set."
      );
    }

    if (!data.userPrompt) {
      await publish(geminiChannel().status({ nodeId, status: "error" }));

      throw new NonRetriableError(
        "Gemini Node error: No user prompt has been set."
      );
    }

    // fetch credential that user selected

    const credential = await step.run("get-credential", () => {
      return prisma.credential.findUnique({
        where: {
          id: data.credentialId,
          userId,
        },
      });
    });

    if (!credential) {
      await publish(geminiChannel().status({ nodeId, status: "error" }));

      throw new NonRetriableError("Gemini Node error: Credential not found.");
    }

    const systemPrompt = data.systemPrompt
      ? Handlebars.compile(data.systemPrompt)(context)
      : "You are a helpful assistant.";

    const userPrompt = Handlebars.compile(data.userPrompt)(context);

    const google = createGoogleGenerativeAI({
      apiKey: decrypt(credential.value),
    });

    const { steps } = await step.ai.wrap("gemini-generate-text", generateText, {
      model: google(data.model || "gemini-2.5-flash"),
      system: systemPrompt,
      prompt: userPrompt,
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
      },
    });

    const text =
      steps[0].content[0].type === "text" ? steps[0].content[0].text : "";

    await publish(geminiChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [data.variableName]: {
        aiResponse: text,
      },
    };
  } catch (error) {
    await publish(geminiChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
