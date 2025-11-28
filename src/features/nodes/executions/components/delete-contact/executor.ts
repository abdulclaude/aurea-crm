import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { deleteContactChannel } from "@/inngest/channels/delete-contact";
import prisma from "@/lib/db";
import { decode } from "html-entities";

type DeleteContactData = {
  variableName?: string;
  contactId: string;
};

export const deleteContactExecutor: NodeExecutor<
  DeleteContactData
> = async ({ data, nodeId, context, step, publish }) => {
  await publish(
    deleteContactChannel().status({ nodeId, status: "loading" })
  );

  try {
    if (!data.variableName) {
      await publish(
        deleteContactChannel().status({ nodeId, status: "error" })
      );
      throw new NonRetriableError(
        "Delete Contact Node error: No variable name has been set."
      );
    }

    if (!data.contactId) {
      await publish(
        deleteContactChannel().status({ nodeId, status: "error" })
      );
      throw new NonRetriableError(
        "Delete Contact Node error: Contact ID is required."
      );
    }

    const workflow = await step.run("get-workflow-context", async () => {
      const node = await prisma.node.findUnique({
        where: { id: nodeId },
        include: {
          workflow: {
            select: {
              subaccountId: true,
              organizationId: true,
            },
          },
        },
      });

      if (!node?.workflow?.organizationId) {
        throw new NonRetriableError(
          "Delete Contact Node error: This workflow must be in an organization context."
        );
      }

      return node.workflow;
    });

    const contactId = decode(Handlebars.compile(data.contactId)(context));

    const deletedContact = await step.run("delete-contact", async () => {
      return await prisma.contact.delete({
        where: {
          id: contactId,
          ...(workflow.subaccountId
            ? { subaccountId: workflow.subaccountId }
            : { organizationId: workflow.organizationId! }),
        },
      });
    });

    await publish(
      deleteContactChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [data.variableName]: {
        deleted: true,
        deletedId: deletedContact.id,
        deletedName: deletedContact.name,
        deletedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    await publish(
      deleteContactChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};
