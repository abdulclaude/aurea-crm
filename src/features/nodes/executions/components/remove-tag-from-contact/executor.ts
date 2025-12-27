import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { removeTagFromContactChannel } from "@/inngest/channels/remove-tag-from-contact";
import prisma from "@/lib/db";
import { decode } from "html-entities";

type RemoveTagFromContactData = {
  contactId: string;
  tag: string;
  variableName?: string;
};

export const removeTagFromContactExecutor: NodeExecutor<RemoveTagFromContactData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(removeTagFromContactChannel().status({ nodeId, status: "loading" }));

  try {
    if (!data.contactId) {
      await publish(removeTagFromContactChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Remove Tag from Contact Node error: Contact ID is required."
      );
    }

    if (!data.tag) {
      await publish(removeTagFromContactChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Remove Tag from Contact Node error: Tag is required."
      );
    }

    // Compile fields with Handlebars
    const contactId = decode(Handlebars.compile(data.contactId)(context));
    const tag = decode(Handlebars.compile(data.tag)(context)).trim();

    const contact = await step.run("remove-tag-from-contact", async () => {
      // Fetch the current contact
      const existingContact = await prisma.contact.findUnique({
        where: { id: contactId },
      });

      if (!existingContact) {
        throw new NonRetriableError(
          `Remove Tag from Contact Node error: Contact with ID ${contactId} not found.`
        );
      }

      // Remove tag if it exists
      const currentTags = existingContact.tags || [];
      const updatedTags = currentTags.filter(t => t !== tag);

      return await prisma.contact.update({
        where: { id: contactId },
        data: {
          tags: updatedTags,
          updatedAt: new Date(),
        },
      });
    });

    await publish(removeTagFromContactChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: {
              id: contact.id,
              name: contact.name,
              tags: contact.tags,
            },
          }
        : {}),
    };
  } catch (error) {
    await publish(removeTagFromContactChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
