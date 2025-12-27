import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { onedriveDownloadFileChannel } from "@/inngest/channels/onedrive-download-file";
import { decode } from "html-entities";

type OnedriveDownloadFileData = {
  variableName?: string;
  fileId: string;
};

export const onedriveDownloadFileExecutor: NodeExecutor<OnedriveDownloadFileData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(onedriveDownloadFileChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.fileId) {
      await publish(onedriveDownloadFileChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("OneDrive: Download File error: fileId is required.");
    }

    // Compile fields with Handlebars
    const fileId = data.fileId ? decode(Handlebars.compile(data.fileId)(context)) : undefined;

    // TODO: Implement OneDrive: Download File logic here
    const result = await step.run("onedrive-download-file", async () => {
      // Add implementation here
      throw new NonRetriableError("OneDrive: Download File: Not yet implemented");
    });

    await publish(onedriveDownloadFileChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(onedriveDownloadFileChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
