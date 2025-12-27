import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { slackUploadFileChannel } from "@/inngest/channels/slack-upload-file";
import { decode } from "html-entities";

type SlackUploadFileData = {
  variableName?: string;
  channel: string;
  file: string;
  filename: string;
};

export const slackUploadFileExecutor: NodeExecutor<SlackUploadFileData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(slackUploadFileChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.channel) {
      await publish(slackUploadFileChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Slack: Upload File error: channel is required.");
    }

    if (!data.file) {
      await publish(slackUploadFileChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Slack: Upload File error: file is required.");
    }

    if (!data.filename) {
      await publish(slackUploadFileChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Slack: Upload File error: filename is required.");
    }

    // Compile fields with Handlebars
    const channel = data.channel ? decode(Handlebars.compile(data.channel)(context)) : undefined;
    const file = data.file ? decode(Handlebars.compile(data.file)(context)) : undefined;
    const filename = data.filename ? decode(Handlebars.compile(data.filename)(context)) : undefined;

    // TODO: Implement Slack: Upload File logic here
    const result = await step.run("slack-upload-file", async () => {
      // Add implementation here
      throw new NonRetriableError("Slack: Upload File: Not yet implemented");
    });

    await publish(slackUploadFileChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(slackUploadFileChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
