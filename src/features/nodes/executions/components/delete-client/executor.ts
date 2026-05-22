import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { deleteClientChannel } from "@/inngest/channels/delete-client";
import { decode } from "html-entities";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { client as clientTable, node as nodeTable } from "@/db/schema";

type DeleteClientData = {
  variableName?: string;
  clientId: string;
};

export const deleteClientExecutor: NodeExecutor<
  DeleteClientData
> = async ({ data, nodeId, context, step, publish }) => {
  await publish(
    deleteClientChannel().status({ nodeId, status: "loading" })
  );

  try {
    if (!data.variableName) {
      await publish(
        deleteClientChannel().status({ nodeId, status: "error" })
      );
      throw new NonRetriableError(
        "Delete Client Node error: No variable name has been set."
      );
    }

    if (!data.clientId) {
      await publish(
        deleteClientChannel().status({ nodeId, status: "error" })
      );
      throw new NonRetriableError(
        "Delete Client Node error: Client ID is required."
      );
    }

    const workflow = await step.run("get-workflow-context", async () => {
      const node = await db.query.node.findFirst({
        where: eq(nodeTable.id, nodeId),
        with: {
          workflow: {
            columns: {
              locationId: true,
              organizationId: true,
            },
          },
        },
      });

      if (!node?.workflow?.organizationId) {
        throw new NonRetriableError(
          "Delete Client Node error: This workflow must be in an organization context."
        );
      }

      return {
        organizationId: node.workflow.organizationId,
        locationId: node.workflow.locationId,
      };
    });

    const clientId = decode(Handlebars.compile(data.clientId)(context));

    const deletedClient = await step.run("delete-client", async () => {
      const [deleted] = await db
        .delete(clientTable)
        .where(
          and(
            eq(clientTable.id, clientId),
            workflow.locationId
              ? eq(clientTable.locationId, workflow.locationId)
              : eq(clientTable.organizationId, workflow.organizationId)
          )
        )
        .returning();

      if (!deleted) {
        throw new NonRetriableError(
          `Delete Client Node error: Client with ID ${clientId} not found.`
        );
      }

      return deleted;
    });

    await publish(
      deleteClientChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [data.variableName]: {
        deleted: true,
        deletedId: deletedClient.id,
        deletedName: deletedClient.name,
        deletedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    await publish(
      deleteClientChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};
