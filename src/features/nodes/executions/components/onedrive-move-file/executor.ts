import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { onedriveMoveFileChannel } from "@/inngest/channels/onedrive-move-file";
import { decode } from "html-entities";

type OnedriveMoveFileData = {
  variableName?: string;
  fileId: string;
  destinationFolderId: string;
};

export const onedriveMoveFileExecutor: NodeExecutor<OnedriveMoveFileData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(onedriveMoveFileChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.fileId) {
      await publish(onedriveMoveFileChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("OneDrive: Move File error: fileId is required.");
    }

    if (!data.destinationFolderId) {
      await publish(onedriveMoveFileChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("OneDrive: Move File error: destinationFolderId is required.");
    }

    // Compile fields with Handlebars
    const fileId = data.fileId ? decode(Handlebars.compile(data.fileId)(context)) : undefined;
    const destinationFolderId = data.destinationFolderId ? decode(Handlebars.compile(data.destinationFolderId)(context)) : undefined;

    // TODO: Implement OneDrive: Move File logic here
    const result = await step.run("onedrive-move-file", async () => {
      // Add implementation here
      throw new NonRetriableError("OneDrive: Move File: Not yet implemented");
    });

    await publish(onedriveMoveFileChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(onedriveMoveFileChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
