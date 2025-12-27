import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { addTagToContactChannel } from "@/inngest/channels/add-tag-to-contact";
import prisma from "@/lib/db";
import { decode } from "html-entities";

type AddTagToContactData = {
  contactId: string;
  tag: string;
  variableName?: string;
};

export const addTagToContactExecutor: NodeExecutor<AddTagToContactData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(addTagToContactChannel().status({ nodeId, status: "loading" }));

  try {
    if (!data.contactId) {
      await publish(addTagToContactChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Add Tag to Contact Node error: Contact ID is required."
      );
    }

    if (!data.tag) {
      await publish(addTagToContactChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Add Tag to Contact Node error: Tag is required."
      );
    }

    // Compile fields with Handlebars
    const contactId = decode(Handlebars.compile(data.contactId)(context));
    const tag = decode(Handlebars.compile(data.tag)(context)).trim();

    const contact = await step.run("add-tag-to-contact", async () => {
      // Fetch the current contact
      const existingContact = await prisma.contact.findUnique({
        where: { id: contactId },
      });

      if (!existingContact) {
        throw new NonRetriableError(
          `Add Tag to Contact Node error: Contact with ID ${contactId} not found.`
        );
      }

      // Add tag if it doesn't already exist
      const currentTags = existingContact.tags || [];
      const updatedTags = currentTags.includes(tag)
        ? currentTags
        : [...currentTags, tag];

      return await prisma.contact.update({
        where: { id: contactId },
        data: {
          tags: updatedTags,
          updatedAt: new Date(),
        },
      });
    });

    await publish(addTagToContactChannel().status({ nodeId, status: "success" }));

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
    await publish(addTagToContactChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
