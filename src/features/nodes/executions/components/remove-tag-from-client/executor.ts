import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { removeTagFromClientChannel } from "@/inngest/channels/remove-tag-from-client";
import { decode } from "html-entities";
import { db } from "@/db";
import { client as clientTable } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

type RemoveTagFromClientData = {
  clientId: string;
  tag?: string;
  tags?: string[];
  variableName?: string;
};

export const removeTagFromClientExecutor: NodeExecutor<RemoveTagFromClientData> = async ({
  data,
  nodeId,
  scope,
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

    if (!data.tag && !data.tags?.length) {
      await publish(removeTagFromClientChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Remove Tag from Client Node error: Tag is required."
      );
    }

    // Compile fields with Handlebars
    const clientId = decode(Handlebars.compile(data.clientId)(context));
    const tags = new Set(
      (data.tags?.length ? data.tags : [data.tag || ""])
        .map((tag) => decode(Handlebars.compile(tag)(context)).trim())
        .filter(Boolean),
    );

    const client = await step.run("remove-tag-from-client", async () => {
      // Fetch the current client
      const existingClient = await db.query.client.findFirst({
        where: and(
          eq(clientTable.id, clientId),
          eq(clientTable.organizationId, scope.organizationId),
          scope.locationId
            ? eq(clientTable.locationId, scope.locationId)
            : isNull(clientTable.locationId),
        ),
      });

      if (!existingClient) {
        throw new NonRetriableError(
          `Remove Tag from Client Node error: Client with ID ${clientId} not found.`
        );
      }

      // Remove tag if it exists
      const currentTags = existingClient.tags || [];
      const updatedTags = currentTags.filter((tag) => !tags.has(tag));

      const [updatedClient] = await db
        .update(clientTable)
        .set({
          tags: updatedTags,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(clientTable.id, clientId),
            eq(clientTable.organizationId, scope.organizationId),
            scope.locationId
              ? eq(clientTable.locationId, scope.locationId)
              : isNull(clientTable.locationId),
          ),
        )
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
