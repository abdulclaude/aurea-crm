import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { removeTagFromClientChannel } from "@/inngest/channels/remove-tag-from-client";
import { decode } from "html-entities";
import { db } from "@/db";
import { client as clientTable } from "@/db/schema";
import { eq } from "drizzle-orm";

type RemoveTagFromClientData = {
  clientId: string;
  tag: string;
  variableName?: string;
};

export const removeTagFromClientExecutor: NodeExecutor<RemoveTagFromClientData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(removeTagFromClientChannel().status({ nodeId, status: "loading" }));

  try {
    if (!data.clientId) {
      await publish(removeTagFromClientChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Remove Tag from Client Node error: Client ID is required."
      );
    }

    if (!data.tag) {
      await publish(removeTagFromClientChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Remove Tag from Client Node error: Tag is required."
      );
    }

    // Compile fields with Handlebars
    const clientId = decode(Handlebars.compile(data.clientId)(context));
    const tag = decode(Handlebars.compile(data.tag)(context)).trim();

    const client = await step.run("remove-tag-from-client", async () => {
      // Fetch the current client
      const existingClient = await db.query.client.findFirst({
        where: eq(clientTable.id, clientId),
      });

      if (!existingClient) {
        throw new NonRetriableError(
          `Remove Tag from Client Node error: Client with ID ${clientId} not found.`
        );
      }

      // Remove tag if it exists
      const currentTags = existingClient.tags || [];
      const updatedTags = currentTags.filter(t => t !== tag);

      const [updatedClient] = await db
        .update(clientTable)
        .set({
          tags: updatedTags,
          updatedAt: new Date(),
        })
        .where(eq(clientTable.id, clientId))
        .returning();

      return updatedClient;
    });

    await publish(removeTagFromClientChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: {
              id: client.id,
              name: client.name,
              tags: client.tags,
            },
          }
        : {}),
    };
  } catch (error) {
    await publish(removeTagFromClientChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
