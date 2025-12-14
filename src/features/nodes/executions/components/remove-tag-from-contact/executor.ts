import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { removeTagFromContactChannel } from "@/inngest/channels/remove-tag-from-contact";
import prisma from "@/lib/db";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type RemoveTagFromContactData = {
  variableName?: string;
  contactId: string;
  tag: string;
};

export const removeTagFromContactExecutor: NodeExecutor<RemoveTagFromContactData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(removeTagFromContactChannel().status({ nodeId, status: "loading" }));

  try {
    if (!data.contactId || !data.tag) {
      await publish(removeTagFromContactChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Remove Tag from Contact: Contact ID and tag are required."
      );
    }

    // Get workflow context
    const workflow = await step.run("get-workflow-context", async () => {
      const node = await prisma.node.findUnique({
        where: { id: nodeId },
        include: {
          Workflows: {
            select: {
              subaccountId: true,
              organizationId: true,
            },
          },
        },
      });

      if (!node?.Workflows?.organizationId) {
        throw new NonRetriableError(
          "Remove Tag from Contact: This workflow must be in an organization context."
        );
      }

      return node.Workflows;
    });

    // Compile contactId and tag with Handlebars
    const contactId = decode(Handlebars.compile(data.contactId)(context));
    const tag = decode(Handlebars.compile(data.tag)(context));

    // Find contact and update tags
    const contact = await step.run("remove-tag-from-contact", async () => {
      const existingContact = await prisma.contact.findUnique({
        where: { id: contactId },
      });

      if (!existingContact) {
        throw new NonRetriableError(
          `Remove Tag from Contact: Contact with ID ${contactId} not found.`
        );
      }

      // Verify contact belongs to the same organization
      if (existingContact.organizationId !== workflow.organizationId) {
        throw new NonRetriableError(
          "Remove Tag from Contact: Contact does not belong to this organization."
        );
      }

      // Remove tag if it exists
      const currentTags = existingContact.tags || [];
      const updatedTags = currentTags.filter((t) => t !== tag);

      return await prisma.contact.update({
        where: { id: contactId },
        data: { tags: updatedTags },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          companyName: true,
          position: true,
          type: true,
          lifecycleStage: true,
          score: true,
          tags: true,
          website: true,
          linkedin: true,
          country: true,
          city: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    await publish(removeTagFromContactChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: {
              ...contact,
              createdAt:
                typeof contact.createdAt === "string"
                  ? contact.createdAt
                  : (contact.createdAt as Date).toISOString(),
              updatedAt:
                typeof contact.updatedAt === "string"
                  ? contact.updatedAt
                  : (contact.updatedAt as Date).toISOString(),
            },
          }
        : {}),
    };
  } catch (error) {
    await publish(removeTagFromContactChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
