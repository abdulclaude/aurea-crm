import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { addTagToClientChannel } from "@/inngest/channels/add-tag-to-client";
import { decode } from "html-entities";
import { db } from "@/db";
import { client as clientTable } from "@/db/schema";
import { eq } from "drizzle-orm";

type AddTagToClientData = {
  clientId: string;
  tag: string;
  variableName?: string;
};

export const addTagToClientExecutor: NodeExecutor<AddTagToClientData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(addTagToClientChannel().status({ nodeId, status: "loading" }));

  try {
    if (!data.clientId) {
      await publish(addTagToClientChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Add Tag to Client Node error: Client ID is required."
      );
    }

    if (!data.tag) {
      await publish(addTagToClientChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Add Tag to Client Node error: Tag is required."
      );
    }

    // Compile fields with Handlebars
    const clientId = decode(Handlebars.compile(data.clientId)(context));
    const tag = decode(Handlebars.compile(data.tag)(context)).trim();

    const client = await step.run("add-tag-to-client", async () => {
      // Fetch the current client
      const existingClient = await db.query.client.findFirst({
        where: eq(clientTable.id, clientId),
      });

      if (!existingClient) {
        throw new NonRetriableError(
          `Add Tag to Client Node error: Client with ID ${clientId} not found.`
        );
      }

      // Add tag if it doesn't already exist
      const currentTags = existingClient.tags || [];
      const updatedTags = currentTags.includes(tag)
        ? currentTags
        : [...currentTags, tag];

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

    await publish(addTagToClientChannel().status({ nodeId, status: "success" }));

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
    await publish(addTagToClientChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
