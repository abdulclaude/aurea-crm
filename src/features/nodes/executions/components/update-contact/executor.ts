import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { updateContactChannel } from "@/inngest/channels/update-contact";
import prisma from "@/lib/db";
import { decode } from "html-entities";
import { ContactType, LifecycleStage } from "@/generated/prisma/enums";

type UpdateContactData = {
  variableName?: string;
  contactId: string;
  name?: string;
  email?: string;
  companyName?: string;
  phone?: string;
  position?: string;
  type?: ContactType;
  lifecycleStage?: LifecycleStage;
  source?: string;
  website?: string;
  linkedin?: string;
  country?: string;
  city?: string;
  notes?: string;
};

export const updateContactExecutor: NodeExecutor<
  UpdateContactData
> = async ({ data, nodeId, context, step, publish }) => {
  await publish(
    updateContactChannel().status({ nodeId, status: "loading" })
  );

  try {
    if (!data.variableName) {
      await publish(
        updateContactChannel().status({ nodeId, status: "error" })
      );
      throw new NonRetriableError(
        "Update Contact Node error: No variable name has been set."
      );
    }

    if (!data.contactId) {
      await publish(
        updateContactChannel().status({ nodeId, status: "error" })
      );
      throw new NonRetriableError(
        "Update Contact Node error: Contact ID is required."
      );
    }

    const workflow = await step.run("get-workflow-context", async () => {
      const node = await prisma.node.findUnique({
        where: { id: nodeId },
        include: {
          workflow: {
            select: {
              subaccountId: true,
            },
          },
        },
      });

      if (!node?.workflow?.subaccountId) {
        throw new NonRetriableError(
          "Update Contact Node error: This workflow must be in a subaccount context."
        );
      }

      return node.workflow;
    });

    const contactId = decode(Handlebars.compile(data.contactId)(context));

    const updateData: Record<string, unknown> = {};

    if (data.name) {
      updateData.name = decode(Handlebars.compile(data.name)(context));
    }
    if (data.email !== undefined) {
      updateData.email = data.email
        ? decode(Handlebars.compile(data.email)(context))
        : null;
    }
    if (data.companyName !== undefined) {
      updateData.companyName = data.companyName
        ? decode(Handlebars.compile(data.companyName)(context))
        : null;
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone
        ? decode(Handlebars.compile(data.phone)(context))
        : null;
    }
    if (data.position !== undefined) {
      updateData.position = data.position
        ? decode(Handlebars.compile(data.position)(context))
        : null;
    }
    if (data.type) {
      updateData.type = data.type;
    }
    if (data.lifecycleStage !== undefined) {
      updateData.lifecycleStage = data.lifecycleStage || null;
    }
    if (data.source !== undefined) {
      updateData.source = data.source
        ? decode(Handlebars.compile(data.source)(context))
        : null;
    }
    if (data.website !== undefined) {
      updateData.website = data.website
        ? decode(Handlebars.compile(data.website)(context))
        : null;
    }
    if (data.linkedin !== undefined) {
      updateData.linkedin = data.linkedin
        ? decode(Handlebars.compile(data.linkedin)(context))
        : null;
    }
    if (data.country !== undefined) {
      updateData.country = data.country
        ? decode(Handlebars.compile(data.country)(context))
        : null;
    }
    if (data.city !== undefined) {
      updateData.city = data.city
        ? decode(Handlebars.compile(data.city)(context))
        : null;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes
        ? decode(Handlebars.compile(data.notes)(context))
        : null;
    }

    const contact = await step.run("update-contact", async () => {
      return await prisma.contact.update({
        where: {
          id: contactId,
          subaccountId: workflow.subaccountId!,
        },
        data: updateData,
      });
    });

    await publish(
      updateContactChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [data.variableName]: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        companyName: contact.companyName,
        phone: contact.phone,
        type: contact.type,
        lifecycleStage: contact.lifecycleStage,
        updatedAt: typeof contact.updatedAt === 'string' ? contact.updatedAt : (contact.updatedAt as Date).toISOString(),
      },
    };
  } catch (error) {
    await publish(
      updateContactChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};
