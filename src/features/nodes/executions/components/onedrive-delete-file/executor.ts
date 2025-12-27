import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { onedriveDeleteFileChannel } from "@/inngest/channels/onedrive-delete-file";
import { decode } from "html-entities";

type OnedriveDeleteFileData = {
  variableName?: string;
  fileId: string;
};

export const onedriveDeleteFileExecutor: NodeExecutor<OnedriveDeleteFileData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(onedriveDeleteFileChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.fileId) {
      await publish(onedriveDeleteFileChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("OneDrive: Delete File error: fileId is required.");
    }

    // Compile fields with Handlebars
    const fileId = data.fileId ? decode(Handlebars.compile(data.fileId)(context)) : undefined;

    // TODO: Implement OneDrive: Delete File logic here
    const result = await step.run("onedrive-delete-file", async () => {
      // Add implementation here
      throw new NonRetriableError("OneDrive: Delete File: Not yet implemented");
    });

    await publish(onedriveDeleteFileChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(onedriveDeleteFileChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
