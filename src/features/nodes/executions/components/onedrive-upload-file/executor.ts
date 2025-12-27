import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { onedriveUploadFileChannel } from "@/inngest/channels/onedrive-upload-file";
import { decode } from "html-entities";

type OnedriveUploadFileData = {
  variableName?: string;
  fileName: string;
  fileContent: string;
};

export const onedriveUploadFileExecutor: NodeExecutor<OnedriveUploadFileData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(onedriveUploadFileChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.fileName) {
      await publish(onedriveUploadFileChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("OneDrive: Upload File error: fileName is required.");
    }

    if (!data.fileContent) {
      await publish(onedriveUploadFileChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("OneDrive: Upload File error: fileContent is required.");
    }

    // Compile fields with Handlebars
    const fileName = data.fileName ? decode(Handlebars.compile(data.fileName)(context)) : undefined;
    const fileContent = data.fileContent ? decode(Handlebars.compile(data.fileContent)(context)) : undefined;

    // TODO: Implement OneDrive: Upload File logic here
    const result = await step.run("onedrive-upload-file", async () => {
      // Add implementation here
      throw new NonRetriableError("OneDrive: Upload File: Not yet implemented");
    });

    await publish(onedriveUploadFileChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(onedriveUploadFileChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
