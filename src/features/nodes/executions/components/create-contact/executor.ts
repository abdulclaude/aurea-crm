import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { createContactChannel } from "@/inngest/channels/create-contact";
import prisma from "@/lib/db";
import { decode } from "html-entities";
import { ContactType, LifecycleStage } from "@prisma/client";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type CreateContactData = {
  variableName?: string;
  name: string;
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

export const createContactExecutor: NodeExecutor<CreateContactData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(createContactChannel().status({ nodeId, status: "loading" }));

  try {
    if (!data.name) {
      await publish(createContactChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Create Contact Node error: Name is required."
      );
    }

    // Get organization/subaccount from workflow
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
          "Create Contact Node error: This workflow must be in an organization context to create contacts."
        );
      }

      return node.workflow;
    });

    // Compile all fields with Handlebars
    const name = decode(Handlebars.compile(data.name)(context));

    const email = data.email
      ? decode(Handlebars.compile(data.email)(context))
      : undefined;
    const companyName = data.companyName
      ? decode(Handlebars.compile(data.companyName)(context))
      : undefined;
    const phone = data.phone
      ? decode(Handlebars.compile(data.phone)(context))
      : undefined;
    const position = data.position
      ? decode(Handlebars.compile(data.position)(context))
      : undefined;
    const source = data.source
      ? decode(Handlebars.compile(data.source)(context))
      : undefined;
    const website = data.website
      ? decode(Handlebars.compile(data.website)(context))
      : undefined;
    const linkedin = data.linkedin
      ? decode(Handlebars.compile(data.linkedin)(context))
      : undefined;
    const country = data.country
      ? decode(Handlebars.compile(data.country)(context))
      : undefined;
    const city = data.city
      ? decode(Handlebars.compile(data.city)(context))
      : undefined;
    const notes = data.notes
      ? decode(Handlebars.compile(data.notes)(context))
      : undefined;

    const contact = await step.run("create-contact", async () => {
      return await prisma.contact.create({
        data: {
          subaccountId: workflow.subaccountId || null,
          organizationId: workflow.organizationId!,
          name,
          email: email || null,
          companyName: companyName || null,
          phone: phone || null,
          position: position || null,
          type: data.type || ContactType.LEAD,
          lifecycleStage: data.lifecycleStage || null,
          source: source || null,
          website: website || null,
          linkedin: linkedin || null,
          country: country || null,
          city: city || null,
          notes: notes || null,
          score: 0,
          tags: [],
        },
      });
    });

    await publish(createContactChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: {
              id: contact.id,
              name: contact.name,
              email: contact.email,
              companyName: contact.companyName,
              phone: contact.phone,
              position: contact.position,
              type: contact.type,
              lifecycleStage: contact.lifecycleStage,
              source: contact.source,
              website: contact.website,
              linkedin: contact.linkedin,
              country: contact.country,
              city: contact.city,
              createdAt:
                typeof contact.createdAt === "string"
                  ? contact.createdAt
                  : (contact.createdAt as Date).toISOString(),
            },
          }
        : {}),
    };
  } catch (error) {
    await publish(createContactChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
